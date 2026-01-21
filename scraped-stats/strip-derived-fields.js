/**
 * Strip derived fields (unlocks, usedBy) from animals.json
 * These are now computed at runtime by dataUtils.js
 */
const fs = require('fs');
const animals = JSON.parse(fs.readFileSync('../animals.json', 'utf8'));

// Remove derived fields
animals.animals = animals.animals.map(a => {
  const { unlocks, usedBy, ...rest } = a;
  return rest;
});

fs.writeFileSync('../animals.json', JSON.stringify(animals, null, 2));

console.log('Stripped unlocks and usedBy from', animals.animals.length, 'animals');
console.log('Fields remaining:', Object.keys(animals.animals[0]).join(', '));
