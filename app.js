// app.js
// ---------------------------------------------------------------------------
// The brain of the app: screens, events, and rendering.
//
// Layout of this file:
//   1. Imports, state, small helpers
//   2. Boot, role select, pairing
//   3. Parent: home list, nudging, install banner
//   4. Parent: compose
//   5. Card sheet (create/edit card) and Card Library
//   6. Settings
//   7. Child: question, answers, confetti
//   8. Event wiring and start-up
//
// Rules this file follows:
//   - Every user-facing string goes through t().
//   - Data from Firestore is only ever put in the page with textContent / src,
//     never innerHTML, so a typed question can't inject markup.
//   - Firestore is only touched through `fb` (firebase.js), push only through `push` (push.js).
// ---------------------------------------------------------------------------

import {
  getConfigProblems,
  MIN_OPTIONS,
  MAX_OPTIONS,
  NUDGE_INTERVAL_MS,
  IMAGE_MAX_DIMENSION,
  IMAGE_QUALITY,
  IMAGE_MAX_BYTES,
  LS_INSTALL_DISMISSED,
  LS_PUSH_BANNER_DISMISSED,
} from "./config.js";
import { t, tCard, applyTranslations } from "./i18n.js";
import { BUILTIN_CARDS, BUILTIN_CATEGORIES, searchCards } from "./cards-builtin.js";

// ---------------------------------------------------------------------------
// 1. State and helpers
// ---------------------------------------------------------------------------

// Loaded with dynamic import() in boot(), AFTER the config check, so the setup
// screen still works if the Firebase SDK can't be downloaded.
let fb = null;     // firebase.js
let push = null;   // push.js

const ELSE_KEY = "__else";   // the option key used for the "Something else" card
const SCREEN_IDS = [
  "setup", "loading", "role", "pair-parent", "pair-kid",
  "parent", "compose", "library", "settings", "child", "child-text",
];

const state = {
  role: null,
  familyId: null,
  uid: null,
  family: null,                 // the family document (memberUids, pairingCode)
  cards: [],                    // the family's custom cards
  questions: [],                // parent: newest questions of every status
  childPending: [],             // child: pending questions, newest first
  childAnswered: [],            // child: answered questions, newest first
  compose: { options: [], allowMultiple: false, somethingElse: false },
  libFilter: "all",
  sheet: null,                  // state of the open card sheet
  installEvent: null,           // saved beforeinstallprompt event
  child: {
    qid: null,                  // id of the question currently drawn
    sig: null,                  // fingerprint of what is drawn (avoids needless redraws)
    current: null,              // the question object currently drawn
    selected: new Set(),        // multi-select: chosen option keys
    showThanks: false,
    answeringQid: null,
    submitting: false,
  },
};

const stops = [];               // unsubscribe functions for every live listener
let nudgeTimer = null;
let confettiRun = 0;

const $ = (id) => document.getElementById(id);

function lsGet(key) { try { return localStorage.getItem(key); } catch (_) { return null; } }
function lsSet(key, value) { try { localStorage.setItem(key, value); } catch (_) { /* ignore */ } }

// Show exactly one screen.
function showScreen(name) {
  for (const id of SCREEN_IDS) $("screen-" + id).hidden = id !== name;
  window.scrollTo(0, 0);
}

// A short message at the bottom of the screen.
function toast(message, type = "info") {
  const node = document.createElement("div");
  node.className = "toast" + (type === "error" ? " toast--error" : "");
  node.textContent = message;
  $("toast-area").appendChild(node);
  setTimeout(() => node.remove(), 4000);
}

// Clone a <template> and translate any data-i18n text inside the clone.
function cloneTemplate(id) {
  const fragment = $(id).content.cloneNode(true);
  applyTranslations(fragment);
  return fragment;
}

// Draw an emoji and/or a photo into `el`. The emoji shows straight away; if the
// card has a photo it is fetched (and cached by firebase.js) and swapped in.
function setVisual(el, { emoji, imageRef }) {
  el.replaceChildren();
  el.textContent = emoji || "⭐";
  if (!imageRef || !fb || !state.familyId) return;
  fb.getImage(state.familyId, imageRef).then((dataUrl) => {
    if (!dataUrl) return;                       // image document is gone: keep the emoji
    const img = document.createElement("img");
    img.alt = "";
    img.decoding = "async";
    img.src = dataUrl;
    el.replaceChildren(img);
  }).catch(() => { /* keep the emoji */ });
}

// Label to show for any option. The "Something else" label is translated at
// display time so each device uses its own language.
function optionLabel(option) {
  return option.key === ELSE_KEY ? t("child.somethingElse") : option.label;
}

// Label for a card (built-in cards are translatable, custom ones are used as typed).
function cardLabel(card) {
  return card.builtIn ? tCard(card) : card.label;
}

function childUids() { return fb.uidsByRole(state.family && state.family.memberUids, "child"); }
function parentUids() { return fb.uidsByRole(state.family && state.family.memberUids, "parent"); }

// "🍕 Pizza, 🎬 Movie, typed text". Used in push bodies and the child's history.
function summarize(options, selectedKeys, text) {
  const parts = (options || [])
    .filter((o) => (selectedKeys || []).includes(o.key))
    .map((o) => (o.emoji ? o.emoji + " " : "") + optionLabel(o));
  if (text) parts.push(text);
  return parts.join(", ");
}

