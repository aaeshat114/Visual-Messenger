// cards-data.js
// ---------------------------------------------------------------------------
//
// CARD TEMPLATE:
//   {
//     id: "pizza",                  unique, lower case, letters/numbers/hyphens only, no spaces
//     label: "Pizza",               the name shown under the picture, also searched
//     category: "food",             one of the ids in PREMADE_CATEGORIES below
//     keywords: ["dinner", "slice"],  extra words that find this card in the search (can be [])
//     svg: `<svg ...>...</svg>`,    the SVG code, pasted between the two backtick characters
//   },
//
// RULES FOR THE SVG:
//   - Paste the whole code, from <svg to </svg>. Most icon sites have a "copy SVG" button.
//   - It needs a viewBox (icon sites include one). Without it the picture will not scale.
//   - Do not leave a backtick (`) or the two characters ${ inside it. Icon files almost never have them.
//   - Keep it small. Under 10 KB is ideal. A free tool like svgomg.net shrinks big files.
//   - Check each icon site's licence and attribution rules.
//
// Keep a comma after every card (and every category), and make sure each id is used only once.
// After you change this file, raise CACHE_VERSION in sw.js, or phones keep showing the old cards.
// ---------------------------------------------------------------------------

// The categories shown as filter buttons in the Card Library, in this order.
// The button text comes from i18n.js ("category.<id>"); if there is no entry there,
// the id is shown with a capital letter.
export const PREMADE_CATEGORIES = [
  // "food",
  // "play",
];

export const PREMADE_CARDS = [
  
];
