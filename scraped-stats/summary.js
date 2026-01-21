const a = require('../animals.json');
const c = require('../crafting.json');

console.log('=== DATA SUMMARY ===');
console.log('Animals:', a.animals.filter(x => x.type === 'animal').length);
console.log('Fish:', a.animals.filter(x => x.type === 'fish').length);
console.log('Crafting recipes:', c.craftingRecipes.length);
console.log();

console.log('=== USEDBY COUNTS ===');
const animals = a.animals.filter(x => x.type === 'animal');
console.log('Field:', animals.filter(x => x.usedBy?.includes('Field')).length);
console.log('Trapper:', animals.filter(x => x.usedBy?.includes('Trapper')).length);
console.log('Fence:', animals.filter(x => x.usedBy?.includes('Fence')).length);
console.log('Pearson:', animals.filter(x => x.usedBy?.includes('Pearson')).length);
console.log('Algernon:', animals.filter(x => x.usedBy?.includes('Algernon')).length);
console.log();

const noUses = animals.filter(x => !x.usedBy || x.usedBy.length === 0);
console.log('Animals with no uses:', noUses.length);
if (noUses.length > 0) {
  console.log('  Examples:', noUses.slice(0, 10).map(x => x.name).join(', '));
}
