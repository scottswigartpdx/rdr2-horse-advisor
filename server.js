// Simple local dev server with OpenAI Responses API
const http = require('http');
const fs = require('fs');
const path = require('path');

// Load .env file
require('dotenv').config();

// Shared auth utilities
const { verifySupabaseToken, checkRateLimit, DAILY_QUERY_LIMIT } = require('./lib/auth');
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://tbnbfdcqdmfcaczxczyx.supabase.co';

const PORT = 3000;

// Supabase keys from env
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'sb_publishable_QYHw3yzSd61GgQj3Izb3ng_zkfT_IZv';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

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

                const user = await verifySupabaseToken(token, SUPABASE_ANON_KEY);
                if (!user) {
                    res.writeHead(401, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Unauthorized - please sign in' }));
                    return;
                }

                console.log('Authenticated user:', user.email);

                // Check rate limit
                const rateLimit = await checkRateLimit(user.id, SUPABASE_SERVICE_KEY);
                if (!rateLimit.allowed) {
                    // Check if it's a service error or actual rate limit
                    if (rateLimit.error) {
                        console.log(`Rate limit service error for ${user.email}: ${rateLimit.error}`);
                        res.writeHead(503, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({
                            error: 'Service unavailable',
                            message: 'Unable to process request. Please try again later.'
                        }));
                    } else {
                        console.log(`Rate limit exceeded for ${user.email}: ${rateLimit.current}/${rateLimit.limit}`);
                        res.writeHead(429, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({
                            error: 'Daily limit reached',
                            message: `You've used all ${rateLimit.limit} queries for today. Your limit resets at midnight UTC.`,
                            current: rateLimit.current,
                            limit: rateLimit.limit
                        }));
                    }
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

    // Admin stats endpoint
    if (req.url === '/api/admin/stats' && req.method === 'GET') {
        try {
            // Verify auth token
            const authHeader = req.headers['authorization'];
            const token = authHeader?.replace('Bearer ', '');

            const user = await verifySupabaseToken(token, SUPABASE_ANON_KEY);
            if (!user) {
                res.writeHead(401, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Unauthorized' }));
                return;
            }

            // Check if user is admin
            if (user.email !== process.env.ADMIN_EMAIL) {
                res.writeHead(403, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Forbidden - admin only' }));
                return;
            }

            const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
            const today = new Date().toISOString().split('T')[0];

            // Get today's stats
            const { data: todayStats, error: todayError } = await supabase
                .from('rate_limits')
                .select('user_id, query_count')
                .eq('date', today);

            if (todayError) throw todayError;

            // Get all-time stats
            const { data: allTimeStats, error: allTimeError } = await supabase
                .from('rate_limits')
                .select('user_id, query_count, date');

            if (allTimeError) throw allTimeError;

            // Get user emails from auth
            const { data: { users }, error: usersError } = await supabase.auth.admin.listUsers();

            const userEmailMap = {};
            if (!usersError && users) {
                users.forEach(u => {
                    userEmailMap[u.id] = u.email;
                });
            }

            // Calculate stats
            const uniqueUsersToday = new Set(todayStats?.map(r => r.user_id) || []).size;
            const queriesToday = todayStats?.reduce((sum, r) => sum + r.query_count, 0) || 0;
            const uniqueUsersAllTime = new Set(allTimeStats?.map(r => r.user_id) || []).size;
            const queriesAllTime = allTimeStats?.reduce((sum, r) => sum + r.query_count, 0) || 0;

            // Daily breakdown
            const dailyStats = {};
            allTimeStats?.forEach(r => {
                if (!dailyStats[r.date]) {
                    dailyStats[r.date] = { users: new Set(), queries: 0 };
                }
                dailyStats[r.date].users.add(r.user_id);
                dailyStats[r.date].queries += r.query_count;
            });

            const dailyBreakdown = Object.entries(dailyStats)
                .map(([date, stats]) => ({
                    date,
                    uniqueUsers: stats.users.size,
                    totalQueries: stats.queries
                }))
                .sort((a, b) => b.date.localeCompare(a.date))
                .slice(0, 30);

            // Per-user stats
            const userStats = {};
            allTimeStats?.forEach(r => {
                if (!userStats[r.user_id]) {
                    userStats[r.user_id] = { queries: 0, days: new Set() };
                }
                userStats[r.user_id].queries += r.query_count;
                userStats[r.user_id].days.add(r.date);
            });

            const userBreakdown = Object.entries(userStats)
                .map(([userId, stats]) => ({
                    email: userEmailMap[userId] || userId,
                    totalQueries: stats.queries,
                    activeDays: stats.days.size
                }))
                .sort((a, b) => b.totalQueries - a.totalQueries);

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                today: { date: today, uniqueUsers: uniqueUsersToday, totalQueries: queriesToday },
                allTime: { uniqueUsers: uniqueUsersAllTime, totalQueries: queriesAllTime },
                dailyBreakdown,
                userBreakdown
            }));
        } catch (error) {
            console.error('Admin stats error:', error);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Failed to fetch stats' }));
        }
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
