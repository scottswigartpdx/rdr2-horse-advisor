#!/usr/bin/env node

/**
 * RDR2 Weapon Stats Scraper
 * Pulls weapon data from multiple sources for comparison
 *
 * Usage: node scrape-weapon-stats.js
 * Output: scraped-stats/ directory with JSON files from each source
 */

const fs = require('fs');
const path = require('path');

// Output directory
const OUTPUT_DIR = './scraped-stats';

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// Helper to save data
function saveData(source, data) {
    const filename = path.join(OUTPUT_DIR, `${source}.json`);
    fs.writeFileSync(filename, JSON.stringify(data, null, 2));
    console.log(`✓ Saved ${filename} (${data.weapons?.length || 0} weapons)`);
}

// Helper to fetch with error handling
async function fetchPage(url) {
    try {
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
            }
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return await response.text();
    } catch (err) {
        console.error(`  Failed to fetch ${url}: ${err.message}`);
        return null;
    }
}

// Parse HTML tables - simple regex-based parser (no cheerio dependency)
function parseTable(html, tablePattern) {
    const tables = [];
    const tableRegex = /<table[^>]*>([\s\S]*?)<\/table>/gi;
    let match;
    while ((match = tableRegex.exec(html)) !== null) {
        const tableHtml = match[1];
        const rows = [];
        const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
        let rowMatch;
        while ((rowMatch = rowRegex.exec(tableHtml)) !== null) {
            const cells = [];
            const cellRegex = /<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi;
            let cellMatch;
            while ((cellMatch = cellRegex.exec(rowMatch[1])) !== null) {
                // Strip HTML tags and trim
                const text = cellMatch[1].replace(/<[^>]+>/g, '').trim();
                cells.push(text);
            }
            if (cells.length > 0) rows.push(cells);
        }
        if (rows.length > 0) tables.push(rows);
    }
    return tables;
}

// Extract number from string like "3.2" or "3.2 / 4.0"
function parseStatValue(str) {
    if (!str) return null;
    const match = str.match(/[\d.]+/);
    return match ? parseFloat(match[0]) : null;
}

// Extract base/max from strings like "3.2 / 4.0" or "3.2/4.0"
function parseBaseMax(str) {
    if (!str) return { base: null, max: null };
    const parts = str.split(/[\/\-]/);
    return {
        base: parseStatValue(parts[0]),
        max: parts[1] ? parseStatValue(parts[1]) : null
    };
}

// ============ SCRAPERS ============

async function scrapeFandom() {
    console.log('\n📖 Scraping Red Dead Wiki (Fandom)...');
    const weapons = [];

    // Main weapons page
    const html = await fetchPage('https://reddead.fandom.com/wiki/Weapons_in_Redemption_2');
    if (!html) return { source: 'fandom', weapons: [], error: 'Failed to fetch' };

    const tables = parseTable(html);

    for (const table of tables) {
        if (table.length < 2) continue;
        const headers = table[0].map(h => h.toLowerCase());

        // Look for weapon stat tables (have damage column)
        const damageIdx = headers.findIndex(h => h.includes('damage'));
        const nameIdx = headers.findIndex(h => h.includes('weapon') || h.includes('name'));

        if (damageIdx === -1 || nameIdx === -1) continue;

        const rangeIdx = headers.findIndex(h => h.includes('range'));
        const fireRateIdx = headers.findIndex(h => h.includes('fire') || h.includes('rate'));
        const accuracyIdx = headers.findIndex(h => h.includes('accuracy'));
        const reloadIdx = headers.findIndex(h => h.includes('reload'));

        for (let i = 1; i < table.length; i++) {
            const row = table[i];
            const name = row[nameIdx];
            if (!name || name.toLowerCase().includes('weapon')) continue;

            const damage = parseBaseMax(row[damageIdx]);

            weapons.push({
                name: name,
                damage: damage.base,
                damageMax: damage.max,
                range: parseStatValue(row[rangeIdx]),
                fireRate: parseStatValue(row[fireRateIdx]),
                accuracy: parseStatValue(row[accuracyIdx]),
                reload: parseStatValue(row[reloadIdx])
            });
        }
    }

    return { source: 'fandom', url: 'https://reddead.fandom.com/wiki/Weapons_in_Redemption_2', weapons };
}

