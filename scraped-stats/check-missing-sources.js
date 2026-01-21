const normalized = require('./weapon-stats-normalized.json');

const targets = [
  "john's cattleman revolver",
  'antler knife',
  'double bit hatchet',
  'hewing hatchet',
  'rusted double bit hatchet',
  'rusted hunter hatchet',
  'hunter hatchet',
  "john's knife",
  'stone hatchet',
  "lowry's revolver",
  'high roller double-action revolver'
];

function norm(s) {
  return s.toLowerCase().replace(/['']/g, "'").replace(/-/g, ' ').trim();
}

const seen = new Set();

for (const target of targets) {
  const matches = normalized.filter(w => {
    const n1 = norm(w.weapon);
    const n2 = norm(target);
    return n1 === n2 || n1.includes(n2) || n2.includes(n1);
  });

  for (const m of matches) {
    const key = norm(m.weapon);
    if (seen.has(key)) continue;
    seen.add(key);

    const d = m.damage;
    const sources = [];
    const values = [];

    if (d.fandom !== null) { sources.push('Fandom: ' + d.fandom); values.push(d.fandom); }
    if (d.gamewith !== null) { sources.push('GameWith: ' + d.gamewith); values.push(d.gamewith); }
    if (d.rankedboost !== null) { sources.push('RankedBoost: ' + d.rankedboost); values.push(d.rankedboost); }
    if (d.gtabase !== null) { sources.push('GTABase: ' + d.gtabase); values.push(d.gtabase); }
    if (d.gamerevolution !== null) { sources.push('GameRev: ' + d.gamerevolution); values.push(d.gamerevolution); }
    if (d.googlesheets !== null) { sources.push('GSheets: ' + d.googlesheets); values.push(d.googlesheets); }
    if (d.github !== null) { sources.push('GitHub: ' + d.github); values.push(d.github); }

    if (sources.length >= 2) {
      const min = Math.min(...values);
      const max = Math.max(...values);
      const diff = Math.round((max - min) * 10) / 10;
      const flag = diff > 0.1 ? ' ⚠️ DIFF: ' + diff : '';

      console.log(m.weapon + flag);
      console.log('  ' + sources.join(', '));
      console.log('  Average: ' + d.average);
      console.log('');
    }
  }
}
