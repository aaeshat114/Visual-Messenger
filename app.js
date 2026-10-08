// app.js
// ---------------------------------------------------------------------------
// The brain of the app: screens, events, and rendering.
//
// Layout of this file:
//   1. Imports, state, small helpers
//   2. Boot, role select, pairing
//   3. Parent: home list, nudging, install banner
//   4. Parent: compose (who gets it, options, sending)
//   4b. Card maker (label + image) and the image picker
//   5. Card sheet (create/edit card), Card Library (Cards and Images tabs), image editing
//   6. Settings (parents and kids)
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
  IMAGE_SVG_MAX_BYTES,
  LS_INSTALL_DISMISSED,
  LS_PUSH_BANNER_DISMISSED,
} from "./config.js";
import { t, tCard, applyTranslations } from "./i18n.js";
import { BUILTIN_CARDS, BUILTIN_CATEGORIES, BUILTIN_IMAGES, searchCards, searchImages } from "./cards-builtin.js";

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
  members: {},                  // parent only: uid -> member document (names)
  cards: [],                    // the family's custom cards
  images: [],                   // parent only: the family's own images (SVGs and photos)
  questions: [],                // parent: newest questions of every status
  childPending: [],             // child: pending questions, newest first
  childAnswered: [],            // child: answered questions, newest first
  compose: {
    options: [],                // the cards chosen for this question
    allowMultiple: false,
    somethingElse: false,
    targets: new Set(),         // which kids get the question
    draftImage: null,           // the image picked for the card being made (or null)
  },
  picker: {
    newImage: null,             // the "add new image" form's current image
    onPick: null,               // what to do when an image is chosen (set by whoever opened the picker)
    keywordSeed: "",            // starting text for the keyword box of a new image
    newOnly: false,             // true when opened straight on the "add new image" form (from the library)
  },
  libTab: "cards",              // library tab: "cards" or "images"
  libFilter: "all",
  sheet: null,                  // state of the open card sheet
  imageEdit: null,              // the image open in the edit dialog
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

