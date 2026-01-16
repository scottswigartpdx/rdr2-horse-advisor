// Shared authentication and rate limiting utilities
// Used by both api/chat.js (Vercel) and server.js (local dev)

const SUPABASE_URL = 'https://vejhtrzmesjpxlonwhig.supabase.co';
const DAILY_QUERY_LIMIT = 20;

// Verify Supabase auth token
async function verifySupabaseToken(token, supabaseAnonKey) {
    if (!token) {
        console.log('[AUTH] No token provided');
        return null;
    }

    console.log('[AUTH] Verifying token, length:', token.length, 'starts with:', token.substring(0, 20));
    console.log('[AUTH] Using apikey:', supabaseAnonKey ? supabaseAnonKey.substring(0, 20) + '...' : 'MISSING');

    try {
        const response = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'apikey': supabaseAnonKey
            }
        });

        console.log('[AUTH] Supabase response status:', response.status);

        if (response.ok) {
            const user = await response.json();
            console.log('[AUTH] Verified user:', user.email);
            return user;
        }

        const errorText = await response.text();
        console.log('[AUTH] Verification failed:', errorText);
        return null;
    } catch (error) {
        console.error('[AUTH] Token verification error:', error);
        return null;
    }
}

// Check and increment rate limit for user
async function checkRateLimit(userId, supabaseServiceKey) {
    if (!supabaseServiceKey) {
        console.warn('SUPABASE_SERVICE_KEY not set - rate limiting disabled');
        return { allowed: true, current: 0, limit: DAILY_QUERY_LIMIT };
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

module.exports = {
    SUPABASE_URL,
    DAILY_QUERY_LIMIT,
    verifySupabaseToken,
    checkRateLimit
};
