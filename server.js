// Simple local dev server with OpenAI Responses API
const http = require('http');
const fs = require('fs');
const path = require('path');
const { runChatAgent } = require('./lib/agentRunner');

// Load .env file
require('dotenv').config();

// Shared auth utilities
const { verifySupabaseToken, checkRateLimit, checkVisitorRateLimit, logQuery, DAILY_QUERY_LIMIT, SUPABASE_URL } = require('./lib/auth');
const { createClient } = require('@supabase/supabase-js');

const PORT = Number(process.env.PORT) || 3000;

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
                // Check for auth token (logged-in user) or visitor ID (anonymous)
                const authHeader = req.headers['authorization'];
                const token = authHeader?.replace('Bearer ', '');
                const visitorId = req.headers['x-visitor-id'];

                let user = null;
                let rateLimit = null;
                let isAnonymous = false;

                // Try to authenticate user
                if (token) {
                    user = await verifySupabaseToken(token, SUPABASE_ANON_KEY);
                }

                if (user) {
                    // Logged-in user - use user rate limiting
                    console.log('Authenticated user:', user.email);
                    rateLimit = await checkRateLimit(user.id, SUPABASE_SERVICE_KEY);
                } else if (visitorId) {
                    // Anonymous visitor - use visitor rate limiting
                    isAnonymous = true;
                    console.log('Anonymous visitor:', visitorId.substring(0, 8) + '...');
                    rateLimit = await checkVisitorRateLimit(visitorId, SUPABASE_SERVICE_KEY);
                } else {
                    // No auth and no visitor ID - reject
                    res.writeHead(401, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({
                        error: 'Unauthorized',
                        message: 'Please sign in or enable cookies to continue.'
                    }));
                    return;
                }

                // Check rate limit result
                if (!rateLimit.allowed) {
                    if (rateLimit.error) {
                        console.log(`Rate limit service error: ${rateLimit.error}`);
                        res.writeHead(503, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({
                            error: 'Service unavailable',
                            message: 'Unable to process request. Please try again later.'
                        }));
                    } else if (isAnonymous) {
                        // Anonymous user hit limit - prompt to sign in
                        console.log(`Anonymous visitor limit reached: ${rateLimit.current}/${rateLimit.limit}`);
                        res.writeHead(401, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({
                            error: 'Anonymous limit reached',
                            code: 'ANONYMOUS_LIMIT_REACHED',
                            message: `You've used your ${rateLimit.limit} free questions. Sign in to continue!`,
                            current: rateLimit.current,
                            limit: rateLimit.limit
                        }));
                    } else {
                        // Logged-in user hit limit
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

                const userLabel = user ? user.email : `visitor:${visitorId.substring(0, 8)}`;
                console.log(`Query ${rateLimit.current}/${rateLimit.limit} for ${userLabel}`);

                const { system, messages } = JSON.parse(body);

                // Get the user's question (last user message)
                const userQuestion = messages.filter(m => m.role === 'user').pop()?.content || '';

                const outputText = await runChatAgent({ system, messages, model: 'gpt-5.2' });

                // Log the query for analytics (don't await - fire and forget)
                logQuery({
                    visitorId: isAnonymous ? visitorId : null,
                    userId: user?.id || null,
                    question: userQuestion,
                    supabaseServiceKey: SUPABASE_SERVICE_KEY
                });

                // Transform response to match our frontend's expected format
                const transformedResponse = {
                    content: [{
                        text: outputText
                    }]
                };

                res.writeHead(200, { 'Content-Type': 'application/json' });
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
