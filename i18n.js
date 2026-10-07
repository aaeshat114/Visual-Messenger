// i18n.js
// ---------------------------------------------------------------------------
// All user-facing text lives here. Nothing else in the app contains bare strings.
//
// To add a language: fill in a locale object below (e.g. `fr`) with the same keys
// as `en`. Any key you leave out automatically falls back to English, so a
// partial translation works fine. That is the entire one-file change.
// ---------------------------------------------------------------------------

import { DEFAULT_LOCALE } from "./config.js";

export const STRINGS = {
  en: {
    // ---- App-wide ----
    "app.title": "Visual Messenger",
    "common.cancel": "Cancel",
    "common.close": "Close",
    "common.save": "Save",
    "common.delete": "Delete",
    "common.edit": "Edit",
    "common.back": "Back",
    "common.ok": "OK",
    "common.copy": "Copy",
    "common.copied": "Copied!",
    "common.loading": "Loading…",
    "common.dismiss": "Dismiss",
    "common.search": "Search",

    // ---- Setup screen (shown when config.js still has placeholders) ----
    "setup.title": "Almost there! Setup needed",
    "setup.body": "Open config.js and replace the placeholder values below with your own, then reload this page.",
    "setup.missing": "Still to fill in:",
    "setup.readme": "The README has step-by-step instructions.",

    // ---- Role select ----
    "role.title": "Who is using this device?",
    "role.parent": "I'm the Parent",
    "role.kid": "I'm the Kid",
    "role.defaultNameParent": "Parent",
    "role.defaultNameKid": "Kid",

    // ---- Pairing ----
    "pair.parent.title": "Your pairing code",
    "pair.parent.body": "Open the app on your child's device, tap \"I'm the Kid\", and type this code.",
    "pair.parent.continue": "Continue",
    "pair.parent.creating": "Setting things up…",
    "pair.kid.title": "Type the code",
    "pair.kid.body": "Ask your parent to show you the 6 letters.",
    "pair.kid.placeholder": "ABC123",
    "pair.kid.join": "Join",
    "pair.kid.joining": "Joining…",
    "pair.kid.invalid": "That code didn't work. Check the letters and try again.",
    "pair.kid.failed": "Couldn't join. Please try again.",
    "pair.codeLabel": "Pairing code",

    // ---- Parent home ----
    "parent.title": "Questions",
    "parent.newQuestion": "New Question",
    "parent.cardLibrary": "Card Library",
    "parent.settings": "Settings",
    "parent.pending": "Pending",
    "parent.answered": "Answered",
    "parent.empty": "No questions yet. Tap \"New Question\" to send one.",
    "parent.noPending": "Nothing waiting for an answer.",
    "parent.noAnswered": "No answers yet.",
    "parent.nudge": "Nudge",
    "parent.cancelQuestion": "Cancel",
    "parent.cancelConfirm": "Cancel this question? Your child will no longer see it.",
    "parent.duplicate": "Duplicate",
    "parent.nudged": "Nudged {count}×",
    "parent.chose": "Chose:",
    "parent.typed": "Typed:",
    "parent.status.pending": "Waiting",
    "parent.status.answered": "Answered",
    "parent.status.cancelled": "Cancelled",
    "parent.multiple": "Pick many",
    "parent.single": "Pick one",
    "parent.somethingElseUsed": "Something else",

    // ---- Compose ----
    "compose.title": "New Question",
    "compose.questionLabel": "Question",
    "compose.questionPlaceholder": "What do you want to do?",
    "compose.modeLabel": "How many can they pick?",
    "compose.modeSingle": "Pick one",
    "compose.modeMultiple": "Pick many",
    "compose.searchLabel": "Add answer cards",
    "compose.searchPlaceholder": "Search cards (try \"pizza\" or \"park\")",
    "compose.noResults": "No cards found.",
    "compose.selected": "Chosen cards ({count} of {max})",
    "compose.removeOption": "Remove {label}",
    "compose.createCard": "Create New Card",
    "compose.somethingElse": "Include a \"Something else\" card",
    "compose.send": "Send",
    "compose.sending": "Sending…",
    "compose.sent": "Question sent!",
    "compose.errorNeedText": "Please type a question.",
    "compose.errorNeedOptions": "Pick at least {min} cards.",
    "compose.errorTooMany": "You can pick up to {max} cards.",
    "compose.addCard": "Add {label}",
    "compose.alreadyAdded": "Already added",

    // ---- Create / edit card sheet ----
    "cardSheet.titleNew": "Create a card",
    "cardSheet.titleEdit": "Edit card",
    "cardSheet.label": "Label",
    "cardSheet.labelPlaceholder": "e.g. Swimming",
    "cardSheet.emoji": "Pick an emoji",
    "cardSheet.photo": "Photo (optional)",
    "cardSheet.photoRemove": "Remove photo",
    "cardSheet.keywords": "Keywords",
    "cardSheet.keywordsHelp": "Separate with commas. They help you find the card later.",
    "cardSheet.category": "Category",
    "cardSheet.errorLabel": "Please give the card a label.",
    "cardSheet.errorImageTooBig": "That photo is still too big after shrinking ({kb} KB). Try a simpler picture.",
    "cardSheet.errorImageRead": "Couldn't read that image. Try a different file.",
    "cardSheet.saved": "Card saved.",
    "cardSheet.deleted": "Card deleted.",

        // ---- Compose: the card maker (label + image) ----
    "compose.cardLabel": "Card name",
    "compose.cardLabelPlaceholder": "Type a name, e.g. Pizza",
    "compose.noMatchHint": "No card with that name yet. Pick an image to make your own.",
    "compose.pickImage": "Pick image",
    "compose.changeImage": "Change image",
    "compose.addToQuestion": "Add to question",
    "compose.needLabelFirst": "Type a card name first.",
    "compose.needImage": "Pick an image for this card.",

    // ---- Image picker ----
    "picker.title": "Pick an image",
    "picker.searchPlaceholder": "Search images (e.g. pizza)",
    "picker.empty": "No images match. Add a new one.",
    "picker.pick": "Use this image: {keyword}",
    "picker.addNew": "Add new image",
    "picker.newTitle": "Add a new image",
    "picker.svgFile": "SVG file",
    "picker.svgPaste": "Or paste SVG code",
    "picker.svgPastePlaceholder": "Paste the SVG code here",
    "picker.photo": "Or upload a photo",
    "picker.keywordLabel": "Keyword",
    "picker.keywordHelp": "One word that describes the picture. You will use it to find the image later.",
    "picker.preview": "Preview",
    "picker.saved": "Image saved.",
    "picker.errorNoImage": "Choose an SVG file, paste SVG code, or upload a photo.",
    "picker.errorBadSvg": "That doesn't look like a valid SVG. Check that it starts with <svg and ends with </svg>.",
    "picker.errorNoViewBox": "This SVG has no viewBox, so it can't be resized. Try another file, or copy the full SVG code.",
    "picker.errorSvgTooBig": "That SVG is {kb} KB, over the {max} KB limit. Try shrinking it at svgomg.net.",
    "picker.errorNoKeyword": "Type a keyword so you can find this image later.",
    
    // ---- Card Library ----
    "library.title": "Card Library",
    "library.searchPlaceholder": "Search by name or keyword",
    "library.allCategories": "All",
    "library.builtIn": "Built-in",
    "library.mine": "My card",
    "library.duplicateToMine": "Duplicate to my cards",
    "library.duplicated": "Added to your cards.",
    "library.deleteConfirm": "Delete this card? Questions you already sent are not affected.",
    "library.empty": "No cards match.",

    // ---- Card categories (used by the library filter) ----
    "category.food": "Food",
    "category.drinks": "Drinks",
    "category.play": "Play",
    "category.outdoors": "Outdoors",
    "category.screens": "Screens",
    "category.creative": "Creative",
    "category.home": "Home",
    "category.feelings": "Feelings",
    "category.animals": "Animals",
    "category.places": "Places",
    "category.custom": "Custom",

    // ---- Child screens ----
    "child.defaultQuestion": "What do you want to do?",
    "child.somethingElse": "Something else",
    "child.somethingElseTitle": "What would you like?",
    "child.typeHere": "Type here…",
    "child.send": "Send",
    "child.done": "Done",
    "child.pickOne": "Tap one",
    "child.pickMany": "Tap as many as you like",
    "child.waiting": "Nothing to answer right now. 🌈",
    "child.thankYou": "Thank you!",
    "child.yourAnswers": "Your answers",
    "child.noAnswers": "No answers yet.",
    "child.back": "Back",
    "child.submitFailed": "Oops, that didn't send. Try again!",
    "child.selected": "Selected",
        "child.signOutHold": "Grown-ups: hold for 2 seconds to open settings",
    "compose.sendTo": "Send to",
    "compose.everyone": "Everyone",
    "compose.errorNeedKid": "Pick at least one child to send to.",
    "parent.for": "For {name}",
    "parent.answeredBy": "Answered by {name}",
    "pair.kid.nameLabel": "Your name",
    "pair.kid.namePlaceholder": "e.g. Mia",
    
    // ---- Settings ----
    "settings.title": "Settings",
    "settings.displayName": "Display name",
    "settings.nameSaved": "Name saved.",
    "settings.notifications": "Notifications",
    "settings.notifStatus": "Status: {status}",
    "settings.notifGranted": "On",
    "settings.notifDenied": "Blocked",
    "settings.notifDefault": "Not enabled yet",
    "settings.notifUnsupported": "Not supported on this browser",
    "settings.notifEnable": "Enable notifications",
    "settings.notifDeniedBanner": "Notifications are blocked. In Android Chrome, tap the lock icon next to the address bar, choose Permissions, then allow Notifications. If you installed the app, long-press its icon, tap App info, then Notifications.",
    "settings.pairingCode": "Pairing code",
    "settings.showCode": "Show pairing code",
    "settings.hideCode": "Hide pairing code",
    "settings.signOut": "Sign out",
    "settings.signOutWarning": "Signing out unpairs this device. You will need the pairing code to connect again. Continue?",

    // ---- Connection indicator ----
    "conn.reconnecting": "Reconnecting…",
    "conn.online": "Connected",

    // ---- Install banner (parent only) ----
    "install.title": "Install this app",
    "install.body": "Add it to your home screen so notifications arrive reliably.",
    "install.button": "Install",

    // ---- Push notification text ----
    "push.newQuestion.title": "New question",
    "push.newQuestion.body": "{text}",
    "push.answer.title": "Your child answered",
    "push.answer.body": "{text}",
    "push.nudge.title": "Still waiting for your answer",
    "push.nudge.body": "{text}",

    // ---- Errors and toasts ----
    "error.generic": "Something went wrong. Please try again.",
    "error.writeFailed": "Couldn't save that. Check your connection and try again.",
    "error.signInFailed": "Couldn't sign in. Check your connection and try again.",
    "error.permissionDenied": "Permission denied. Check the Firestore rules in the README.",
    "error.pushFailed": "Couldn't send the notification.",
    "error.offline": "You appear to be offline.",
  },

  // Present as a demonstration. Empty on purpose: every lookup falls back to English.
  fr: {},
  es: {},
};

