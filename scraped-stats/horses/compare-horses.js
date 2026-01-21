const fs = require('fs');

// Load data
const local = JSON.parse(fs.readFileSync('./local.json', 'utf8'));
const fandom = JSON.parse(fs.readFileSync('./fandom-horses.json', 'utf8'));
const rankedboost = JSON.parse(fs.readFileSync('./rankedboost-horses.json', 'utf8'));
const nkbgaming = JSON.parse(fs.readFileSync('./nkbgaming-horses.json', 'utf8'));

// Normalize coat names for matching
function normCoat(coat) {
  return coat.toLowerCase()
    .replace(/['']/g, "'")
    .replace(/\s+/g, ' ')
    .replace(/-/g, ' ')
    .replace(/\(online\)/gi, '')
    .replace(/\(story\)/gi, '')
    .replace(/\(war horse\)/gi, '')
    .replace(/\(buell\)/gi, '')
    .replace(/\(rachel\)/gi, '')
    .replace('few spotted', 'few spot')
    .replace('leopard appaloosa', 'leopard')
    .replace('iron grey', 'iron grey roan')
    .replace('blonde chestnut', 'blond chestnut')
    .trim();
}

function normBreed(breed) {
  return breed.toLowerCase()
    .replace(/['']/g, "'")
    .replace(/\s+/g, ' ')
    .replace(/-/g, ' ')
    .replace('half bred', 'halfbred')
    .replace('belgian draft', 'belgian')
    .replace('suffolk punch', 'suffolk punch')
    .trim();
}

// Create key for horse matching
function makeKey(breed, coat) {
  return normBreed(breed) + '|' + normCoat(coat);
}

// Build external data maps
const externalData = {};

function addSource(horses, sourceName) {
  for (const h of horses) {
    const key = makeKey(h.breed, h.coat);
    if (!externalData[key]) {
      externalData[key] = {
        breed: h.breed,
        coat: h.coat,
        sources: {}
      };
    }
    externalData[key].sources[sourceName] = {
      health: h.health,
      stamina: h.stamina,
      speed: h.speed,
      acceleration: h.acceleration
    };
  }
}

addSource(fandom, 'fandom');
addSource(rankedboost, 'rankedboost');
addSource(nkbgaming, 'nkbgaming');

// Calculate averages for external data (only for matching sources)
for (const key of Object.keys(externalData)) {
  const sources = externalData[key].sources;
  const sourceNames = Object.keys(sources);

  if (sourceNames.length > 0) {
    // For each stat, collect values from all sources
    const stats = ['health', 'stamina', 'speed', 'acceleration'];
    const avg = {};
    const details = {};

    for (const stat of stats) {
      const values = sourceNames.map(src => sources[src][stat]);
      avg[stat] = Math.round(values.reduce((a, b) => a + b, 0) / values.length * 10) / 10;
      details[stat] = {
        values: values,
        min: Math.min(...values),
        max: Math.max(...values),
        spread: Math.max(...values) - Math.min(...values)
      };
    }

    externalData[key].average = avg;
    externalData[key].details = details;
    externalData[key].sourceCount = sourceNames.length;
    externalData[key].sourceNames = sourceNames;
  }
}

// Compare our horses against external data
const comparisons = [];
const notFound = [];

for (const horse of local.horses) {
  const key = makeKey(horse.breed, horse.coat);
  const ext = externalData[key];

  if (ext && ext.average) {
    const our = horse.baseStats;
    const avg = ext.average;

    const diffs = {
      health: Math.round((our.health - avg.health) * 10) / 10,
      stamina: Math.round((our.stamina - avg.stamina) * 10) / 10,
      speed: Math.round((our.speed - avg.speed) * 10) / 10,
      acceleration: Math.round((our.acceleration - avg.acceleration) * 10) / 10
    };

    const maxDiff = Math.max(
      Math.abs(diffs.health),
      Math.abs(diffs.stamina),
      Math.abs(diffs.speed),
      Math.abs(diffs.acceleration)
    );

    comparisons.push({
      breed: horse.breed,
      coat: horse.coat,
      our: our,
      external: avg,
      diffs: diffs,
      maxDiff: maxDiff,
      sourceCount: ext.sourceCount,
      sourceNames: ext.sourceNames,
      details: ext.details,
      sources: ext.sources
    });
  } else {
    notFound.push({ breed: horse.breed, coat: horse.coat });
  }
}

