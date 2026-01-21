const crafting = require('../crafting.json');
const animals = require('../animals.json');

// Find recipes that mention small birds
const birdTerms = ['robin', 'woodpecker', 'cardinal', 'oriole', 'sparrow', 'songbird', 'bluejay', 'blue jay', 'waxwing', 'crow', 'raven', 'owl', 'hawk', 'eagle', 'jay'];

console.log('=== CRAFTING RECIPES WITH SMALL BIRDS ===');
for (const recipe of crafting.craftingRecipes) {
  if (!recipe.ingredients) continue;
  for (const ing of recipe.ingredients) {
    const item = ing.item.toLowerCase();
    if (birdTerms.some(b => item.includes(b))) {
      console.log(recipe.name, '@', recipe.craftedAt);
      console.log('  ->', ing.item, '(qty:', ing.qty + ')');
    }
  }
}

console.log('\n=== SMALL BIRDS IN ANIMALS.JSON ===');
const smallBirds = animals.animals.filter(a =>
  a.type === 'animal' &&
  birdTerms.some(b => a.name.toLowerCase().includes(b))
);
smallBirds.forEach(b => {
  console.log(b.name, '-> usedBy:', (b.usedBy || []).join(', ') || 'NONE');
});

// Check which birds have no usedBy
console.log('\n=== BIRDS WITH NO CRAFTING USES ===');
smallBirds.filter(b => !b.usedBy || b.usedBy.length === 0).forEach(b => {
  console.log('  -', b.name);
});
