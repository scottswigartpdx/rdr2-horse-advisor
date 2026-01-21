#!/usr/bin/env node

/**
 * RDR2 Weapon Stats Comparison
 * Compares weapon data from multiple sources to find discrepancies
 *
 * Usage: node compare-weapon-stats.js
 * Requires: Run scrape-weapon-stats.js first
 */

const fs = require('fs');
const path = require('path');

const SCRAPED_DIR = './scraped-stats';

// Load all scraped data
function loadScrapedData() {
    const sources = {};
    const files = fs.readdirSync(SCRAPED_DIR);

    for (const file of files) {
        if (!file.endsWith('.json')) continue;
        const data = JSON.parse(fs.readFileSync(path.join(SCRAPED_DIR, file)));
        sources[data.source] = data;
    }

    return sources;
}

// Normalize weapon names for matching
function normalizeName(name) {
    return name
        .toLowerCase()
        .replace(/['']/g, "'")
        .replace(/[^a-z0-9' ]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
}

// Find matching weapon across sources
function findWeapon(weapons, targetName) {
    const normalized = normalizeName(targetName);
    return weapons.find(w => normalizeName(w.name) === normalized);
}

// Compare damage values
function compareDamage(sources) {
    console.log('\n🔫 DAMAGE COMPARISON');
    console.log('====================\n');

    // Get all unique weapon names from local data
    const local = sources.local;
    if (!local) {
        console.log('No local data found. Run scraper first.');
        return;
    }

    const discrepancies = [];
    const sourceNames = Object.keys(sources).filter(s => s !== 'local');

    // Header
    console.log('Weapon'.padEnd(30) + 'Local'.padEnd(12) + sourceNames.map(s => s.padEnd(12)).join(''));
    console.log('-'.repeat(30 + 12 + sourceNames.length * 12));

    for (const weapon of local.weapons) {
        const row = [weapon.name.padEnd(30)];
        const localDmg = weapon.damage !== null ? weapon.damage.toFixed(1) : '-';
        row.push(localDmg.padEnd(12));

        let hasDiscrepancy = false;
        const values = [weapon.damage];

        for (const sourceName of sourceNames) {
            const source = sources[sourceName];
            const match = source?.weapons ? findWeapon(source.weapons, weapon.name) : null;
            const dmg = match?.damage;
            values.push(dmg);

            if (dmg !== null && dmg !== undefined) {
                const dmgStr = dmg.toFixed(1);
                // Check for discrepancy (tolerance of 0.2)
                if (weapon.damage !== null && Math.abs(dmg - weapon.damage) > 0.2) {
                    row.push(`${dmgStr} ⚠️`.padEnd(12));
                    hasDiscrepancy = true;
                } else {
                    row.push(dmgStr.padEnd(12));
                }
            } else {
                row.push('-'.padEnd(12));
            }
        }

        if (hasDiscrepancy) {
            console.log(row.join(''));
            discrepancies.push({
                weapon: weapon.name,
                local: weapon.damage,
                others: Object.fromEntries(sourceNames.map((s, i) => [s, values[i + 1]]))
            });
        }
    }

    if (discrepancies.length === 0) {
        console.log('No significant discrepancies found in damage values.');
    } else {
        console.log(`\n⚠️  Found ${discrepancies.length} weapons with discrepancies (>0.2 difference)`);
    }

    return discrepancies;
}

// Compare max damage values
function compareMaxDamage(sources) {
    console.log('\n\n💥 MAX DAMAGE COMPARISON (Base → Max)');
    console.log('======================================\n');

    const local = sources.local;
    if (!local) return;

    const sourceNames = Object.keys(sources).filter(s => s !== 'local' && sources[s].weapons?.some(w => w.damageMax));

    if (sourceNames.length === 0) {
        console.log('No sources with max damage data found.');
        return;
    }

    console.log('Weapon'.padEnd(30) + 'Local'.padEnd(15) + sourceNames.map(s => s.padEnd(15)).join(''));
    console.log('-'.repeat(30 + 15 + sourceNames.length * 15));

    for (const weapon of local.weapons) {
        if (!weapon.damageMax) continue;

        const localStr = `${weapon.damage}→${weapon.damageMax}`;
        const row = [weapon.name.padEnd(30), localStr.padEnd(15)];

        let hasDiscrepancy = false;

        for (const sourceName of sourceNames) {
            const source = sources[sourceName];
            const match = findWeapon(source.weapons, weapon.name);

            if (match?.damageMax) {
                const srcStr = `${match.damage}→${match.damageMax}`;
                if (Math.abs(match.damageMax - weapon.damageMax) > 0.1 ||
                    Math.abs(match.damage - weapon.damage) > 0.2) {
                    row.push(`${srcStr} ⚠️`.padEnd(15));
                    hasDiscrepancy = true;
                } else {
                    row.push(srcStr.padEnd(15));
                }
            } else {
                row.push('-'.padEnd(15));
            }
        }

        if (hasDiscrepancy) {
            console.log(row.join(''));
        }
    }
}

// Show coverage - which weapons are in which sources
function showCoverage(sources) {
    console.log('\n\n📊 DATA COVERAGE');
    console.log('================\n');

    const sourceNames = Object.keys(sources);
    console.log('Source'.padEnd(15) + 'Weapons'.padEnd(10) + 'Has Damage'.padEnd(12) + 'Has Max');
    console.log('-'.repeat(50));

    for (const name of sourceNames) {
        const src = sources[name];
        const total = src.weapons?.length || 0;
        const hasDamage = src.weapons?.filter(w => w.damage !== null).length || 0;
        const hasMax = src.weapons?.filter(w => w.damageMax !== null).length || 0;

        console.log(
            name.padEnd(15) +
            total.toString().padEnd(10) +
            hasDamage.toString().padEnd(12) +
            hasMax.toString()
        );
    }
}

// List weapons missing from sources
function showMissing(sources) {
    console.log('\n\n❓ MISSING WEAPONS');
    console.log('==================\n');

    const local = sources.local;
    if (!local) return;

    const sourceNames = Object.keys(sources).filter(s => s !== 'local');

    for (const sourceName of sourceNames) {
        const source = sources[sourceName];
        if (!source?.weapons?.length) continue;

        const missing = local.weapons.filter(lw =>
            !findWeapon(source.weapons, lw.name)
        );

        if (missing.length > 0 && missing.length < local.weapons.length / 2) {
            console.log(`${sourceName} is missing ${missing.length} weapons:`);
            missing.slice(0, 10).forEach(w => console.log(`  - ${w.name}`));
            if (missing.length > 10) console.log(`  ... and ${missing.length - 10} more`);
            console.log('');
        }
    }
}

// Main
function main() {
    console.log('🔍 RDR2 Weapon Stats Comparison');
    console.log('================================');

    if (!fs.existsSync(SCRAPED_DIR)) {
        console.error(`\n❌ ${SCRAPED_DIR} not found. Run scrape-weapon-stats.js first.`);
        process.exit(1);
    }

    const sources = loadScrapedData();
    console.log(`\nLoaded ${Object.keys(sources).length} data sources.`);

    showCoverage(sources);
    showMissing(sources);
    compareDamage(sources);
    compareMaxDamage(sources);

    console.log('\n✅ Comparison complete.');
}

main();
