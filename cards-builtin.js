// cards-builtin.js
// ---------------------------------------------------------------------------
// ~120 ready-made answer cards. They ship inside the app, so using them costs
// zero Firestore reads and works offline.
//
// Each card has the shape:
//   { id, label, emoji, keywords: [], category }
// plus two fields (builtIn, imageRef) so built-in and custom cards look the
// same to the rest of the app.
//
// Built-in ids are short words like "pizza". Custom cards use Firestore's
// auto-generated 20-character ids, so the two can never collide in practice.
//
// Labels are English here. To translate one, add a "card.<id>" key to a locale
// in i18n.js (e.g. "card.pizza": "Pizza"). tCard() picks it up.
// ---------------------------------------------------------------------------

import { tCard } from "./i18n.js";

// Small helper so the table below stays one card per line and easy to edit.
// Argument order: id, label, emoji, category, keywords.
const card = (id, label, emoji, category, keywords) =>
  Object.freeze({
    id,
    label,
    emoji,
    keywords: Object.freeze(keywords),
    category,
    builtIn: true,
    imageRef: null, // built-ins use an emoji, never a photo
  });

// Category ids in the order the Card Library filter should show them.
// Their display names are the "category.<id>" keys in i18n.js.
export const BUILTIN_CATEGORIES = Object.freeze([
  "food",
  "drinks",
  "play",
  "outdoors",
  "screens",
  "creative",
  "home",
  "feelings",
  "animals",
  "places",
]);

