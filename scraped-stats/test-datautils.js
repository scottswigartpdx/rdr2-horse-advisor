const DataUtils = require('../dataUtils.js');
const animals = require('../animals.json');
const crafting = require('../crafting.json');

// Enrich animals
const enriched = DataUtils.enrichAnimalsData(animals.animals, crafting.craftingRecipes);

// Test robin
const robin = enriched.find(a => a.name === 'American Robin');
console.log('American Robin:');
console.log('  usedBy:', robin.usedBy);
console.log('  unlocks:', robin.unlocks.map(u => u.name));

// Test rooster
const rooster = enriched.find(a => a.name === 'Dominique Rooster');
console.log('\nDominique Rooster:');
console.log('  usedBy:', rooster.usedBy);
console.log('  unlocks:', rooster.unlocks.map(u => u.name));

// Summary
const withUnlocks = enriched.filter(a => a.unlocks && a.unlocks.length > 0);
const withUsedBy = enriched.filter(a => a.usedBy && a.usedBy.length > 0);
console.log('\nSummary:');
console.log('  Animals with unlocks:', withUnlocks.length);
console.log('  Animals with usedBy:', withUsedBy.length);
