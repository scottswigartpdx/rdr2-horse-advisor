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

// ========== TABLE UTILITIES ==========

/**
 * TableUtils - Shared utilities for sortable/filterable tables
 */
const TableUtils = {
    /**
     * Initialize scroll shadow behavior for horizontal scrolling tables.
     * Hides the right shadow when scrolled to the end.
     * @param {string} wrapperId - ID of the scroll wrapper element
     */
    initScrollShadow: (wrapperId) => {
        const scrollWrapper = document.getElementById(wrapperId);
        if (!scrollWrapper) return;

        const outerWrapper = scrollWrapper.parentElement;
        scrollWrapper.addEventListener('scroll', () => {
            const isAtEnd = scrollWrapper.scrollLeft + scrollWrapper.clientWidth >= scrollWrapper.scrollWidth - 5;
            outerWrapper.classList.toggle('scrolled-end', isAtEnd);
        });
    },

    /**
     * Update sort indicator classes on table headers.
     * @param {string} tableSelector - CSS selector for the table
     * @param {Object} sortState - { column: string, direction: 'asc'|'desc' }
     */
    updateSortIndicators: (tableSelector, sortState) => {
        document.querySelectorAll(`${tableSelector} th`).forEach(th => {
            th.classList.remove('sorted-asc', 'sorted-desc');
            if (th.dataset.sort === sortState.column) {
                th.classList.add(sortState.direction === 'asc' ? 'sorted-asc' : 'sorted-desc');
            }
        });
    },

    /**
     * Initialize sort click listeners on table headers.
     * @param {string} tableSelector - CSS selector for the table
     * @param {Object} sortState - { column: string, direction: 'asc'|'desc' } - will be mutated
     * @param {Function} onSort - Callback after sort state changes (typically calls updateTable)
     * @param {Array} [ascFirstColumns=[]] - Columns that should sort ascending first (e.g., price, name)
     */
    initSortListeners: (tableSelector, sortState, onSort, ascFirstColumns = []) => {
        document.querySelectorAll(`${tableSelector} th[data-sort]`).forEach(th => {
            th.addEventListener('click', () => {
                const column = th.dataset.sort;
                if (sortState.column === column) {
                    // Toggle direction on same column
                    sortState.direction = sortState.direction === 'desc' ? 'asc' : 'desc';
                } else {
                    // New column - determine initial direction
                    sortState.column = column;
                    sortState.direction = ascFirstColumns.includes(column) ? 'asc' : 'desc';
                }
                TableUtils.updateSortIndicators(tableSelector, sortState);
                onSort();
            });
        });
    }
};

// Export TableUtils globally
window.TableUtils = TableUtils;
