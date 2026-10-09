// cards-builtin.js
// ---------------------------------------------------------------------------
// The premade cards and premade images, built from YOUR list in cards-data.js.
// You normally never edit this file: add, change or remove cards in cards-data.js.
//
// A premade card has the same shape as a card you make in the app, plus a picture:
//   { id, label, emoji, imageRef, imageData, keywords, category, parent, placeholder, builtIn }
//     emoji        always "" (premade pictures are SVGs)
//     imageRef     always null (the picture is not stored in Firestore)
//     imageData    the SVG as a ready-to-use data URL: "data:image/svg+xml;base64,..."
//     parent       the id of the doorway card this card belongs to, or null.
//                  Only the "What's wrong?" check-in reads this; the normal composer ignores it.
//     placeholder  true when the card has no svg yet and shows a grey question-mark picture
//     builtIn      true
//
// When a premade card is put into a question, imageData is copied into the question
// (see toOption in app.js), so a kid's phone never needs this file to draw it.
// ---------------------------------------------------------------------------

import { t, tCard } from "./i18n.js";
import { PREMADE_CARDS, PREMADE_CATEGORIES } from "./cards-data.js";

const SVG_WARN_BYTES = 30 * 1024;      // log a warning above this size (questions carry a copy of the picture)

// The category whose cards form the two-level structure used by the "What's wrong?" check-in.
export const CHECKIN_CATEGORY = "problems";

// Shown for a card that has no svg yet: a soft grey square with a question mark.
const PLACEHOLDER_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">' +
  '<rect x="2" y="2" width="20" height="20" rx="6" fill="#E9E4F5"/>' +
  '<path d="M9.5 9.6a2.5 2.5 0 1 1 3.6 2.2c-.7.4-1.1.9-1.1 1.7" fill="none" stroke="#8B6CD6" stroke-width="1.8" stroke-linecap="round"/>' +
  '<circle cx="12" cy="17" r="1.1" fill="#8B6CD6"/></svg>';

// ---------------------------------------------------------------------------
// Turning your SVG code into a picture the browser can draw
// ---------------------------------------------------------------------------

// An SVG shown with <img> must declare its XML namespace, or the browser draws nothing.
// Icon sites usually include it; if yours doesn't, we add it here.
function ensureNamespace(svg) {
  return /<svg(?![^>]*\sxmlns=)/i.test(svg)
    ? svg.replace(/<svg/i, '<svg xmlns="http://www.w3.org/2000/svg"')
    : svg;
}

// SVG text -> "data:image/svg+xml;base64,..." (an <img> can show it directly).
// btoa() only handles plain characters, so the text is turned into bytes first.
// That keeps accents and symbols inside the SVG safe.
function svgToDataUrl(svg) {
  const bytes = new TextEncoder().encode(svg);
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return "data:image/svg+xml;base64," + btoa(binary);
}

// ---------------------------------------------------------------------------
// Building the cards (cards with a mistake are skipped, with a message in the console)
// ---------------------------------------------------------------------------

const ID_RE = /^[a-z0-9][a-z0-9-]*$/;       // lower case letters, numbers, hyphens