// ---------------------------------------------------------------------------
// 2. Boot, role select, pairing
// ---------------------------------------------------------------------------

async function boot() {
  applyTranslations();
  wireEvents();

  // Setup screen instead of a crash when config.js still has placeholders.
  const problems = getConfigProblems();
  if (problems.length > 0) {
    const list = $("setup-missing");
    list.replaceChildren(...problems.map((name) => {
      const li = document.createElement("li");
      li.textContent = name;
      return li;
    }));
    showScreen("setup");
    return;
  }

  try {
    [fb, push] = await Promise.all([import("./firebase.js"), import("./push.js")]);
  } catch (err) {
    console.error("Could not load Firebase/OneSignal modules:", err);
    document.querySelector("#screen-loading .loading-text").textContent = t("error.offline");
    return;
  }

  fb.setErrorReporter((message) => toast(message, "error"));
  fb.onConnectionChange((isDown) => { $("conn-pill").hidden = !isDown; });

  try {
    state.uid = await fb.ensureSignedIn();
  } catch (err) {
    console.error("Sign-in failed:", err);
    toast(t("error.signInFailed"), "error");
  }

  // Already paired on this device? Skip straight to the right home screen.
  const { familyId, role } = fb.getSession();
  if (familyId && role && state.uid) enterHome(familyId, role);
  else showScreen("role");
}

async function startParentPairing() {
  document.body.dataset.role = "parent";
  showScreen("pair-parent");
  $("pair-parent-status").hidden = false;
  $("pair-parent-ready").hidden = true;
  try {
    state.uid = await fb.ensureSignedIn();
    const { pairingCode } = await fb.createFamily(t("role.defaultNameParent"));
    $("pair-code").textContent = pairingCode;
    $("pair-parent-status").hidden = true;
    $("pair-parent-ready").hidden = false;
  } catch (err) {
    console.error(err);
    if (!err.reported) toast(t("error.signInFailed"), "error");
    showScreen("role");
  }
}

function startKidPairing() {
  document.body.dataset.role = "child";
  $("pair-input").value = "";
  $("pair-error").hidden = true;
  showScreen("pair-kid");
  $("pair-input").focus();
}

async function joinAsKid() {
  const input = $("pair-input");
  const button = $("btn-pair-join");
  const code = input.value.trim();
  $("pair-error").hidden = true;
  if (!code) { input.focus(); return; }

  button.disabled = true;
  button.textContent = t("pair.kid.joining");
  try {
    state.uid = await fb.ensureSignedIn();
    const { familyId } = await fb.joinFamilyByCode(code, t("role.defaultNameKid"));
    enterHome(familyId, "child");
  } catch (err) {
    console.error(err);
    $("pair-error").textContent = err.code === "invalid-code" ? t("pair.kid.invalid") : t("pair.kid.failed");
    $("pair-error").hidden = false;
  } finally {
    button.disabled = false;
    button.textContent = t("pair.kid.join");
  }
}

// Called once we know this device's family and role (after pairing or at launch).
function enterHome(familyId, role) {
  state.familyId = familyId;
  state.role = role;
  state.uid = fb.getUid();
  document.body.dataset.role = role;

  // Registers the service worker and starts OneSignal. It never asks permission by itself.
  push.initPush(role).then(() => { if (role === "child") updateChildNotifButton(); });
  fb.touchLastSeen(familyId);

  stops.push(fb.subscribeFamily(familyId, (items) => {
    state.family = items[0] || null;
    if (!$("screen-settings").hidden) updateSettingsCode();
  }));

  if (role === "parent") startParent();
  else startChild();
}

// ---------------------------------------------------------------------------
// 3. Parent home
// ---------------------------------------------------------------------------

function startParent() {
  showScreen("parent");
  stops.push(fb.subscribeAllQuestions(state.familyId, (items) => {
    state.questions = items;
    renderParentHome();
  }));
  stops.push(fb.subscribeCards(state.familyId, (items) => {
    state.cards = items;
    if (!$("screen-compose").hidden) renderResults();
    if (!$("screen-library").hidden) renderLibrary();
  }));
  updateInstallBanner();

  // Phase 1 auto-nudge: only runs while this app is open.
  nudgeTimer = setInterval(autoNudge, NUDGE_INTERVAL_MS);
}

function renderParentHome() {
  const pending = state.questions.filter((q) => q.status === "pending");
  const rest = state.questions.filter((q) => q.status !== "pending");   // answered + cancelled
  fillQuestionList($("pending-list"), pending);
  fillQuestionList($("answered-list"), rest);
  $("pending-empty").hidden = pending.length > 0;
  $("answered-empty").hidden = rest.length > 0;
}

function fillQuestionList(container, list) {
  const fragment = document.createDocumentFragment();
  for (const q of list) fragment.appendChild(buildQuestionCard(q));
  container.replaceChildren(fragment);
}

