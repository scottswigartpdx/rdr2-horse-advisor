/**
 * utils.js - Shared utilities for RDR2 Companion
 *
 * Provides centralized Supabase auth singleton and common utility functions.
 * All pages should use window.Auth instead of creating their own Supabase clients.
 */

// ========== SUPABASE AUTH SINGLETON ==========
const SUPABASE_URL = 'https://vejhtrzmesjpxlonwhig.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_QYHw3yzSd61GgQj3Izb3ng_zkfT_IZv';

let _supabaseClient = null;

/**
 * Get the Supabase client singleton.
 * Creates the client on first call, returns cached instance thereafter.
 */
function getSupabaseClient() {
    if (!_supabaseClient) {
        _supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
            auth: {
                detectSessionInUrl: true,
                persistSession: true,
                autoRefreshToken: true,
                flowType: 'pkce'
            }
        });
    }
    return _supabaseClient;
}

/**
 * Get the current auth token for API calls.
 * Returns null if user is not logged in.
 */
async function getAuthToken() {
    const { data: { session } } = await getSupabaseClient().auth.getSession();
    return session?.access_token || null;
}

/**
 * Sign in with Google OAuth.
 * Redirects to Google, then back to the current page.
 */
async function signInWithGoogle() {
    const { error } = await getSupabaseClient().auth.signInWithOAuth({
        provider: 'google',
        options: {
            redirectTo: window.location.href
        }
    });
    if (error) {
        console.error('Sign in error:', error);
    }
}

/**
 * Sign out the current user.
 */
async function signOut() {
    const { error } = await getSupabaseClient().auth.signOut();
    if (error) {
        console.error('Sign out error:', error);
    }
}

/**
 * Get the current session (includes user info).
 */
async function getSession() {
    const { data: { session } } = await getSupabaseClient().auth.getSession();
    return session;
}

/**
 * Get the current user (or null if not logged in).
 */
async function getCurrentUser() {
    const session = await getSession();
    return session?.user || null;
}

/**
 * Listen for auth state changes.
 * @param {Function} callback - Called with (event, session) on auth changes
 */
function onAuthStateChange(callback) {
    return getSupabaseClient().auth.onAuthStateChange(callback);
}

// Export as window.Auth for use across pages
window.Auth = {
    getSupabaseClient,
    getAuthToken,
    signInWithGoogle,
    signOut,
    getSession,
    getCurrentUser,
    onAuthStateChange
};

// Also export individual functions for pages that prefer direct access
window.getAuthToken = getAuthToken;
window.signInWithGoogle = signInWithGoogle;