export const BUILTIN_CARDS = Object.freeze([
  // ---- Food (14) ----
  card("pizza", "Pizza", "🍕", "food", ["dinner", "cheese", "slice"]),
  card("pasta", "Pasta", "🍝", "food", ["spaghetti", "noodles", "dinner"]),
  card("sandwich", "Sandwich", "🥪", "food", ["lunch", "bread"]),
  card("soup", "Soup", "🍲", "food", ["warm", "bowl", "lunch"]),
  card("pancakes", "Pancakes", "🥞", "food", ["breakfast", "syrup", "waffles"]),
  card("cereal", "Cereal", "🥣", "food", ["breakfast", "bowl", "milk"]),
  card("apple", "Apple", "🍎", "food", ["fruit", "snack"]),
  card("banana", "Banana", "🍌", "food", ["fruit", "snack"]),
  card("grapes", "Grapes", "🍇", "food", ["fruit", "snack"]),
  card("ice-cream", "Ice cream", "🍦", "food", ["dessert", "sweet", "cold", "treat"]),
  card("cookie", "Cookie", "🍪", "food", ["biscuit", "dessert", "sweet", "treat"]),
  card("popcorn", "Popcorn", "🍿", "food", ["snack", "movie"]),
  card("fries", "Fries", "🍟", "food", ["chips", "potato", "snack"]),
  card("toast", "Toast", "🍞", "food", ["breakfast", "bread", "butter"]),

  // ---- Drinks (8) ----
  card("water", "Water", "💧", "drinks", ["thirsty", "drink", "glass"]),
  card("milk", "Milk", "🥛", "drinks", ["drink", "glass", "cow"]),
  card("juice", "Juice", "🧃", "drinks", ["drink", "box", "orange", "apple"]),
  card("hot-chocolate", "Hot chocolate", "☕", "drinks", ["cocoa", "warm", "winter"]),
  card("smoothie", "Smoothie", "🥤", "drinks", ["fruit", "shake", "cup"]),
  card("lemonade", "Lemonade", "🍋", "drinks", ["lemon", "summer", "cold"]),
  card("tea", "Tea", "🍵", "drinks", ["warm", "cup"]),
  card("bubble-tea", "Bubble tea", "🧋", "drinks", ["boba", "tapioca", "treat"]),

  // ---- Play (14) ----
  card("blocks", "Building blocks", "🧱", "play", ["lego", "build", "bricks", "toys"]),
  card("puzzle", "Puzzle", "🧩", "play", ["jigsaw", "game", "think"]),
  card("board-game", "Board game", "🎲", "play", ["dice", "game", "family"]),
  card("card-game", "Card game", "🃏", "play", ["cards", "game", "uno"]),
  card("teddy", "Teddy bear", "🧸", "play", ["stuffed", "toy", "cuddly"]),
  card("toy-cars", "Toy cars", "🏎️", "play", ["cars", "race", "vroom", "toys"]),
  card("toy-train", "Toy train", "🚂", "play", ["trains", "track", "choo choo", "toys"]),
  card("dress-up", "Dress up", "🎭", "play", ["costume", "pretend", "role play"]),
  card("hide-seek", "Hide and seek", "🙈", "play", ["hiding", "game", "find"]),
  card("dance", "Dance", "💃", "play", ["music", "party", "move"]),
  card("music", "Listen to music", "🎵", "play", ["songs", "sing", "tunes"]),
  card("kite", "Fly a kite", "🪁", "play", ["wind", "outside", "sky"]),
  card("yo-yo", "Yo-yo", "🪀", "play", ["toy", "tricks"]),
  card("magic", "Magic tricks", "🎩", "play", ["magician", "show", "tricks"]),

  // ---- Outdoors (14) ----
  card("playground", "Playground", "🛝", "outdoors", ["park", "slide", "swings"]),
  card("bike", "Ride a bike", "🚲", "outdoors", ["bicycle", "cycling", "wheels"]),
  card("scooter", "Scooter", "🛴", "outdoors", ["ride", "wheels"]),
  card("swimming", "Swimming", "🏊", "outdoors", ["pool", "water", "swim"]),
  card("soccer", "Soccer", "⚽", "outdoors", ["football", "ball", "kick", "sport"]),
  card("basketball", "Basketball", "🏀", "outdoors", ["ball", "hoops", "sport"]),
  card("hiking", "Go for a hike", "🥾", "outdoors", ["walk", "trail", "nature"]),
  card("picnic", "Picnic", "🧺", "outdoors", ["basket", "lunch", "park"]),
  card("beach", "Beach", "🏖️", "outdoors", ["sand", "sea", "ocean", "summer"]),
  card("snowman", "Snow play", "⛄", "outdoors", ["winter", "snowman", "sledding", "cold"]),
  card("gardening", "Gardening", "🌻", "outdoors", ["plants", "flowers", "dirt", "grow"]),
  card("fishing", "Fishing", "🎣", "outdoors", ["fish", "lake", "rod"]),
  card("camping", "Camping", "⛺", "outdoors", ["tent", "campfire", "night"]),
  card("skating", "Ice skating", "⛸️", "outdoors", ["ice", "rink", "winter", "skates"]),

  // ---- Screens (8) ----
  card("tv", "Watch TV", "📺", "screens", ["television", "show", "cartoons"]),
  card("movie", "Watch a movie", "🎬", "screens", ["film", "cinema", "show"]),
  card("video-game", "Video games", "🎮", "screens", ["gaming", "console", "controller"]),
  card("tablet", "Tablet time", "📱", "screens", ["ipad", "phone", "screen"]),
  card("computer", "Computer", "💻", "screens", ["laptop", "screen", "typing"]),
  card("headphones", "Headphones", "🎧", "screens", ["listen", "audio", "podcast", "music"]),
  card("video-call", "Video call", "📞", "screens", ["call", "phone", "grandma", "friends", "facetime"]),
  card("photos", "Take photos", "📷", "screens", ["camera", "pictures", "selfie"]),

  // ---- Creative (12) ----
  card("drawing", "Drawing", "✏️", "creative", ["pencil", "sketch", "art"]),
  card("painting", "Painting", "🎨", "creative", ["paint", "art", "brush", "colors"]),
  card("colouring", "Colouring", "🖍️", "creative", ["coloring", "crayons", "markers", "art"]),
  card("crafts", "Arts and crafts", "✂️", "creative", ["scissors", "glue", "make", "cut"]),
  card("clay", "Play dough", "🏺", "creative", ["clay", "playdough", "mould", "sculpt"]),
  card("reading", "Read a book", "📖", "creative", ["story", "book", "quiet"]),
  card("origami", "Paper folding", "🦢", "creative", ["origami", "paper", "fold"]),
  card("singing", "Singing", "🎤", "creative", ["songs", "karaoke", "voice"]),
  card("piano", "Play piano", "🎹", "creative", ["keyboard", "music", "instrument"]),
  card("guitar", "Play guitar", "🎸", "creative", ["music", "instrument", "strings"]),
  card("baking", "Baking", "🧁", "creative", ["cupcakes", "cake", "kitchen", "cooking"]),
  card("science", "Science experiment", "🔬", "creative", ["experiment", "lab", "discover"]),

  // ---- Home (14) ----
  card("nap", "Nap", "😴", "home", ["sleep", "rest", "quiet time"]),
  card("bath", "Bath", "🛁", "home", ["wash", "bubbles", "tub"]),
  card("bed", "Go to bed", "🛏️", "home", ["bedtime", "sleep", "night"]),
  card("shower", "Shower", "🚿", "home", ["wash", "clean"]),
  card("brush-teeth", "Brush teeth", "🪥", "home", ["toothbrush", "dentist", "clean", "morning"]),
  card("get-dressed", "Get dressed", "👕", "home", ["clothes", "outfit", "morning"]),
  card("shoes", "Put on shoes", "👟", "home", ["sneakers", "leave", "go out"]),
  card("homework", "Homework", "📝", "home", ["school", "work", "study"]),
  card("tidy-up", "Tidy up", "🧹", "home", ["clean", "chores", "sweep", "mess"]),
  card("cuddle", "Cuddle", "🤗", "home", ["hug", "snuggle", "love"]),
  card("family-time", "Family time", "👨‍👩‍👧", "home", ["together", "parents", "kids"]),
  card("stay-home", "Stay home", "🏠", "home", ["house", "inside", "relax"]),
  card("cooking", "Cook together", "🍳", "home", ["kitchen", "help", "meal"]),
  card("bedtime-story", "Bedtime story", "🌙", "home", ["night", "read", "moon", "sleep"]),

  // ---- Feelings (12) ----
  card("happy", "Happy", "😊", "feelings", ["smile", "good", "joy"]),
  card("sad", "Sad", "😢", "feelings", ["cry", "upset", "down"]),
  card("angry", "Angry", "😠", "feelings", ["mad", "cross", "frustrated"]),
  card("tired", "Tired", "🥱", "feelings", ["sleepy", "yawn", "exhausted"]),
  card("scared", "Scared", "😨", "feelings", ["afraid", "frightened", "worried"]),
  card("excited", "Excited", "🤩", "feelings", ["thrilled", "wow", "cant wait"]),
  card("silly", "Silly", "🤪", "feelings", ["goofy", "funny", "playful"]),
  card("hungry", "Hungry", "😋", "feelings", ["yummy", "food", "starving"]),
  card("sick", "Not feeling well", "🤒", "feelings", ["ill", "fever", "poorly", "hurt"]),
  card("bored", "Bored", "😐", "feelings", ["nothing to do", "meh"]),
  card("proud", "Proud", "🥳", "feelings", ["celebrate", "achievement", "party"]),
  card("loved", "Loved", "❤️", "feelings", ["love", "heart", "care"]),

  // ---- Animals (12) ----
  card("dog", "Dog", "🐶", "animals", ["puppy", "pet", "walk"]),
  card("cat", "Cat", "🐱", "animals", ["kitten", "pet", "meow"]),
  card("rabbit", "Rabbit", "🐰", "animals", ["bunny", "pet", "hop"]),
  card("bird", "Bird", "🐦", "animals", ["tweet", "fly", "feathers"]),
  card("fish", "Fish", "🐠", "animals", ["aquarium", "swim", "pet"]),
  card("horse", "Horse", "🐴", "animals", ["pony", "riding", "farm"]),
  card("cow", "Cow", "🐮", "animals", ["farm", "moo", "milk"]),
  card("duck", "Duck", "🦆", "animals", ["pond", "quack", "feed"]),
  card("butterfly", "Butterfly", "🦋", "animals", ["insect", "garden", "wings"]),
  card("dinosaur", "Dinosaur", "🦖", "animals", ["dino", "trex", "roar", "museum"]),
  card("elephant", "Elephant", "🐘", "animals", ["zoo", "trunk", "big"]),
  card("lion", "Lion", "🦁", "animals", ["zoo", "roar", "big cat"]),

  // ---- Places (12) ----
  card("school", "School", "🏫", "places", ["class", "teacher", "learn"]),
  card("library", "Library", "📚", "places", ["books", "reading", "borrow"]),
  card("grandparents", "Grandparents' house", "🏡", "places", ["grandma", "grandpa", "visit", "nana"]),
  card("friends-house", "Friend's house", "🏘️", "places", ["playdate", "visit", "friends", "sleepover"]),
  card("zoo", "Zoo", "🦓", "places", ["animals", "trip", "visit"]),
  card("museum", "Museum", "🏛️", "places", ["trip", "history", "visit", "exhibit"]),
  card("shop", "Go shopping", "🛒", "places", ["store", "supermarket", "groceries", "buy"]),
  card("restaurant", "Restaurant", "🍽️", "places", ["eat out", "dinner", "cafe"]),
  card("cinema", "Cinema", "🎟️", "places", ["movies", "theatre", "film", "tickets"]),
  card("farm", "Farm", "🚜", "places", ["tractor", "animals", "country"]),
  card("aquarium", "Aquarium", "🐙", "places", ["fish", "sea life", "octopus", "trip"]),
  card("fun-fair", "Fun fair", "🎡", "places", ["amusement park", "rides", "ferris wheel", "carnival"]),
]);

