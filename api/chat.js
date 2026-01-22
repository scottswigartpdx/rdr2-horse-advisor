// Vercel Serverless Function - OpenAI Responses API Proxy
// Keeps API key secure on server side

const { verifySupabaseToken, checkRateLimit, DAILY_QUERY_LIMIT } = require('../lib/auth');
const { runChatAgent } = require('../lib/agentRunner');

export default async function handler(req, res) {
    // Only allow POST
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    // Verify auth token
    const authHeader = req.headers['authorization'];
    const token = authHeader?.replace('Bearer ', '');

    const user = await verifySupabaseToken(token, process.env.SUPABASE_ANON_KEY);
    if (!user) {
        return res.status(401).json({ error: 'Unauthorized - please sign in' });
    }

    console.log('Authenticated user:', user.email);

    // Check rate limit
    const rateLimit = await checkRateLimit(user.id, process.env.SUPABASE_SERVICE_KEY);
    if (!rateLimit.allowed) {
        // Check if it's a service error or actual rate limit
        if (rateLimit.error) {
            console.log(`Rate limit service error for ${user.email}: ${rateLimit.error}`);
            return res.status(503).json({
                error: 'Service unavailable',
                message: 'Unable to process request. Please try again later.'
            });
        } else {
            console.log(`Rate limit exceeded for ${user.email}: ${rateLimit.current}/${rateLimit.limit}`);
            return res.status(429).json({
                error: 'Daily limit reached',
                message: `You've used all ${rateLimit.limit} queries for today. Your limit resets at midnight UTC.`,
                current: rateLimit.current,
                limit: rateLimit.limit
            });
        }
    }

    console.log(`Query ${rateLimit.current}/${rateLimit.limit} for ${user.email}`);

    try {
        const { system, messages } = req.body;
        const outputText = await runChatAgent({ system, messages, model: 'gpt-5.2' });

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
