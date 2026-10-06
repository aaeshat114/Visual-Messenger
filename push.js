// push.js
// ---------------------------------------------------------------------------
// Everything to do with push notifications lives here.
//
// Exports:
//   initPush(role)                          call once at launch (after pairing). NEVER asks permission.
//   requestPushPermission()                 call ONLY from a button tap (Settings -> Enable notifications)
//   getPushStatus()                         "granted" | "denied" | "default" | "unsupported"
//   sendPush(targetUids, title, body, data) send a notification to other family members
//
// Uses the OneSignal Web SDK v16 (page SDK from OneSignal's CDN) through its
// documented "OneSignalDeferred" queue: we push a function onto the queue and
// OneSignal calls it, with the OneSignal object, once the SDK has loaded.
// ---------------------------------------------------------------------------

import {
  ONESIGNAL_APP_ID,
  ONESIGNAL_REST_API_KEY,
  ONESIGNAL_API_URL,
  USE_WORKER_PROXY,
  WORKER_URL,
  SW_URL,
  SW_SCOPE,
  ONESIGNAL_WORKER_PATH,
  BASE_PATH,
} from "./config.js";
import { getSession, getMembers, setMemberPush } from "./firebase.js";

const SDK_URL = "https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js";

// Web push needs service workers, the Push API and the Notifications API.
export function isPushSupported() {
  return "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}

// ---------------------------------------------------------------------------
// Loading the SDK
// ---------------------------------------------------------------------------

let sdkPromise = null;

// Adds the <script> tag once. Rejects if it can't load (offline, or an ad blocker).
function loadSdk() {
  if (!sdkPromise) {
    sdkPromise = new Promise((resolve, reject) => {
      window.OneSignalDeferred = window.OneSignalDeferred || [];
      const script = document.createElement("script");
      script.src = SDK_URL;
      script.defer = true;
      script.onload = () => resolve();
      script.onerror = () => {
        sdkPromise = null;                       // allow a retry on the next call
        reject(new Error("OneSignal SDK failed to load"));
      };
      document.head.appendChild(script);
    });
  }
  return sdkPromise;
}

// Run fn(OneSignal) when the SDK is ready; resolves with whatever fn returns.
function withOneSignal(fn) {
  return new Promise((resolve, reject) => {
    window.OneSignalDeferred = window.OneSignalDeferred || [];
    window.OneSignalDeferred.push(async (OneSignal) => {
      try { resolve(await fn(OneSignal)); } catch (err) { reject(err); }
    });
  });
}

// Give a promise at most `ms` milliseconds, then reject (so a blocked SDK can't hang the app).
function timeout(promise, ms, label) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error(`${label} timed out`)), ms)),
  ]);
}

// ---------------------------------------------------------------------------
// initPush(role)
// ---------------------------------------------------------------------------

let oneSignal = null;       // the OneSignal object, once init() has finished
let initPromise = null;     // makes initPush safe to call more than once

export function initPush(role) {
  if (!initPromise) {
    initPromise = doInit(role).catch((err) => {
      console.warn("Push setup failed:", err);
      alert("DEBUG push setup failed: " + (err && err.message ? err.message : err));
      initPromise = null;                        // allow a retry
      return { ok: false, error: err };
    });
  }
  return initPromise;
}