// ---------------------------------------------------------------------------
// Helpers (used by the Compose picker and the Card Library)
// ---------------------------------------------------------------------------

// Fast lookup by id. Useful for "duplicate to my cards" and for rebuilding
// chips. Note: sent questions never need this, because option display data is
// copied into the question document when it is created.
const BY_ID = new Map(BUILTIN_CARDS.map((c) => [c.id, c]));

export function getBuiltinCard(id) {
  return BY_ID.get(id) || null;
}

// Lowercase and strip accents so "Café" matches "cafe".
// normalize("NFD") splits "é" into "e" + an accent mark; the regex removes the mark.
function normalize(text) {
  return String(text).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
}

// Filter a list of cards by a search string and/or category.
// Works on built-in cards AND the family's custom cards (same shape), so the
// caller can pass [...BUILTIN_CARDS, ...customCards].
//
//   searchCards(cards, "pizza")                 -> cards whose label/keyword contains "pizza"
//   searchCards(cards, "ice cr", "food")        -> only the food category
//
// Every word the user typed must match somewhere in the label or keywords,
// so "ice cold" finds a card tagged "ice" and "cold" even if not adjacent.
export function searchCards(cards, query = "", category = "all") {
  const words = normalize(query).split(/\s+/).filter(Boolean);

  return cards.filter((c) => {
    if (category !== "all" && c.category !== category) return false;
    if (words.length === 0) return true;

    // Search the translated label, the English label and all keywords.
    const haystack = normalize(
      [tCard(c), c.label, ...(c.keywords || [])].join(" ")
    );
    return words.every((w) => haystack.includes(w));
  });
}
