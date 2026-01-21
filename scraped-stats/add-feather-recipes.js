const fs = require('fs');
const crafting = JSON.parse(fs.readFileSync('../crafting.json', 'utf8'));

// New Trapper feather recipes from Fandom wiki
const newRecipes = [
  {
    name: "Deer Cavalry Hat",
    category: "Hat",
    subcategory: "Trapper Hat",
    craftedAt: "Trapper",
    ingredients: [
      { item: "Raven Feather", qty: 10 }
    ]
  },
  {
    name: "Bison Gambler's Hat",
    category: "Hat",
    subcategory: "Trapper Hat",
    craftedAt: "Trapper",
    ingredients: [
      { item: "Oriole Feather", qty: 4 },
      { item: "Robin Feather", qty: 4 }
    ]
  },
  {
    name: "Stalker Accessory",
    category: "Accessory",
    subcategory: "Hat Accessory",
    craftedAt: "Trapper",
    ingredients: [
      { item: "Condor Feather", qty: 1 },
      { item: "Loon Feather", qty: 2 },
      { item: "Raven Feather", qty: 3 }
    ]
  },
  {
    name: "Scavenger Accessory",
    category: "Accessory",
    subcategory: "Hat Accessory",
    craftedAt: "Trapper",
    ingredients: [
      { item: "Seagull Feather", qty: 1 },
      { item: "Vulture Feather", qty: 1 }
    ]
  },
  {
    name: "Native Accessory",
    category: "Accessory",
    subcategory: "Hat Accessory",
    craftedAt: "Trapper",
    ingredients: [
      { item: "Pheasant Feather", qty: 1 },
      { item: "Robin Feather", qty: 3 },
      { item: "Sparrow Feather", qty: 4 }
    ]
  },
  {
    name: "Pilgrim Accessory",
    category: "Accessory",
    subcategory: "Hat Accessory",
    craftedAt: "Trapper",
    ingredients: [
      { item: "Blue Jay Feather", qty: 3 },
      { item: "Cedar Waxwing Feather", qty: 2 },
      { item: "Turkey Feather", qty: 1 }
    ]
  },
  {
    name: "Huntsman Accessory",
    category: "Accessory",
    subcategory: "Hat Accessory",
    craftedAt: "Trapper",
    ingredients: [
      { item: "Boar Pelt", qty: 1 },
      { item: "Hawk Feather", qty: 1 },
      { item: "Quail Feather", qty: 2 }
    ]
  },
  {
    name: "Pioneer Accessory",
    category: "Accessory",
    subcategory: "Hat Accessory",
    craftedAt: "Trapper",
    ingredients: [
      { item: "Chicken Feather", qty: 3 },
      { item: "Duck Feather", qty: 3 },
      { item: "Turkey Feather", qty: 3 }
    ]
  },
  {
    name: "Rococo Accessory",
    category: "Accessory",
    subcategory: "Hat Accessory",
    craftedAt: "Trapper",
    ingredients: [
      { item: "Cardinal Feather", qty: 2 },
      { item: "Crow Feather", qty: 2 }
    ]
  },
  {
    name: "Glorious Accessory",
    category: "Accessory",
    subcategory: "Hat Accessory",
    craftedAt: "Trapper",
    ingredients: [
      { item: "Oriole Feather", qty: 1 },
      { item: "Woodpecker Feather", qty: 4 }
    ]
  },
  {
    name: "Pursuer Accessory",
    category: "Accessory",
    subcategory: "Hat Accessory",
    craftedAt: "Trapper",
    ingredients: [
      { item: "Eagle Feather", qty: 2 },
      { item: "Pigeon Feather", qty: 2 }
    ]
  },
  {
    name: "Majestic Accessory",
    category: "Accessory",
    subcategory: "Hat Accessory",
    craftedAt: "Trapper",
    ingredients: [
      { item: "Rooster Feather", qty: 4 },
      { item: "Songbird Feather", qty: 2 },
      { item: "Woodpecker Feather", qty: 2 }
    ]
  },
  {
    name: "Homestead Accessory",
    category: "Accessory",
    subcategory: "Hat Accessory",
    craftedAt: "Trapper",
    ingredients: [
      { item: "Chicken Feather", qty: 1 },
      { item: "Goose Feather", qty: 2 }
    ]
  },
  {
    name: "Judicious Accessory",
    category: "Accessory",
    subcategory: "Hat Accessory",
    craftedAt: "Trapper",
    ingredients: [
      { item: "Owl Feather", qty: 1 },
      { item: "Pheasant Feather", qty: 1 }
    ]
  }
];

// Check for existing recipes and add new ones
const existingNames = new Set(crafting.craftingRecipes.map(r => r.name.toLowerCase()));
let added = 0;

for (const recipe of newRecipes) {
  if (!existingNames.has(recipe.name.toLowerCase())) {
    crafting.craftingRecipes.push(recipe);
    console.log('Added:', recipe.name);
    added++;
  } else {
    console.log('Skipped (exists):', recipe.name);
  }
}

fs.writeFileSync('../crafting.json', JSON.stringify(crafting, null, 2));
console.log('\nTotal added:', added);
console.log('Total recipes now:', crafting.craftingRecipes.length);
