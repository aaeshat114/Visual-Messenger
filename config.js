// config.js
// ---------------------------------------------------------------------------
// The ONLY file you edit to set up the app. Every other file imports from here.
// Nothing in this file needs a build step: it is a plain ES module.
// ---------------------------------------------------------------------------

// ---- 1. Firebase --------------------------------------------------------
// Paste the object from: Firebase console -> Project settings -> Your apps ->
// Web app -> "SDK setup and configuration" -> Config.
// These values are NOT secret. Your Firestore security rules protect the data.
export const firebaseConfig = {
  apiKey: "YOUR_FIREBASE_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com", // unused (we store images in Firestore) but the SDK expects it
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID",
};

// ---- 2. OneSignal -------------------------------------------------------
// From: OneSignal dashboard -> Your app -> Settings -> Keys & IDs.
export const ONESIGNAL_APP_ID = "YOUR_ONESIGNAL_APP_ID";

// WARNING: anything in this file is public once it is on GitHub Pages.
// If USE_WORKER_PROXY is false, this REST key ships to every browser and
// anyone who views the source can send pushes to your app's users.
// That is acceptable for a private two-device family app, but it is the reason
// the optional Cloudflare Worker (Phase 2) exists: it keeps the key server-side.
// If you switch to the Worker, set this to "" and remove the key from GitHub.
export const ONESIGNAL_REST_API_KEY = "YOUR_ONESIGNAL_REST_API_KEY";

// ---- 3. Push delivery mode ---------------------------------------------
// false = push.js POSTs straight to OneSignal using the REST key above.
// true  = push.js POSTs to WORKER_URL, and the Worker adds the key.
export const USE_WORKER_PROXY = true;

// Full URL of your deployed Cloudflare Worker (only used when the flag above is true).
export const WORKER_URL = "htpps://visual-messenger.ludmila-tauschova.workers.dev";

// Direct OneSignal endpoint (only used when USE_WORKER_PROXY is false).
export const ONESIGNAL_API_URL = "https://onesignal.com/api/v1/notifications";

// ---- 4. Subpath awareness ----------------------------------------------
// GitHub Pages project sites live at https://user.github.io/repo/, not at "/".
// So we never hard-code "/" anywhere. This works out the folder this file sits in:
//   https://user.github.io/repo/config.js  ->  "/repo/"
//   https://user.github.io/config.js       ->  "/"
// Because config.js lives in the app's root folder, this is always the app's base path.
export const BASE_PATH = new URL("./", import.meta.url).pathname;

// Service worker scope and file locations, derived from BASE_PATH.
export const SW_SCOPE = BASE_PATH;                             // e.g. "/repo/"
export const SW_URL = BASE_PATH + "sw.js";                     // our app-shell service worker
export const ONESIGNAL_WORKER_PATH = SW_URL;

// ---- 5. App behaviour ---------------------------------------------------
export const DEFAULT_LOCALE = "en";

// Pairing and IDs
export const FAMILY_ID_LENGTH = 20;        // random string; acts as the capability token
export const PAIRING_CODE_LENGTH = 6;
// Uppercase letters and digits with look-alikes removed (no 0/O, 1/I/L).
export const PAIRING_CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

// Nudging (Phase 1: runs only while the parent's app is open in the foreground)
export const NUDGE_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

// Images: downscaled in the browser before saving to Firestore
export const IMAGE_MAX_DIMENSION = 256;         // px, longest side
export const IMAGE_QUALITY = 0.8;               // WebP quality, 0 to 1
export const IMAGE_MAX_BYTES = 900 * 1024;      // reject anything larger after downscaling
                                                // (Firestore docs cap at 1 MiB, so this leaves headroom)

// Option limits for a question
export const MIN_OPTIONS = 2;
export const MAX_OPTIONS = 6;

// Listener reconnect backoff (used when a Firestore onSnapshot listener fails)
export const BACKOFF_START_MS = 1000;
export const BACKOFF_MAX_MS = 30000;

// localStorage keys (kept here so every file agrees on the names)
export const LS_FAMILY_ID = "vm.familyId";
export const LS_ROLE = "vm.role";
export const LS_INSTALL_DISMISSED = "vm.installDismissed";
export const LS_PUSH_BANNER_DISMISSED = "vm.pushBannerDismissed";

// ---- 6. Setup check -----------------------------------------------------
// Returns a list of config problems. An empty list means "ready to run".
// app.js shows a setup screen if this is non-empty, instead of crashing.
export function getConfigProblems() {
  const problems = [];
  // A value counts as a placeholder if it still contains "YOUR_" or "YOUR-".
  const isPlaceholder = (v) =>
    typeof v !== "string" || v.trim() === "" || /YOUR[_-]/i.test(v);

  for (const [key, value] of Object.entries(firebaseConfig)) {
    if (isPlaceholder(value)) problems.push(`firebaseConfig.${key}`);
  }
  if (isPlaceholder(ONESIGNAL_APP_ID)) problems.push("ONESIGNAL_APP_ID");

  if (USE_WORKER_PROXY) {
    if (isPlaceholder(WORKER_URL)) problems.push("WORKER_URL");
  } else if (isPlaceholder(ONESIGNAL_REST_API_KEY)) {
    problems.push("ONESIGNAL_REST_API_KEY");
  }
  return problems;
}
