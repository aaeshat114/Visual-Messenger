// firebase.js
// ---------------------------------------------------------------------------
// The ONLY file that talks to Firebase. app.js and push.js call the functions
// exported here and never import the Firebase SDK themselves.
//
// Uses the Firebase JS SDK v11 modular API, loaded straight from Google's CDN.
//
// Conventions:
//  - Reads return plain JS objects ({ id, ...fields }) with timestamps already
//    converted to milliseconds (numbers), so the UI can just do new Date(ms).
//  - Every WRITE is wrapped by write(): if it fails, the registered error
//    reporter (app.js shows a toast) is called ONCE, then the error is re-thrown
//    with err.reported = true so callers can stop what they were doing without
//    showing a second message.
//  - Realtime listeners (subscribe...) return an unsubscribe function and
//    retry by themselves with exponential backoff.
// ---------------------------------------------------------------------------

import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.0/firebase-app.js";
import {
  getAuth,
  signInAnonymously,
  signOut,
} from "https://www.gstatic.com/firebasejs/11.0.0/firebase-auth.js";
import {
  initializeFirestore,
  getFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  doc,
  collection,
  query,
  where,
  orderBy,
  limit,
  getDoc,
  getDocFromCache,
  getDocs,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  serverTimestamp,
  increment,
  deleteField,
} from "https://www.gstatic.com/firebasejs/11.0.0/firebase-firestore.js";

import {
  firebaseConfig,
  getConfigProblems,
  FAMILY_ID_LENGTH,
  PAIRING_CODE_LENGTH,
  PAIRING_CODE_ALPHABET,
  IMAGE_MAX_BYTES,
  IMAGE_SVG_MAX_BYTES,
  BACKOFF_START_MS,
  BACKOFF_MAX_MS,
  LS_FAMILY_ID,
  LS_ROLE,
} from "./config.js";
import { t } from "./i18n.js";

// ---------------------------------------------------------------------------
// 1. Initialisation and sign-in
// ---------------------------------------------------------------------------

let app = null;
let auth = null;
let db = null;

// Safe to call many times; only the first call does any work.
export function initFirebase() {
  if (db) return;
  // Safety net: app.js shows the setup screen before it ever gets here.
  if (getConfigProblems().length > 0) {
    throw codedError("config-missing", "config.js still has placeholder values");
  }
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  try {
    // Persistent cache = data is kept on the device (IndexedDB). The app opens
    // instantly with the last known data, and works while offline.
    db = initializeFirestore(app, {
      localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
    });
  } catch (err) {
    // Some browsers can't do persistence (e.g. private mode). Fall back to memory only.
    console.warn("Persistent cache unavailable, using memory cache:", err);
    db = getFirestore(app);
  }
}

// Make sure we have an anonymous Firebase user, and return its uid.
// The anonymous user is remembered by the browser, so the uid is stable across
// launches until the site data is cleared or the user signs out.
export async function ensureSignedIn() {
  initFirebase();
  await auth.authStateReady();                 // waits until the saved login (if any) has loaded
  if (!auth.currentUser) await signInAnonymously(auth);
  return auth.currentUser.uid;
}

export function getUid() {
  return auth && auth.currentUser ? auth.currentUser.uid : null;
}

// ---------------------------------------------------------------------------
// 2. Small helpers
// ---------------------------------------------------------------------------

function codedError(code, message = code) {
  const e = new Error(message);
  e.code = code;
  return e;
}

// Random string using the browser's cryptographic generator.
// "Rejection sampling": bytes at or above maxUnbiased are skipped so that
// no character is slightly more likely than another.
function randomString(length, alphabet) {
  const out = [];
  const maxUnbiased = 256 - (256 % alphabet.length);
  while (out.length < length) {
    const bytes = crypto.getRandomValues(new Uint8Array(length * 2));
    for (const b of bytes) {
      if (b < maxUnbiased && out.length < length) out.push(alphabet[b % alphabet.length]);
    }
  }
  return out.join("");
}

const ID_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
const CODE_RE = new RegExp(`^[${PAIRING_CODE_ALPHABET}]{${PAIRING_CODE_LENGTH}}$`);

// Firestore snapshot -> plain object. { serverTimestamps: "estimate" } means a
// just-written document shows the local clock time instead of null while it
// waits for the server to stamp it.
function plain(snap) {
  const data = snap.data({ serverTimestamps: "estimate" }) || {};
  const out = { id: snap.id };
  for (const [key, value] of Object.entries(data)) {
    out[key] = value && typeof value.toMillis === "function" ? value.toMillis() : value;
  }
  return out;
}

