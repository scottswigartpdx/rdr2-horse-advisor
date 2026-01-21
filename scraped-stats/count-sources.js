const data = require('./weapon-stats-normalized.json');

// Count sources per weapon (combining duplicates)
const weaponSources = {};

for (const w of data) {
  const key = w.weapon.toLowerCase();
  if (!weaponSources[key]) {
    weaponSources[key] = { name: w.weapon, sources: new Set() };
  }

  const d = w.damage;
  if (d.fandom !== null) weaponSources[key].sources.add('Fandom');
  if (d.gamewith !== null) weaponSources[key].sources.add('GameWith');
  if (d.rankedboost !== null) weaponSources[key].sources.add('RankedBoost');
  if (d.gtabase !== null) weaponSources[key].sources.add('GTABase');
  if (d.gamerevolution !== null) weaponSources[key].sources.add('GameRev');
  if (d.googlesheets !== null) weaponSources[key].sources.add('GSheets');
  if (d.github !== null) weaponSources[key].sources.add('GitHub');
}

// Convert to array and sort by source count
const results = Object.values(weaponSources)
  .map(w => ({ name: w.name, count: w.sources.size, sources: [...w.sources].join(', ') }))
  .sort((a, b) => a.count - b.count);

console.log('Weapons by number of sources:\n');
console.log('| Count | Weapon | Sources |');
console.log('|-------|--------|---------|');
for (const r of results) {
  console.log(`| ${r.count} | ${r.name} | ${r.sources} |`);
}

// Summary
const counts = {};
for (const r of results) {
  counts[r.count] = (counts[r.count] || 0) + 1;
}
console.log('\n--- Summary ---');
for (const [count, num] of Object.entries(counts).sort((a,b) => a[0]-b[0])) {
  console.log(`${count} source(s): ${num} weapons`);
}
