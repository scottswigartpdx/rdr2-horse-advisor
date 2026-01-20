# Chrome Automation Setup for Claude Code

## Problem
Google blocks sign-in on Chrome instances launched with automation flags (detects `--enable-automation` and `navigator.webdriver=true`).

## Solution
Launch Chrome manually with remote debugging enabled, then connect via MCP.

## Setup Steps

### 1. Create `.mcp.json` in project root
```json
{
  "mcpServers": {
    "chrome-devtools": {
      "type": "stdio",
      "command": "npx",
      "args": [
        "chrome-devtools-mcp@latest",
        "--browserUrl=http://127.0.0.1:9222"
      ]
    }
  }
}
```

### 2. Launch Chrome with Remote Debugging
**Important:** Chrome requires a separate user data directory for remote debugging.

```bash
# Kill any existing Chrome instances first
pkill -9 Chrome

# Wait for Chrome to fully quit
sleep 2

# Create a debug profile directory
mkdir -p /tmp/chrome-debug-profile

# Launch Chrome with debugging enabled
/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome \
  --remote-debugging-port=9222 \
  --user-data-dir=/tmp/chrome-debug-profile &
```

### 3. Verify Connection
```bash
# Should return JSON with browser info
curl -s http://127.0.0.1:9222/json/version
```

### 4. Restart Claude Code Session
The MCP config is loaded at session start, so restart Claude Code after creating `.mcp.json`.

### 5. Use MCP Tools
Now `mcp__chrome-devtools__*` tools will connect to your real Chrome instance where you can sign in normally.

## Quick Reference Commands

```bash
# One-liner to start Chrome with debugging
pkill -9 Chrome; sleep 2; mkdir -p /tmp/chrome-debug-profile; /Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome --remote-debugging-port=9222 --user-data-dir=/tmp/chrome-debug-profile &
```

## Notes
- The `/tmp/chrome-debug-profile` is a fresh profile each time - you'll need to sign in again
- To persist sign-in, use a permanent directory like `~/.chrome-debug-profile`
- Google OAuth works because Chrome wasn't launched by the MCP with automation flags