// ---------------------------------------------------------------------------
// Locale selection
// ---------------------------------------------------------------------------

// Pick the first browser-preferred language that we have a locale object for.
// navigator.languages looks like ["fr-CA", "fr", "en-US"], so we trim "fr-CA" to "fr".
function detectLocale() {
  const preferred = navigator.languages && navigator.languages.length
    ? navigator.languages
    : [navigator.language || DEFAULT_LOCALE];
  for (const tag of preferred) {
    const base = String(tag).toLowerCase().split("-")[0];
    if (STRINGS[base]) return base;
  }
  return DEFAULT_LOCALE;
}

let currentLocale = detectLocale();

export function getLocale() {
  return currentLocale;
}

// Switch language at runtime (not required by the app, but handy for testing).
// Call applyTranslations() afterwards to refresh any static HTML.
export function setLocale(locale) {
  currentLocale = STRINGS[locale] ? locale : DEFAULT_LOCALE;
  document.documentElement.lang = currentLocale;
}

// Set <html lang="..."> as soon as this module loads (screen readers and
// browser translation tools use it).
document.documentElement.lang = currentLocale;

// ---------------------------------------------------------------------------
// Lookup
// ---------------------------------------------------------------------------

// Returns a string only if the locale really has a non-empty value for the key.
function lookup(locale, key) {
  const value = STRINGS[locale] && STRINGS[locale][key];
  return typeof value === "string" && value !== "" ? value : null;
}