async function scrapeGameWith() {
    console.log('\n🎮 Scraping GameWith...');
    const weapons = [];

    const html = await fetchPage('https://gamewith.net/red-dead-redemption2/article/show/1154');
    if (!html) return { source: 'gamewith', weapons: [], error: 'Failed to fetch' };

    const tables = parseTable(html);

    for (const table of tables) {
        if (table.length < 2) continue;
        const headers = table[0].map(h => h.toLowerCase());

        const damageIdx = headers.findIndex(h => h.includes('damage'));
        const nameIdx = headers.findIndex(h => h.includes('weapon') || h.includes('name') || headers.indexOf(h) === 0);

        if (damageIdx === -1) continue;

        const rangeIdx = headers.findIndex(h => h.includes('range'));
        const fireRateIdx = headers.findIndex(h => h.includes('fire') || h.includes('rate'));
        const accuracyIdx = headers.findIndex(h => h.includes('accuracy'));
        const reloadIdx = headers.findIndex(h => h.includes('reload'));

        for (let i = 1; i < table.length; i++) {
            const row = table[i];
            if (row.length <= Math.max(nameIdx, damageIdx)) continue;

            const name = row[nameIdx];
            if (!name || name.length < 2) continue;

            const damage = parseBaseMax(row[damageIdx]);

            weapons.push({
                name: name,
                damage: damage.base,
                damageMax: damage.max,
                range: rangeIdx >= 0 ? parseStatValue(row[rangeIdx]) : null,
                fireRate: fireRateIdx >= 0 ? parseStatValue(row[fireRateIdx]) : null,
                accuracy: accuracyIdx >= 0 ? parseStatValue(row[accuracyIdx]) : null,
                reload: reloadIdx >= 0 ? parseStatValue(row[reloadIdx]) : null
            });
        }
    }

    return { source: 'gamewith', url: 'https://gamewith.net/red-dead-redemption2/article/show/1154', weapons };
}

async function scrapeGTABase() {
    console.log('\n🔫 Scraping GTABase...');
    const weapons = [];

    // GTABase has individual weapon pages, main page just lists them
    const html = await fetchPage('https://www.gtabase.com/red-dead-redemption-2/weapons/');
    if (!html) return { source: 'gtabase', weapons: [], error: 'Failed to fetch' };

    // Extract weapon links
    const linkRegex = /href="(\/red-dead-redemption-2\/weapons\/[^"]+)"/gi;
    const links = new Set();
    let match;
    while ((match = linkRegex.exec(html)) !== null) {
        if (!match[1].includes('#') && !match[1].includes('?')) {
            links.add('https://www.gtabase.com' + match[1]);
        }
    }

    console.log(`  Found ${links.size} weapon pages, fetching...`);

    // Fetch each weapon page (limit to avoid rate limiting)
    let count = 0;
    for (const url of links) {
        if (count >= 60) break; // Limit

        const weaponHtml = await fetchPage(url);
        if (!weaponHtml) continue;

        // Extract weapon name from title
        const titleMatch = weaponHtml.match(/<h1[^>]*>([^<]+)<\/h1>/i);
        const name = titleMatch ? titleMatch[1].trim() : null;
        if (!name) continue;

        // Look for stat values - GTABase uses specific markup
        const damageMatch = weaponHtml.match(/damage[^>]*>[\s]*([0-9.]+)/i);
        const rangeMatch = weaponHtml.match(/range[^>]*>[\s]*([0-9.]+)/i);
        const fireRateMatch = weaponHtml.match(/fire\s*rate[^>]*>[\s]*([0-9.]+)/i);
        const accuracyMatch = weaponHtml.match(/accuracy[^>]*>[\s]*([0-9.]+)/i);
        const reloadMatch = weaponHtml.match(/reload[^>]*>[\s]*([0-9.]+)/i);

        weapons.push({
            name: name,
            damage: damageMatch ? parseFloat(damageMatch[1]) : null,
            range: rangeMatch ? parseFloat(rangeMatch[1]) : null,
            fireRate: fireRateMatch ? parseFloat(fireRateMatch[1]) : null,
            accuracy: accuracyMatch ? parseFloat(accuracyMatch[1]) : null,
            reload: reloadMatch ? parseFloat(reloadMatch[1]) : null,
            url: url
        });

        count++;
        if (count % 10 === 0) console.log(`  Fetched ${count} weapons...`);

        // Small delay to be polite
        await new Promise(r => setTimeout(r, 200));
    }

    return { source: 'gtabase', url: 'https://www.gtabase.com/red-dead-redemption-2/weapons/', weapons };
}