const newestFirst = (a, b) => (b.createdAt || Date.now()) - (a.createdAt || Date.now());

// Give a promise at most `ms` milliseconds. Used where waiting forever offline is unacceptable.
function withTimeout(promise, ms) {
  return Promise.race([promise, new Promise((resolve) => setTimeout(resolve, ms))]);
}

// ---- Error reporting for writes ----
let reporter = () => {};
// app.js calls setErrorReporter((message) => showToast(message, "error")).
export function setErrorReporter(fn) {
  reporter = typeof fn === "function" ? fn : () => {};
}

function friendlyMessage(err) {
  switch (err && err.code) {
    case "permission-denied": return t("error.permissionDenied");
    case "unavailable":       return t("error.offline");
    default:                  return t("error.writeFailed");
  }
}

// Wrap every Firestore write in this. See the file header for how it behaves.
async function write(fn) {
  try {
    return await fn();
  } catch (err) {
    console.error("Firestore write failed:", err);
    try { reporter(friendlyMessage(err), err); } catch (_) { /* never let the reporter break us */ }
    if (err && typeof err === "object") err.reported = true;
    throw err;
  }
}

// ---------------------------------------------------------------------------
// 3. Session (which family / role this device belongs to), kept in localStorage
// ---------------------------------------------------------------------------

export function getSession() {
  try {
    const familyId = localStorage.getItem(LS_FAMILY_ID);
    const role = localStorage.getItem(LS_ROLE);
    if (familyId && (role === "parent" || role === "child")) return { familyId, role };
  } catch (_) { /* localStorage can be blocked */ }
  return { familyId: null, role: null };
}

export function saveSession(familyId, role) {
  try {
    localStorage.setItem(LS_FAMILY_ID, familyId);
    localStorage.setItem(LS_ROLE, role);
  } catch (_) { /* ignore */ }
}

export function clearSession() {
  try {
    localStorage.removeItem(LS_FAMILY_ID);
    localStorage.removeItem(LS_ROLE);
  } catch (_) { /* ignore */ }
}

// ---------------------------------------------------------------------------
// 4. Families and pairing
// ---------------------------------------------------------------------------
//   /families/{familyId}                 the family document
//   /pairingCodes/{CODE}  -> { familyId } a lookup table (see the note in the message)

const familyRef = (familyId) => doc(db, "families", familyId);
const memberRef = (familyId, uid) => doc(db, "families", familyId, "members", uid);

// Parent flow: create a brand new family. Returns { familyId, pairingCode }.
export async function createFamily(displayName) {
  const uid = await ensureSignedIn();
  const familyId = randomString(FAMILY_ID_LENGTH, ID_ALPHABET);

  // Find a pairing code nobody has used yet (collisions are very unlikely).
  let pairingCode = null;
  for (let attempt = 0; attempt < 5 && !pairingCode; attempt++) {
    const candidate = randomString(PAIRING_CODE_LENGTH, PAIRING_CODE_ALPHABET);
    const taken = await getDoc(doc(db, "pairingCodes", candidate));
    if (!taken.exists()) pairingCode = candidate;
  }
  if (!pairingCode) throw codedError("no-free-code");

  // These three writes are done ONE AFTER ANOTHER on purpose: the security rules
  // for the later ones look up the family document, which must already exist.
  await write(() => setDoc(familyRef(familyId), {
    createdAt: serverTimestamp(),
    pairingCode,
    pairingCodeExpiresAt: null,          // reserved: the code never expires for now
    memberUids: { [uid]: "parent" },
  }));
  await write(() => setDoc(doc(db, "pairingCodes", pairingCode), {
    familyId,
    createdAt: serverTimestamp(),
  }));
  await write(() => setDoc(memberRef(familyId, uid), {
    role: "parent",
    displayName: displayName || "",
    joinedAt: serverTimestamp(),
    pushPlayerId: null,
    pushEnabled: false,
    lastSeenAt: serverTimestamp(),
  }));

  saveSession(familyId, "parent");
  return { familyId, pairingCode };
}