async function doInit(role) {
  if (!isPushSupported()) return { ok: false, unsupported: true };

  // 1) Register OUR service worker (app shell cache + notification clicks).
  //    The explicit scope keeps it correct on a GitHub Pages subpath.
  await navigator.serviceWorker.register(SW_URL, { scope: SW_SCOPE });

  // 2) Load and initialise OneSignal. Using OneSignal's own worker file path and
  //    scope means it registers its worker inside our folder, not at the domain root.
  await timeout(loadSdk(), 15000, "OneSignal SDK load");
  await timeout(withOneSignal(async (OneSignal) => {
    await OneSignal.init({
      appId: ONESIGNAL_APP_ID,
      serviceWorkerPath: ONESIGNAL_WORKER_PATH,
      serviceWorkerParam: { scope: SW_SCOPE },
      notifyButton: { enable: false },                 // we have our own button in Settings
      allowLocalhostAsSecureOrigin: true,              // lets you test on http://localhost
      // No prompt options: permission is requested only by requestPushPermission().
    });
    oneSignal = OneSignal;

    // Whenever the subscription changes (permission granted, ID assigned, opted out),
    // copy the new state into /members/{uid}.
    OneSignal.User.PushSubscription.addEventListener("change", () => syncMember());

    // A label you can filter on later in the OneSignal dashboard.
    if (role) OneSignal.User.addTag("role", role);
  }), 20000, "OneSignal init");

  // 3) If permission was already granted in an earlier session, make sure Firestore has the current ID.
  await syncMember();
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Status, permission and syncing the player ID to Firestore
// ---------------------------------------------------------------------------

// "granted" only if the browser allows notifications AND we haven't been opted out.
export function getPushStatus() {
  if (!isPushSupported()) return "unsupported";
    if (Notification.permission === "granted") {
    // Only report "On" once OneSignal has really subscribed this device.
    if (!oneSignal) return "default";
    const sub = oneSignal.User.PushSubscription;
    return sub.optedIn && sub.id ? "granted" : "default";
    }
  return Notification.permission;          // "denied" or "default"
}

// Remember the last values we wrote, so repeated events don't cost Firestore writes.
let lastSynced = "";

// Writes { pushPlayerId, pushEnabled } to /families/{fid}/members/{uid}.
// ("Player ID" is the old OneSignal name for what v16 calls the subscription ID.)
async function syncMember() {
  if (!oneSignal) return;
  const { familyId } = getSession();
  if (!familyId) return;

  const sub = oneSignal.User.PushSubscription;
  const id = sub.id || null;
  const enabled = !!(id && sub.optedIn && Notification.permission === "granted");

  const signature = `${id}|${enabled}`;
  if (signature === lastSynced) return;
  try {
    await setMemberPush(familyId, id, enabled);
    lastSynced = signature;
  } catch (err) {
    // firebase.js has already shown a toast; we just remember to try again next time.
    console.warn("Could not save push ID:", err);
  }
}

// MUST be called from a click handler (browsers only allow the permission
// popup in response to a user tap). Returns the new status string.
export async function requestPushPermission() {
  if (!isPushSupported()) return "unsupported";
  const init = await initPush();
  if (!init.ok || !oneSignal) return getPushStatus();

  await oneSignal.Notifications.requestPermission();   // shows the browser's own prompt
  await oneSignal.User.PushSubscription.optIn();       // make sure we're opted in if permission is granted

  // The subscription ID can take a moment to appear after permission is granted.
  for (let i = 0; i < 20 && !oneSignal.User.PushSubscription.id; i++) {
    await new Promise((r) => setTimeout(r, 500));
  }
  await syncMember();
  return getPushStatus();
}

// ---------------------------------------------------------------------------
// sendPush(targetUids, title, body, data)
// ---------------------------------------------------------------------------
// targetUids: Firebase uids of the people to notify (e.g. [childUid]).
// title/body: already-translated text (call t() before passing it in).
// data:       small object delivered with the notification, e.g. { questionId }.
//
// Never throws: push is a bonus on top of the realtime listener, so a failed
// push must never break sending a question. Returns { ok, sent, error? }.
export async function sendPush(targetUids, title, body, data = {}) {
  try {
    const { familyId } = getSession();
    if (!familyId || !targetUids || targetUids.length === 0) return { ok: true, sent: 0 };

    // Look up each target's OneSignal ID in Firestore (one small read per member).
    const members = await getMembers(familyId);
    const playerIds = members
      .filter((m) => targetUids.includes(m.id) && m.pushEnabled && m.pushPlayerId)
      .map((m) => m.pushPlayerId);
    if (playerIds.length === 0) return { ok: true, sent: 0 };       // nobody has notifications on

    const payload = {
      app_id: ONESIGNAL_APP_ID,
      include_player_ids: playerIds,
      headings: { en: title },          // OneSignal wants text keyed by language code
      contents: { en: body },
      data,
      url: location.origin + BASE_PATH, // where a tap on the notification opens
    };

    // The ONE branch: same request either way, but the Worker adds the secret key itself.
    const endpoint = USE_WORKER_PROXY ? WORKER_URL : ONESIGNAL_API_URL;
    const headers = { "Content-Type": "application/json" };
    if (!USE_WORKER_PROXY) headers.Authorization = "Basic " + ONESIGNAL_REST_API_KEY;

    const res = await fetch(endpoint, { method: "POST", headers, body: JSON.stringify(payload) });
    if (!res.ok) throw new Error(`Push request failed: HTTP ${res.status} ${await res.text()}`);
    return { ok: true, sent: playerIds.length };
  } catch (err) {
    console.warn("sendPush failed:", err);
    return { ok: false, sent: 0, error: err };
  }
}
