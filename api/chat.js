// Vercel Serverless Function - OpenAI Responses API Proxy
// Keeps API key secure on server side

const { verifySupabaseToken, checkRateLimit, checkVisitorRateLimit, logQuery, DAILY_QUERY_LIMIT } = require('../lib/auth');
const { runChatAgent } = require('../lib/agentRunner');

export default async function handler(req, res) {
    // Only allow POST
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    // Check for auth token (logged-in user) or visitor ID (anonymous)
    const authHeader = req.headers['authorization'];
    const token = authHeader?.replace('Bearer ', '');
    const visitorId = req.headers['x-visitor-id'];

    let user = null;
    let rateLimit = null;
    let isAnonymous = false;

    // Try to authenticate user
    if (token) {
        user = await verifySupabaseToken(token, process.env.SUPABASE_ANON_KEY);
    }

    if (user) {
        // Logged-in user - use user rate limiting
        console.log('Authenticated user:', user.email);
        rateLimit = await checkRateLimit(user.id, process.env.SUPABASE_SERVICE_KEY);
    } else if (visitorId) {
        // Anonymous visitor - use visitor rate limiting
        isAnonymous = true;
        console.log('Anonymous visitor:', visitorId.substring(0, 8) + '...');
        rateLimit = await checkVisitorRateLimit(visitorId, process.env.SUPABASE_SERVICE_KEY);
    } else {
        // No auth and no visitor ID - reject
        return res.status(401).json({
            error: 'Unauthorized',
            message: 'Please sign in or enable cookies to continue.'
        });
    }

    // Check rate limit result
    if (!rateLimit.allowed) {
        if (rateLimit.error) {
            console.log(`Rate limit service error: ${rateLimit.error}`);
            return res.status(503).json({
                error: 'Service unavailable',
                message: 'Unable to process request. Please try again later.'
            });
        } else if (isAnonymous) {
            // Anonymous user hit limit - prompt to sign in
            console.log(`Anonymous visitor limit reached: ${rateLimit.current}/${rateLimit.limit}`);
            return res.status(401).json({
                error: 'Anonymous limit reached',
                code: 'ANONYMOUS_LIMIT_REACHED',
                message: `You've used your ${rateLimit.limit} free questions. Sign in to continue!`,
                current: rateLimit.current,
                limit: rateLimit.limit
            });
        } else {
            // Logged-in user hit limit
            console.log(`Rate limit exceeded for ${user.email}: ${rateLimit.current}/${rateLimit.limit}`);
            return res.status(429).json({
                error: 'Daily limit reached',
                message: `You've used all ${rateLimit.limit} queries for today. Your limit resets at midnight UTC.`,
                current: rateLimit.current,
                limit: rateLimit.limit
            });
        }
    }

    const userLabel = user ? user.email : `visitor:${visitorId.substring(0, 8)}`;
    console.log(`Query ${rateLimit.current}/${rateLimit.limit} for ${userLabel}`);

    try {
        const { system, messages } = req.body;

        // Get the user's question (last user message)
        const userQuestion = messages.filter(m => m.role === 'user').pop()?.content || '';

        const outputText = await runChatAgent({ system, messages, model: 'gpt-5.2' });

        // Log the query for analytics (don't await - fire and forget)
        logQuery({
            visitorId: isAnonymous ? visitorId : null,
            userId: user?.id || null,
            question: userQuestion,
            supabaseServiceKey: process.env.SUPABASE_SERVICE_KEY
        });

        // Transform response to match our frontend's expected format
        const transformedResponse = {
            content: [{
                text: outputText
            }]
        };

        return res.status(200).json(transformedResponse);

    } catch (error) {
        console.error('API Error:', error);
        return res.status(500).json({ error: 'Failed to call OpenAI API' });
    }
}
