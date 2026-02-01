// Shared authentication and rate limiting utilities
// Used by both api/chat.js (Vercel) and server.js (local dev)
//
// IMPORTANT: No silent fallbacks! Critical features must fail loudly.
// If logging or rate limiting can't work, the app should refuse to start.
// Silent failures lead to features being broken in production without anyone noticing.

const SUPABASE_URL = 'https://vejhtrzmesjpxlonwhig.supabase.co';
const DAILY_QUERY_LIMIT = 20;

// Validate required configuration - call this at startup
// Throws if critical env vars are missing
function validateConfig() {
    const missing = [];

    if (!process.env.SUPABASE_SERVICE_KEY) {
        missing.push('SUPABASE_SERVICE_KEY');
    }
    if (!process.env.SUPABASE_ANON_KEY) {
        missing.push('SUPABASE_ANON_KEY');
    }

    if (missing.length > 0) {
        throw new Error(`Missing required environment variables: ${missing.join(', ')}. ` +
            `Rate limiting and query logging will not work without these. ` +
            `Add them to Vercel with: npx vercel env add <VAR_NAME>`);
    }
}

// Verify Supabase auth token
async function verifySupabaseToken(token, supabaseAnonKey) {
    if (!token) return null;

    try {
        const response = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'apikey': supabaseAnonKey
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
async function checkRateLimit(userId, supabaseServiceKey) {
    if (!supabaseServiceKey) {
        // No silent fallback - this is a critical feature
        throw new Error('SUPABASE_SERVICE_KEY not set - cannot check rate limits');
    }

    try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/increment_usage`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'apikey': supabaseServiceKey,
                'Authorization': `Bearer ${supabaseServiceKey}`
            },
            body: JSON.stringify({
                p_user_id: userId,
                p_daily_limit: DAILY_QUERY_LIMIT
            })
        });

        if (!response.ok) {
            const error = await response.text();
            console.error('Rate limit check failed:', error);
            // Fail closed - deny the request if rate limiting fails
            return { allowed: false, current: 0, limit: DAILY_QUERY_LIMIT, error: 'Service temporarily unavailable' };
        }

        const result = await response.json();
        if (result && result.length > 0) {
            return {
                allowed: result[0].allowed,
                current: result[0].current_count,
                limit: result[0].daily_limit
            };
        }

        // Unexpected response format - fail closed
        return { allowed: false, current: 0, limit: DAILY_QUERY_LIMIT, error: 'Service temporarily unavailable' };
    } catch (error) {
        console.error('Rate limit error:', error);
        // Fail closed - deny the request if rate limiting fails
        return { allowed: false, current: 0, limit: DAILY_QUERY_LIMIT, error: 'Service temporarily unavailable' };
    }
}

// Check and increment rate limit for anonymous visitor
async function checkVisitorRateLimit(visitorId, supabaseServiceKey) {
    if (!supabaseServiceKey) {
        // No silent fallback - this is a critical feature
        throw new Error('SUPABASE_SERVICE_KEY not set - cannot check rate limits');
    }

    if (!visitorId || visitorId.length < 10) {
        // Invalid visitor ID - reject
        return { allowed: false, current: 0, limit: DAILY_QUERY_LIMIT, error: 'Invalid visitor ID' };
    }

    try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/increment_visitor_usage`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'apikey': supabaseServiceKey,
                'Authorization': `Bearer ${supabaseServiceKey}`
            },
            body: JSON.stringify({
                p_visitor_id: visitorId,
                p_daily_limit: DAILY_QUERY_LIMIT
            })
        });

        if (!response.ok) {
            const error = await response.text();
            console.error('Visitor rate limit check failed:', error);
            return { allowed: false, current: 0, limit: DAILY_QUERY_LIMIT, error: 'Service temporarily unavailable' };
        }

        const result = await response.json();
        if (result && result.length > 0) {
            return {
                allowed: result[0].allowed,
                current: result[0].current_count,
                limit: result[0].daily_limit
            };
        }

        return { allowed: false, current: 0, limit: DAILY_QUERY_LIMIT, error: 'Service temporarily unavailable' };
    } catch (error) {
        console.error('Visitor rate limit error:', error);
        return { allowed: false, current: 0, limit: DAILY_QUERY_LIMIT, error: 'Service temporarily unavailable' };
    }
}

// Log a query for analytics
// Throws on failure - logging is a critical feature, not optional
async function logQuery({ visitorId, userId, question, supabaseServiceKey }) {
    if (!supabaseServiceKey) {
        // No silent fallback - this is a critical feature
        throw new Error('SUPABASE_SERVICE_KEY not set - cannot log queries');
    }

    const response = await fetch(`${SUPABASE_URL}/rest/v1/query_log`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'apikey': supabaseServiceKey,
            'Authorization': `Bearer ${supabaseServiceKey}`,
            'Prefer': 'return=minimal'
        },
        body: JSON.stringify({
            visitor_id: visitorId || null,
            user_id: userId || null,
            question: question
        })
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`Query logging failed: ${error}`);
    }
}

module.exports = {
    SUPABASE_URL,
    DAILY_QUERY_LIMIT,
    validateConfig,
    verifySupabaseToken,
    checkRateLimit,
    checkVisitorRateLimit,
    logQuery
};