// Child flow: join using the code the parent is showing.
// Throws an error with err.code === "invalid-code" if the code is wrong, so the
// pairing screen can show t("pair.kid.invalid"). Any other error = a network or
// permission problem (show t("pair.kid.failed")).
export async function joinFamilyByCode(rawCode, displayName) {
  const uid = await ensureSignedIn();
  const code = String(rawCode || "").trim().toUpperCase();
  if (!CODE_RE.test(code)) throw codedError("invalid-code");   // also keeps odd characters out of the doc path

  const codeSnap = await getDoc(doc(db, "pairingCodes", code));
  if (!codeSnap.exists()) throw codedError("invalid-code");
  const familyId = codeSnap.data().familyId;

  // 1) Add ourselves to memberUids. "memberUids.<uid>" is a dot-path that sets just
  //    that one key in the map without touching the others.
  await write(() => updateDoc(familyRef(familyId), { [`memberUids.${uid}`]: "child" }));
  // 2) Now that we are a member, we are allowed to create our own member document.
  await write(() => setDoc(memberRef(familyId, uid), {
    role: "child",
    displayName: displayName || "",
    joinedAt: serverTimestamp(),
    pushPlayerId: null,
    pushEnabled: false,
    lastSeenAt: serverTimestamp(),
  }));

  saveSession(familyId, "child");
  return { familyId };
}

// One-off read of the family document (e.g. to re-show the pairing code, or to
// work out which uids are children). Returns null if it doesn't exist.
export async function getFamily(familyId) {
  const snap = await getDoc(familyRef(familyId));
  return snap.exists() ? plain(snap) : null;
}

// Realtime version, so the parent's pairing screen can notice a child joining.
// onData receives the family object (or null).
export function subscribeFamily(familyId, onData) {
  return listen([{ build: () => familyRef(familyId) }], (items) => onData(items[0] || null));
}

// Pure helper: which uids in a memberUids map have a given role?
//   uidsByRole(family.memberUids, "child")  ->  ["abc...", "def..."]
export function uidsByRole(memberUids, role) {
  return Object.entries(memberUids || {}).filter(([, r]) => r === role).map(([uid]) => uid);
}

// Leave the family and sign out. Called from Settings after the user confirms.
// Best effort: if we're offline we still sign out (after a short wait).
export async function signOutUser() {
  const { familyId } = getSession();
  const uid = getUid();
  if (familyId && uid) {
    try {
      // Tidy up so this (soon to be abandoned) uid doesn't keep receiving questions or pushes.
      await withTimeout(deleteDoc(memberRef(familyId, uid)), 3000);
      await withTimeout(updateDoc(familyRef(familyId), { [`memberUids.${uid}`]: deleteField() }), 3000);
    } catch (err) {
      console.warn("Could not tidy up membership before sign-out:", err);
    }
  }
  clearSession();
  if (auth) await signOut(auth);
}

// ---------------------------------------------------------------------------
// 5. Members (display name, push registration, last seen)
// ---------------------------------------------------------------------------

export async function getMembers(familyId) {
  const snaps = await getDocs(collection(db, "families", familyId, "members"));
  return snaps.docs.map(plain);          // each item's id is the member's uid
}

// Live list of the family's members (used by the parent for kids' names).
// Each item's id is the member's uid.
export function subscribeMembers(familyId, onData) {
  return listen([{ build: () => collection(db, "families", familyId, "members") }], onData);
}

export async function updateDisplayName(familyId, displayName) {
  await write(() => updateDoc(memberRef(familyId, getUid()), { displayName }));
}

// Called by push.js once OneSignal gives us an ID, or when permission changes.
// setDoc with merge:true creates the document if it's missing and only changes the listed fields.
export async function setMemberPush(familyId, pushPlayerId, pushEnabled) {
  await write(() => setDoc(memberRef(familyId, getUid()), { pushPlayerId, pushEnabled }, { merge: true }));
}

// Non-critical "I'm here" stamp. Never shows an error toast.
export async function touchLastSeen(familyId) {
  try {
    await updateDoc(memberRef(familyId, getUid()), { lastSeenAt: serverTimestamp() });
  } catch (err) {
    console.warn("touchLastSeen failed:", err);
  }
}

// ---------------------------------------------------------------------------
// 6. Cards (the family's custom cards) and images
// ---------------------------------------------------------------------------

const cardsCol = (familyId) => collection(db, "families", familyId, "cards");
const imagesCol = (familyId) => collection(db, "families", familyId, "images");

// Realtime list of custom cards, newest first.
// (No orderBy in the query: Firestore silently skips documents that lack the
// ordered field, so we sort in the browser instead.)
export function subscribeCards(familyId, onData) {
  return listen([{ build: () => cardsCol(familyId), sort: (items) => items.sort(newestFirst) }], onData);
}