function buildQuestionCard(q) {
  const card = cloneTemplate("tpl-question").firstElementChild;
  card.classList.toggle("is-answered", q.status === "answered");
  card.classList.toggle("is-cancelled", q.status === "cancelled");

  card.querySelector(".q-card__text").textContent = q.text;
  const badge = card.querySelector(".q-card__status");
  badge.textContent = t("parent.status." + q.status);
  badge.classList.toggle("is-answered", q.status === "answered");
  badge.classList.toggle("is-cancelled", q.status === "cancelled");
  card.querySelector(".q-card__mode").textContent = q.allowMultiple ? t("parent.multiple") : t("parent.single");

  // Option thumbnails; chosen ones are highlighted on answered questions.
  const answer = q.answer || { selectedKeys: [], text: null };
  const optionsList = card.querySelector(".q-card__options");
  for (const option of q.options || []) {
    const thumb = cloneTemplate("tpl-thumb").firstElementChild;
    setVisual(thumb.querySelector(".thumb__visual"), option);
    thumb.querySelector(".thumb__label").textContent = optionLabel(option);
    const chosen = (answer.selectedKeys || []).includes(option.key) || (option.key === ELSE_KEY && !!answer.text);
    thumb.classList.toggle("is-chosen", q.status === "answered" && chosen);
    optionsList.appendChild(thumb);
  }

  // What the child answered.
  if (q.status === "answered") {
    const labels = (q.options || [])
      .filter((o) => (answer.selectedKeys || []).includes(o.key))
      .map(optionLabel);
    const lines = [];
    if (labels.length) lines.push(`${t("parent.chose")} ${labels.join(", ")}`);
    if (answer.text) lines.push(`${t("parent.typed")} ${answer.text}`);
    const answerEl = card.querySelector(".q-card__answer");
    answerEl.textContent = lines.join(" · ");
    answerEl.hidden = lines.length === 0;
  }

  // "Nudged 2×" is shown on both devices because the count lives in the question doc.
  if (q.nudgeCount > 0) {
    const nudgeEl = card.querySelector(".q-card__nudges");
    nudgeEl.textContent = t("parent.nudged", { count: q.nudgeCount });
    nudgeEl.hidden = false;
  }

  const nudgeBtn = card.querySelector(".js-nudge");
  const cancelBtn = card.querySelector(".js-cancel");
  const duplicateBtn = card.querySelector(".js-duplicate");
  if (q.status === "pending") {
    nudgeBtn.hidden = false;
    cancelBtn.hidden = false;
    nudgeBtn.addEventListener("click", () => nudge(q, false));
    cancelBtn.addEventListener("click", async () => {
      if (!confirm(t("parent.cancelConfirm"))) return;
      try { await fb.cancelQuestion(state.familyId, q.id); } catch (_) { /* toast already shown */ }
    });
  } else {
    duplicateBtn.hidden = false;
    duplicateBtn.addEventListener("click", () => openCompose(q));
  }
  return card;
}

// Bump the counter in Firestore, then push the child. `auto` = true for the timer.
async function nudge(q, auto) {
  try {
    await fb.nudgeQuestion(state.familyId, q.id);
  } catch (_) {
    return;                                    // toast already shown by firebase.js
  }
  const result = await push.sendPush(
    q.targetUids,
    t("push.nudge.title"),
    t("push.nudge.body", { text: q.text }),
    { questionId: q.id, type: "nudge" }
  );
  if (!result.ok && !auto) toast(t("error.pushFailed"), "error");
}

// Runs every NUDGE_INTERVAL_MS while the parent's app is open and visible.
function autoNudge() {
  if (document.visibilityState !== "visible") return;
  const now = Date.now();
  for (const q of state.questions) {
    if (q.status !== "pending") continue;
    // Skip questions nudged (or sent) less than ~4 minutes ago, so a brand-new question isn't nudged straight away.
    const lastTouch = Math.max(q.lastNudgeAt || 0, q.createdAt || 0);
    if (now - lastTouch >= NUDGE_INTERVAL_MS * 0.8) nudge(q, true);
  }
}

// Install banner: parent device only.
function updateInstallBanner() {
  const show = state.role === "parent" && !!state.installEvent && !lsGet(LS_INSTALL_DISMISSED);
  $("install-banner").hidden = !show;
}

// ---------------------------------------------------------------------------
// 4. Compose
// ---------------------------------------------------------------------------

// `prefill` is an existing question (when duplicating), or undefined for a blank form.
function openCompose(prefill) {
  const c = state.compose;
  c.options = [];
  c.allowMultiple = false;
  c.somethingElse = false;
  let text = "";

  if (prefill) {
    text = prefill.text || "";
    c.allowMultiple = !!prefill.allowMultiple;
    for (const o of prefill.options || []) {
      if (o.key === ELSE_KEY) c.somethingElse = true;
      else c.options.push({ key: o.key, label: o.label, emoji: o.emoji || "", imageRef: o.imageRef || null });
    }
  }

  $("compose-text").value = text;
  $("compose-search").value = "";
  document.querySelector(`input[name="compose-mode"][value="${c.allowMultiple ? "multiple" : "single"}"]`).checked = true;
  $("compose-something-else").checked = c.somethingElse;
  $("compose-error").hidden = true;
  setSending(false);
  showScreen("compose");
  renderChips();
  renderResults();
}

function setSending(isSending) {
  const button = $("btn-send-question");
  button.disabled = isSending;
  button.textContent = isSending ? t("compose.sending") : t("compose.send");
}

function showComposeError(message) {
  $("compose-error").textContent = message;
  $("compose-error").hidden = false;
}

// The shape stored inside a question: a full copy of what the child needs to display.
function toOption(card) {
  return { key: card.id, label: cardLabel(card), emoji: card.emoji || "", imageRef: card.imageRef || null };
}