async function scrapeRankedBoost() {
    console.log('\n📊 Scraping RankedBoost...');
    const weapons = [];

    const html = await fetchPage('https://rankedboost.com/red-dead-redemption-2/best-weapons/');
    if (!html) return { source: 'rankedboost', weapons: [], error: 'Failed to fetch' };

    const tables = parseTable(html);

    for (const table of tables) {
        if (table.length < 2) continue;
        const headers = table[0].map(h => h.toLowerCase());

        const damageIdx = headers.findIndex(h => h.includes('damage') || h.includes('dmg'));
        const nameIdx = headers.findIndex(h => h.includes('weapon') || h.includes('name'));

        if (nameIdx === -1) continue;

        for (let i = 1; i < table.length; i++) {
            const row = table[i];
            const name = row[nameIdx];
            if (!name || name.length < 2) continue;

            weapons.push({
                name: name,
                damage: damageIdx >= 0 ? parseStatValue(row[damageIdx]) : null
            });
        }
    }

    return { source: 'rankedboost', url: 'https://rankedboost.com/red-dead-redemption-2/best-weapons/', weapons };
}

async function scrapeFextralife() {
    console.log('\n📚 Scraping Fextralife...');
    const weapons = [];

    const html = await fetchPage('https://reddeadredemption2.wiki.fextralife.com/Weapons');
    if (!html) return { source: 'fextralife', weapons: [], error: 'Failed to fetch' };

    const tables = parseTable(html);

    for (const table of tables) {
        if (table.length < 2) continue;
        const headers = table[0].map(h => h.toLowerCase());

        const damageIdx = headers.findIndex(h => h.includes('damage'));
        const nameIdx = headers.findIndex(h => h.includes('name') || h.includes('weapon'));

        if (nameIdx === -1) continue;

        for (let i = 1; i < table.length; i++) {
            const row = table[i];
            const name = row[nameIdx];
            if (!name || name.length < 2) continue;

            weapons.push({
                name: name,
                damage: damageIdx >= 0 ? parseStatValue(row[damageIdx]) : null
            });
        }
    }

    return { source: 'fextralife', url: 'https://reddeadredemption2.wiki.fextralife.com/Weapons', weapons };
}

// Get our local data for comparison
function getLocalData() {
    console.log('\n📁 Loading local weapons.json...');
    const data = require('./weapons.json');
    const weapons = data.weapons.map(w => ({
        name: w.name,
        damage: w.baseStats?.damage,
        damageMax: w.maxStats?.damage,
        range: w.baseStats?.range,
        fireRate: w.baseStats?.fireRate,
        accuracy: w.baseStats?.accuracy,
        reload: w.baseStats?.reload
    }));
    return { source: 'local', file: 'weapons.json', weapons };
}

// ============ MAIN ============

async function main() {
    console.log('🔍 RDR2 Weapon Stats Scraper');
    console.log('============================');

    const results = [];

    // Get local data first
    const local = getLocalData();
    saveData('local', local);
    results.push(local);

    // Scrape each source
    const scrapers = [
        scrapeFandom,
        scrapeGameWith,
        scrapeGTABase,
        scrapeRankedBoost,
        scrapeFextralife
    ];

    for (const scraper of scrapers) {
        try {
            const data = await scraper();
            saveData(data.source, data);
            results.push(data);
        } catch (err) {
            console.error(`  Error: ${err.message}`);
        }
    }

    // Summary
    console.log('\n📋 Summary');
    console.log('==========');
    for (const r of results) {
        console.log(`${r.source}: ${r.weapons?.length || 0} weapons`);
    }

    console.log(`\nOutput saved to ${OUTPUT_DIR}/`);
    console.log('Run: node compare-weapon-stats.js to see discrepancies');
}

main().catch(console.error);