// card = { label, emoji, imageRef, keywords, category }. Returns the new card id.
export async function createCard(familyId, card) {
  const ref = await write(() => addDoc(cardsCol(familyId), {
    label: card.label,
    emoji: card.emoji || "",
    imageRef: card.imageRef || null,
    keywords: card.keywords || [],
    category: card.category || "custom",
    builtIn: false,
    createdBy: getUid(),
    createdAt: serverTimestamp(),
  }));
  return ref.id;
}

// Only these fields can be edited; anything else in `changes` is ignored.
export async function updateCard(familyId, cardId, changes) {
  const allowed = {};
  for (const key of ["label", "emoji", "imageRef", "keywords", "category"]) {
    if (key in changes) allowed[key] = changes[key] === undefined ? null : changes[key];
  }
  await write(() => updateDoc(doc(db, "families", familyId, "cards", cardId), allowed));
}

// Deletes the card only, NOT its image document. Questions already sent keep
// their own copy of the card's imageRef, so they must still be able to show it.
export async function deleteCard(familyId, cardId) {
  await write(() => deleteDoc(doc(db, "families", familyId, "cards", cardId)));
}

// Size in bytes of the file inside a base64 data URL.
function dataUrlBytes(dataUrl) {
  const b64 = dataUrl.slice(dataUrl.indexOf(",") + 1);
  const padding = b64.endsWith("==") ? 2 : b64.endsWith("=") ? 1 : 0;
  return Math.floor((b64.length * 3) / 4) - padding;
}

// Save an image and return its id (the "imageRef").
//   { dataUrl, w, h, kind, keyword }
//   kind    = "svg" or "photo" (anything else counts as "photo", which is what the old
//             Create New Card sheet sends)
//   keyword = one word to find the image by (stored in lower case)
// SVGs arrive here already cleaned, as a base64 data URL ("data:image/svg+xml;base64,...").
// Throws err.code "image-too-big" (with err.bytes and err.maxBytes) BEFORE touching the
// network if the file is over its limit, so app.js can show a clear message.
export async function saveImage(familyId, { dataUrl, w, h, kind, keyword }) {
  if (typeof dataUrl !== "string" || !dataUrl.startsWith("data:image/")) throw codedError("bad-image");
  const imageKind = kind === "svg" ? "svg" : "photo";
  const maxBytes = imageKind === "svg" ? IMAGE_SVG_MAX_BYTES : IMAGE_MAX_BYTES;
  const bytes = dataUrlBytes(dataUrl);
  if (bytes > maxBytes) {
    const err = codedError("image-too-big");
    err.bytes = bytes;
    err.maxBytes = maxBytes;
    throw err;
  }
  const ref = await write(() => addDoc(imagesCol(familyId), {
    kind: imageKind,
    dataUrl,
    w: w || null,                       // Firestore refuses "undefined", and SVGs have no pixel size
    h: h || null,
    bytes,
    keyword: String(keyword || "").trim().toLowerCase(),
    createdBy: getUid(),
    createdAt: serverTimestamp(),
  }));
  imageCache.set(`${familyId}/${ref.id}`, Promise.resolve(dataUrl));
  return ref.id;
}


// Live list of the family's own images (SVGs and photos), newest first. Each item looks
// like { id, kind, dataUrl, keyword, ... }. Photos saved before this change have no kind
// or keyword, and app.js treats a missing kind as "photo".
export function subscribeImages(familyId, onData) {
  return listen([{ build: () => imagesCol(familyId), sort: (items) => items.sort(newestFirst) }], onData);
}

// Change an image's keyword (the one word used to find it in the picker).
export async function updateImageKeyword(familyId, imageId, keyword) {
  await write(() => updateDoc(doc(db, "families", familyId, "images", imageId), {
    keyword: String(keyword || "").trim().toLowerCase(),
  }));
}

// Delete one image. Cards and questions that point at it are NOT changed: they keep their
// reference, and wherever the picture can no longer be found they show a plain placeholder.
export async function deleteImage(familyId, imageId) {
  await write(() => deleteDoc(doc(db, "families", familyId, "images", imageId)));
  imageCache.delete(`${familyId}/${imageId}`);     // forget our remembered copy of the picture
}

// Images are fetched on demand and remembered, so each image costs at most one
// Firestore read per device, and none once it's in the offline cache.
const imageCache = new Map();

