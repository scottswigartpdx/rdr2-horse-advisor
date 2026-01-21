const fs = require('fs');
const animals = JSON.parse(fs.readFileSync('../animals.json', 'utf8'));
const crafting = JSON.parse(fs.readFileSync('../crafting.json', 'utf8'));

// Build map of ingredient -> crafting locations
const ingredientToLocations = {};
for (const recipe of crafting.craftingRecipes) {
  if (!recipe.ingredients) continue;
  for (const ing of recipe.ingredients) {
    const item = ing.item.toLowerCase();
    if (!ingredientToLocations[item]) ingredientToLocations[item] = new Set();
    ingredientToLocations[item].add(recipe.craftedAt);
  }
}

// Exotic birds for Algernon
const algernonBirds = ['egret', 'heron', 'spoonbill', 'parakeet', 'parrot', 'macaw'];

// Flying birds that provide Flight Feathers (for Field crafting arrows)
// All birds except Turkey, Rooster, Chicken provide Flight Feathers
const flyingBirdTerms = [
  'eagle', 'hawk', 'owl', 'crow', 'raven', 'robin', 'cardinal', 'oriole',
  'sparrow', 'songbird', 'woodpecker', 'jay', 'waxwing', 'duck', 'goose',
  'pelican', 'crane', 'cormorant', 'gull', 'loon', 'booby', 'condor',
  'vulture', 'pigeon', 'pheasant', 'quail', 'egret', 'heron', 'spoonbill',
  'parakeet', 'macaw'
];

// Birds that do NOT provide Flight Feathers (actual turkeys, not turkey vultures)
const noFlightFeatherPatterns = ['wild turkey', 'rooster', 'chicken'];

function isFlyingBird(name) {
  const lower = name.toLowerCase();
  // Check if it's a bird that doesn't give flight feathers
  if (noFlightFeatherPatterns.some(b => lower.includes(b))) return false;
  // Check if it matches any flying bird term
  return flyingBirdTerms.some(b => lower.includes(b));
}

// Helper to normalize animal name
function normalizeAnimal(name) {
  return name.toLowerCase()
    .replace('legendary ', '')
    .replace('american ', '')
    .replace('north american ', '')
    .replace('california ', '')
    .replace('californian ', '')
    .replace('western ', '')
    .replace('sierra nevada ', '')
    .replace('rocky mountain ', '')
    .replace('banded ', '')
    .replace('bharati grizzly ', '')
    .replace('giaguaro ', '')
    .replace('bull gator', 'alligator')
    .replace(/ ?\(.*\)/, '')
    .trim();
}

// Update animals with usedBy
animals.animals = animals.animals.map(a => {
  if (a.type === 'fish') {
    a.usedBy = ['Cooking'];
    return a;
  }

  const usedBy = new Set();
  const normalized = normalizeAnimal(a.name);

  // Get base animal name (last word usually)
  const words = normalized.split(' ');
  const baseAnimal = words[words.length - 1];

  // Check all ingredients for matches
  for (const [ingredient, locations] of Object.entries(ingredientToLocations)) {
    // Check if ingredient contains this animal
    if (ingredient.includes(baseAnimal) ||
        ingredient.includes(normalized) ||
        (a.legendary && ingredient.includes('legendary'))) {
      locations.forEach(loc => usedBy.add(loc));
    }
  }

  // Check if exotic bird for Algernon
  if (algernonBirds.some(bird => a.name.toLowerCase().includes(bird))) {
    usedBy.add('Algernon');
  }

  // Flying birds provide Flight Feathers -> Field crafting
  if (isFlyingBird(a.name)) {
    usedBy.add('Field');
  }

  a.usedBy = usedBy.size > 0 ? [...usedBy] : [];
  return a;
});

fs.writeFileSync('../animals.json', JSON.stringify(animals, null, 2));

// Summary
const withUses = animals.animals.filter(a => a.usedBy && a.usedBy.length > 0);
console.log('Animals with uses:', withUses.length);
const allLocations = new Set();
withUses.forEach(a => a.usedBy.forEach(u => allLocations.add(u)));
console.log('All usedBy values:', [...allLocations].sort());

// Show some examples
console.log('\nExamples:');
animals.animals.slice(0, 10).forEach(a => {
  console.log(`  ${a.name}: [${a.usedBy.join(', ')}]`);
});
