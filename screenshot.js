#!/usr/bin/env node
/**
 * Playwright screenshot tool for the RDR2 Horse Advisor app
 *
 * Usage:
 *   node screenshot.js                    # Capture current state
 *   node screenshot.js --url /horses      # Navigate to path first
 *   node screenshot.js --full             # Full page screenshot
 *   node screenshot.js --query "What's the fastest horse?"  # Submit a query first
 *   node screenshot.js --output my-screenshot.png
 */

const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const BASE_URL = process.env.APP_URL || 'http://localhost:3000';
const SCREENSHOTS_DIR = path.join(process.cwd(), 'screenshots');

// Ensure screenshots directory exists
if (!fs.existsSync(SCREENSHOTS_DIR)) {
    fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

function parseArgs() {
    const args = process.argv.slice(2);
    const options = {
        url: '/',
        output: null,
        fullPage: false,
        query: null,
        wait: 2000,
        help: false
    };

    for (let i = 0; i < args.length; i++) {
        switch (args[i]) {
            case '--url':
            case '-u':
                options.url = args[++i];
                break;
            case '--output':
            case '-o':
                options.output = args[++i];
                break;
            case '--full':
            case '-f':
                options.fullPage = true;
                break;
            case '--query':
            case '-q':
                options.query = args[++i];
                break;
            case '--wait':
            case '-w':
                options.wait = parseInt(args[++i], 10);
                break;
            case '--help':
            case '-h':
                options.help = true;
                break;
        }
    }

    return options;
}

function showHelp() {
    console.log(`
Playwright Screenshot Tool for RDR2 Horse Advisor

Usage:
  node screenshot.js [options]

Options:
  -u, --url <path>     URL path to navigate to (default: /)
  -o, --output <file>  Output filename (default: screenshot-<timestamp>.png)
  -f, --full           Capture full page screenshot
  -q, --query <text>   Submit a query to the chat before capturing
  -w, --wait <ms>      Wait time after page load/query (default: 2000)
  -h, --help           Show this help message

Examples:
  # Basic screenshot of home page
  node screenshot.js

  # Screenshot after submitting a query
  node screenshot.js -q "Where do I find the White Arabian?"

  # Full page screenshot of horse browser
  node screenshot.js -u /horses -f -o horses-page.png
`);
}

async function takeScreenshot(options) {
    console.log('Launching browser...');

    const browser = await chromium.launch({
        headless: true
    });

    const context = await browser.newContext({
        viewport: { width: 1512, height: 800 }
    });

    const page = await context.newPage();

    try {
        const fullUrl = BASE_URL + options.url;
        console.log(`Navigating to ${fullUrl}...`);
        await page.goto(fullUrl, { waitUntil: 'networkidle' });

        // If a query was provided, submit it
        if (options.query) {
            console.log(`Submitting query: "${options.query}"`);

            // Wait for the input to be visible
            await page.waitForSelector('#queryInput', { timeout: 5000 });

            // Type the query
            await page.fill('#queryInput', options.query);

            // Click send button
            await page.click('#sendBtn');

            // Wait for response (look for assistant message or loading to finish)
            console.log('Waiting for response...');
            await page.waitForSelector('.message.assistant', { timeout: 30000 });

            // Extra wait for any animations/rendering
            await page.waitForTimeout(options.wait);
        } else {
            await page.waitForTimeout(options.wait);
        }

        // Generate output filename
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const outputFile = options.output || `screenshot-${timestamp}.png`;
        const outputPath = path.isAbsolute(outputFile) ? outputFile : path.join(SCREENSHOTS_DIR, outputFile);

        // Take screenshot
        console.log(`Taking screenshot...`);
        await page.screenshot({
            path: outputPath,
            fullPage: options.fullPage
        });

        console.log(`\nScreenshot saved: ${outputPath}`);
        return outputPath;

    } finally {
        await browser.close();
    }
}

// Main
const options = parseArgs();

if (options.help) {
    showHelp();
    process.exit(0);
}

takeScreenshot(options)
    .then(outputPath => {
        console.log('\nTo send to ChatGPT for review:');
        console.log(`node chat-with-gpt.js -p "Review this UI" -i ${outputPath}`);
    })
    .catch(error => {
        console.error('Error:', error.message);
        process.exit(1);
    });
