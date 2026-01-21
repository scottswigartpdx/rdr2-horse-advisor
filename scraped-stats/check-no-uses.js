const a = require('../animals.json');
const noUses = a.animals.filter(x => x.type === 'animal' && (!x.usedBy || x.usedBy.length === 0));
console.log('Animals with no crafting uses (' + noUses.length + '):');
noUses.forEach(x => console.log('  -', x.name));