// Tap a result tile: add it, or remove it if it is already chosen.
function toggleOption(card) {
  const c = state.compose;
  $("compose-error").hidden = true;
  const index = c.options.findIndex((o) => o.key === card.id);
  if (index >= 0) {
    c.options.splice(index, 1);
  } else {
    if (c.options.length >= MAX_OPTIONS) { showComposeError(t("compose.errorTooMany", { max: MAX_OPTIONS })); return; }
    c.options.push(toOption(card));
  }
  renderChips();
  renderResults();
}

function renderChips() {
  const c = state.compose;
  $("compose-selected-label").textContent = t("compose.selected", { count: c.options.length, max: MAX_OPTIONS });
  const fragment = document.createDocumentFragment();
  for (const option of c.options) {
    const chip = cloneTemplate("tpl-chip").firstElementChild;
    setVisual(chip.querySelector(".chip__visual"), option);
    chip.querySelector(".chip__label").textContent = option.label;
    const remove = chip.querySelector(".chip__remove");
    remove.setAttribute("aria-label", t("compose.removeOption", { label: option.label }));
    remove.addEventListener("click", () => {
      c.options = c.options.filter((o) => o.key !== option.key);
      renderChips();
      renderResults();
    });
    fragment.appendChild(chip);
  }
  $("compose-chips").replaceChildren(fragment);
}

// Search box results: the family's own cards first, then the built-in set.
function renderResults() {
  const all = [...state.cards, ...BUILTIN_CARDS];
  const found = searchCards(all, $("compose-search").value, "all");
  const shown = found.slice(0, 60);                            // keeps the page quick; typing narrows it
  const chosenKeys = new Set(state.compose.options.map((o) => o.key));

  const fragment = document.createDocumentFragment();
  for (const card of shown) {
    const tile = cloneTemplate("tpl-tile").firstElementChild;
    setVisual(tile.querySelector(".tile__visual"), card);
    tile.querySelector(".tile__label").textContent = cardLabel(card);
    const chosen = chosenKeys.has(card.id);
    tile.classList.toggle("is-selected", chosen);
    tile.setAttribute("aria-pressed", String(chosen));
    tile.setAttribute("aria-label", chosen ? t("compose.alreadyAdded") : t("compose.addCard", { label: cardLabel(card) }));
    tile.addEventListener("click", () => toggleOption(card));
    fragment.appendChild(tile);
  }
  $("compose-results").replaceChildren(fragment);
  $("compose-no-results").hidden = shown.length > 0;
}

async function sendQuestion() {
  const c = state.compose;
  const text = $("compose-text").value.trim();
  const total = c.options.length + (c.somethingElse ? 1 : 0);
  $("compose-error").hidden = true;

  if (!text) { showComposeError(t("compose.errorNeedText")); return; }
  if (total < MIN_OPTIONS) { showComposeError(t("compose.errorNeedOptions", { min: MIN_OPTIONS })); return; }
  const targets = childUids();
  if (targets.length === 0) { showComposeError(t("pair.parent.body")); return; }   // no child has paired yet

  const options = c.options.map((o) => ({ ...o }));
  if (c.somethingElse) options.push({ key: ELSE_KEY, label: t("child.somethingElse"), emoji: "💬", imageRef: null });

  setSending(true);
  try {
    const questionId = await fb.createQuestion(state.familyId, {
      text, allowMultiple: c.allowMultiple, options, targetUids: targets,
    });
    // Push in the background: a failed push must never block or undo the send.
    push.sendPush(targets, t("push.newQuestion.title"), t("push.newQuestion.body", { text }), { questionId, type: "question" })
      .then((result) => { if (!result.ok) toast(t("error.pushFailed"), "error"); });
    toast(t("compose.sent"));
    showScreen("parent");
  } catch (_) {
    setSending(false);                         // toast already shown by firebase.js
  }
}

// ---------------------------------------------------------------------------
// 5. Card sheet (create / edit) and Card Library
// ---------------------------------------------------------------------------

// A simple emoji grid for the card sheet.
const EMOJIS = [
  "🍕","🍔","🌭","🥪","🌮","🍝","🍜","🍣","🥗","🍳","🥞","🍞",
  "🍎","🍌","🍓","🍉","🥕","🍪","🍰","🍦","🍫","🍿","🥛","🧃",
  "⚽","🏀","🎾","🏊","🚲","🛴","⛺","🏖️","🎣","🥾","🏞️","🌳",
  "🎮","📺","🎬","🎧","🎨","✏️","📚","🧩","🎲","🧸","🎹","🎸",
  "🐶","🐱","🐰","🐴","🐠","🦋","🦖","🐘","🚗","🚂","✈️","🚀",
  "🏠","🏫","🛁","🛏️","🧹","🛒","🎡","🎂","⭐","❤️","😊","🌈",
];

function dataUrlBytes(dataUrl) {
  const b64 = dataUrl.slice(dataUrl.indexOf(",") + 1);
  const padding = b64.endsWith("==") ? 2 : b64.endsWith("=") ? 1 : 0;
  return Math.floor((b64.length * 3) / 4) - padding;
}