function buildCards() {
  const seen = new Set();
  const draft = [];                         // cards that passed the basic checks; parent links are checked next

  PREMADE_CARDS.forEach((raw, index) => {
    const where = `cards-data.js, card #${index + 1}${raw && raw.id ? ` ("${raw.id}")` : ""}`;
    const hasSvg = !!raw && typeof raw.svg === "string" && raw.svg.trim() !== "";
    let problem = null;
    if (!raw || typeof raw !== "object") problem = "it is not a card";
    else if (typeof raw.id !== "string" || !ID_RE.test(raw.id)) problem = "id must be lower case letters, numbers and hyphens, with no spaces";
    else if (seen.has(raw.id)) problem = "this id is already used by another card";
    else if (typeof raw.label !== "string" || !raw.label.trim()) problem = "it has no label";
    else if (hasSvg && !/<svg[\s>]/i.test(raw.svg)) problem = "the svg must contain the code from <svg to </svg>";
    else if (hasSvg && !/viewBox\s*=/i.test(raw.svg)) problem = "the svg has no viewBox, so it cannot be scaled";
    if (problem) {
      console.warn(`[premade cards] Skipped ${where}: ${problem}.`);
      return;
    }

    // No svg yet? Use the grey question-mark picture so the card still works.
    const svg = ensureNamespace((hasSvg ? raw.svg : PLACEHOLDER_SVG).trim());
    const bytes = new TextEncoder().encode(svg).length;
    if (hasSvg && bytes > SVG_WARN_BYTES) {
      console.warn(`[premade cards] ${where} is ${Math.round(bytes / 1024)} KB. Large pictures make questions heavy; consider shrinking it at svgomg.net.`);
    }

    seen.add(raw.id);
    draft.push({
      id: raw.id,
      label: raw.label.trim(),
      emoji: "",
      imageRef: null,
      imageData: svgToDataUrl(svg),
      placeholder: !hasSvg,
      keywords: (raw.keywords || []).map((k) => String(k).toLowerCase()),
      category: raw.category || "",
      parent: typeof raw.parent === "string" && raw.parent ? raw.parent : null,
      builtIn: true,
    });
  });

  // ---- Check the parent links (only the "What's wrong?" check-in uses them) ----
  // A card with a parent is a leaf, its parent is a doorway. Only two levels are allowed.
  // A bad link is ignored (with a message in the console), so it can never affect the normal composer.
  const byId = new Map(draft.map((c) => [c.id, c]));
  const originalParent = new Map(draft.map((c) => [c.id, c.parent]));
  for (const card of draft) {
    if (!card.parent) continue;
    const parent = byId.get(card.parent);
    let problem = null;
    if (!parent) problem = `its parent "${card.parent}" does not exist`;
    else if (parent.category !== card.category) problem = `its parent "${card.parent}" is in a different category`;
    else if (originalParent.get(parent.id)) problem = `its parent "${card.parent}" is itself a leaf (only two levels are allowed)`;
    if (problem) {
      console.warn(`[premade cards] Ignored the parent of card "${card.id}": ${problem}.`);
      card.parent = null;
    }
  }

  // Every Problems card should be a doorway (has children) or a leaf (has a parent).
  const hasChildren = new Set(draft.filter((c) => c.parent).map((c) => c.parent));
  for (const card of draft) {
    if (card.category === CHECKIN_CATEGORY && !card.parent && !hasChildren.has(card.id)) {
      console.warn(`[premade cards] Card "${card.id}" is in the Problems category but is neither a doorway nor a leaf, so the check-in will skip it.`);
    }
  }

  return Object.freeze(draft.map((c) => Object.freeze({ ...c, keywords: Object.freeze(c.keywords) })));
}

export const BUILTIN_CARDS = buildCards();

// The categories shown as filter buttons in the Card Library (in the order you listed them).
export const BUILTIN_CATEGORIES = Object.freeze([...PREMADE_CATEGORIES]);

// The display name of any category id. It uses the translation "category.<id>" from i18n.js
// when there is one; otherwise the id itself with a capital letter ("snacks" -> "Snacks").
export function categoryName(id) {
  const key = "category." + id;
  const text = t(key);
  return text !== key ? text : id.charAt(0).toUpperCase() + id.slice(1);
}

// Fast lookup by id (for example "apple").
const CARD_BY_ID = new Map(BUILTIN_CARDS.map((c) => [c.id, c]));

export function getBuiltinCard(id) {
  return CARD_BY_ID.get(id) || null;
}

