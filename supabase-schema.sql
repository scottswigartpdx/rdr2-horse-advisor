-- Run this in Supabase SQL Editor (Dashboard > SQL Editor)

-- Table to track daily API usage per user
CREATE TABLE IF NOT EXISTS usage (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    query_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, date)
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_usage_user_date ON usage(user_id, date);

-- Enable RLS (Row Level Security)
ALTER TABLE usage ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own usage (optional, for if you expose this to frontend)
CREATE POLICY "Users can view own usage" ON usage
    FOR SELECT USING (auth.uid() = user_id);

-- Policy: Service role can do everything (for server-side operations)
CREATE POLICY "Service role full access" ON usage
    FOR ALL USING (auth.role() = 'service_role');

-- Function to increment usage and check limit (atomic operation)
CREATE OR REPLACE FUNCTION increment_usage(p_user_id UUID, p_daily_limit INTEGER DEFAULT 20)
RETURNS TABLE(allowed BOOLEAN, current_count INTEGER, daily_limit INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_count INTEGER;
BEGIN
    -- Insert or update usage for today
    INSERT INTO usage (user_id, date, query_count)
    VALUES (p_user_id, CURRENT_DATE, 1)
    ON CONFLICT (user_id, date)
    DO UPDATE SET
        query_count = usage.query_count + 1,
        updated_at = NOW()
    RETURNING usage.query_count INTO v_count;

    -- Return whether the query is allowed
    RETURN QUERY SELECT
        v_count <= p_daily_limit AS allowed,
        v_count AS current_count,
        p_daily_limit AS daily_limit;
END;
$$;
