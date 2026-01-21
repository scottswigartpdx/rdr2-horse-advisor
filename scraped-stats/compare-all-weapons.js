const fs = require('fs');

// Load data
const local = JSON.parse(fs.readFileSync('./local.json', 'utf8'));
const normalized = JSON.parse(fs.readFileSync('./weapon-stats-normalized.json', 'utf8'));

// Normalize weapon names for matching
function normalize(name) {
  return name.toLowerCase()
    .replace(/['']/g, "'")
    .replace(/\s+/g, ' ')
    .replace(/-/g, '-')
    .trim();
}

// Build normalized map from external sources (combine duplicates by averaging)
const externalMap = {};
for (const w of normalized) {
  const key = normalize(w.weapon);
  if (!externalMap[key]) {
    externalMap[key] = {
      name: w.weapon,
      damage: w.damage.average,
      sources: []
    };
  }
  // Collect all averages if duplicates exist
  if (w.damage.average) {
    externalMap[key].sources.push(w.damage.average);
  }
}

// Calculate true average for weapons with duplicate entries
for (const key of Object.keys(externalMap)) {
  const sources = externalMap[key].sources;
  if (sources.length > 1) {
    externalMap[key].damage = Math.round((sources.reduce((a, b) => a + b, 0) / sources.length) * 10) / 10;
  }
}

// Compare each weapon in our app
const comparisons = [];
const notFound = [];

for (const weapon of local.weapons) {
  const key = normalize(weapon.name);
  const external = externalMap[key];

  if (external && external.damage !== null) {
    const ourDamage = weapon.damage;
    const extDamage = external.damage;
    const diff = Math.round((ourDamage - extDamage) * 10) / 10;

    comparisons.push({
      name: weapon.name,
      ourDamage,
      extDamage,
      diff,
      diffPercent: Math.round((diff / extDamage) * 100)
    });
  } else {
    notFound.push(weapon.name);
  }
}

// Sort by absolute difference (largest first)
comparisons.sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff));

// Output markdown
let md = `# Our App vs External Sources - Full Comparison

All damage values normalized to 1-4 scale.

## Weapons With Significant Discrepancies (diff > 0.2)

| Weapon | Our App | External AVG | Diff | % Diff |
|--------|---------|--------------|------|--------|
`;

const significant = comparisons.filter(c => Math.abs(c.diff) > 0.2);
for (const c of significant) {
  const flag = Math.abs(c.diff) >= 0.5 ? ' ⚠️' : '';
  md += `| ${c.name} | ${c.ourDamage} | ${c.extDamage} | ${c.diff > 0 ? '+' : ''}${c.diff}${flag} | ${c.diffPercent > 0 ? '+' : ''}${c.diffPercent}% |\n`;
}

md += `
## All Weapons Comparison (sorted by difference)

| Weapon | Our App | External AVG | Diff | % Diff | Status |
|--------|---------|--------------|------|--------|--------|
`;

for (const c of comparisons) {
  let status = '✅';
  if (Math.abs(c.diff) >= 0.5) status = '❌ WRONG';
  else if (Math.abs(c.diff) > 0.2) status = '⚠️ Check';
  else if (Math.abs(c.diff) > 0.1) status = '~';

  md += `| ${c.name} | ${c.ourDamage} | ${c.extDamage} | ${c.diff > 0 ? '+' : ''}${c.diff} | ${c.diffPercent > 0 ? '+' : ''}${c.diffPercent}% | ${status} |\n`;
}

if (notFound.length > 0) {
  md += `
## Weapons Not Found in External Sources

These weapons exist in our app but weren't matched in external data:
`;
  for (const name of notFound) {
    md += `- ${name}\n`;
  }
}

// Summary
const wrongCount = comparisons.filter(c => Math.abs(c.diff) >= 0.5).length;
const checkCount = comparisons.filter(c => Math.abs(c.diff) > 0.2 && Math.abs(c.diff) < 0.5).length;
const okCount = comparisons.filter(c => Math.abs(c.diff) <= 0.2).length;

md += `
## Summary

- **Total weapons compared**: ${comparisons.length}
- **❌ WRONG (diff >= 0.5)**: ${wrongCount}
- **⚠️ Check (diff > 0.2)**: ${checkCount}
- **✅ OK (diff <= 0.2)**: ${okCount}
- **Not found in external sources**: ${notFound.length}
`;

fs.writeFileSync('./weapon-comparison-full.md', md);
console.log('Created weapon-comparison-full.md');

// Also output JSON
const jsonOutput = {
  summary: {
    total: comparisons.length,
    wrong: wrongCount,
    check: checkCount,
    ok: okCount,
    notFound: notFound.length
  },
  wrong: comparisons.filter(c => Math.abs(c.diff) >= 0.5),
  check: comparisons.filter(c => Math.abs(c.diff) > 0.2 && Math.abs(c.diff) < 0.5),
  ok: comparisons.filter(c => Math.abs(c.diff) <= 0.2),
  notFound
};

fs.writeFileSync('./weapon-comparison-full.json', JSON.stringify(jsonOutput, null, 2));
console.log('Created weapon-comparison-full.json');