// Draw an emoji and/or a photo or SVG into `el`. An emoji shows straight away; if the
// card has an image it is fetched (and cached by firebase.js) and swapped in.
function setVisual(el, { emoji, imageRef }) {
  el.replaceChildren();
  el.textContent = emoji || (imageRef ? "" : "⭐");     // no star flash while an image loads
  if (!imageRef || !fb || !state.familyId) return;
  fb.getImage(state.familyId, imageRef).then((dataUrl) => {
    if (!dataUrl) { el.textContent = emoji || "⭐"; return; }   // image document is gone: placeholder
    const img = document.createElement("img");
    img.alt = "";
    img.decoding = "async";
    img.src = dataUrl;
    el.replaceChildren(img);
  }).catch(() => { el.textContent = emoji || "⭐"; });
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

// A kid's display name. If two kids share a name (for example both are still the
// default "Kid"), a number is added so the parent can tell them apart: "Kid 1", "Kid 2".
function memberName(uid) {
  const nameOf = (u) => (state.members[u] && state.members[u].displayName) || t("role.defaultNameKid");
  const base = nameOf(uid);
  const same = childUids().filter((u) => nameOf(u) === base);
  return same.length > 1 ? `${base} ${same.indexOf(uid) + 1}` : base;
}

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
  $("pair-name").value = "";
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
    // The name is optional; without one the kid is called "Kid".
    const name = $("pair-name").value.trim() || t("role.defaultNameKid");
    const { familyId } = await fb.joinFamilyByCode(code, name);
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

  stops.push(fb.subscribeFamily(familyId, (family) => {
    state.family = family || null;
    if (!$("screen-settings").hidden) updateSettingsCode();
    if (state.role === "parent") {            // a kid joined or left: refresh names and the "Send to" buttons
      renderParentHome();
      if (!$("screen-compose").hidden) renderRecipients();
    }
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
  // The family's own images (SVGs and photos), for the image picker and the library's Images tab.
  stops.push(fb.subscribeImages(state.familyId, (items) => {
    state.images = items;
    if ($("image-picker").open) renderPicker();
    if (!$("screen-library").hidden && state.libTab === "images") renderLibrary();
  }));
  // Kids' names, live: a rename on a kid's device shows up here.
  stops.push(fb.subscribeMembers(state.familyId, (items) => {
    state.members = Object.fromEntries(items.map((m) => [m.id, m]));
    renderParentHome();
    if (!$("screen-compose").hidden) renderRecipients();
  }));
  updateInstallBanner();
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

  // "Pick one · For Mia" while waiting, "Pick one · Answered by Mia" once answered.
  // Every question is sent to exactly one kid, so the name is unambiguous.
  const kidUid = (q.status === "answered" && q.answeredBy) || (q.targetUids || [])[0];
  const modeText = q.allowMultiple ? t("parent.multiple") : t("parent.single");
  card.querySelector(".q-card__mode").textContent = kidUid
    ? `${modeText} · ${t(q.status === "answered" ? "parent.answeredBy" : "parent.for", { name: memberName(kidUid) })}`
    : modeText;

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
  c.draftImage = null;

  // Who gets the question: everyone by default; when duplicating, the same kid(s) as before.
  const kids = childUids();
  c.targets = new Set(prefill && prefill.targetUids ? prefill.targetUids.filter((uid) => kids.includes(uid)) : kids);
  if (c.targets.size === 0) c.targets = new Set(kids);

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
  renderRecipients();
  renderChips();
  renderResults();
  renderDraft();
}

// The "Send to" buttons. Only shown when two or more kids are paired.
function renderRecipients() {
  const c = state.compose;
  const kids = childUids();
  $("compose-recipients-box").hidden = kids.length < 2;     // with one kid there is nothing to choose
  if (kids.length < 2) return;

  c.targets = new Set([...c.targets].filter((uid) => kids.includes(uid)));   // drop kids who have left

  const makeButton = (label, pressed, onClick) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "filter-btn";                        // same look as the library's filter buttons
    button.textContent = label;
    button.setAttribute("aria-pressed", String(pressed));
    button.addEventListener("click", onClick);
    return button;
  };

  const fragment = document.createDocumentFragment();
  fragment.appendChild(makeButton(t("compose.everyone"), c.targets.size === kids.length, () => {
    c.targets = new Set(kids);
    renderRecipients();
  }));
  for (const uid of kids) {
    fragment.appendChild(makeButton(memberName(uid), c.targets.has(uid), () => {
      if (c.targets.has(uid)) c.targets.delete(uid);
      else c.targets.add(uid);
      renderRecipients();
    }));
  }
  $("compose-recipients").replaceChildren(fragment);
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

// Cards matching what was typed in the card-name box: the family's own cards first, then the built-in set.
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

  const kids = childUids();
  if (kids.length === 0) { showComposeError(t("pair.parent.body")); return; }   // no child has paired yet
  // With one kid there is nothing to choose; with several, only the kids that are switched on.
  const targets = kids.length === 1 ? kids : kids.filter((uid) => c.targets.has(uid));
  if (targets.length === 0) { showComposeError(t("compose.errorNeedKid")); return; }

  const options = c.options.map((o) => ({ ...o }));
  if (c.somethingElse) options.push({ key: ELSE_KEY, label: t("child.somethingElse"), emoji: "💬", imageRef: null });

  setSending(true);
  try {
    // One copy of the question per kid. Each kid answers their own copy, which is how
    // the parent can see who answered what.
    for (const uid of targets) {
      const questionId = await fb.createQuestion(state.familyId, {
        text, allowMultiple: c.allowMultiple, options, targetUids: [uid],
      });
      // Push in the background: a failed push must never block or undo the send.
      push.sendPush([uid], t("push.newQuestion.title"), t("push.newQuestion.body", { text }), { questionId, type: "question" })
        .then((result) => { if (!result.ok) toast(t("error.pushFailed"), "error"); });
    }
    toast(t("compose.sent"));
    showScreen("parent");
  } catch (_) {
    setSending(false);                         // toast already shown by firebase.js
  }
}

// ---------------------------------------------------------------------------
// 4b. Card maker (label + image) and the image picker
// ---------------------------------------------------------------------------
// An IMAGE here is { id, kind, emoji?, dataUrl?, keyword }.
//   kind "emoji": a premade image (id looks like "builtin:pizza", the emoji is in `emoji`)
//   kind "svg" or "photo": your own image, saved in Firestore (id is the Firestore id,
//                          the picture itself is in `dataUrl`)
// A CARD is still { label, emoji, imageRef }: an emoji image fills `emoji`, an own image fills `imageRef`.

// Draw an image (emoji or picture) into an element, using data we already have.
function paintImage(el, image) {
  el.replaceChildren();
  if (image.kind === "emoji") {
    el.textContent = image.emoji;
    return;
  }
  const img = document.createElement("img");
  img.alt = "";
  img.decoding = "async";
  img.src = image.dataUrl;
  el.replaceChildren(img);
}

// The row under the card-name box: the image picked so far, and the right buttons.
function renderDraft() {
  const image = state.compose.draftImage;
  $("compose-draft").hidden = !image;
  $("btn-add-card").hidden = !image;
  $("btn-pick-image").textContent = image ? t("compose.changeImage") : t("compose.pickImage");
  if (!image) return;
  const visual = $("compose-draft-visual");
  if (visual.dataset.imageId !== String(image.id)) {         // redraw the picture only when it changed
    paintImage(visual, image);
    visual.dataset.imageId = String(image.id);
  }
  $("compose-draft-label").textContent = $("compose-search").value.trim();   // follows what is typed
}

// Does this card already use this image? Used to avoid saving duplicate cards.
function cardUsesImage(card, image) {
  return image.kind === "emoji"
    ? !card.imageRef && card.emoji === image.emoji
    : card.imageRef === image.id;
}

// "Add to question": turn the typed name + picked image into a card and add it to the question.
async function addDraftCard() {
  const c = state.compose;
  const label = $("compose-search").value.trim();
  const image = c.draftImage;
  if (!label) { showComposeError(t("compose.needLabelFirst")); return; }
  if (!image) { showComposeError(t("compose.needImage")); return; }
  if (c.options.length >= MAX_OPTIONS) { showComposeError(t("compose.errorTooMany", { max: MAX_OPTIONS })); return; }
  $("compose-error").hidden = true;

  // Re-use a card that already has this exact name and picture, instead of saving a duplicate.
  const same = [...state.cards, ...BUILTIN_CARDS].find(
    (card) => cardLabel(card).toLowerCase() === label.toLowerCase() && cardUsesImage(card, image)
  );

  if (same) {
    if (!c.options.some((o) => o.key === same.id)) c.options.push(toOption(same));
  } else {
    const button = $("btn-add-card");
    button.disabled = true;
    try {
      // Save the new card to the family's cards, so it shows up in the search next time.
      const data = {
        label,
        emoji: image.kind === "emoji" ? image.emoji : "",
        imageRef: image.kind === "emoji" ? null : image.id,
        keywords: image.keyword ? [image.keyword] : [],
        category: "custom",
      };
      const id = await fb.createCard(state.familyId, data);
      c.options.push(toOption({ id, builtIn: false, ...data }));
    } catch (_) {
      return;                                  // toast already shown by firebase.js
    } finally {
      button.disabled = false;
    }
  }

  // Ready for the next card.
  c.draftImage = null;
  $("compose-search").value = "";
  renderDraft();
  renderChips();
  renderResults();
}

// ---- The picker dialog ----
// One picker, used from three places: the compose screen, the card sheet, and the library's
// "Add new image" button. Whoever opens it passes `onPick`, which is called with the chosen image.

function openPicker(keywordSeed, onPick) {
  state.picker.onPick = onPick || null;
  state.picker.keywordSeed = keywordSeed || "";
  state.picker.newOnly = false;
  $("picker-search").value = "";
  showPickerView("list");
  renderPicker();
  $("image-picker").showModal();
}

// Compose screen: "Pick image" needs a card name first.
function openImagePicker() {
  const name = $("compose-search").value.trim();
  if (!name) {
    showComposeError(t("compose.needLabelFirst"));
    $("compose-search").focus();
    return;
  }
  $("compose-error").hidden = true;
  openPicker(name, (image) => {
    state.compose.draftImage = {
      id: image.id, kind: image.kind, emoji: image.emoji, dataUrl: image.dataUrl, keyword: image.keyword,
    };
    renderDraft();
  });
}

// The picker has two views in one dialog: the list of images, and the "add new image" form.
function showPickerView(view) {
  $("picker-list-view").hidden = view !== "list";
  $("picker-new-view").hidden = view !== "new";
  $("image-picker").querySelector(".sheet__body").scrollTop = 0;
}

// Every image the parent can pick: their own first, then the premade ones.
function allPickerImages() {
  const own = state.images
    .filter((img) => img.dataUrl)                            // skip any broken document
    .map((img) => ({
      id: img.id,
      kind: img.kind || "photo",                             // photos saved before this change have no kind
      dataUrl: img.dataUrl,
      keyword: img.keyword || "",
    }));
  return [...own, ...BUILTIN_IMAGES];
}

function renderPicker() {
  const found = searchImages(allPickerImages(), $("picker-search").value);
  const shown = found.slice(0, 150);                         // typing narrows the list
  const fragment = document.createDocumentFragment();
  for (const image of shown) {
    const tile = cloneTemplate("tpl-tile").firstElementChild;
    paintImage(tile.querySelector(".tile__visual"), image);
    tile.querySelector(".tile__label").textContent = image.keyword;
    tile.setAttribute("aria-label", t("picker.pick", { keyword: image.keyword }));
    tile.addEventListener("click", () => pickImage(image));
    fragment.appendChild(tile);
  }
  $("picker-grid").replaceChildren(fragment);
  $("picker-empty").hidden = shown.length > 0;
}

// An image was chosen (from the list, or just saved): close the picker and hand it to whoever opened it.
function pickImage(image) {
  const callback = state.picker.onPick;
  $("image-picker").close();
  if (callback) callback(image);
}

// ---- Adding a new image ----

function openNewImageView() {
  $("picker-svg-file").value = "";
  $("picker-svg-text").value = "";
  $("picker-photo").value = "";
  $("picker-error").hidden = true;
  $("picker-keyword").value = state.picker.keywordSeed.trim().toLowerCase();   // starts as the card name
  setNewImage(null);
  showPickerView("new");
}

function pickerError(message) {
  $("picker-error").textContent = message;
  $("picker-error").hidden = false;
}

// Remember the image being added and show a preview of it.
function setNewImage(image) {
  state.picker.newImage = image;
  const preview = $("picker-preview");
  if (!image) { preview.replaceChildren(); return; }
  const img = document.createElement("img");
  img.alt = "";
  img.src = image.dataUrl;
  preview.replaceChildren(img);
}

// Clean up SVG code and turn it into a data URL. Returns { dataUrl } or { error }.
// Safety: the picture is only ever shown inside an <img> tag, where scripts cannot run,
// and we also strip scripts and event handlers here as a second layer.
function prepareSvg(rawText) {
  let text = String(rawText || "").trim();
  if (!/<svg[\s>]/i.test(text)) return { error: t("picker.errorBadSvg") };

  // Make sure the XML namespace is declared, or the browser will not draw the picture.
  text = text.replace(/<svg(?![^>]*\sxmlns=)/i, '<svg xmlns="http://www.w3.org/2000/svg"');

  const doc = new DOMParser().parseFromString(text, "image/svg+xml");
  const root = doc.documentElement;
  if (!root || root.nodeName !== "svg" || doc.querySelector("parsererror")) return { error: t("picker.errorBadSvg") };

  // Remove anything that could run code.
  root.querySelectorAll("script, foreignObject").forEach((el) => el.remove());
  for (const el of [root, ...root.querySelectorAll("*")]) {
    for (const attr of [...el.attributes]) {
      const name = attr.name.toLowerCase();
      const value = attr.value.trim().toLowerCase();
      const isHandler = name.startsWith("on");                                   // onclick, onload, ...
      const isScriptLink = (name === "href" || name === "xlink:href") && value.startsWith("javascript:");
      if (isHandler || isScriptLink) el.removeAttribute(attr.name);
    }
  }

  // The picture needs a viewBox to scale. If it is missing, build one from width and height.
  if (!root.getAttribute("viewBox")) {
    const w = parseFloat(root.getAttribute("width"));
    const h = parseFloat(root.getAttribute("height"));
    if (w > 0 && h > 0) root.setAttribute("viewBox", `0 0 ${w} ${h}`);
    else return { error: t("picker.errorNoViewBox") };
  }

  const svg = new XMLSerializer().serializeToString(root);
  const bytes = new TextEncoder().encode(svg).length;
  if (bytes > IMAGE_SVG_MAX_BYTES) {
    return { error: t("picker.errorSvgTooBig", { kb: Math.round(bytes / 1024), max: Math.round(IMAGE_SVG_MAX_BYTES / 1024) }) };
  }
  // btoa only handles plain characters, so turn the text into bytes first (keeps accents and symbols safe).
  const binary = Array.from(new TextEncoder().encode(svg), (b) => String.fromCharCode(b)).join("");
  return { dataUrl: "data:image/svg+xml;base64," + btoa(binary) };
}

// Use SVG code as the new image. showErrors is false while typing or pasting, because half-typed code is not an error yet.
function applySvgText(text, showErrors) {
  const result = prepareSvg(text);
  if (result.error) {
    setNewImage(null);
    if (showErrors) pickerError(result.error);
    return;
  }
  $("picker-error").hidden = true;
  setNewImage({ kind: "svg", dataUrl: result.dataUrl, w: null, h: null });
}

async function onSvgFileChosen(event) {
  const file = event.target.files && event.target.files[0];
  event.target.value = "";
  if (!file) return;
  try {
    const text = await file.text();
    $("picker-svg-text").value = "";            // the file wins over any pasted code
    applySvgText(text, true);
  } catch (err) {
    console.warn("SVG file read failed:", err);
    pickerError(t("cardSheet.errorImageRead"));
  }
}

async function onPickerPhotoChosen(event) {
  const file = event.target.files && event.target.files[0];
  event.target.value = "";
  if (!file) return;
  $("picker-error").hidden = true;
  try {
    const image = await downscaleImage(file);
    if (image.bytes > IMAGE_MAX_BYTES) {
      pickerError(t("cardSheet.errorImageTooBig", { kb: Math.round(image.bytes / 1024) }));
      return;
    }
    $("picker-svg-text").value = "";
    setNewImage({ kind: "photo", dataUrl: image.dataUrl, w: image.w, h: image.h });
  } catch (err) {
    console.warn("Image read failed:", err);
    pickerError(t("cardSheet.errorImageRead"));
  }
}

// Save the new image to the family's images, then hand it to whoever opened the picker.
async function savePickerImage() {
  const p = state.picker;
  const keyword = $("picker-keyword").value.trim().toLowerCase();

  if (!p.newImage) {
    // Nothing usable yet: explain why (pasted code that is invalid, or nothing chosen at all).
    const pasted = $("picker-svg-text").value;
    if (pasted.trim()) pickerError(prepareSvg(pasted).error || t("picker.errorBadSvg"));
    else pickerError(t("picker.errorNoImage"));
    return;
  }
  if (!keyword) { pickerError(t("picker.errorNoKeyword")); return; }

  const button = $("btn-picker-save");
  button.disabled = true;
  $("picker-error").hidden = true;
  try {
    const id = await fb.saveImage(state.familyId, { ...p.newImage, keyword });
    toast(t("picker.saved"));
    pickImage({ id, kind: p.newImage.kind, dataUrl: p.newImage.dataUrl, keyword });
  } catch (err) {
    if (err.code === "image-too-big") {
      pickerError(p.newImage.kind === "svg"
        ? t("picker.errorSvgTooBig", { kb: Math.round(err.bytes / 1024), max: Math.round(err.maxBytes / 1024) })
        : t("cardSheet.errorImageTooBig", { kb: Math.round(err.bytes / 1024) }));
    } else if (!err.reported) {
      pickerError(t("error.generic"));          // write errors were already toasted
    }
  } finally {
    button.disabled = false;
  }
}

// ---------------------------------------------------------------------------
// 5. Card sheet (create / edit), Card Library, and image editing
// ---------------------------------------------------------------------------

function dataUrlBytes(dataUrl) {
  const b64 = dataUrl.slice(dataUrl.indexOf(",") + 1);
  const padding = b64.endsWith("==") ? 2 : b64.endsWith("=") ? 1 : 0;
  return Math.floor((b64.length * 3) / 4) - padding;
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

// ---- Card sheet: a name plus an image ----

// card = an existing custom card to edit, or null for a new one.
// onSaved(card) is called after a successful save (or null when nothing needs to happen afterwards).
function openCardSheet(card, onSaved) {
  state.sheet = {
    card,
    // What the card's picture is: { emoji, imageRef }. A new card has none until one is picked.
    visual: card ? { emoji: card.emoji || "", imageRef: card.imageRef || null } : null,
    keyword: "",                               // the keyword of a newly picked image (becomes the card's keyword)
    onSaved: onSaved || null,
  };
  $("card-sheet-title").textContent = card ? t("cardSheet.titleEdit") : t("cardSheet.titleNew");
  $("card-label").value = card ? card.label : "";
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
  if (!s.visual) { preview.replaceChildren(); return; }
  setVisual(preview, s.visual);
}

// "Pick image" in the card sheet: the same picker as the compose screen.
function pickImageForSheet() {
  openPicker($("card-label").value.trim(), (image) => {
    state.sheet.visual = image.kind === "emoji"
      ? { emoji: image.emoji, imageRef: null }
      : { emoji: "", imageRef: image.id };
    state.sheet.keyword = image.keyword || "";
    $("card-sheet-error").hidden = true;
    renderSheetPreview();
  });
}

async function saveCardFromSheet() {
  const s = state.sheet;
  const label = $("card-label").value.trim();
  if (!label) { sheetError(t("cardSheet.errorLabel")); return; }
  if (!s.visual) { sheetError(t("compose.needImage")); return; }

  const button = $("btn-card-save");
  button.disabled = true;
  $("card-sheet-error").hidden = true;
  try {
    const picture = { emoji: s.visual.emoji || "", imageRef: s.visual.imageRef || null };
    let saved;
    if (s.card) {
      // Editing changes only the name and the picture; the card keeps its keywords and category.
      await fb.updateCard(state.familyId, s.card.id, { label, ...picture });
      saved = { ...s.card, label, ...picture };
    } else {
      const data = { label, ...picture, keywords: s.keyword ? [s.keyword] : [], category: "custom" };
      const id = await fb.createCard(state.familyId, data);
      saved = { id, builtIn: false, ...data };
    }
    $("card-sheet").close();
    toast(t("cardSheet.saved"));
    if (s.onSaved) s.onSaved(saved);
  } catch (err) {
    if (!err.reported) sheetError(t("error.generic"));      // write errors were already toasted
  } finally {
    button.disabled = false;
  }
}

// ---- Card Library (Cards tab and Images tab) ----

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
  setLibraryTab(state.libTab);
}

// Switch between the Cards and Images tabs, and show only the controls that belong to each.
function setLibraryTab(tab) {
  state.libTab = tab;
  const images = tab === "images";
  $("tab-cards").setAttribute("aria-pressed", String(!images));
  $("tab-images").setAttribute("aria-pressed", String(images));
  $("library-filters").hidden = images;                      // categories only apply to cards
  $("btn-library-create").hidden = images;
  $("btn-library-add-image").hidden = !images;
  $("library-search").setAttribute("placeholder", t(images ? "library.searchImagesPlaceholder" : "library.searchPlaceholder"));
  renderLibrary();
}

function renderLibrary() {
  if (state.libTab === "images") renderLibraryImages();
  else renderLibraryCards();
}

function renderLibraryCards() {
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
  $("library-empty-images").hidden = true;
}

// The Images tab: your own images (editable) and the premade ones (read-only).
function renderLibraryImages() {
  const found = searchImages(allPickerImages(), $("library-search").value);
  const shown = found.slice(0, 300);
  const fragment = document.createDocumentFragment();

  for (const image of shown) {
    const tile = cloneTemplate("tpl-lib-card").firstElementChild;
    paintImage(tile.querySelector(".tile__visual"), image);
    tile.querySelector(".tile__label").textContent = image.keyword;
    tile.querySelector(".tile__badge").textContent = image.builtIn ? t("library.builtIn") : t("library.myImage");
    if (!image.builtIn) {
      const edit = tile.querySelector(".js-edit");
      edit.hidden = false;
      edit.addEventListener("click", () => openImageEdit(image));
    }
    fragment.appendChild(tile);
  }
  $("library-grid").replaceChildren(fragment);
  $("library-empty").hidden = true;
  $("library-empty-images").hidden = shown.length > 0;
}

// Library "Add new image": opens the picker straight on the "add new image" form.
function openAddImageFromLibrary() {
  openPicker("", null);
  state.picker.newOnly = true;                 // "Back" closes the dialog instead of showing the picture list
  openNewImageView();
}

// ---- Editing one of your own images ----

function openImageEdit(image) {
  state.imageEdit = image;
  paintImage($("image-edit-preview"), image);
  $("image-edit-keyword").value = image.keyword || "";
  $("image-edit").showModal();
}

async function saveImageEdit() {
  const image = state.imageEdit;
  if (!image) return;
  const keyword = $("image-edit-keyword").value.trim().toLowerCase();
  if (!keyword) { toast(t("picker.errorNoKeyword"), "error"); return; }

  const button = $("btn-image-edit-save");
  button.disabled = true;
  try {
    await fb.updateImageKeyword(state.familyId, image.id, keyword);
    $("image-edit").close();
    toast(t("imageEdit.saved"));
  } catch (_) {
    /* toast already shown by firebase.js */
  } finally {
    button.disabled = false;
  }
}

async function deleteImageFromEdit() {
  const image = state.imageEdit;
  if (!image) return;
  // Tell the parent how many of their cards use this picture before they confirm.
  const used = state.cards.filter((c) => c.imageRef === image.id).length;
  const message = used > 0 ? t("imageEdit.deleteConfirmUsed", { count: used }) : t("imageEdit.deleteConfirm");
  if (!confirm(message)) return;
  try {
    await fb.deleteImage(state.familyId, image.id);
    $("image-edit").close();
    toast(t("imageEdit.deleted"));
  } catch (_) { /* toast already shown */ }
}

// ---------------------------------------------------------------------------
// 6. Settings (the same screen for parents and kids)
// ---------------------------------------------------------------------------

async function openSettings() {
  showScreen("settings");
  // Kids get the same settings as parents, except the pairing code, which stays with the parent.
  const isParent = state.role === "parent";
  $("settings-code-title").hidden = !isParent;
  $("btn-toggle-code").hidden = !isParent;
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
  setupChildSettingsButton();
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

// A small gear in the corner of the child's screen. A grown-up holds it for 2 seconds
// to open the settings (name, notifications, sign out). A quick tap by a child only shows a hint.
function setupChildSettingsButton() {
  if ($("btn-child-settings")) return;
  const button = document.createElement("button");
  button.type = "button";
  button.id = "btn-child-settings";
  button.textContent = "⚙️";
  button.setAttribute("aria-label", t("child.signOutHold"));
  button.style.cssText =
    "position:fixed;top:calc(8px + env(safe-area-inset-top));right:8px;z-index:30;" +
    "width:56px;height:56px;border:0;border-radius:50%;background:rgba(255,253,249,0.5);" +
    "font-size:24px;opacity:0.45;user-select:none;-webkit-user-select:none;touch-action:manipulation;";

  let timer = null;
  let heldFired = false;                       // true once the 2-second hold has completed
  const cancel = () => { clearTimeout(timer); timer = null; };

  button.addEventListener("pointerdown", () => {
    cancel();
    timer = setTimeout(() => {
      timer = null;
      heldFired = true;
      openSettings();
    }, 2000);
  });
  for (const name of ["pointerup", "pointerleave", "pointercancel"]) button.addEventListener(name, cancel);
  button.addEventListener("click", () => {
    if (heldFired) { heldFired = false; return; }   // the click that ends a completed hold
    toast(t("child.signOutHold"));
  });
  button.addEventListener("contextmenu", (e) => e.preventDefault());   // stops Android's long-press menu

  $("screen-child").appendChild(button);
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
  // Typing in the card-name box searches the cards and keeps the card being made up to date.
  $("compose-search").addEventListener("input", () => { renderResults(); renderDraft(); });
  for (const radio of document.querySelectorAll('input[name="compose-mode"]')) {
    radio.addEventListener("change", () => { state.compose.allowMultiple = radio.value === "multiple" && radio.checked; });
  }
  $("compose-something-else").addEventListener("change", (e) => { state.compose.somethingElse = e.target.checked; });
  $("btn-pick-image").addEventListener("click", openImagePicker);
  $("btn-add-card").addEventListener("click", addDraftCard);
  $("btn-send-question").addEventListener("click", sendQuestion);

  // ---- Image picker ----
  $("picker-search").addEventListener("input", renderPicker);
  $("btn-picker-close").addEventListener("click", () => $("image-picker").close());
  $("btn-picker-new").addEventListener("click", openNewImageView);
  $("btn-picker-new-back").addEventListener("click", () => {
    if (state.picker.newOnly) $("image-picker").close();     // opened from the library: there is no list to go back to
    else showPickerView("list");
  });
  $("picker-svg-file").addEventListener("change", onSvgFileChosen);
  $("picker-svg-text").addEventListener("input", (e) => {
    if (e.target.value.trim()) applySvgText(e.target.value, false);   // an emptied box must not wipe a chosen file
  });
  $("picker-photo").addEventListener("change", onPickerPhotoChosen);
  $("btn-picker-save").addEventListener("click", savePickerImage);

  // ---- Library ----
  buildLibraryFilters();
  $("btn-library-back").addEventListener("click", () => showScreen("parent"));
  $("btn-library-create").addEventListener("click", () => openCardSheet(null, null));
  $("btn-library-add-image").addEventListener("click", openAddImageFromLibrary);
  $("tab-cards").addEventListener("click", () => { $("library-search").value = ""; setLibraryTab("cards"); });
  $("tab-images").addEventListener("click", () => { $("library-search").value = ""; setLibraryTab("images"); });
  $("library-search").addEventListener("input", renderLibrary);

  // ---- Card sheet and image editing ----
  $("btn-card-pick-image").addEventListener("click", pickImageForSheet);
  $("btn-card-cancel").addEventListener("click", () => $("card-sheet").close());
  $("btn-card-save").addEventListener("click", saveCardFromSheet);
  $("btn-image-edit-cancel").addEventListener("click", () => $("image-edit").close());
  $("btn-image-edit-save").addEventListener("click", saveImageEdit);
  $("btn-image-delete").addEventListener("click", deleteImageFromEdit);

  // ---- Settings (parents go back to their home, kids back to their screen) ----
  $("btn-settings-back").addEventListener("click", () => showScreen(state.role === "child" ? "child" : "parent"));
  $("btn-save-name").addEventListener("click", async () => {
    try {
      await fb.updateDisplayName(state.familyId, $("settings-name").value.trim());
      toast(t("settings.nameSaved"));
    } catch (_) { /* toast already shown */ }
  });
  $("btn-enable-push").addEventListener("click", async () => {   // permission is only ever requested from a button tap
    await push.requestPushPermission();
    refreshPushUi();
    updateChildNotifButton();
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