// t("parent.nudged", { count: 2 })  ->  "Nudged 2×"
// Fallback order: current locale -> English -> the key itself (so a missing
// string is visible in the UI rather than blank).
// {placeholders} with no matching variable are left as-is.
export function t(key, vars = {}) {
  const template = lookup(currentLocale, key) ?? lookup("en", key) ?? key;
  return template.replace(/\{(\w+)\}/g, (match, name) =>
    Object.prototype.hasOwnProperty.call(vars, name) ? String(vars[name]) : match
  );
}

// Built-in card labels live in cards-builtin.js in English, so we don't need
// 120 entries in the table above. A translator can still override any card by
// adding a "card.<id>" key, e.g.  "card.pizza": "Pizza".
export function tCard(card) {
  return lookup(currentLocale, "card." + card.id) ?? card.label;
}

// ---------------------------------------------------------------------------
// Static HTML translation
// ---------------------------------------------------------------------------
// index.html contains no visible text. Elements carry attributes instead:
//   <h1 data-i18n="role.title"></h1>
//   <input data-i18n-placeholder="compose.searchPlaceholder">
//   <button data-i18n-aria-label="common.close"></button>
// Call applyTranslations() once at startup (and again after setLocale()).
export function applyTranslations(root = document) {
  root.querySelectorAll("[data-i18n]").forEach((el) => {
    el.textContent = t(el.dataset.i18n);
  });
  root.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
    el.setAttribute("placeholder", t(el.dataset.i18nPlaceholder));
  });
  root.querySelectorAll("[data-i18n-aria-label]").forEach((el) => {
    el.setAttribute("aria-label", t(el.dataset.i18nAriaLabel));
  });
  document.title = t("app.title");
}
