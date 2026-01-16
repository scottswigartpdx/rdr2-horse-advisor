// Vercel Serverless Function - OpenAI Responses API Proxy
// Keeps API key secure on server side

const { verifySupabaseToken, checkRateLimit, DAILY_QUERY_LIMIT } = require('../lib/auth');

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

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
        return res.status(500).json({ error: 'API key not configured' });
    }

    try {
        const { system, messages } = req.body;

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
                'Authorization': `Bearer ${apiKey}`
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

        return res.status(response.ok ? 200 : response.status).json(transformedResponse);

    } catch (error) {
        console.error('API Error:', error);
        return res.status(500).json({ error: 'Failed to call OpenAI API' });
    }
}
