const normalized = require('./weapon-stats-normalized.json');
const local = require('./local.json');

// Get all weapon names from our app (normalized for matching)
function norm(name) {
  return name.toLowerCase().replace(/['']/g, "'").replace(/\s+/g, ' ').trim();
}

const ourWeapons = new Set(local.weapons.map(w => norm(w.name)));

// Get all unique weapon names from external sources
const externalMap = {};
for (const w of normalized) {
  const key = norm(w.weapon);
  if (!externalMap[key]) {
    externalMap[key] = {
      name: w.weapon,
      damage: w.damage.average,
      sources: []
    };
  }
  // Count sources
  const d = w.damage;
  if (d.fandom !== null) externalMap[key].sources.push('Fandom');
  if (d.gamewith !== null) externalMap[key].sources.push('GameWith');
  if (d.rankedboost !== null) externalMap[key].sources.push('RankedBoost');
  if (d.gtabase !== null) externalMap[key].sources.push('GTABase');
  if (d.gamerevolution !== null) externalMap[key].sources.push('GameRev');
  if (d.googlesheets !== null) externalMap[key].sources.push('GSheets');
  if (d.github !== null) externalMap[key].sources.push('GitHub');
}

// Find weapons in external but not in our app
const missing = [];
for (const [key, data] of Object.entries(externalMap)) {
  if (!ourWeapons.has(key)) {
    missing.push({
      name: data.name,
      damage: data.damage,
      sourceCount: [...new Set(data.sources)].length,
      sources: [...new Set(data.sources)].join(', ')
    });
  }
}

// Sort by source count (most sources first)
missing.sort((a, b) => b.sourceCount - a.sourceCount);

console.log('Weapons in external sources but NOT in our app:\n');
console.log('| Weapon | Damage | Sources | Source Names |');
console.log('|--------|--------|---------|--------------|');
for (const w of missing) {
  console.log(`| ${w.name} | ${w.damage || 'N/A'} | ${w.sourceCount} | ${w.sources || 'none'} |`);
}
console.log('\nTotal missing:', missing.length);