// Resolves to the data URL string, or null if the image document is gone.
export function getImage(familyId, imageId) {
  const key = `${familyId}/${imageId}`;
  if (!imageCache.has(key)) {
    const ref = doc(db, "families", familyId, "images", imageId);
    const promise = (async () => {
      let snap;
      try {
        snap = await getDocFromCache(ref);   // free: served from the device
      } catch (_) {
        snap = await getDoc(ref);            // not cached yet: one real read
      }
      return snap.exists() ? snap.data().dataUrl : null;
    })();
    imageCache.set(key, promise);
    promise.catch(() => imageCache.delete(key));   // don't remember failures; allow a retry
  }
  return imageCache.get(key);
}

// ---------------------------------------------------------------------------
// 7. Questions
// ---------------------------------------------------------------------------

const questionsCol = (familyId) => collection(db, "families", familyId, "questions");
const questionRef = (familyId, questionId) => doc(db, "families", familyId, "questions", questionId);

const PARENT_LIST_LIMIT = 50;   // newest N questions shown on Parent Home (keeps reads low)
const HISTORY_LIMIT = 20;       // newest N answered questions in the child's "Your answers"

// Parent -> create a question. Returns the new question id.
// Option display data is COPIED into the question (denormalised), so the child
// never needs to look up the card. The one exception is the picture itself:
// imageRef is an id, and the image is fetched with getImage() (and cached).
export async function createQuestion(familyId, { text, allowMultiple, options, targetUids }) {
  const cleanOptions = options.map((o) => ({
    key: String(o.key),
    label: String(o.label),
    emoji: o.emoji || "",
    imageRef: o.imageRef || null,
    imageData: o.imageData || null,       // a premade card's picture (SVG data URL), copied into the question
  }));
  const ref = await write(() => addDoc(questionsCol(familyId), {
    text,
    allowMultiple: !!allowMultiple,
    options: cleanOptions,
    targetUids,
    status: "pending",
    createdAt: serverTimestamp(),
    createdBy: getUid(),
    answeredAt: null,
    answeredBy: null,
    answer: null,
    nudgeCount: 0,
    lastNudgeAt: null,
  }));
  return ref.id;
}

export async function cancelQuestion(familyId, questionId) {
  await write(() => updateDoc(questionRef(familyId, questionId), { status: "cancelled" }));
}

// Bumps nudgeCount by 1 (increment() is applied on the server, so two nudges
// at once still count as two) and stamps lastNudgeAt.
export async function nudgeQuestion(familyId, questionId) {
  await write(() => updateDoc(questionRef(familyId, questionId), {
    nudgeCount: increment(1),
    lastNudgeAt: serverTimestamp(),
  }));
}

// Child -> submit an answer. selectedKeys = option keys; text = the typed
// "Something else" text, or null/"" if none.
export async function answerQuestion(familyId, questionId, { selectedKeys, text }) {
  await write(() => updateDoc(questionRef(familyId, questionId), {
    status: "answered",
    answeredAt: serverTimestamp(),
    answeredBy: getUid(),
    answer: { selectedKeys, text: text ? text : null },
  }));
}

// PARENT: the newest questions of every status, newest first.
export function subscribeAllQuestions(familyId, onData) {
  return listen([{
    build: () => query(questionsCol(familyId), orderBy("createdAt", "desc"), limit(PARENT_LIST_LIMIT)),
  }], onData);
}

// CHILD: pending questions addressed to this uid, newest first (as in the spec).
// That query needs a Firestore "composite index". If it hasn't been created yet
// Firestore refuses it, and we automatically switch to the same query without
// orderBy and sort in the browser instead. The README explains the index.
export function subscribePendingQuestions(familyId, uid, onData) {
  const filters = () => [where("targetUids", "array-contains", uid), where("status", "==", "pending")];
  return listen([
    { build: () => query(questionsCol(familyId), ...filters(), orderBy("createdAt", "desc")) },
    { build: () => query(questionsCol(familyId), ...filters()), sort: (items) => items.sort(newestFirst) },
  ], onData);
}

// CHILD: this child's most recent answered questions for "Your answers".
// Same pattern: ideal query first, index-free fallback second.
export function subscribeAnsweredQuestions(familyId, uid, onData) {
  const byAnsweredDesc = (a, b) => (b.answeredAt || 0) - (a.answeredAt || 0);
  return listen([
    {
      build: () => query(questionsCol(familyId), where("answeredBy", "==", uid),
                         orderBy("answeredAt", "desc"), limit(HISTORY_LIMIT)),
    },
    {
      build: () => query(questionsCol(familyId), where("answeredBy", "==", uid)),
      sort: (items) => items.sort(byAnsweredDesc).slice(0, HISTORY_LIMIT),
    },
  ], onData);
}

