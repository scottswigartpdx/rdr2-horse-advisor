// Simple local dev server with OpenAI Responses API
const http = require('http');
const fs = require('fs');
const path = require('path');

// Load .env file
require('dotenv').config();

const PORT = 3000;

// Supabase config for token verification and rate limiting
const SUPABASE_URL = 'https://vejhtrzmesjpxlonwhig.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'sb_publishable_QYHw3yzSd61GgQj3Izb3ng_zkfT_IZv';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY; // Required for rate limiting

// Daily query limit per user
const DAILY_QUERY_LIMIT = 20;

// Simple JWT verification (checks with Supabase)
async function verifySupabaseToken(token) {
    if (!token) return null;

    try {
        // Verify token with Supabase
        const response = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'apikey': SUPABASE_ANON_KEY
            }
        });

        if (response.ok) {
            return await response.json();
        }
        return null;
    } catch (error) {
        console.error('Token verification error:', error);
        return null;
    }
}

// Check and increment rate limit for user
// Returns { allowed: boolean, current: number, limit: number } or null on error
async function checkRateLimit(userId) {
    if (!SUPABASE_SERVICE_KEY) {
        console.warn('SUPABASE_SERVICE_KEY not set - rate limiting disabled');
        return { allowed: true, current: 0, limit: DAILY_QUERY_LIMIT };
    }

    try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/increment_usage`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'apikey': SUPABASE_SERVICE_KEY,
                'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`
            },
            body: JSON.stringify({
                p_user_id: userId,
                p_daily_limit: DAILY_QUERY_LIMIT
            })
        });

        if (!response.ok) {
            const error = await response.text();
            console.error('Rate limit check failed:', error);
            // Fail open - allow the request if rate limiting fails
            return { allowed: true, current: 0, limit: DAILY_QUERY_LIMIT };
        }

        const result = await response.json();
        // Result is an array with one row
        if (result && result.length > 0) {
            return {
                allowed: result[0].allowed,
                current: result[0].current_count,
                limit: result[0].daily_limit
            };
        }

        return { allowed: true, current: 0, limit: DAILY_QUERY_LIMIT };
    } catch (error) {
        console.error('Rate limit error:', error);
        // Fail open
        return { allowed: true, current: 0, limit: DAILY_QUERY_LIMIT };
    }
}

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
                // Verify auth token
                const authHeader = req.headers['authorization'];
                const token = authHeader?.replace('Bearer ', '');

                const user = await verifySupabaseToken(token);
                if (!user) {
                    res.writeHead(401, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Unauthorized - please sign in' }));
                    return;
                }

                console.log('Authenticated user:', user.email);

                // Check rate limit
                const rateLimit = await checkRateLimit(user.id);
                if (!rateLimit.allowed) {
                    console.log(`Rate limit exceeded for ${user.email}: ${rateLimit.current}/${rateLimit.limit}`);
                    res.writeHead(429, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({
                        error: 'Daily limit reached',
                        message: `You've used all ${rateLimit.limit} queries for today. Your limit resets at midnight UTC.`,
                        current: rateLimit.current,
                        limit: rateLimit.limit
                    }));
                    return;
                }

                console.log(`Query ${rateLimit.current}/${rateLimit.limit} for ${user.email}`);

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