// card = an existing custom card to edit, or null for a new one.
// onSaved(card) is called with the saved card (compose uses it to add the new card straight away).
function openCardSheet(card, onSaved) {
  state.sheet = {
    card,
    emoji: card ? card.emoji || EMOJIS[0] : EMOJIS[0],
    existingRef: card ? card.imageRef || null : null,
    newImage: null,                            // { dataUrl, w, h, bytes } after a photo is chosen
    onSaved: onSaved || null,
  };
  $("card-sheet-title").textContent = card ? t("cardSheet.titleEdit") : t("cardSheet.titleNew");
  $("card-label").value = card ? card.label : "";
  $("card-keywords").value = card ? (card.keywords || []).join(", ") : "";
  $("card-category").value = card && card.category ? card.category : "custom";
  $("card-photo").value = "";
  $("card-sheet-error").hidden = true;
  renderSheetPreview();
  $("card-sheet").showModal();
}

function sheetError(message) {
  $("card-sheet-error").textContent = message;
  $("card-sheet-error").hidden = false;
}

function renderSheetPreview() {
  const s = state.sheet;
  const preview = $("card-preview");
  if (s.newImage) {
    const img = document.createElement("img");
    img.alt = "";
    img.src = s.newImage.dataUrl;
    preview.replaceChildren(img);
  } else {
    setVisual(preview, { emoji: s.emoji, imageRef: s.existingRef });
  }
  $("btn-card-photo-remove").hidden = !(s.newImage || s.existingRef);
  for (const btn of $("emoji-grid").children) btn.classList.toggle("is-selected", btn.dataset.emoji === s.emoji);
}

// Shrink a photo to at most IMAGE_MAX_DIMENSION px and encode it as WebP.
async function downscaleImage(file) {
  let bitmap;
  if ("createImageBitmap" in window) {
    bitmap = await createImageBitmap(file);
  } else {
    bitmap = await new Promise((resolve, reject) => {          // very old browsers
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("image load failed")); };
      img.src = url;
    });
  }
  const scale = Math.min(1, IMAGE_MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));   // never enlarge
  const w = Math.max(1, Math.round(bitmap.width * scale));
  const h = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  canvas.getContext("2d").drawImage(bitmap, 0, 0, w, h);
  if (bitmap.close) bitmap.close();
  const dataUrl = canvas.toDataURL("image/webp", IMAGE_QUALITY);
  return { dataUrl, w, h, bytes: dataUrlBytes(dataUrl) };
}

async function onPhotoChosen(event) {
  const file = event.target.files && event.target.files[0];
  event.target.value = "";                     // lets the same file be picked again later
  if (!file) return;
  $("card-sheet-error").hidden = true;
  try {
    const image = await downscaleImage(file);
    if (image.bytes > IMAGE_MAX_BYTES) {
      sheetError(t("cardSheet.errorImageTooBig", { kb: Math.round(image.bytes / 1024) }));
      return;
    }
    state.sheet.newImage = image;
    renderSheetPreview();
  } catch (err) {
    console.warn("Image read failed:", err);
    sheetError(t("cardSheet.errorImageRead"));
  }
}

async function saveCardFromSheet() {
  const s = state.sheet;
  const label = $("card-label").value.trim();
  if (!label) { sheetError(t("cardSheet.errorLabel")); return; }

  const button = $("btn-card-save");
  button.disabled = true;
  $("card-sheet-error").hidden = true;
  try {
    let imageRef = s.existingRef;
    if (s.newImage) imageRef = await fb.saveImage(state.familyId, s.newImage);

    const data = {
      label,
      emoji: s.emoji,
      imageRef: imageRef || null,
      keywords: $("card-keywords").value.split(",").map((k) => k.trim().toLowerCase()).filter(Boolean),
      category: $("card-category").value || "custom",
    };
    let id;
    if (s.card) { await fb.updateCard(state.familyId, s.card.id, data); id = s.card.id; }
    else id = await fb.createCard(state.familyId, data);

    $("card-sheet").close();
    toast(t("cardSheet.saved"));
    if (s.onSaved) s.onSaved({ id, builtIn: false, ...data });
  } catch (err) {
    if (err.code === "image-too-big") sheetError(t("cardSheet.errorImageTooBig", { kb: Math.round(err.bytes / 1024) }));
    else if (!err.reported) sheetError(t("error.generic"));      // write errors were already toasted
  } finally {
    button.disabled = false;
  }
}

// ---- Card Library ----

function buildLibraryFilters() {
  const box = $("library-filters");
  const fragment = document.createDocumentFragment();
  for (const category of ["all", ...BUILTIN_CATEGORIES, "custom"]) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "filter-btn";
    button.dataset.category = category;
    button.textContent = category === "all" ? t("library.allCategories") : t("category." + category);
    button.setAttribute("aria-pressed", String(category === state.libFilter));
    button.addEventListener("click", () => {
      state.libFilter = category;
      for (const b of box.children) b.setAttribute("aria-pressed", String(b.dataset.category === category));
      renderLibrary();
    });
    fragment.appendChild(button);
  }
  box.replaceChildren(fragment);
}

function openLibrary() {
  showScreen("library");
  renderLibrary();
}