// Sort by max difference
comparisons.sort((a, b) => b.maxDiff - a.maxDiff);

// Output markdown report
let md = `# Horse Stats Comparison: Our App vs External Sources

## Summary
- **Our horses**: ${local.horses.length}
- **Matched with external**: ${comparisons.length}
- **Not found in external**: ${notFound.length}
- **Sources**: Fandom, RankedBoost, NKB Gaming

## Horses With Discrepancies (sorted by max diff)

| Breed | Coat | Stat | Ours | Ext Avg | Diff | Sources | Source Values |
|-------|------|------|------|---------|------|---------|---------------|
`;

const withDiffs = comparisons.filter(c => c.maxDiff > 0);
for (const c of withDiffs) {
  const stats = ['health', 'stamina', 'speed', 'acceleration'];
  for (const stat of stats) {
    if (c.diffs[stat] !== 0) {
      const sign = c.diffs[stat] > 0 ? '+' : '';
      const flag = Math.abs(c.diffs[stat]) >= 2 ? ' ⚠️' : '';
      const sourceVals = c.sourceNames.map(s => `${s.slice(0,3)}:${c.sources[s][stat]}`).join(', ');
      md += `| ${c.breed} | ${c.coat} | ${stat} | ${c.our[stat]} | ${c.external[stat]} | ${sign}${c.diffs[stat]}${flag} | ${c.sourceCount} | ${sourceVals} |\n`;
    }
  }
}

// Summary stats
const exactMatch = comparisons.filter(c => c.maxDiff === 0).length;
const smallDiff = comparisons.filter(c => c.maxDiff > 0 && c.maxDiff < 2).length;
const largeDiff = comparisons.filter(c => c.maxDiff >= 2).length;

md += `
## Stats Summary
- **Exact match**: ${exactMatch} horses
- **Small diff (< 2)**: ${smallDiff} horses
- **Large diff (>= 2)**: ${largeDiff} horses

`;

if (notFound.length > 0) {
  md += `## Horses Not Found in External Sources\n\n`;
  for (const h of notFound) {
    md += `- ${h.breed} (${h.coat})\n`;
  }
}

// Sources agreement section
md += `\n## Source Agreement Analysis\n\n`;
md += `Showing horses where sources disagree (spread > 1):\n\n`;
md += `| Breed | Coat | Stat | Spread | Fandom | RankedBoost | NKB |\n`;
md += `|-------|------|------|--------|--------|-------------|-----|\n`;

for (const c of comparisons) {
  const stats = ['health', 'stamina', 'speed', 'acceleration'];
  for (const stat of stats) {
    if (c.details[stat].spread > 1) {
      const f = c.sources.fandom ? c.sources.fandom[stat] : '-';
      const r = c.sources.rankedboost ? c.sources.rankedboost[stat] : '-';
      const n = c.sources.nkbgaming ? c.sources.nkbgaming[stat] : '-';
      md += `| ${c.breed} | ${c.coat} | ${stat} | ${c.details[stat].spread} | ${f} | ${r} | ${n} |\n`;
    }
  }
}

fs.writeFileSync('./horse-comparison.md', md);
console.log('Created horse-comparison.md');

// Output JSON for programmatic use
const jsonOutput = {
  summary: {
    ourHorses: local.horses.length,
    matched: comparisons.length,
    notFound: notFound.length,
    exactMatch: exactMatch,
    smallDiff: smallDiff,
    largeDiff: largeDiff,
    sources: ['Fandom', 'RankedBoost', 'NKB Gaming']
  },
  discrepancies: withDiffs.map(c => ({
    breed: c.breed,
    coat: c.coat,
    our: c.our,
    external: c.external,
    diffs: c.diffs,
    sourceCount: c.sourceCount,
    sources: c.sources
  })),
  notFound: notFound
};

fs.writeFileSync('./horse-comparison.json', JSON.stringify(jsonOutput, null, 2));
console.log('Created horse-comparison.json');

// Print quick summary
console.log('\n--- Quick Summary ---');
console.log(`Sources: Fandom, RankedBoost, NKB Gaming`);
console.log(`Matched: ${comparisons.length}/${local.horses.length}`);
console.log(`Exact match: ${exactMatch}`);
console.log(`With differences: ${withDiffs.length}`);
console.log(`Large differences (>=2): ${largeDiff}`);
