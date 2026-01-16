// Admin endpoint for usage statistics
// Restricted to ADMIN_EMAIL

const { verifySupabaseToken } = require('../../lib/auth');
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://tbnbfdcqdmfcaczxczyx.supabase.co';

export default async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    // Verify auth token
    const authHeader = req.headers['authorization'];
    const token = authHeader?.replace('Bearer ', '');

    const user = await verifySupabaseToken(token, process.env.SUPABASE_ANON_KEY);
    if (!user) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    // Check if user is admin
    if (user.email !== process.env.ADMIN_EMAIL) {
        return res.status(403).json({ error: 'Forbidden - admin only' });
    }

    try {
        // Use service key to query rate_limits table
        const supabase = createClient(SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

        // Get today's stats
        const today = new Date().toISOString().split('T')[0];

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

        // Get user emails from auth (for display)
        const { data: { users }, error: usersError } = await supabase.auth.admin.listUsers();

        const userEmailMap = {};
        if (!usersError && users) {
            users.forEach(u => {
                userEmailMap[u.id] = u.email;
            });
        }

        // Calculate summary stats
        const uniqueUsersToday = new Set(todayStats?.map(r => r.user_id) || []).size;
        const queriesToday = todayStats?.reduce((sum, r) => sum + r.query_count, 0) || 0;

        const uniqueUsersAllTime = new Set(allTimeStats?.map(r => r.user_id) || []).size;
        const queriesAllTime = allTimeStats?.reduce((sum, r) => sum + r.query_count, 0) || 0;

        // Get daily breakdown (last 30 days)
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

        // Get per-user stats (all time)
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

        return res.status(200).json({
            today: {
                date: today,
                uniqueUsers: uniqueUsersToday,
                totalQueries: queriesToday
            },
            allTime: {
                uniqueUsers: uniqueUsersAllTime,
                totalQueries: queriesAllTime
            },
            dailyBreakdown,
            userBreakdown
        });

    } catch (error) {
        console.error('Admin stats error:', error);
        return res.status(500).json({ error: 'Failed to fetch stats' });
    }
}
