const fs = require('fs');

// Load all data files
const fandom = JSON.parse(fs.readFileSync('./fandom-browser.json', 'utf8'));
const gamewith = JSON.parse(fs.readFileSync('./gamewith.json', 'utf8'));
const rankedboost = JSON.parse(fs.readFileSync('./rankedboost.json', 'utf8'));
const gtabase = JSON.parse(fs.readFileSync('./gtabase.json', 'utf8'));
const gamerevolution = JSON.parse(fs.readFileSync('./gamerevolution.json', 'utf8'));
const googlesheets = JSON.parse(fs.readFileSync('./google-sheets-community.json', 'utf8'));
const jellysquider = JSON.parse(fs.readFileSync('./jellysquider-github.json', 'utf8'));

// Normalize weapon names for matching
function normalize(name) {
  return name.toLowerCase()
    .replace(/['']/g, "'")
    .replace(/\s+/g, ' ')
    .replace(/-/g, '-')
    .trim();
}

// Scale conversions to 1-4 scale
const scale1to4 = (val) => val ? Math.round(val * 10) / 10 : null;  // keep as-is, round to 1 decimal
const scale0to100 = (val) => val ? Math.round((val / 25) * 10) / 10 : null;  // divide by 25
const scale1to10 = (val) => val ? Math.round((val / 2.5) * 10) / 10 : null;  // divide by 2.5

// Parse GameRevolution damage (e.g., "5.5/10" -> 5.5)
function parseGR(val) {
  if (!val) return null;
  const match = val.match(/([\d.]+)/);
  return match ? parseFloat(match[1]) : null;
}

// Build normalized maps
function buildNormalizedMap(weapons, scaleFn, parseVal = (v) => v) {
  const map = {};
  for (const w of weapons) {
    const key = normalize(w.name);
    map[key] = {
      name: w.name,
      damage: scaleFn(parseVal(w.damage)),
      range: scaleFn(parseVal(w.range)),
      fireRate: scaleFn(parseVal(w.fireRate || w.firingRate)),
      accuracy: scaleFn(parseVal(w.accuracy)),
      reload: scaleFn(parseVal(w.reload || w.reloadingSpeed)),
    };
  }
  return map;
}

const fandomMap = buildNormalizedMap(fandom.weapons, scale1to4);
const gamewithMap = buildNormalizedMap(gamewith.weapons, scale1to4);
const rankedboostMap = buildNormalizedMap(rankedboost.weapons, scale1to4);
const gtabaseMap = buildNormalizedMap(gtabase.weapons, scale0to100);
const gamerevolutionMap = buildNormalizedMap(gamerevolution.weapons, scale1to10, parseGR);
const googlesheetsMap = buildNormalizedMap(googlesheets.weapons, scale0to100);
const jellysquiderMap = buildNormalizedMap(jellysquider.weapons, scale1to4);

// Get all unique weapon names
const allNames = new Set();
[fandom, gamewith, rankedboost, gtabase, gamerevolution, googlesheets, jellysquider].forEach(source => {
  source.weapons.forEach(w => allNames.add(normalize(w.name)));
});

// Canonical name mapping (pick best casing)
const canonicalNames = {};
[fandom, googlesheets, gtabase, jellysquider, gamewith, rankedboost, gamerevolution].forEach(source => {
  source.weapons.forEach(w => {
    const key = normalize(w.name);
    // Prefer non-ALL-CAPS names
    if (!canonicalNames[key] || (w.name !== w.name.toUpperCase() && canonicalNames[key] === canonicalNames[key].toUpperCase())) {
      canonicalNames[key] = w.name;
    }
  });
});

// Build comparison with normalized values (all on 0-100 scale)
const results = [];

for (const key of [...allNames].sort()) {
  const sources = {
    fandom: fandomMap[key],
    gamewith: gamewithMap[key],
    rankedboost: rankedboostMap[key],
    gtabase: gtabaseMap[key],
    gamerevolution: gamerevolutionMap[key],
    googlesheets: googlesheetsMap[key],
    jellysquider: jellysquiderMap[key],
  };

  // Collect damage values
  const damageValues = Object.values(sources).map(s => s?.damage).filter(v => v !== null && v !== undefined);
  const avgDamage = damageValues.length ? Math.round((damageValues.reduce((a, b) => a + b, 0) / damageValues.length) * 10) / 10 : null;
  const minDamage = damageValues.length ? Math.min(...damageValues) : null;
  const maxDamage = damageValues.length ? Math.max(...damageValues) : null;
  const spread = (minDamage && maxDamage) ? Math.round((maxDamage - minDamage) * 10) / 10 : null;

  results.push({
    weapon: canonicalNames[key] || key,
    fandom: sources.fandom?.damage ?? '',
    gamewith: sources.gamewith?.damage ?? '',
    rankedboost: sources.rankedboost?.damage ?? '',
    gtabase: sources.gtabase?.damage ?? '',
    gamerev: sources.gamerevolution?.damage ?? '',
    gsheets: sources.googlesheets?.damage ?? '',
    github: sources.jellysquider?.damage ?? '',
    avg: avgDamage ?? '',
    min: minDamage ?? '',
    max: maxDamage ?? '',
    spread: spread ?? '',
  });
}