function renderLibrary() {
  const all = [...state.cards, ...BUILTIN_CARDS];
  const found = searchCards(all, $("library-search").value, state.libFilter);
  const fragment = document.createDocumentFragment();

  for (const card of found) {
    const tile = cloneTemplate("tpl-lib-card").firstElementChild;
    setVisual(tile.querySelector(".tile__visual"), card);
    tile.querySelector(".tile__label").textContent = cardLabel(card);
    tile.querySelector(".tile__badge").textContent = card.builtIn ? t("library.builtIn") : t("library.mine");

    if (card.builtIn) {
      // Built-in cards are read-only; they can be copied into the family's own cards.
      const duplicate = tile.querySelector(".js-duplicate");
      duplicate.hidden = false;
      duplicate.addEventListener("click", async () => {
        try {
          await fb.createCard(state.familyId, {
            label: cardLabel(card), emoji: card.emoji, imageRef: null,
            keywords: [...card.keywords], category: card.category,
          });
          toast(t("library.duplicated"));
        } catch (_) { /* toast already shown */ }
      });
    } else {
      const edit = tile.querySelector(".js-edit");
      const del = tile.querySelector(".js-delete");
      edit.hidden = false;
      del.hidden = false;
      edit.addEventListener("click", () => openCardSheet(card, null));
      del.addEventListener("click", async () => {
        if (!confirm(t("library.deleteConfirm"))) return;
        try {
          await fb.deleteCard(state.familyId, card.id);
          toast(t("cardSheet.deleted"));
        } catch (_) { /* toast already shown */ }
      });
    }
    fragment.appendChild(tile);
  }
  $("library-grid").replaceChildren(fragment);
  $("library-empty").hidden = found.length > 0;
}

// ---------------------------------------------------------------------------
// 6. Settings
// ---------------------------------------------------------------------------

async function openSettings() {
  showScreen("settings");
  $("settings-code").hidden = true;
  $("btn-toggle-code").textContent = t("settings.showCode");
  updateSettingsCode();
  refreshPushUi();
  try {
    const members = await fb.getMembers(state.familyId);
    const me = members.find((m) => m.id === state.uid);
    if (me) $("settings-name").value = me.displayName || "";
  } catch (err) {
    console.warn("Could not load display name:", err);
  }
}

function updateSettingsCode() {
  $("settings-code").textContent = state.family ? state.family.pairingCode || "" : "";
}

function refreshPushUi() {
  const status = push.getPushStatus();
  const labelKeys = {
    granted: "settings.notifGranted",
    denied: "settings.notifDenied",
    default: "settings.notifDefault",
    unsupported: "settings.notifUnsupported",
  };
  $("settings-notif-status").textContent = t("settings.notifStatus", { status: t(labelKeys[status]) });
  // Only "default" can be asked again; a "denied" choice must be undone in browser settings.
  $("btn-enable-push").hidden = status !== "default";
  $("push-denied-banner").hidden = !(status === "denied" && !lsGet(LS_PUSH_BANNER_DISMISSED));
}

async function signOut() {
  if (!confirm(t("settings.signOutWarning"))) return;
  stopEverything();
  try { await fb.signOutUser(); } catch (err) { console.warn("Sign-out cleanup failed:", err); }
  location.reload();                           // simplest way to reset all in-memory state
}

function stopEverything() {
  stops.forEach((stop) => stop());
  stops.length = 0;
  clearInterval(nudgeTimer);
}

// ---------------------------------------------------------------------------
// 7. Child
// ---------------------------------------------------------------------------

function startChild() {
  showScreen("child");
  setupChildNotifButton();
  stops.push(fb.subscribePendingQuestions(state.familyId, state.uid, (items) => {
    state.childPending = items;
    renderChild(false);
  }));
  stops.push(fb.subscribeAnsweredQuestions(state.familyId, state.uid, (items) => {
    state.childAnswered = items;
    renderHistory();
  }));
  renderChild(false);
}

// The child has no chrome, so this one button is added to the "waiting" view.
// Permission is requested only when it is tapped.
function setupChildNotifButton() {
  if (!push.isPushSupported() || $("btn-child-notif")) return;
  const button = document.createElement("button");
  button.type = "button";
  button.id = "btn-child-notif";
  button.className = "kid-back";
  button.style.margin = "0 0 24px";
  button.textContent = t("settings.notifEnable");
  button.addEventListener("click", async () => {
    await push.requestPushPermission();
    updateChildNotifButton();
  });
  const waiting = $("child-waiting");
  waiting.insertBefore(button, waiting.children[1] || null);   // right after the "nothing to answer" text
  updateChildNotifButton();
}

function updateChildNotifButton() {
  const button = $("btn-child-notif");
  if (button) button.hidden = push.getPushStatus() !== "default";
}

// Decide which of the three child views to show, and redraw the question if it changed.
function renderChild(force) {
  const c = state.child;
  // The newest pending question, ignoring one we have just answered (the server may not have caught up yet).
  const active = state.childPending.find((q) => !(c.showThanks && q.id === c.answeringQid)) || null;

  const show = (view) => {
    $("child-question-view").hidden = view !== "question";
    $("child-waiting").hidden = view !== "waiting";
    $("child-thanks").hidden = view !== "thanks";
  };

  if (active) {
    c.showThanks = false;
    show("question");
    const sig = JSON.stringify([active.text, active.allowMultiple, active.options]);
    if (force || c.qid !== active.id || c.sig !== sig) {
      c.qid = active.id;
      c.sig = sig;
      c.current = active;
      renderQuestion(active);
    }
  } else {
    c.qid = null;
    c.sig = null;
    c.current = null;
    show(c.showThanks ? "thanks" : "waiting");
    renderHistory();
  }
}

