# RDR2 Companion - Operating Instructions

## Communicating with ChatGPT for Design Review

Use the `chat-with-gpt.js` CLI tool to get design feedback from GPT. Do NOT use browser automation for ChatGPT - it's unreliable and slow.

### Basic Usage

```bash
# Review UI with screenshots
node chat-with-gpt.js \
  --prompt "Review this UI for issues" \
  --images screenshots/home.png screenshots/weapons.png

# Include code files for context
node chat-with-gpt.js \
  --prompt "Review the weapon card design" \
  --images screenshots/weapon-card.png \
  --files styles.css app.js

# Continue a conversation
node chat-with-gpt.js \
  --conversation-id <id> \
  --prompt "What about the mobile layout?"

# List recent conversations
node chat-with-gpt.js --list
```

### Taking Screenshots

```bash
# Create screenshots directory if needed
mkdir -p screenshots

# Use browser dev tools or a screenshot tool
# Screenshots should be saved to screenshots/ folder
```

### Example Review Request

```bash
node chat-with-gpt.js \
  --prompt "I'm building an RDR2 companion web app. Please review these UI screenshots and identify: 1) Visual consistency issues 2) Usability problems 3) Mobile-friendliness concerns 4) Elements that look out of place. Be specific and actionable." \
  --images screenshots/home.png screenshots/weapons.png screenshots/weapon-card.png \
  --files styles.css
```

---

## Pre-Merge Checklist

Before merging to main, verify:

### 1. Data Accuracy
- [ ] Weapon stats verified against GameWith/Fandom sources
- [ ] Horse stats verified
- [ ] No placeholder or test data in JSON files

### 2. UI/Visual Review
- [ ] Get ChatGPT review using `chat-with-gpt.js`
- [ ] Address any critical feedback
- [ ] Check visual consistency across pages

### 3. Mobile Testing
- [ ] Test at 375px width (iPhone SE)
- [ ] Test at 390px width (iPhone 12/13/14)
- [ ] Test at 428px width (iPhone 14 Plus)
- [ ] Navigation usable on touch
- [ ] Text readable without zooming
- [ ] Buttons/links have adequate tap targets (44px min)
- [ ] Tables scroll horizontally or reflow
- [ ] Cards don't overflow viewport

### 4. Functionality Testing
- [ ] AI chat returns relevant results
- [ ] Weapon cards display correct stats
- [ ] Horse cards display correct stats
- [ ] Search/filter works on tables
- [ ] All navigation links work
- [ ] No console errors

### 5. Code Quality
- [ ] JSON files are valid (`node -e "JSON.parse(...)"`)
- [ ] No hardcoded test values
- [ ] CSS has no obvious issues

---

## Mobile Testing Instructions

### Using Chrome DevTools

1. Open the app in Chrome
2. Open DevTools (F12 or Cmd+Option+I)
3. Click the device toggle icon (or Cmd+Shift+M)
4. Select device or set custom dimensions
5. Test each page at multiple widths

### Key Breakpoints to Test

| Width | Device |
|-------|--------|
| 375px | iPhone SE, older iPhones |
| 390px | iPhone 12/13/14 |
| 428px | iPhone 14 Plus |
| 768px | iPad portrait |
| 1024px | iPad landscape |

### Mobile Testing Checklist

```
Home Page:
- [ ] Title readable
- [ ] Nav sidebar collapses or adapts
- [ ] Suggested prompts don't overflow
- [ ] Chat input accessible

Weapons Page:
- [ ] Sidebar navigation works
- [ ] Weapon cards fit viewport
- [ ] Stat bars readable

Weapons Table:
- [ ] Table scrolls horizontally
- [ ] Column headers stay visible
- [ ] Search input works
- [ ] Sort buttons accessible

Weapon Card (in chat):
- [ ] Two-column layout stacks on mobile
- [ ] Stat bars don't overflow
- [ ] Upgrade/ammo chips wrap properly
```

---

## Local Development

### Starting the Server

```bash
# The server should already be running on port 3000
lsof -i :3000

# If not running, start it
node server.js
# or
npx http-server -p 3000
```

### Validating Data Files

```bash
# Validate weapons.json
node -e "JSON.parse(require('fs').readFileSync('weapons.json')); console.log('Valid')"

# Validate horses.json
node -e "JSON.parse(require('fs').readFileSync('horses.json')); console.log('Valid')"

# Quick stats check
node -e "const d = require('./weapons.json'); console.log('Weapons:', d.weapons.length)"
```

---

## Git Workflow

### Feature Branch

```bash
# Create feature branch
git checkout -b feature/description

# Make changes, commit
git add .
git commit -m "Description of changes"

# Push to remote
git push -u origin feature/description
```

### Before Merging

1. Complete pre-merge checklist above
2. Get PR review if applicable
3. Merge to main

```bash
git checkout main
git pull
git merge feature/description
git push
```

---

## Deployment

The app is deployed via Vercel. Pushing to main triggers automatic deployment.

### Vercel Dashboard
- Check deployment status at vercel.com
- View analytics for usage patterns

---

## Troubleshooting

### Server not responding
```bash
# Check if port is in use
lsof -i :3000

# Kill existing process if needed
kill -9 <PID>
```

### ChatGPT script not working
```bash
# Check for API key
cat .env | grep OPENAI

# Test the script
node chat-with-gpt.js --help
```

### JSON parse errors
```bash
# Pretty-print and validate
node -e "console.log(JSON.stringify(JSON.parse(require('fs').readFileSync('weapons.json')), null, 2))" > weapons-formatted.json
```
