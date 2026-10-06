// sw.js
// ---------------------------------------------------------------------------
// The app's service worker.
//
// Jobs:
//   1. Precache the app files on install, so the app opens instantly and offline.
//   2. Serve those files cache-first. Firestore, OneSignal and every other
//      cross-origin request are left completely alone (never cached).
//   3. Never touch OneSignal's own worker files (OneSignalSDKWorker.js etc.):
//      they are downloaded from OneSignal, live in the repo root, and must be
//      fetched fresh from the network every time. They are NOT in APP_SHELL and
//      the fetch handler skips them.
//   4. Focus or open the app when a notification is tapped.
//   5. Load OneSignal's push-handling code, because a browser allows only ONE
//      service worker per scope and OneSignal needs to receive push messages in it.
//
// !!! BUMP CACHE_VERSION ON EVERY CHANGE to any file in APP_SHELL below. !!!
// Cache-first means that without a new version, devices keep serving old copies.
// ---------------------------------------------------------------------------

const CACHE_VERSION = "v7";
const CACHE_NAME = "vm-shell-" + CACHE_VERSION;

// Paths are relative to THIS file, so they resolve correctly from any GitHub
// Pages subpath (user.github.io/repo/ or the domain root).
// OneSignal's worker files are deliberately NOT listed here.
const APP_SHELL = [
  "./",
  "index.html",
  "app.css",
  "app.js",
  "config.js",
  "i18n.js",
  "cards-builtin.js",
  "firebase.js",
  "push.js",
  "manifest.webmanifest",
  "icon.svg",
];

// Any file whose name starts with "OneSignalSDK" is OneSignal's, e.g.
// OneSignalSDKWorker.js or OneSignalSDKUpdaterWorker.js. Matching on the prefix
// means we also stay out of the way if OneSignal adds or renames one.
const ONESIGNAL_FILE = /\/OneSignalSDK[^/]*$/i;

// ---- OneSignal ----
// Gives this worker OneSignal's push handling. Wrapped in try/catch because
// importScripts throws if the CDN can't be reached, and an uncaught error here
// would stop the whole worker from starting (and the app shell from caching).
try {
  importScripts("https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.sw.js");
} catch (err) {
  console.warn("[sw] Could not load the OneSignal worker script:", err);
}

// ---------------------------------------------------------------------------
// Install: download and store every app file
// ---------------------------------------------------------------------------
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      // cache: "reload" skips the browser's HTTP cache so we store the files
      // exactly as they are on the server right now (GitHub Pages caches for ~10 min).
      cache.addAll(APP_SHELL.map((url) => new Request(url, { cache: "reload" })))
    )
  );
  // Don't wait for old tabs to close: the new version takes over immediately.
  self.skipWaiting();
});

// ---------------------------------------------------------------------------
// Activate: delete caches from older versions, then take control of open pages
// ---------------------------------------------------------------------------
self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(
        names
          .filter((name) => name.startsWith("vm-shell-") && name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
      await self.clients.claim();
    })()
  );
});

// ---------------------------------------------------------------------------
// Fetch: cache-first for our own files, hands-off for everything else
// ---------------------------------------------------------------------------
self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // Only GET requests for files on OUR origin are handled. Returning without calling
  // event.respondWith() makes the browser do its normal network request, so these are
  // never cached: Firestore (firestore.googleapis.com), Firebase Auth, the Firebase and
  // OneSignal SDK scripts, OneSignal's API, Google Fonts.
  if (request.method !== "GET" || url.origin !== self.location.origin) return;

  // Also hands-off: OneSignal's worker files in our own folder. If we cached a copy,
  // OneSignal could be stuck running an outdated worker after you re-download it.
  if (ONESIGNAL_FILE.test(url.pathname)) return;

  event.respondWith(cacheFirst(request));
});

async function cacheFirst(request) {
  const cache = await caches.open(CACHE_NAME);

  // ignoreSearch: "index.html?utm=x" or "./?source=pwa" still match the cached copy.
  const cached = await cache.match(request, { ignoreSearch: true });
  if (cached) return cached;

  try {
    const response = await fetch(request);
    // Remember good responses so files we didn't list (e.g. a later-added image) work offline next time.
    if (response && response.ok && response.type === "basic") {
      cache.put(request, response.clone());
    }
    return response;
  } catch (err) {
    // Offline and not cached. For page navigations, show the app instead of the browser's error page.
    if (request.mode === "navigate") {
      const shell = await cache.match("index.html");
      if (shell) return shell;
    }
    throw err;
  }
}

// ---------------------------------------------------------------------------
// Notification tap: focus the open app window, or open a new one
// ---------------------------------------------------------------------------
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  // self.registration.scope is the app's folder URL, e.g. https://user.github.io/repo/
  const appUrl = self.registration.scope;

  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      for (const client of windows) {
        if (client.url.startsWith(appUrl) && "focus" in client) return client.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow(appUrl);
    })()
  );
});
