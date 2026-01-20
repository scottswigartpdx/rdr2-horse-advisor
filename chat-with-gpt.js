#!/usr/bin/env node
/**
 * CLI tool to chat with GPT-5.2-Codex (OpenAI) with image and file support
 *
 * Usage:
 *   node chat-with-gpt.js --prompt "Your prompt" --images path1.png --files styles.css index.html
 *   node chat-with-gpt.js --prompt "Follow up" --conversation-id abc123
 *   node chat-with-gpt.js --reasoning high  # Set reasoning effort (low/medium/high/xhigh)
 *   node chat-with-gpt.js --list  # List recent conversations
 *
 * Environment: Requires OPENAI_API_KEY in .env
 */

require('dotenv/config');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const CONVERSATIONS_DIR = path.join(process.cwd(), '.conversations');
const MODEL = 'gpt-5.2-codex';
const DEFAULT_REASONING = 'medium';

// Ensure conversations directory exists
if (!fs.existsSync(CONVERSATIONS_DIR)) {
    fs.mkdirSync(CONVERSATIONS_DIR, { recursive: true });
}

function generateConversationId() {
    return crypto.randomBytes(4).toString('hex');
}

function loadConversation(conversationId) {
    const filePath = path.join(CONVERSATIONS_DIR, `${conversationId}.json`);
    if (fs.existsSync(filePath)) {
        return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    }
    return null;
}

