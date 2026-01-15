// Simple local dev server with OpenAI Responses API
const http = require('http');
const fs = require('fs');
const path = require('path');

// Load .env file
require('dotenv').config();

const PORT = 3000;

const MIME_TYPES = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'application/javascript',
    '.json': 'application/json',
    '.webp': 'image/webp',
    '.png': 'image/png',
    '.jpg': 'image/jpeg'
};

const server = http.createServer(async (req, res) => {
    // Handle API route
    if (req.url === '/api/chat' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', async () => {
            try {
                const { system, messages } = JSON.parse(body);

                // Build input array for OpenAI Responses API
                // Start with system message, then add conversation history
                const input = [
                    { role: 'system', content: system }
                ];

                // Add conversation history
                for (const msg of messages) {
                    input.push({
                        role: msg.role,
                        content: msg.content
                    });
                }

                // Call OpenAI Responses API with GPT-5.2 and web search
                const response = await fetch('https://api.openai.com/v1/responses', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
                    },
                    body: JSON.stringify({
                        model: 'gpt-5.2',
                        input: input,
                        tools: [
                            { type: 'web_search' }
                        ],
                        tool_choice: 'auto'
                    })
                });

                const data = await response.json();

                // Extract text from OpenAI Responses API format
                // When web search is used, output array contains:
                // - web_search_call items (type: "web_search_call")
                // - message item (type: "message") with the actual response
                let outputText = 'No response generated';
                if (data.output && Array.isArray(data.output)) {
                    // Find the message item in the output array
                    const messageItem = data.output.find(item => item.type === 'message');
                    if (messageItem?.content?.[0]?.text) {
                        outputText = messageItem.content[0].text;
                    }
                } else if (data.error) {
                    outputText = data.error.message || JSON.stringify(data.error);
                }

                // Transform response to match our frontend's expected format
                const transformedResponse = {
                    content: [{
                        text: outputText
                    }]
                };

                res.writeHead(response.status, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify(transformedResponse));
            } catch (error) {
                console.error('API Error:', error);
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Failed to call API' }));
            }
        });
        return;
    }

    // Serve static files - strip query string
    let urlPath = req.url.split('?')[0];
    let filePath = urlPath === '/' ? '/index.html' : urlPath;
    filePath = path.join(__dirname, filePath);

    const ext = path.extname(filePath);
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    fs.readFile(filePath, (err, content) => {
        if (err) {
            res.writeHead(404);
            res.end('Not found');
            return;
        }
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(content);
    });
});

server.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
    console.log('Using OpenAI GPT-5.2 with web search');
    console.log('Press Ctrl+C to stop');
});