function renderQuestion(q) {
  const c = state.child;
  c.selected = new Set();
  $("child-question").textContent = q.text || t("child.defaultQuestion");
  $("child-hint").textContent = q.allowMultiple ? t("child.pickMany") : t("child.pickOne");
  $("btn-child-done").hidden = true;

  const fragment = document.createDocumentFragment();
  for (const option of q.options || []) {
    const card = cloneTemplate("tpl-kid-card").firstElementChild;
    setVisual(card.querySelector(".kid-card__visual"), option);
    card.querySelector(".kid-card__label").textContent = optionLabel(option);
    if (q.allowMultiple && option.key !== ELSE_KEY) card.setAttribute("aria-pressed", "false");

    card.addEventListener("click", () => {
      if (c.submitting) return;
      if (option.key === ELSE_KEY) { openChildText(); return; }
      if (!q.allowMultiple) {
        submitAnswer(q, [option.key], null);             // single choice: one tap sends it
        return;
      }
      // Multiple choice: toggle the thick border, show Done once something is picked.
      if (c.selected.has(option.key)) c.selected.delete(option.key);
      else c.selected.add(option.key);
      const isSelected = c.selected.has(option.key);
      card.classList.toggle("is-selected", isSelected);
      card.setAttribute("aria-pressed", String(isSelected));
      $("btn-child-done").hidden = c.selected.size === 0;
    });
    fragment.appendChild(card);
  }
  $("child-grid").replaceChildren(fragment);
}

function openChildText() {
  $("child-textarea").value = "";
  $("child-text-error").hidden = true;
  showScreen("child-text");
  $("child-textarea").focus();
}

function sendChildText() {
  const c = state.child;
  const text = $("child-textarea").value.trim();
  if (!text) { $("child-textarea").focus(); return; }
  // The parent may have cancelled the question while the child was typing.
  if (!c.current || !state.childPending.some((q) => q.id === c.current.id)) {
    showScreen("child");
    renderChild(true);
    return;
  }
  submitAnswer(c.current, [...c.selected], text);
}

// Shows "Thank you!" straight away (optimistic) and rolls back if the write fails.
async function submitAnswer(q, selectedKeys, text) {
  const c = state.child;
  if (c.submitting) return;
  c.submitting = true;
  c.showThanks = true;
  c.answeringQid = q.id;
  showScreen("child");
  renderChild(false);
  launchConfetti();

  try {
    await fb.answerQuestion(state.familyId, q.id, { selectedKeys, text });
    push.sendPush(
      parentUids(),
      t("push.answer.title"),
      t("push.answer.body", { text: summarize(q.options, selectedKeys, text) }),
      { questionId: q.id, type: "answer" }
    );
  } catch (err) {
    c.showThanks = false;
    c.answeringQid = null;
    if (!err.reported) toast(t("child.submitFailed"), "error");
    renderChild(true);                         // the question comes back on screen
  } finally {
    c.submitting = false;
  }
}

function renderHistory() {
  for (const list of [$("child-history"), $("child-history-idle")]) {
    const fragment = document.createDocumentFragment();
    for (const q of state.childAnswered) {
      const item = cloneTemplate("tpl-history-item").firstElementChild;
      item.querySelector(".history-item__q").textContent = q.text;
      const answer = q.answer || {};
      item.querySelector(".history-item__a").textContent = summarize(q.options, answer.selectedKeys, answer.text);
      fragment.appendChild(item);
    }
    if (state.childAnswered.length === 0) {
      const empty = document.createElement("li");
      empty.className = "history-item";
      empty.textContent = t("child.noAnswers");
      fragment.appendChild(empty);
    }
    list.replaceChildren(fragment);
  }
}

// Full-screen confetti on a canvas (~4 seconds). Skipped if the person asked for reduced motion.
function launchConfetti() {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const run = ++confettiRun;                   // a newer launch cancels an older one
  const canvas = $("confetti");
  const ctx = canvas.getContext("2d");
  const ratio = window.devicePixelRatio || 1;
  canvas.width = window.innerWidth * ratio;
  canvas.height = window.innerHeight * ratio;
  ctx.scale(ratio, ratio);                     // draw in CSS pixels
  canvas.hidden = false;

  const css = getComputedStyle(document.documentElement);
  const colors = ["--c-red", "--c-orange", "--c-yellow", "--c-green", "--c-blue", "--c-purple", "--c-pink", "--c-ink"]
    .map((name) => css.getPropertyValue(name).trim());

  const pieces = Array.from({ length: 140 }, (_, i) => ({
    x: Math.random() * window.innerWidth,
    y: -20 - Math.random() * window.innerHeight * 0.6,
    vx: (Math.random() - 0.5) * 4,
    vy: 2 + Math.random() * 4,
    size: 8 + Math.random() * 10,
    rot: Math.random() * Math.PI,
    vr: (Math.random() - 0.5) * 0.3,
    color: colors[i % colors.length],
  }));

  const start = performance.now();
  function frame(now) {
    if (run !== confettiRun) return;
    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    for (const p of pieces) {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.05;                            // gravity
      p.rot += p.vr;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
      ctx.restore();
    }
    if (now - start < 4000) {
      requestAnimationFrame(frame);
    } else {
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
      canvas.hidden = true;
    }
  }
  requestAnimationFrame(frame);
}

// ---------------------------------------------------------------------------
// 8. Event wiring and start-up
// ---------------------------------------------------------------------------