function saveConversation(conversationId, data) {
    const filePath = path.join(CONVERSATIONS_DIR, `${conversationId}.json`);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

function listConversations() {
    const files = fs.readdirSync(CONVERSATIONS_DIR)
        .filter(f => f.endsWith('.json'))
        .map(f => {
            const data = JSON.parse(fs.readFileSync(path.join(CONVERSATIONS_DIR, f), 'utf-8'));
            return {
                id: f.replace('.json', ''),
                created: data.created,
                messageCount: data.messages.length,
                lastPrompt: data.messages.filter(m => m.role === 'user').pop()?.preview || 'N/A'
            };
        })
        .sort((a, b) => new Date(b.created) - new Date(a.created));

    console.log('\nRecent Conversations:');
    console.log('─'.repeat(80));
    files.slice(0, 10).forEach(c => {
        console.log(`ID: ${c.id} | Messages: ${c.messageCount} | Created: ${c.created}`);
        console.log(`   Last: ${c.lastPrompt.substring(0, 60)}...`);
    });
    console.log('─'.repeat(80));
}

function imageToBase64(imagePath) {
    const absolutePath = path.resolve(imagePath);
    if (!fs.existsSync(absolutePath)) {
        throw new Error(`Image not found: ${absolutePath}`);
    }
    const imageBuffer = fs.readFileSync(absolutePath);
    const base64 = imageBuffer.toString('base64');
    const ext = path.extname(imagePath).toLowerCase();
    const mimeType = ext === '.png' ? 'image/png' :
                     ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' :
                     ext === '.gif' ? 'image/gif' :
                     ext === '.webp' ? 'image/webp' : 'image/png';
    return { base64, mimeType };
}

function readTextFile(filePath) {
    const absolutePath = path.resolve(filePath);
    if (!fs.existsSync(absolutePath)) {
        throw new Error(`File not found: ${absolutePath}`);
    }
    const content = fs.readFileSync(absolutePath, 'utf-8');
    const ext = path.extname(filePath).toLowerCase();
    const filename = path.basename(filePath);

    // Determine language for code block
    const langMap = {
        '.css': 'css',
        '.html': 'html',
        '.js': 'javascript',
        '.json': 'json',
        '.ts': 'typescript',
        '.jsx': 'jsx',
        '.tsx': 'tsx',
        '.md': 'markdown',
        '.py': 'python',
        '.sql': 'sql',
        '.sh': 'bash'
    };
    const lang = langMap[ext] || '';

    return { filename, content, lang };
}

async function chat(prompt, imagePaths = [], filePaths = [], conversationId = null, reasoning = DEFAULT_REASONING) {
    // Load or create conversation
    let conversation = conversationId ? loadConversation(conversationId) : null;

    if (conversationId && !conversation) {
        console.error(`Conversation ${conversationId} not found.`);
        process.exit(1);
    }

    if (!conversation) {
        conversationId = generateConversationId();
        conversation = {
            id: conversationId,
            created: new Date().toISOString(),
            messages: []
        };
        console.log(`\nNew conversation: ${conversationId}`);
    } else {
        console.log(`\nContinuing conversation: ${conversationId}`);
    }

    // Build the user message content
    const content = [];

    // Add images first (Responses API format)
    for (const imagePath of imagePaths) {
        const { base64, mimeType } = imageToBase64(imagePath);
        content.push({
            type: 'input_image',
            image_url: `data:${mimeType};base64,${base64}`
        });
        console.log(`  Added image: ${imagePath}`);
    }

    // Build text content with files
    let textContent = prompt;

    if (filePaths.length > 0) {
        textContent += '\n\n--- ATTACHED FILES ---\n';
        for (const filePath of filePaths) {
            const { filename, content: fileContent, lang } = readTextFile(filePath);
            const truncated = fileContent.length > 50000
                ? fileContent.substring(0, 50000) + '\n... (truncated)'
                : fileContent;
            textContent += `\n### ${filename}\n\`\`\`${lang}\n${truncated}\n\`\`\`\n`;
            console.log(`  Added file: ${filename} (${fileContent.length} chars)`);
        }
    }

    // Add text prompt (Responses API format)
    content.push({
        type: 'input_text',
        text: textContent
    });

    // Add to conversation history (store without full file content for preview)
    conversation.messages.push({
        role: 'user',
        content: content,
        preview: prompt.substring(0, 100),
        timestamp: new Date().toISOString(),
        attachedFiles: filePaths.map(f => path.basename(f)),
        attachedImages: imagePaths.map(f => path.basename(f))
    });

    // Build input for Responses API
    const systemPrompt = `You are a senior UI/UX designer and frontend developer. You're collaborating with another AI (Claude) to improve the design of a web application. Provide specific, actionable feedback on visual design, usability, and implementation. Be direct and constructive. When suggesting CSS changes, provide the exact selectors and properties to change.`;

    const apiInput = [
        { role: 'system', content: systemPrompt },
        ...conversation.messages.map(m => ({
            role: m.role,
            content: m.content
        }))
    ];

    console.log(`\nSending to ${MODEL} (reasoning: ${reasoning})...`);

    try {
        const response = await fetch('https://api.openai.com/v1/responses', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${OPENAI_API_KEY}`
            },
            body: JSON.stringify({
                model: MODEL,
                input: apiInput,
                reasoning: { effort: reasoning }
            })
        });

        if (!response.ok) {
            const error = await response.json();
            console.error('API Error:', error);
            process.exit(1);
        }

        const data = await response.json();

        // Extract text from Responses API format
        // Structure: data.output[].content[].text where type is "message"
        let assistantMessage = null;
        if (data.output_text) {
            assistantMessage = data.output_text;
        } else if (data.output) {
            // Find the message output (not reasoning)
            const messageOutput = data.output.find(o => o.type === 'message');
            if (messageOutput?.content) {
                const textContent = messageOutput.content.find(c => c.type === 'output_text');
                assistantMessage = textContent?.text;
            }
        }
        if (!assistantMessage) {
            assistantMessage = data.choices?.[0]?.message?.content || 'No response text found';
        }

        // Add assistant response to conversation
        conversation.messages.push({
            role: 'assistant',
            content: assistantMessage,
            preview: assistantMessage.substring(0, 100),
            timestamp: new Date().toISOString()
        });

        // Save conversation
        saveConversation(conversationId, conversation);

        console.log('\n' + '═'.repeat(80));
        console.log('GPT Response:');
        console.log('═'.repeat(80));
        console.log(assistantMessage);
        console.log('═'.repeat(80));
        console.log(`\nConversation ID: ${conversationId}`);
        console.log(`To continue: node chat-with-gpt.js --conversation-id ${conversationId} --prompt "Your follow-up"`);

        return { conversationId, response: assistantMessage };

    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
}

// Parse command line arguments
function parseArgs() {
    const args = process.argv.slice(2);
    const options = {
        prompt: null,
        images: [],
        files: [],
        conversationId: null,
        reasoning: DEFAULT_REASONING,
        list: false,
        help: false
    };

    for (let i = 0; i < args.length; i++) {
        switch (args[i]) {
            case '--prompt':
            case '-p':
                options.prompt = args[++i];
                break;
            case '--images':
            case '-i':
                // Collect all following args until next flag
                while (i + 1 < args.length && !args[i + 1].startsWith('-')) {
                    options.images.push(args[++i]);
                }
                break;
            case '--files':
            case '-f':
                // Collect all following args until next flag
                while (i + 1 < args.length && !args[i + 1].startsWith('-')) {
                    options.files.push(args[++i]);
                }
                break;
            case '--conversation-id':
            case '-c':
                options.conversationId = args[++i];
                break;
            case '--reasoning':
            case '-r':
                options.reasoning = args[++i];
                break;
            case '--list':
            case '-l':
                options.list = true;
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
Chat with GPT-5.2-Codex (OpenAI) - Image and file-enabled conversation tool

Usage:
  node chat-with-gpt.js --prompt "Your prompt" --images img.png --files styles.css index.html
  node chat-with-gpt.js --prompt "Follow up" --conversation-id <id>
  node chat-with-gpt.js --reasoning high  # Use higher reasoning effort
  node chat-with-gpt.js --list

Options:
  -p, --prompt           The prompt/question to send
  -i, --images           One or more image paths to include
  -f, --files            One or more text files to include (CSS, HTML, JS, etc.)
  -c, --conversation-id  Continue an existing conversation
  -r, --reasoning        Reasoning effort: low, medium (default), high, xhigh
  -l, --list             List recent conversations
  -h, --help             Show this help message

Examples:
  # Start new conversation with screenshot and code files
  node chat-with-gpt.js -p "Review this UI" -i screenshot.png -f styles.css index.html

  # Use high reasoning for complex analysis
  node chat-with-gpt.js -p "Analyze architecture" -f styles.css -r high

  # Continue conversation
  node chat-with-gpt.js -c abc123 -p "What about the color scheme?"

  # Multiple images and files
  node chat-with-gpt.js -p "Compare designs" -i before.png after.png -f styles.css
`);
}

// Main
const options = parseArgs();

if (options.help) {
    showHelp();
    process.exit(0);
}

if (options.list) {
    listConversations();
    process.exit(0);
}

if (!options.prompt) {
    console.error('Error: --prompt is required');
    showHelp();
    process.exit(1);
}

chat(options.prompt, options.images, options.files, options.conversationId, options.reasoning);
