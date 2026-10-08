// cards-builtin.js
// ---------------------------------------------------------------------------
// The premade cards and premade images, built from YOUR list in cards-data.js.
// You normally never edit this file: add, change or remove cards in cards-data.js.
//
// A premade card has the same shape as a card you make in the app, plus a picture:
//   { id, label, emoji, imageRef, imageData, keywords, category, builtIn }
//     emoji     always "" (premade pictures are SVGs now)
//     imageRef  always null (the picture is not stored in Firestore)
//     imageData the SVG as a ready-to-use data URL: "data:image/svg+xml;base64,..."
//     builtIn   true
//
// When a premade card is put into a question, imageData is copied into the question
// (see toOption in app.js), so a kid's phone never needs this file to draw it.
// ---------------------------------------------------------------------------

import { t, tCard } from "./i18n.js";
import { PREMADE_CARDS, PREMADE_CATEGORIES } from "./cards-data.js";

const SVG_WARN_BYTES = 30 * 1024;      // log a warning above this size (questions carry a copy of the picture)

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
  const cards = [];

  PREMADE_CARDS.forEach((raw, index) => {
    const where = `cards-data.js, card #${index + 1}${raw && raw.id ? ` ("${raw.id}")` : ""}`;
    let problem = null;
    if (!raw || typeof raw !== "object") problem = "it is not a card";
    else if (typeof raw.id !== "string" || !ID_RE.test(raw.id)) problem = "id must be lower case letters, numbers and hyphens, with no spaces";
    else if (seen.has(raw.id)) problem = "this id is already used by another card";
    else if (typeof raw.label !== "string" || !raw.label.trim()) problem = "it has no label";
    else if (typeof raw.svg !== "string" || !/<svg[\s>]/i.test(raw.svg)) problem = "the svg must contain the code from <svg to </svg>";
    else if (!/viewBox\s*=/i.test(raw.svg)) problem = "the svg has no viewBox, so it cannot be scaled";
    if (problem) {
      console.warn(`[premade cards] Skipped ${where}: ${problem}.`);
      return;
    }

    const svg = ensureNamespace(raw.svg.trim());
    const bytes = new TextEncoder().encode(svg).length;
    if (bytes > SVG_WARN_BYTES) {
      console.warn(`[premade cards] ${where} is ${Math.round(bytes / 1024)} KB. Large pictures make questions heavy; consider shrinking it at svgomg.net.`);
    }

    seen.add(raw.id);
    cards.push(Object.freeze({
      id: raw.id,
      label: raw.label.trim(),
      emoji: "",
      imageRef: null,
      imageData: svgToDataUrl(svg),
      keywords: Object.freeze((raw.keywords || []).map((k) => String(k).toLowerCase())),
      category: raw.category || "",
      builtIn: true,
    }));
  });

  return Object.freeze(cards);
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

// Fast lookup by id (for example "smile").
const CARD_BY_ID = new Map(BUILTIN_CARDS.map((c) => [c.id, c]));

export function getBuiltinCard(id) {
  return CARD_BY_ID.get(id) || null;
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
// Every premade card also gives one premade image: its SVG, searchable by the card's
// label and keywords. They are built from BUILTIN_CARDS above, so there is nothing to
// keep in sync. When you pick one for a card of your own, the card remembers the id.
//
// Image shape (the same fields are used for your own images, see app.js):
//   { id, kind, dataUrl, keyword, keywords?, builtIn }
//   id = "builtin:<card id>", e.g. "builtin:smile". It can never collide with an id
//        from Firestore (those have no colon).
export const BUILTIN_IMAGES = Object.freeze(
  BUILTIN_CARDS.map((c) =>
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

const IMAGE_BY_ID = new Map(BUILTIN_IMAGES.map((img) => [img.id, img]));

// The picture (a data URL) for an id like "builtin:smile", or null if there is no such card.
// Cards of your own can point at a premade picture this way.
export function getBuiltinImageData(id) {
  const image = IMAGE_BY_ID.get(id);
  return image ? image.dataUrl : null;
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