function wireEvents() {
  // ---- Role select and pairing ----
  $("btn-role-parent").addEventListener("click", startParentPairing);
  $("btn-role-kid").addEventListener("click", startKidPairing);
  $("btn-pair-copy").addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText($("pair-code").textContent);
      toast(t("common.copied"));
    } catch (_) { /* clipboard blocked: the code is selectable on screen */ }
  });
  $("btn-pair-continue").addEventListener("click", () => enterHome(fb.getSession().familyId, "parent"));
  $("btn-pair-kid-back").addEventListener("click", () => showScreen("role"));
  $("btn-pair-join").addEventListener("click", joinAsKid);
  $("pair-input").addEventListener("input", (e) => { e.target.value = e.target.value.toUpperCase(); });
  $("pair-input").addEventListener("keydown", (e) => { if (e.key === "Enter") joinAsKid(); });

  // ---- Parent home ----
  $("btn-new-question").addEventListener("click", () => openCompose());
  $("btn-open-library").addEventListener("click", openLibrary);
  $("btn-open-settings").addEventListener("click", openSettings);
  $("btn-install").addEventListener("click", async () => {
    const event = state.installEvent;
    if (!event) return;
    event.prompt();
    await event.userChoice;
    state.installEvent = null;
    updateInstallBanner();
  });
  $("btn-install-dismiss").addEventListener("click", () => {
    lsSet(LS_INSTALL_DISMISSED, "1");
    updateInstallBanner();
  });

  // ---- Compose ----
  $("btn-compose-back").addEventListener("click", () => showScreen("parent"));
  $("compose-search").addEventListener("input", renderResults);
  for (const radio of document.querySelectorAll('input[name="compose-mode"]')) {
    radio.addEventListener("change", () => { state.compose.allowMultiple = radio.value === "multiple" && radio.checked; });
  }
  $("compose-something-else").addEventListener("change", (e) => { state.compose.somethingElse = e.target.checked; });
  $("btn-create-card").addEventListener("click", () => {
    // A card created from here is added to the question straight away.
    openCardSheet(null, (card) => {
      if (state.compose.options.length < MAX_OPTIONS) state.compose.options.push(toOption(card));
      renderChips();
      renderResults();
    });
  });
  $("btn-send-question").addEventListener("click", sendQuestion);

  // ---- Library ----
  buildLibraryFilters();
  $("btn-library-back").addEventListener("click", () => showScreen("parent"));
  $("btn-library-create").addEventListener("click", () => openCardSheet(null, null));
  $("library-search").addEventListener("input", renderLibrary);

  // ---- Card sheet ----
  const emojiGrid = $("emoji-grid");
  for (const emoji of EMOJIS) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "emoji-btn";
    button.dataset.emoji = emoji;
    button.textContent = emoji;
    button.addEventListener("click", () => { state.sheet.emoji = emoji; renderSheetPreview(); });
    emojiGrid.appendChild(button);
  }
  const categorySelect = $("card-category");
  for (const category of [...BUILTIN_CATEGORIES, "custom"]) {
    const option = document.createElement("option");
    option.value = category;
    option.textContent = t("category." + category);
    categorySelect.appendChild(option);
  }
  $("card-photo").addEventListener("change", onPhotoChosen);
  $("btn-card-photo-remove").addEventListener("click", () => {
    state.sheet.newImage = null;
    state.sheet.existingRef = null;
    renderSheetPreview();
  });
  $("btn-card-cancel").addEventListener("click", () => $("card-sheet").close());
  $("btn-card-save").addEventListener("click", saveCardFromSheet);

  // ---- Settings ----
  $("btn-settings-back").addEventListener("click", () => showScreen("parent"));
  $("btn-save-name").addEventListener("click", async () => {
    try {
      await fb.updateDisplayName(state.familyId, $("settings-name").value.trim());
      toast(t("settings.nameSaved"));
    } catch (_) { /* toast already shown */ }
  });
  $("btn-enable-push").addEventListener("click", async () => {   // the ONLY place the parent is asked for permission
    await push.requestPushPermission();
    refreshPushUi();
  });
  $("btn-push-banner-dismiss").addEventListener("click", () => {
    lsSet(LS_PUSH_BANNER_DISMISSED, "1");
    refreshPushUi();
  });
  $("btn-toggle-code").addEventListener("click", () => {
    const code = $("settings-code");
    code.hidden = !code.hidden;
    $("btn-toggle-code").textContent = code.hidden ? t("settings.showCode") : t("settings.hideCode");
  });
  $("btn-sign-out").addEventListener("click", signOut);

  // ---- Child ----
  $("btn-child-done").addEventListener("click", () => {
    const c = state.child;
    if (c.current && c.selected.size > 0) submitAnswer(c.current, [...c.selected], null);
  });
  $("btn-child-text-back").addEventListener("click", () => showScreen("child"));
  $("btn-child-text-send").addEventListener("click", sendChildText);

  // ---- Browser events ----
  // Chrome fires this when the app is installable. We keep it for the parent's banner.
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    state.installEvent = event;
    updateInstallBanner();
  });
  window.addEventListener("appinstalled", () => {
    state.installEvent = null;
    updateInstallBanner();
  });
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible" && fb && state.familyId) fb.touchLastSeen(state.familyId);
  });
}

boot().catch((err) => {
  console.error("Start-up failed:", err);
  toast(t("error.generic"), "error");
});
