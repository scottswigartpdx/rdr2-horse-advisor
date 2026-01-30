-- Run this in Supabase SQL Editor (Dashboard > SQL Editor)
-- Last updated: Added visitor_usage table for anonymous users + query_log for analytics

-- ========== LOGGED-IN USER USAGE ==========
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

-- ========== ANONYMOUS VISITOR USAGE ==========
-- Table to track daily API usage for anonymous visitors (before sign-in)
CREATE TABLE IF NOT EXISTS visitor_usage (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    visitor_id TEXT NOT NULL,  -- client-generated ID stored in localStorage
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    query_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(visitor_id, date)
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_visitor_usage_visitor_date ON visitor_usage(visitor_id, date);

-- Enable RLS (Row Level Security)
ALTER TABLE visitor_usage ENABLE ROW LEVEL SECURITY;

-- Policy: Service role can do everything (server-side only)
CREATE POLICY "Service role full access on visitor_usage" ON visitor_usage
    FOR ALL USING (auth.role() = 'service_role');

-- Function to increment visitor usage and check limit (atomic operation)
CREATE OR REPLACE FUNCTION increment_visitor_usage(p_visitor_id TEXT, p_daily_limit INTEGER DEFAULT 20)
RETURNS TABLE(allowed BOOLEAN, current_count INTEGER, daily_limit INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_count INTEGER;
BEGIN
    -- Insert or update usage for today
    INSERT INTO visitor_usage (visitor_id, date, query_count)
    VALUES (p_visitor_id, CURRENT_DATE, 1)
    ON CONFLICT (visitor_id, date)
    DO UPDATE SET
        query_count = visitor_usage.query_count + 1,
        updated_at = NOW()
    RETURNING visitor_usage.query_count INTO v_count;

    -- Return whether the query is allowed
    RETURN QUERY SELECT
        v_count <= p_daily_limit AS allowed,
        v_count AS current_count,
        p_daily_limit AS daily_limit;
END;
$$;

-- ========== QUERY LOG (ANALYTICS) ==========
-- Table to log all questions for analytics
CREATE TABLE IF NOT EXISTS query_log (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    visitor_id TEXT,              -- for anonymous users
    user_id UUID,                 -- for logged-in users (nullable)
    question TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_query_log_created ON query_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_query_log_visitor ON query_log(visitor_id) WHERE visitor_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_query_log_user ON query_log(user_id) WHERE user_id IS NOT NULL;

-- Enable RLS
ALTER TABLE query_log ENABLE ROW LEVEL SECURITY;

-- Policy: Service role can do everything
CREATE POLICY "Service role full access on query_log" ON query_log
    FOR ALL USING (auth.role() = 'service_role');