// ---------------------------------------------------------------------------
// 8. Realtime listener engine (shared by every subscribe... function)
// ---------------------------------------------------------------------------

// ---- Connection indicator ----
// A listener counts as "down" if it errored, or if it has been serving only
// cached data for a few seconds (the usual sign the network is gone).
const CACHE_GRACE_MS = 4000;
const downListeners = new Set();
const connectionCallbacks = new Set();
let connectionIsDown = false;

function recomputeConnection() {
  const offline = typeof navigator !== "undefined" && navigator.onLine === false;
  const down = offline || downListeners.size > 0;
  if (down !== connectionIsDown) {
    connectionIsDown = down;
    connectionCallbacks.forEach((cb) => cb(down));
  }
}
window.addEventListener("online", recomputeConnection);
window.addEventListener("offline", recomputeConnection);

// app.js: onConnectionChange((isDown) => pill.hidden = !isDown). Returns an unsubscribe function.
export function onConnectionChange(cb) {
  connectionCallbacks.add(cb);
  return () => connectionCallbacks.delete(cb);
}

// variants: [{ build: () => Query | DocumentReference, sort?: (items) => items }, ...]
// We try variants[0]. If Firestore says "failed-precondition" (missing index),
// we move on to the next variant. Any other error: retry the same variant with
// exponential backoff (1s, 2s, 4s ... up to BACKOFF_MAX_MS, with a little jitter).
// onData(items) is called with the full, current list (an array of plain objects).
function listen(variants, onData) {
  const id = Symbol("listener");
  let active = true;
  let unsubscribe = null;
  let variantIndex = 0;
  let delay = BACKOFF_START_MS;
  let retryTimer = null;
  let downTimer = null;
  let first = true;               // always deliver the very first snapshot
  let permissionReported = false;

  function start() {
    retryTimer = null;
    if (!active) return;
    const variant = variants[variantIndex];

    unsubscribe = onSnapshot(
      variant.build(),
      // includeMetadataChanges lets us see "fromCache" flip to false when the server answers.
      { includeMetadataChanges: true },
      (snap) => {
        if (!active) return;

        // -- connection tracking --
        if (!snap.metadata.fromCache) {
          clearTimeout(downTimer);
          downTimer = null;
          delay = BACKOFF_START_MS;          // healthy again: reset the backoff
          downListeners.delete(id);
          recomputeConnection();
        } else if (!downTimer && !downListeners.has(id)) {
          downTimer = setTimeout(() => {
            downTimer = null;
            if (active) { downListeners.add(id); recomputeConnection(); }
          }, CACHE_GRACE_MS);
        }

        // -- deliver data --
        // Metadata-only snapshots (e.g. "your write was confirmed") change nothing
        // visible, so we skip them. That stops the child's cards re-rendering and
        // replaying their pop-in animation.
        const dataChanged = "docChanges" in snap ? snap.docChanges().length > 0 : true;
        if (first || dataChanged) {
          first = false;
          let items = "docs" in snap
            ? snap.docs.map(plain)
            : (snap.exists() ? [plain(snap)] : []);
          if (variant.sort) items = variant.sort(items);
          onData(items);
        }
      },
      (err) => {
        if (!active) return;
        console.warn("Listener error:", err);

        // Missing composite index: use the fallback query right away.
        if (err.code === "failed-precondition" && variantIndex < variants.length - 1) {
          console.warn("Firestore index missing, using fallback query. Details:", err.message);
          variantIndex++;
          first = true;
          start();
          return;
        }

        if (err.code === "permission-denied" && !permissionReported) {
          permissionReported = true;
          try { reporter(t("error.permissionDenied"), err); } catch (_) { /* ignore */ }
        }

        downListeners.add(id);
        recomputeConnection();
        const wait = delay * (0.8 + Math.random() * 0.4);   // +/- 20% jitter
        delay = Math.min(delay * 2, BACKOFF_MAX_MS);
        retryTimer = setTimeout(start, wait);
      }
    );
  }

  start();

  // The function we hand back: call it to stop listening.
  return function stop() {
    active = false;
    clearTimeout(retryTimer);
    clearTimeout(downTimer);
    if (unsubscribe) unsubscribe();
    downListeners.delete(id);
    recomputeConnection();
  };
                         }
