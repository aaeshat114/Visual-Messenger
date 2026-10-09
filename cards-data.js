// cards-data.js
// ---------------------------------------------------------------------------
//
// CARD TEMPLATE:
//   {
//     id: "pizza",                  unique, lower case, letters/numbers/hyphens only, no spaces
//     label: "Pizza",               the name shown under the picture, also searched
//     category: "food",             one of the ids in PREMADE_CATEGORIES below or a list to put the card in several: category: ["food", "snack"],
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
   "problems",
   "food",
   "activity",
   "place",
   "other"
];

export const PREMADE_CARDS = [
  // ---- FOOD ----

// Fruit
{ id: "apple", label: "Apple", category: ["food"], parent: "", keywords: ["fruit", "lunch", "snack", "crunchy", "fall", "cold", "light"], svg: `` },
{ id: "banana", label: "Banana", category: ["food"], parent: "", keywords: ["fruit", "breakfast", "lunch", "snack", "soft", "light"], svg: `` },
{ id: "grapes", label: "Grapes", category: ["food"], parent: "", keywords: ["fruit", "lunch", "snack", "cold"], svg: `` },
{ id: "strawberries", label: "Strawberries", category: ["food"], parent: "", keywords: ["fruit", "breakfast", "lunch", "snack", "summer", "cold", "spring"], svg: `` },
{ id: "blueberries", label: "Blueberries", category: ["food"], parent: "", keywords: ["fruit", "breakfast", "lunch", "snack", "summer", "cold"], svg: `` },
{ id: "raspberries", label: "Raspberries", category: ["food"], parent: "", keywords: ["fruit", "lunch", "snack", "summer", "cold", "soft"], svg: `` },
{ id: "mandarin", label: "Mandarin", category: ["food"], parent: "", keywords: ["fruit", "lunch", "snack", "winter"], svg: `` },
{ id: "orange", label: "Orange", category: ["food"], parent: "", keywords: ["fruit", "breakfast", "lunch", "snack", "winter"], svg: `` },
{ id: "watermelon", label: "Watermelon", category: ["food"], parent: "", keywords: ["fruit", "snack", "summer", "cold"], svg: `` },
{ id: "cantaloupe", label: "Cantaloupe", category: ["food"], parent: "", keywords: ["fruit", "lunch", "snack", "summer", "cold", "soft", "melon"], svg: `` },
{ id: "honeydew-melon", label: "Honeydew melon", category: ["food"], parent: "", keywords: ["fruit", "lunch", "snack", "summer", "cold", "soft"], svg: `` },
{ id: "pineapple", label: "Pineapple", category: ["food"], parent: "", keywords: ["fruit", "snack", "summer"], svg: `` },
{ id: "kiwi", label: "Kiwi", category: ["food"], parent: "", keywords: ["fruit", "lunch", "snack", "summer", "soft"], svg: `` },
{ id: "peach", label: "Peach", category: ["food"], parent: "", keywords: ["fruit", "snack", "summer", "soft"], svg: `` },
{ id: "plum", label: "Plum", category: ["food"], parent: "", keywords: ["fruit", "snack", "summer", "soft"], svg: `` },
{ id: "nectarine", label: "Nectarine", category: ["food"], parent: "", keywords: ["fruit", "snack", "summer", "soft"], svg: `` },
{ id: "mango", label: "Mango", category: ["food"], parent: "", keywords: ["fruit", "snack", "summer", "soft"], svg: `` },
{ id: "pear", label: "Pear", category: ["food"], parent: "", keywords: ["fruit", "lunch", "snack", "fall", "soft"], svg: `` },
{ id: "cherries", label: "Cherries", category: ["food"], parent: "", keywords: ["fruit", "snack", "summer"], svg: `` },
{ id: "fruit-pouch", label: "Fruit pouch", category: ["food"], parent: "", keywords: ["fruit", "lunch", "snack", "soft", "light"], svg: `` },
{ id: "fruit-cup", label: "Fruit cup", category: ["food"], parent: "", keywords: ["fruit", "lunch", "snack", "soft", "light"], svg: `` },

// Vegetables
{ id: "baby-carrots", label: "Baby carrots", category: ["food"], parent: "", keywords: ["vegetable", "lunch", "dinner", "snack", "crunchy"], svg: `` },
{ id: "cucumber", label: "Cucumber", category: ["food"], parent: "", keywords: ["vegetable", "lunch", "dinner", "summer", "crunchy", "cold"], svg: `` },
{ id: "cherry-tomatoes", label: "Cherry tomatoes", category: ["food"], parent: "", keywords: ["vegetable", "lunch", "dinner", "summer", "soft"], svg: `` },
{ id: "bell-pepper-strips", label: "Bell pepper strips", category: ["food"], parent: "", keywords: ["vegetable", "lunch", "dinner", "crunchy"], svg: `` },
{ id: "celery-sticks", label: "Celery sticks", category: ["food"], parent: "", keywords: ["vegetable", "lunch", "dinner", "snack", "crunchy"], svg: `` },
{ id: "broccoli-florets", label: "Broccoli florets", category: ["food"], parent: "", keywords: ["vegetable", "lunch", "dinner", "crunchy"], svg: `` },
{ id: "peas", label: "Peas", category: ["food"], parent: "", keywords: ["vegetable", "dinner", "soft", "spring"], svg: `` },
{ id: "radishes", label: "Radishes", category: ["food"], parent: "", keywords: ["vegetable", "lunch", "dinner", "summer", "crunchy", "spring"], svg: `` },

// Protein & dairy
{ id: "ham", label: "Ham", category: ["food"], parent: "", keywords: ["protein", "lunch", "chicken", "beef"], svg: `` },
{ id: "salami", label: "Salami", category: ["food"], parent: "", keywords: ["protein", "lunch", "salty", "chicken", "beef"], svg: `` },
{ id: "pepperoni-stick", label: "Pepperoni stick", category: ["food"], parent: "", keywords: ["protein", "lunch", "snack", "salty", "chicken", "beef"], svg: `` },
{ id: "sausage", label: "Sausage", category: ["food"], parent: "", keywords: ["protein", "breakfast", "lunch", "hot", "chicken", "beef"], svg: `` },
{ id: "string-cheese", label: "String cheese", category: ["food"], parent: "", keywords: ["protein", "dairy", "lunch", "snack", "salty", "cold"], svg: `` },
{ id: "babybel-cheese", label: "Babybel cheese", category: ["food"], parent: "", keywords: ["protein", "dairy", "lunch", "snack", "salty", "cold"], svg: `` },
{ id: "yogurt", label: "Yogurt", category: ["food"], parent: "", keywords: ["protein", "dairy", "breakfast", "lunch", "snack", "soft", "cold", "light"], svg: `` },

// Lunch mains
{ id: "jam-sandwich", label: "Jam sandwich", category: ["food"], parent: "", keywords: ["grain", "lunch", "soft", "light"], svg: `` },
{ id: "ham-sandwich", label: "Ham sandwich", category: ["food"], parent: "", keywords: ["grain", "protein", "lunch", "light"], svg: `` },
{ id: "bagel", label: "Bagel", category: ["food"], parent: "", keywords: ["grain", "breakfast", "lunch"], svg: `` },
{ id: "croissant", label: "Croissant", category: ["food"], parent: "", keywords: ["grain", "breakfast", "lunch"], svg: `` },

// Lunch snacks
{ id: "trail-mix", label: "Trail mix", category: ["food"], parent: "", keywords: ["snack", "lunch", "crunchy", "salty"], svg: `` },
{ id: "granola-bar", label: "Granola bar", category: ["food"], parent: "", keywords: ["grain", "snack", "lunch", "crunchy"], svg: `` },
{ id: "crackers", label: "Crackers", category: ["food"], parent: "", keywords: ["grain", "snack", "lunch", "crunchy", "salty", "light"], svg: `` },
{ id: "pretzels", label: "Pretzels", category: ["food"], parent: "", keywords: ["grain", "snack", "lunch", "crunchy", "salty"], svg: `` },
{ id: "muffin", label: "Muffin", category: ["food"], parent: "", keywords: ["grain", "sweet", "breakfast", "lunch", "snack", "soft"], svg: `` },
{ id: "popcorn", label: "Popcorn", category: ["food"], parent: "", keywords: ["snack", "crunchy", "salty"], svg: `` },
{ id: "candy", label: "Candy", category: ["food"], parent: "", keywords: ["sweet", "snack"], svg: `` },
{ id: "bear-paw", label: "Bear paw", category: ["food"], parent: "", keywords: ["sweet", "snack", "lunch", "soft", "cookie"], svg: `` },
{ id: "mini-cookies", label: "Mini cookies", category: ["food"], parent: "", keywords: ["sweet", "snack", "crunchy"], svg: `` },

// Drinks
{ id: "juice-box", label: "Juice box", category: ["food"], parent: "", keywords: ["drink", "liquid", "lunch", "snack", "summer", "cold"], svg: `` },
{ id: "yogurt-drink", label: "Yogurt drink", category: ["food"], parent: "", keywords: ["drink", "dairy", "liquid", "breakfast", "lunch", "snack", "summer", "cold", "soft"], svg: `` },
{ id: "milk", label: "Milk", category: ["food"], parent: "", keywords: ["drink", "dairy", "liquid", "breakfast", "lunch", "snack", "cold"], svg: `` },
{ id: "water", label: "Water", category: ["food", "tools"], parent: "", keywords: ["drink", "liquid", "snack", "summer", "cold"], svg: `` },
{ id: "ketchup", label: "Ketchup", category: ["food"], parent: "", keywords: ["liquid"], svg: `` },
{ id: "pudding", label: "Pudding", category: ["food"], parent: "", keywords: ["sweet", "snack", "lunch", "liquid", "soft", "cold"], svg: `` },

// Dinner mains
{ id: "baked-chicken", label: "Baked chicken", category: ["food"], parent: "", keywords: ["protein", "dinner", "hot"], svg: `` },
{ id: "chicken-curry", label: "Chicken curry", category: ["food"], parent: "", keywords: ["protein", "dinner", "hot", "curry"], svg: `` },
{ id: "korean-fried-chicken", label: "Korean fried chicken", category: ["food"], parent: "", keywords: ["protein", "dinner", "hot", "crunchy"], svg: `` },
{ id: "chicken-soup", label: "Chicken soup", category: ["food"], parent: "", keywords: ["protein", "dinner", "lunch", "hot", "soft", "sick", "light", "winter", "fall", "soup"], svg: `` },
{ id: "chow-mein", label: "Chow mein", category: ["food"], parent: "", keywords: ["grain", "dinner", "hot", "noodles"], svg: `` },
{ id: "fish-sticks", label: "Fish sticks", category: ["food"], parent: "", keywords: ["protein", "dinner", "lunch", "hot", "crunchy"], svg: `` },
{ id: "fish-fillet", label: "Fish fillet", category: ["food"], parent: "", keywords: ["protein", "dinner", "hot", "soft"], svg: `` },
{ id: "beef-bulgogi", label: "Beef bulgogi", category: ["food"], parent: "", keywords: ["protein", "dinner", "hot"], svg: `` },
{ id: "beef-risotto", label: "Beef risotto", category: ["food"], parent: "", keywords: ["protein", "grain", "dinner", "hot", "soft"], svg: `` },
{ id: "spaghetti-bolognese", label: "Spaghetti bolognese", category: ["food"], parent: "", keywords: ["protein", "grain", "dinner", "hot", "soft", "pasta", "beef"], svg: `` },
{ id: "pizza-fast-food", label: "Pizza (fast food)", category: ["food"], parent: "", keywords: ["grain", "dinner", "lunch", "hot"], svg: `` },
{ id: "pizza-frozen", label: "Pizza (frozen)", category: ["food"], parent: "", keywords: ["grain", "dinner", "lunch", "hot"], svg: `` },
{ id: "mini-naan-pizzas", label: "Mini naan pizzas", category: ["food"], parent: "", keywords: ["grain", "dinner", "hot"], svg: `` },
{ id: "burgers", label: "Burgers", category: ["food"], parent: "", keywords: ["protein", "grain", "dinner", "lunch", "summer", "hot", "beef"], svg: `` },
{ id: "paprikash", label: "Paprikash", category: ["food"], parent: "", keywords: ["protein", "dinner", "hot", "soft", "winter", "fall", "chicken"], svg: `` },
{ id: "goulash", label: "Goulash", category: ["food"], parent: "", keywords: ["protein", "dinner", "hot", "soft", "winter", "fall", "beef"], svg: `` },
{ id: "tomato-gravy", label: "Tomato gravy", category: ["food"], parent: "", keywords: ["protein", "dinner", "hot", "soft", "beef"], svg: `` },
{ id: "meatballs", label: "Meatballs", category: ["food"], parent: "", keywords: ["protein", "dinner", "hot", "soft", "chicken", "beef"], svg: `` },
{ id: "kebabs", label: "Kebabs", category: ["food"], parent: "", keywords: ["protein", "dinner", "summer", "hot", "chicken", "beef"], svg: `` },
{ id: "chickpea-curry", label: "Chickpea curry", category: ["food"], parent: "", keywords: ["protein", "vegetable", "dinner", "hot", "soft", "curry"], svg: `` },
{ id: "lentil-soup", label: "Lentil soup", category: ["food"], parent: "", keywords: ["protein", "vegetable", "dinner", "lunch", "hot", "soft", "sick", "light", "winter", "fall", "soup"], svg: `` },
{ id: "spinach-pasta", label: "Spinach pasta", category: ["food"], parent: "", keywords: ["grain", "vegetable", "dinner", "hot", "pasta"], svg: `` },
{ id: "spinach-crepes", label: "Spinach crepes", category: ["food"], parent: "", keywords: ["grain", "vegetable", "dinner", "hot", "soft"], svg: `` },
{ id: "burrito", label: "Burrito", category: ["food"], parent: "", keywords: ["protein", "grain", "dinner", "lunch", "hot", "chicken", "beef"], svg: `` },
{ id: "shawarma", label: "Shawarma", category: ["food"], parent: "", keywords: ["protein", "grain", "dinner", "lunch", "summer", "hot", "chicken"], svg: `` },
{ id: "falafel", label: "Falafel", category: ["food"], parent: "", keywords: ["protein", "vegetable", "dinner", "lunch", "summer", "crunchy"], svg: `` },
{ id: "hotdogs", label: "Hotdogs", category: ["food"], parent: "", keywords: ["protein", "grain", "dinner", "lunch", "summer", "hot", "hot dog", "chicken", "beef"], svg: `` },
{ id: "egg-fried-pasta", label: "Egg fried pasta", category: ["food"], parent: "", keywords: ["protein", "grain", "dinner", "hot", "pasta", "chicken", "beef"], svg: `` },

// Dinner sides
{ id: "rice", label: "Rice", category: ["food"], parent: "", keywords: ["grain", "dinner", "hot", "soft", "sick", "side"], svg: `` },
{ id: "couscous", label: "Couscous", category: ["food"], parent: "", keywords: ["grain", "dinner", "hot", "soft", "side"], svg: `` },
{ id: "pasta-fusili", label: "Pasta (fusili)", category: ["food"], parent: "", keywords: ["grain", "dinner", "hot", "side"], svg: `` },
{ id: "pasta-macaroni", label: "Pasta (macaroni)", category: ["food"], parent: "", keywords: ["grain", "dinner", "hot", "soft", "sick", "side"], svg: `` },
{ id: "pasta-penne", label: "Pasta (penne)", category: ["food"], parent: "", keywords: ["grain", "dinner", "hot", "side"], svg: `` },
{ id: "mashed-potatoes", label: "Mashed potatoes", category: ["food"], parent: "", keywords: ["vegetable", "dinner", "hot", "soft", "side", "sick"], svg: `` },
{ id: "potato-wedges", label: "Potato wedges", category: ["food"], parent: "", keywords: ["vegetable", "dinner", "snack", "hot", "crunchy", "side"], svg: `` },
{ id: "fries", label: "Fries", category: ["food"], parent: "", keywords: ["vegetable", "dinner", "snack", "hot", "crunchy", "salty", "side"], svg: `` },
{ id: "lentils", label: "Lentils", category: ["food"], parent: "", keywords: ["protein", "vegetable", "dinner", "hot", "soft", "side"], svg: `` },
{ id: "roasted-veggies", label: "Roasted veggies", category: ["food"], parent: "", keywords: ["vegetable", "dinner", "hot", "soft", "side", "winter", "fall"], svg: `` },
{ id: "fresh-veggies", label: "Fresh veggies", category: ["food"], parent: "", keywords: ["vegetable", "dinner", "snack", "summer", "crunchy", "cold", "side", "spring"], svg: `` },

// Breakfast
{ id: "fried-egg", label: "Fried egg", category: ["food"], parent: "", keywords: ["protein", "breakfast", "hot", "soft"], svg: `` },
{ id: "egg-sandwich", label: "Egg sandwich", category: ["food"], parent: "", keywords: ["protein", "grain", "breakfast", "hot"], svg: `` },
{ id: "toast", label: "Toast", category: ["food"], parent: "", keywords: ["grain", "breakfast", "snack", "hot", "crunchy", "sick", "light"], svg: `` },
{ id: "pb-jam-sandwich", label: "Peanut butter and jam sandwich", category: ["food"], parent: "", keywords: ["protein", "grain", "breakfast", "lunch", "soft", "light", "pbj"], svg: `` },
{ id: "pb-banana-sandwich", label: "Peanut butter and banana sandwich", category: ["food"], parent: "", keywords: ["protein", "grain", "fruit", "breakfast", "lunch", "soft", "light", "pbj"], svg: `` },
{ id: "waffle", label: "Waffle", category: ["food"], parent: "", keywords: ["grain", "sweet", "breakfast", "hot", "soft"], svg: `` },
{ id: "french-toast", label: "French toast", category: ["food"], parent: "", keywords: ["grain", "protein", "sweet", "breakfast", "hot", "soft"], svg: `` },
{ id: "banana-bread", label: "Banana bread", category: ["food"], parent: "", keywords: ["grain", "sweet", "fruit", "breakfast", "snack", "soft", "fall"], svg: `` },
{ id: "cereal", label: "Cereal", category: ["food"], parent: "", keywords: ["grain", "breakfast", "snack", "crunchy", "cold", "light"], svg: `` },
{ id: "oatmeal", label: "Oatmeal", category: ["food"], parent: "", keywords: ["grain", "breakfast", "hot", "soft", "sick", "light", "winter", "fall"], svg: `` },
{ id: "smoothie", label: "Smoothie", category: ["food"], parent: "", keywords: ["drink", "fruit", "liquid", "breakfast", "snack", "summer", "cold", "soft", "light"], svg: `` },
{ id: "milkshake", label: "Milkshake", category: ["food"], parent: "", keywords: ["drink", "sweet", "liquid", "snack", "summer", "cold", "soft", "shake"], svg: `` },
{ id: "bacon", label: "Bacon", category: ["food"], parent: "", keywords: ["protein", "breakfast", "hot", "crunchy", "salty", "chicken", "beef"], svg: `` },

// Meal cards
{ id: "breakfast", label: "Breakfast", category: ["food"], parent: "", keywords: [], svg: `` },
{ id: "lunch", label: "Lunch", category: ["food"], parent: "", keywords: [], svg: `` },
{ id: "dinner", label: "Dinner", category: ["food"], parent: "", keywords: [], svg: `` },
{ id: "snack", label: "Snack", category: ["food", "tools"], parent: "", keywords: [], svg: `` },

// ---- ACTIVITY ----

{ id: "draw", label: "Draw", category: ["activity", "tools"], parent: "", keywords: ["indoor", "quiet", "creative"], svg: `` },
{ id: "paint", label: "Paint", category: ["activity"], parent: "", keywords: ["indoor", "quiet", "creative"], svg: `` },
{ id: "playdough", label: "Playdough", category: ["activity"], parent: "", keywords: ["indoor", "quiet", "creative", "playdoh", "play doh"], svg: `` },
{ id: "craft", label: "Craft", category: ["activity"], parent: "", keywords: ["indoor", "quiet", "creative"], svg: `` },
{ id: "puzzle", label: "Puzzle", category: ["activity"], parent: "", keywords: ["indoor", "quiet", "alone"], svg: `` },
{ id: "lego", label: "Lego", category: ["activity"], parent: "", keywords: ["indoor", "quiet", "building"], svg: `` },
{ id: "magna-tiles", label: "Magna tiles", category: ["activity"], parent: "", keywords: ["indoor", "quiet", "building"], svg: `` },
{ id: "board-game", label: "Board game", category: ["activity"], parent: "", keywords: ["indoor", "together", "game"], svg: `` },
{ id: "card-game", label: "Card game", category: ["activity"], parent: "", keywords: ["indoor", "together", "game"], svg: `` },
{ id: "read-a-book", label: "Read a book", category: ["activity", "tools"], parent: "", keywords: ["indoor", "quiet", "alone"], svg: `` },
{ id: "cook", label: "Cook", category: ["activity"], parent: "", keywords: ["indoor", "together", "creative"], svg: `` },
{ id: "help", label: "Help", category: ["activity"], parent: "", keywords: ["together"], svg: `` },
{ id: "cartoons", label: "Cartoons", category: ["activity"], parent: "", keywords: ["indoor", "screen", "quiet", "tv", "show"], svg: `` },
{ id: "movie", label: "Movie", category: ["activity"], parent: "", keywords: ["indoor", "screen"], svg: `` },
{ id: "game", label: "Game", category: ["activity"], parent: "", keywords: ["indoor", "game"], svg: `` },
{ id: "screen-time", label: "Screen time", category: ["activity", "tools"], parent: "", keywords: ["indoor", "screen", "quiet"], svg: `` },
{ id: "hide-and-seek", label: "Hide and Seek", category: ["activity"], parent: "", keywords: ["indoor", "outdoor", "active"], svg: `` },
{ id: "pick-toys", label: "Pick toys", category: ["activity"], parent: "", keywords: ["indoor", "quiet"], svg: `` },
{ id: "play-with-mom", label: "Play with mom", category: ["activity"], parent: "", keywords: ["together"], svg: `` },
{ id: "play-with-dad", label: "Play with dad", category: ["activity"], parent: "", keywords: ["together"], svg: `` },
{ id: "play-with-siblings", label: "Play with siblings", category: ["activity"], parent: "", keywords: ["brother", "sister"], svg: `` },
{ id: "play-with-friend", label: "Play with friend", category: ["activity"], parent: "", keywords: ["outdoor"], svg: `` },
{ id: "take-a-bath", label: "Take a bath", category: ["activity"], parent: "", keywords: ["indoor", "quiet", "alone", "water"], svg: `` },
{ id: "rest", label: "Rest", category: ["activity"], parent: "", keywords: ["indoor", "quiet", "alone", "relax", "break"], svg: `` },

// ---- ACTIVITY + PLACE ----

{ id: "playground", label: "Playground", category: ["activity", "place"], parent: "", keywords: ["outdoor", "active", "together", "summer", "spring", "fall"], svg: `` },
{ id: "swimming", label: "Swimming", category: ["activity", "place"], parent: "", keywords: ["outdoor", "active", "together", "water", "summer", "pool"], svg: `` },
{ id: "library", label: "Library", category: ["activity", "place"], parent: "", keywords: ["indoor", "quiet", "together"], svg: `` },
{ id: "balcony", label: "Balcony", category: ["activity", "place"], parent: "", keywords: ["outdoor", "quiet"], svg: `` },
{ id: "bike", label: "Bike", category: ["activity", "place"], parent: "", keywords: ["outdoor", "active", "together", "summer", "spring", "fall", "bicycle", "cycling"], svg: `` },
{ id: "roller-skates", label: "Roller skates", category: ["activity", "place"], parent: "", keywords: ["outdoor", "active", "together", "summer", "spring", "fall", "rollerblade"], svg: `` },
{ id: "spray-park", label: "Spray park", category: ["activity", "place"], parent: "", keywords: ["outdoor", "active", "together", "water", "summer", "splash pad", "sprinkler"], svg: `` },
{ id: "play-room", label: "Play room", category: ["activity", "place"], parent: "", keywords: ["indoor", "quiet", "playroom"], svg: `` },
{ id: "hike", label: "Hike", category: ["activity", "place"], parent: "", keywords: ["outdoor", "active", "together", "summer", "spring", "fall", "trail"], svg: `` },
{ id: "outdoors", label: "Outdoors", category: ["activity", "place"], parent: "", keywords: ["outdoor", "together", "outside"], svg: `` },
{ id: "picnic", label: "Picnic", category: ["activity", "place"], parent: "", keywords: ["outdoor", "together", "summer"], svg: `` },

// ---- PLACE ----

{ id: "home", label: "Home", category: ["place"], parent: "", keywords: ["indoor", "house"], svg: `` },
{ id: "boys-room", label: "Boys' room", category: ["place"], parent: "", keywords: ["indoor"], svg: `` },
{ id: "munis-room", label: "Muni's room", category: ["place"], parent: "", keywords: ["indoor"], svg: `` },
{ id: "parents-bedroom", label: "Parents' bedroom", category: ["place"], parent: "", keywords: ["indoor"], svg: `` },
{ id: "living-room", label: "Living room", category: ["place"], parent: "", keywords: ["indoor"], svg: `` },
{ id: "kitchen", label: "Kitchen", category: ["place"], parent: "", keywords: ["indoor"], svg: `` },
{ id: "storage-room", label: "Storage room", category: ["place"], parent: "", keywords: ["indoor"], svg: `` },
{ id: "washroom", label: "Washroom", category: ["place"], parent: "", keywords: ["indoor", "bathroom", "toilet"], svg: `` },
{ id: "mudroom", label: "Mudroom", category: ["place"], parent: "", keywords: ["indoor"], svg: `` },
{ id: "school", label: "School", category: ["place"], parent: "", keywords: ["indoor"], svg: `` },
{ id: "masjid", label: "Masjid", category: ["place"], parent: "", keywords: ["indoor", "mosque"], svg: `` },
{ id: "store", label: "Store", category: ["place"], parent: "", keywords: ["indoor", "shop", "shopping"], svg: `` },
{ id: "mall", label: "Mall", category: ["place"], parent: "", keywords: ["indoor", "together"], svg: `` },
{ id: "restaurant", label: "Restaurant", category: ["place"], parent: "", keywords: ["indoor", "together"], svg: `` },
{ id: "park", label: "Park", category: ["place"], parent: "", keywords: ["outdoor", "together", "summer", "spring", "fall"], svg: `` },
{ id: "car", label: "Car", category: ["place", "other"], parent: "", keywords: ["vehicle", "drive"], svg: `` },
{ id: "bus", label: "Bus", category: ["place", "other"], parent: "", keywords: ["together", "vehicle"], svg: `` },

// ---- PEOPLE ----

{ id: "teacher", label: "Teacher", category: ["people"], parent: "", keywords: ["adult"], svg: `` },
{ id: "friend", label: "Friend", category: ["people"], parent: "", keywords: ["kid"], svg: `` },
{ id: "classmate", label: "Classmate", category: ["people"], parent: "", keywords: ["kid"], svg: `` },
{ id: "a-kid", label: "A kid", category: ["people"], parent: "", keywords: ["kid", "stranger", "child", "boy", "girl"], svg: `` },
{ id: "a-grown-up", label: "A grown-up", category: ["people"], parent: "", keywords: ["adult", "stranger"], svg: `` },
{ id: "a-lady", label: "A lady", category: ["people"], parent: "", keywords: ["adult", "stranger", "woman"], svg: `` },
{ id: "a-man", label: "A man", category: ["people"], parent: "", keywords: ["adult", "stranger", "guy"], svg: `` },
{ id: "doctor", label: "Doctor", category: ["people"], parent: "", keywords: ["adult"], svg: `` },
{ id: "bus-driver", label: "Bus driver", category: ["people"], parent: "", keywords: ["adult"], svg: `` },

// ---- CLOTHES ----

{ id: "short-sleeve-shirt", label: "Short sleeve shirt", category: ["clothes"], parent: "", keywords: ["top", "summer", "spring", "fall"], svg: `` },
{ id: "long-sleeve-shirt", label: "Long sleeve shirt", category: ["clothes"], parent: "", keywords: ["top", "spring", "fall", "winter"], svg: `` },
{ id: "sweater", label: "Sweater", category: ["clothes"], parent: "", keywords: ["top", "winter", "fall", "jumper"], svg: `` },
{ id: "hoodie", label: "Hoodie", category: ["clothes"], parent: "", keywords: ["top", "spring", "fall", "winter", "outerwear", "sweatshirt"], svg: `` },
{ id: "pants", label: "Pants", category: ["clothes"], parent: "", keywords: ["bottom", "spring", "fall", "winter", "trousers"], svg: `` },
{ id: "shorts", label: "Shorts", category: ["clothes"], parent: "", keywords: ["bottom", "summer", "spring"], svg: `` },
{ id: "snowsuit", label: "Snowsuit", category: ["clothes"], parent: "", keywords: ["full-body", "winter", "outerwear"], svg: `` },
{ id: "underwear", label: "Underwear", category: ["clothes"], parent: "", keywords: ["bottom"], svg: `` },
{ id: "socks", label: "Socks", category: ["clothes"], parent: "", keywords: [], svg: `` },
{ id: "hat-baseball", label: "Hat", category: ["clothes"], parent: "", keywords: ["head", "summer", "spring", "fall", "cap"], svg: `` },
{ id: "hat-toque", label: "Hat", category: ["clothes"], parent: "", keywords: ["head", "winter", "outerwear", "beanie"], svg: `` },
{ id: "gloves", label: "Gloves", category: ["clothes"], parent: "", keywords: ["hands", "winter", "outerwear"], svg: `` },
{ id: "jacket", label: "Jacket", category: ["clothes"], parent: "", keywords: ["outerwear", "spring", "fall", "winter", "coat"], svg: `` },
{ id: "snow-pants", label: "Snow pants", category: ["clothes"], parent: "", keywords: ["bottom", "winter", "outerwear"], svg: `` },
{ id: "shoes", label: "Shoes", category: ["clothes"], parent: "", keywords: ["feet", "spring", "fall", "sneakers"], svg: `` },
{ id: "boots", label: "Boots", category: ["clothes"], parent: "", keywords: ["feet", "winter", "fall", "outerwear"], svg: `` },
{ id: "sandals", label: "Sandals", category: ["clothes"], parent: "", keywords: ["feet", "summer"], svg: `` },
{ id: "pajamas", label: "Pajamas", category: ["clothes"], parent: "", keywords: ["full-body", "pyjamas", "pjs"], svg: `` },

// ---- COLOR ----

{ id: "red", label: "Red", category: ["color"], parent: "", keywords: [], svg: `` },
{ id: "orange-color", label: "Orange", category: ["color"], parent: "", keywords: [], svg: `` },
{ id: "yellow", label: "Yellow", category: ["color"], parent: "", keywords: [], svg: `` },
{ id: "green", label: "Green", category: ["color"], parent: "", keywords: [], svg: `` },
{ id: "blue", label: "Blue", category: ["color"], parent: "", keywords: [], svg: `` },
{ id: "purple", label: "Purple", category: ["color"], parent: "", keywords: [], svg: `` },
{ id: "pink", label: "Pink", category: ["color"], parent: "", keywords: [], svg: `` },
{ id: "brown", label: "Brown", category: ["color"], parent: "", keywords: [], svg: `` },
{ id: "black", label: "Black", category: ["color"], parent: "", keywords: [], svg: `` },
{ id: "white", label: "White", category: ["color"], parent: "", keywords: [], svg: `` },
{ id: "gray", label: "Gray", category: ["color"], parent: "", keywords: ["grey"], svg: `` },
{ id: "rainbow", label: "Rainbow", category: ["color"], parent: "", keywords: [], svg: `` },
{ id: "teal", label: "Teal", category: ["color"], parent: "", keywords: ["green", "blue", "turquoise", "aqua"], svg: `` },
{ id: "lime", label: "Lime", category: ["color"], parent: "", keywords: ["green"], svg: `` },
{ id: "magenta", label: "Magenta", category: ["color"], parent: "", keywords: ["pink", "purple", "fuchsia"], svg: `` },

// ---- OTHER ----

{ id: "spoon", label: "Spoon", category: ["other"], parent: "", keywords: ["utensil", "silverware"], svg: `` },
{ id: "fork", label: "Fork", category: ["other"], parent: "", keywords: ["utensil", "silverware"], svg: `` },

// ---- TOOLS ----

{ id: "deep-breath", label: "Deep breath", category: ["tools"], parent: "", keywords: ["quiet", "alone", "body", "breathe"], svg: `` },
{ id: "hug-stuffie", label: "Hug stuffie", category: ["tools"], parent: "", keywords: ["quiet", "alone", "comfort", "stuffed animal"], svg: `` },
{ id: "blanket-roll", label: "Blanket roll", category: ["tools"], parent: "", keywords: ["quiet", "alone", "comfort"], svg: `` },
{ id: "hug-mom", label: "Hug mom", category: ["tools"], parent: "", keywords: ["quiet", "together", "comfort", "mommy"], svg: `` },
{ id: "hug-dad", label: "Hug dad", category: ["tools"], parent: "", keywords: ["quiet", "together", "comfort", "daddy"], svg: `` },
{ id: "timer", label: "Timer", category: ["tools"], parent: "", keywords: ["routine", "countdown"], svg: `` },
{ id: "routine-cards", label: "Routine cards", category: ["tools"], parent: "", keywords: ["routine", "visual schedule"], svg: `` },
{ id: "routine-app", label: "Routine app", category: ["tools"], parent: "", keywords: ["routine", "screen"], svg: `` },
{ id: "play", label: "Play", category: ["tools"], parent: "", keywords: ["quiet", "alone", "indoor", "outdoor"], svg: `` },

// ---- FEELINGS ----

// Good cluster
{ id: "happy", label: "Happy", category: ["feelings"], parent: "", keywords: ["good", "glad"], svg: `` },
{ id: "excited", label: "Excited", category: ["feelings"], parent: "", keywords: ["good", "happy"], svg: `` },
{ id: "silly", label: "Silly", category: ["feelings"], parent: "", keywords: ["good", "goofy"], svg: `` },
{ id: "okay", label: "Okay", category: ["feelings"], parent: "", keywords: ["good", "ok", "fine"], svg: `` },

// Anger family
{ id: "angry", label: "Angry", category: ["feelings", "problems"], parent: "feeling", keywords: ["bad", "frustrated", "upset", "mad", "furious"], svg: `` },
{ id: "frustrated", label: "Frustrated", category: ["feelings"], parent: "", keywords: ["bad", "angry", "annoyed"], svg: `` },
{ id: "upset", label: "Upset", category: ["feelings", "problems"], parent: "feeling", keywords: ["bad", "angry", "sad", "mad"], svg: `` },
{ id: "disgusted", label: "Disgusted", category: ["feelings"], parent: "", keywords: ["bad", "angry", "gross"], svg: `` },

// Sad family
{ id: "sad", label: "Sad", category: ["feelings"], parent: "", keywords: ["bad", "upset", "disappointed"], svg: `` },
{ id: "disappointed", label: "Disappointed", category: ["feelings"], parent: "", keywords: ["bad", "sad"], svg: `` },
{ id: "lonely", label: "Lonely", category: ["feelings"], parent: "", keywords: ["bad", "sad"], svg: `` },
{ id: "guilty", label: "Guilty", category: ["feelings"], parent: "", keywords: ["bad", "sad"], svg: `` },
{ id: "jealous", label: "Jealous", category: ["feelings"], parent: "", keywords: ["bad", "angry", "envious"], svg: `` },

// Fear family
{ id: "scared", label: "Scared", category: ["feelings", "problems"], parent: "feeling", keywords: ["bad", "worried", "afraid"], svg: `` },
{ id: "worried", label: "Worried", category: ["feelings", "problems"], parent: "feeling", keywords: ["bad", "scared", "anxious", "nervous"], svg: `` },
{ id: "overwhelmed", label: "Overwhelmed", category: ["feelings"], parent: "", keywords: ["bad", "scared", "upset"], svg: `` },
{ id: "rushed", label: "Rushed", category: ["feelings", "problems"], parent: "feeling", keywords: ["bad", "worried"], svg: `` },
{ id: "confused", label: "Confused", category: ["feelings", "problems"], parent: "feeling", keywords: ["bad", "overwhelmed", "unsure"], svg: `` },
{ id: "embarrassed", label: "Embarrassed", category: ["feelings", "problems"], parent: "feeling", keywords: ["bad", "worried"], svg: `` },

// Loose
{ id: "bored", label: "Bored", category: ["feelings"], parent: "", keywords: ["bad"], svg: `` },
{ id: "surprised", label: "Surprised", category: ["feelings"], parent: "", keywords: [], svg: `` },
{ id: "tired", label: "Tired", category: ["feelings", "problems"], parent: "feeling", keywords: ["sleepy", "exhausted"], svg: `` },
{ id: "hungry", label: "Hungry", category: ["feelings", "problems"], parent: "feeling", keywords: ["starving"], svg: `` },
{ id: "sick", label: "Sick", category: ["feelings"], parent: "", keywords: ["ill"], svg: `` },

// ---- PROBLEMS ----

// Doorways
{ id: "stuff", label: "Something happened to my stuff", category: ["problems"], parent: "", keywords: ["things"], svg: `` },
{ id: "someone-mean", label: "Someone was mean", category: ["problems"], parent: "", keywords: ["bully"], svg: `` },
{ id: "got-hurt", label: "I got hurt", category: ["problems"], parent: "", keywords: ["injury"], svg: `` },
{ id: "something-hurts", label: "Something hurts", category: ["problems"], parent: "", keywords: ["pain", "ache", "sore"], svg: `` },
{ id: "dont-want", label: "Don't want to...", category: ["problems"], parent: "", keywords: ["refuse"], svg: `` },
{ id: "want", label: "Want to...", category: ["problems"], parent: "", keywords: [], svg: `` },
{ id: "doing", label: "Something I'm doing...", category: ["problems"], parent: "", keywords: [], svg: `` },
{ id: "sensory", label: "Sensory", category: ["problems"], parent: "", keywords: [], svg: `` },
{ id: "feeling", label: "Feeling:", category: ["problems"], parent: "", keywords: [], svg: `` },

// Leaves under "Something happened to my stuff"
{ id: "got-lost", label: "Got lost", category: ["problems"], parent: "stuff", keywords: ["lose"], svg: `` },
{ id: "is-stuck", label: "Is stuck", category: ["problems"], parent: "stuff", keywords: [], svg: `` },
{ id: "is-broken", label: "Is broken", category: ["problems"], parent: "stuff", keywords: ["break"], svg: `` },
{ id: "someone-took-it", label: "Someone took it", category: ["problems"], parent: "stuff", keywords: ["take", "steal"], svg: `` },
{ id: "something-got-wet", label: "Something got wet", category: ["problems"], parent: "stuff", keywords: ["spill"], svg: `` },

// Leaves under "Someone was mean"
{ id: "hurt-me", label: "Hurt me", category: ["problems"], parent: "someone-mean", keywords: ["hit"], svg: `` },
{ id: "screamed-at-me", label: "Screamed at me", category: ["problems"], parent: "someone-mean", keywords: ["yell", "shout", "loud"], svg: `` },
{ id: "said-something-mean", label: "Said something mean", category: ["problems"], parent: "someone-mean", keywords: ["rude", "unkind"], svg: `` },
{ id: "scared-me", label: "Scared me", category: ["problems"], parent: "someone-mean", keywords: [], svg: `` },
{ id: "blamed-me", label: "Blamed me", category: ["problems"], parent: "someone-mean", keywords: [], svg: `` },

// Leaves under "I got hurt"
{ id: "i-fell", label: "I fell", category: ["problems"], parent: "got-hurt", keywords: ["fall"], svg: `` },
{ id: "i-bumped-into-something", label: "I bumped into something", category: ["problems"], parent: "got-hurt", keywords: ["hit"], svg: `` },
{ id: "something-hit-me", label: "Something hit me", category: ["problems"], parent: "got-hurt", keywords: [], svg: `` },
{ id: "something-fell-on-me", label: "Something fell on me", category: ["problems"], parent: "got-hurt", keywords: ["hit"], svg: `` },
{ id: "i-dont-know-how", label: "I don't know how", category: ["problems"], parent: "got-hurt", keywords: [], svg: `` },

// Leaves under "Something hurts"
{ id: "my-head-hurts", label: "My head hurts", category: ["problems"], parent: "something-hurts", keywords: [], svg: `` },
{ id: "my-face-hurts", label: "My face hurts", category: ["problems"], parent: "something-hurts", keywords: [], svg: `` },
{ id: "my-chest-hurts", label: "My chest hurts", category: ["problems"], parent: "something-hurts", keywords: [], svg: `` },
{ id: "my-tummy-hurts", label: "My tummy hurts", category: ["problems"], parent: "something-hurts", keywords: ["stomach", "belly"], svg: `` },
{ id: "my-back-hurts", label: "My back hurts", category: ["problems"], parent: "something-hurts", keywords: [], svg: `` },
{ id: "my-arm-hurts", label: "My arm hurts", category: ["problems"], parent: "something-hurts", keywords: [], svg: `` },
{ id: "my-leg-hurts", label: "My leg hurts", category: ["problems"], parent: "something-hurts", keywords: [], svg: `` },

// Leaves under "Don't want to..."
{ id: "stop-dont-want", label: "Stop", category: ["problems"], parent: "dont-want", keywords: [], svg: `` },
{ id: "leave", label: "Leave", category: ["problems"], parent: "dont-want", keywords: [], svg: `` },
{ id: "wait", label: "Wait", category: ["problems"], parent: "dont-want", keywords: [], svg: `` },
{ id: "do-a-task", label: "Do a task", category: ["problems"], parent: "dont-want", keywords: ["chore"], svg: `` },
{ id: "change-plans", label: "Change plans", category: ["problems"], parent: "dont-want", keywords: [], svg: `` },

// Leaves under "Want to..."
{ id: "stop-want", label: "Stop", category: ["problems"], parent: "want", keywords: [], svg: `` },
{ id: "be-alone", label: "Be alone", category: ["problems"], parent: "want", keywords: ["space"], svg: `` },
{ id: "have-more-time", label: "Have more time", category: ["problems"], parent: "want", keywords: [], svg: `` },

// Leaves under "Something I'm doing..."
{ id: "is-too-hard", label: "Is too hard", category: ["problems"], parent: "doing", keywords: ["difficult"], svg: `` },
{ id: "went-wrong", label: "Went wrong", category: ["problems"], parent: "doing", keywords: ["mistake"], svg: `` },
{ id: "didnt-work", label: "Didn't work", category: ["problems"], parent: "doing", keywords: ["fail"], svg: `` },

// Leaves under "Sensory"
{ id: "bad-noise", label: "Bad noise", category: ["problems"], parent: "sensory", keywords: ["loud"], svg: `` },
{ id: "bad-smell", label: "Bad smell", category: ["problems"], parent: "sensory", keywords: ["stink"], svg: `` },
{ id: "bad-touch", label: "Bad touch", category: ["problems"], parent: "sensory", keywords: [], svg: `` },
{ id: "too-bright", label: "Too bright", category: ["problems"], parent: "sensory", keywords: [], svg: `` },
{ id: "too-cold", label: "Too cold", category: ["problems"], parent: "sensory", keywords: [], svg: `` },
{ id: "too-hot", label: "Too hot", category: ["problems"], parent: "sensory", keywords: [], svg: `` },
{ id: "itchy", label: "Itchy", category: ["problems"], parent: "sensory", keywords: [], svg: `` },
{ id: "too-many-people", label: "Too many people", category: ["problems"], parent: "sensory", keywords: ["crowd"], svg: `` },
{ id: "i-got-wet", label: "I got wet", category: ["problems"], parent: "sensory", keywords: ["spill"], svg: `` },
];