// Output markdown
let md = `# RDR2 Weapon Damage - Normalized to 1-4 Scale

All values converted to 1-4 scale:
- 1-4 scale sources (Fandom, GameWith, RankedBoost, GitHub): unchanged
- 0-100 scale (GTABase, Google Sheets): divided by 25
- 1-10 scale (GameRevolution): divided by 2.5

## All Weapons - Damage Comparison

| Weapon | Fandom | GameWith | RankedBoost | GTABase | GameRev | GSheets | GitHub | **AVG** | Min | Max | Spread |
|--------|--------|----------|-------------|---------|---------|---------|--------|---------|-----|-----|--------|
`;

for (const r of results) {
  md += `| ${r.weapon} | ${r.fandom} | ${r.gamewith} | ${r.rankedboost} | ${r.gtabase} | ${r.gamerev} | ${r.gsheets} | ${r.github} | **${r.avg}** | ${r.min} | ${r.max} | ${r.spread} |\n`;
}

// Key revolvers section
md += `
## Key Revolvers - Normalized Damage (1-4 scale)

| Weapon | Fandom | GameWith | RankedBoost | GTABase | GSheets | GitHub | **AVG** | Spread |
|--------|--------|----------|-------------|---------|---------|--------|---------|--------|
`;

const keyRevolvers = [
  'cattleman revolver',
  "flaco's revolver",
  "granger's revolver",
  "john's cattleman revolver",
  'double-action revolver',
  "algernon's revolver",
  "micah's revolver",
  'schofield revolver',
  "calloway's revolver",
  "otis miller's revolver",
  'lemat revolver',
  'navy revolver',
  "lowry's revolver",
];

for (const key of keyRevolvers) {
  const r = results.find(x => normalize(x.weapon) === key);
  if (r) {
    md += `| ${r.weapon} | ${r.fandom} | ${r.gamewith} | ${r.rankedboost} | ${r.gtabase} | ${r.gsheets} | ${r.github} | **${r.avg}** | ${r.spread} |\n`;
  }
}

// Pistols
md += `
## Pistols - Normalized Damage (1-4 scale)

| Weapon | Fandom | GameWith | RankedBoost | GTABase | GSheets | GitHub | **AVG** | Spread |
|--------|--------|----------|-------------|---------|---------|--------|---------|--------|
`;

const pistols = results.filter(r =>
  r.weapon.toLowerCase().includes('pistol') &&
  !r.weapon.toLowerCase().includes('revolver')
).sort((a, b) => (b.avg || 0) - (a.avg || 0));

for (const r of pistols) {
  md += `| ${r.weapon} | ${r.fandom} | ${r.gamewith} | ${r.rankedboost} | ${r.gtabase} | ${r.gsheets} | ${r.github} | **${r.avg}** | ${r.spread} |\n`;
}

// Repeaters
md += `
## Repeaters - Normalized Damage (1-4 scale)

| Weapon | Fandom | GameWith | RankedBoost | GTABase | GSheets | GitHub | **AVG** | Spread |
|--------|--------|----------|-------------|---------|---------|--------|---------|--------|
`;

const repeaters = results.filter(r =>
  r.weapon.toLowerCase().includes('repeater')
).sort((a, b) => (b.avg || 0) - (a.avg || 0));

for (const r of repeaters) {
  md += `| ${r.weapon} | ${r.fandom} | ${r.gamewith} | ${r.rankedboost} | ${r.gtabase} | ${r.gsheets} | ${r.github} | **${r.avg}** | ${r.spread} |\n`;
}

// Rifles
md += `
## Rifles - Normalized Damage (1-4 scale)

| Weapon | Fandom | GameWith | RankedBoost | GTABase | GSheets | GitHub | **AVG** | Spread |
|--------|--------|----------|-------------|---------|---------|--------|---------|--------|
`;

const rifles = results.filter(r =>
  r.weapon.toLowerCase().includes('rifle') &&
  !r.weapon.toLowerCase().includes('repeater')
).sort((a, b) => (b.avg || 0) - (a.avg || 0));

for (const r of rifles) {
  md += `| ${r.weapon} | ${r.fandom} | ${r.gamewith} | ${r.rankedboost} | ${r.gtabase} | ${r.gsheets} | ${r.github} | **${r.avg}** | ${r.spread} |\n`;
}

// Shotguns
md += `
## Shotguns - Normalized Damage (1-4 scale)

| Weapon | Fandom | GameWith | RankedBoost | GTABase | GSheets | GitHub | **AVG** | Spread |
|--------|--------|----------|-------------|---------|---------|--------|---------|--------|
`;

const shotguns = results.filter(r =>
  r.weapon.toLowerCase().includes('shotgun')
).sort((a, b) => (b.avg || 0) - (a.avg || 0));

for (const r of shotguns) {
  md += `| ${r.weapon} | ${r.fandom} | ${r.gamewith} | ${r.rankedboost} | ${r.gtabase} | ${r.gsheets} | ${r.github} | **${r.avg}** | ${r.spread} |\n`;
}

fs.writeFileSync('./weapon-stats-normalized.md', md);
console.log('Created weapon-stats-normalized.md');

// Also create JSON
const jsonOutput = results.map(r => ({
  weapon: r.weapon,
  damage: {
    fandom: r.fandom || null,
    gamewith: r.gamewith || null,
    rankedboost: r.rankedboost || null,
    gtabase: r.gtabase || null,
    gamerevolution: r.gamerev || null,
    googlesheets: r.gsheets || null,
    github: r.github || null,
    average: r.avg || null,
    min: r.min || null,
    max: r.max || null,
    spread: r.spread || null,
  }
}));

fs.writeFileSync('./weapon-stats-normalized.json', JSON.stringify(jsonOutput, null, 2));
console.log('Created weapon-stats-normalized.json');