// ---------------------------------------------------------------------------
// The "What's wrong?" check-in structure
// ---------------------------------------------------------------------------
// Returns the doorways of the Problems category, each with its leaves, in the order they are
// written in cards-data.js:
//   [ { card: <doorway card>, children: [ <leaf card>, ... ] }, ... ]
// A doorway is a Problems card that has at least one leaf. Nothing else in the app uses this.
export function getCheckinTree() {
  const problems = BUILTIN_CARDS.filter((c) => c.category === CHECKIN_CATEGORY);
  const childrenOf = new Map();
  for (const card of problems) {
    if (!card.parent) continue;
    if (!childrenOf.has(card.parent)) childrenOf.set(card.parent, []);
    childrenOf.get(card.parent).push(card);
  }
  return problems
    .filter((c) => !c.parent && childrenOf.has(c.id))
    .map((doorway) => ({ card: doorway, children: childrenOf.get(doorway.id) }));
}

// ---------------------------------------------------------------------------
// Searching cards
// ---------------------------------------------------------------------------

// Lowercase and strip accents so "Café" matches "cafe".
// normalize("NFD") splits "é" into "e" + an accent mark; the regex removes the mark.
function normalize(text) {
  return String(text).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
}

// Filter a list of cards by a search string and/or category.
// Works on premade cards AND the family's own cards (same shape), so the
// caller can pass [...ownCards, ...BUILTIN_CARDS].
//
//   searchCards(cards, "pizza")             -> cards whose label/keyword contains "pizza"
//   searchCards(cards, "ice cr", "food")    -> only the food category
//
// Every word the user typed must match somewhere in the label or keywords,
// so "ice cold" finds a card tagged "ice" and "cold" even if not adjacent.
export function searchCards(cards, query = "", category = "all") {
  const words = normalize(query).split(/\s+/).filter(Boolean);

  return cards.filter((c) => {
    if (category !== "all" && c.category !== category) return false;
    if (words.length === 0) return true;

    // Search the translated label, the original label and all keywords.
    const haystack = normalize(
      [tCard(c), c.label, ...(c.keywords || [])].join(" ")
    );
    return words.every((w) => haystack.includes(w));
  });
}

// ---------------------------------------------------------------------------
// Premade IMAGES (used by the image picker and the library's Images tab)
// ---------------------------------------------------------------------------
// Every premade card with a real picture also gives one premade image: its SVG, searchable by
// the card's label and keywords. Cards that still show the grey placeholder are left out,
// so the picker is not filled with identical question marks.
//
// Image shape (the same fields are used for your own images, see app.js):
//   { id, kind, dataUrl, keyword, keywords?, builtIn }
//   id = "builtin:<card id>", e.g. "builtin:apple". It can never collide with an id
//        from Firestore (those have no colon).
export const BUILTIN_IMAGES = Object.freeze(
  BUILTIN_CARDS.filter((c) => !c.placeholder).map((c) =>
    Object.freeze({
      id: "builtin:" + c.id,
      kind: "svg",
      dataUrl: c.imageData,
      keyword: c.label.toLowerCase(),
      keywords: Object.freeze([c.label.toLowerCase(), ...c.keywords]),
      builtIn: true,
    })
  )
);

// The picture (a data URL) for an id like "builtin:apple", or null if there is no such card.
// Cards of your own can point at a premade picture this way.
export function getBuiltinImageData(id) {
  const card = CARD_BY_ID.get(String(id).replace(/^builtin:/, ""));
  return card ? card.imageData : null;
}

// Filter any list of images (premade and your own together) by a search string.
// Every typed word must match the image's keyword or one of its extra keywords.
// So "dinner" finds the pizza image, and an empty search shows everything.
export function searchImages(images, query = "") {
  const words = normalize(query).split(/\s+/).filter(Boolean);
  if (words.length === 0) return images;
  return images.filter((img) => {
    const haystack = normalize([img.keyword, ...(img.keywords || [])].join(" "));
    return words.every((w) => haystack.includes(w));
  });
}
