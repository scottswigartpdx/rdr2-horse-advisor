const normalized = require('./weapon-stats-normalized.json');

// Get all weapon names from our app (canonicalized for matching).
// We intentionally treat punctuation/case/typography differences as the same weapon.
// We also collapse common "site naming" variants (e.g., "Volatile Dynamite" vs "Dynamite (Volatile)").
function weaponKey(name) {
  const raw = String(name ?? '')
    .toLowerCase()
    .replace(/[’]/g, "'")
    .replace(/'/g, '') // treat apostrophe variants as identical
    // Keep meaningful parenthetical variants (e.g., "(Volatile)"); strip only "online" tags.
    .replace(/[()]/g, ' ')
    .replace(/\bonline\b/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');

  const alias = {
    // ordering / labeling differences
    'volatile dynamite': 'dynamite volatile',
    'volatile fire bottle': 'fire bottle volatile',
    'improved throwing knife': 'throwing knife improved',
    'poison throwing knife': 'throwing knife poison',
    'improved tomahawk': 'tomahawk improved',
    'homing tomahawk': 'tomahawk homing',

    // pluralization / naming convenience
    'fire bottles': 'fire bottle',
    'bow and arrows': 'bow',
    'fist': 'unarmed',

    // adjective form differences
    'double barrel shotgun': 'double barreled shotgun',
    'semi automatic shotgun': 'semi auto shotgun',
  };

  return alias[raw] || raw;
}

// Story-only mode: ignore Red Dead Online-only items so they don't appear as "missing".
const STORY_ONLY_IGNORE_KEYS = new Set([
  weaponKey('navy revolver'),
  weaponKey("lowry's revolver"),
  weaponKey('bolas'),
  weaponKey('reinforced lasso'),
  weaponKey('toxic moonshine bottle'),
  weaponKey('hammer'),
  weaponKey('improved bow'),
  weaponKey('improved bow and arrows'),
  weaponKey('improved bow arrows'),
]);

const ourWeapons = new Set(require('../weapons.json').weapons.map(w => weaponKey(w.name)));

// Get all unique weapon names from external sources
const externalMap = {};
for (const w of normalized) {
  const key = weaponKey(w.weapon);
  if (STORY_ONLY_IGNORE_KEYS.has(key)) continue;
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
