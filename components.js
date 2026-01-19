/**
 * components.js - UI Component System for RDR2 Companion
 *
 * Provides reusable components via data-component attributes.
 * Components are injected at DOMContentLoaded for below-fold content,
 * or via document.write() for above-fold content (no FOUC).
 */

const Components = {

    /**
     * Back-link component
     * @param {Object} props
     * @param {string} props.href - Link destination
     * @param {string} props.text - Link text (without arrow)
     * @param {string} [props.style] - Optional inline styles
     */
    backLink: (props = {}) => {
        const style = props.style ? ` style="${props.style}"` : '';
        return `<a href="${props.href}" class="back-link"${style}>&larr; ${props.text}</a>`;
    },

    /**
     * Header component (simple variant)
     * For detail/list pages with back-link and optional title/subtitle.
     * @param {Object} props
     * @param {string} props.backHref - Back link destination
     * @param {string} props.backText - Back link text
     * @param {string} [props.title] - Page title (optional for dynamic pages)
     * @param {string} [props.subtitle] - Page subtitle
     * @param {string} [props.titleHref] - Make title a link (for admin page)
     */
    header: (props = {}) => {
        const backLink = Components.backLink({ href: props.backHref, text: props.backText });
        let titleHtml = '';
        if (props.title) {
            if (props.titleHref) {
                titleHtml = `<h1><a href="${props.titleHref}">${props.title}</a></h1>`;
            } else {
                titleHtml = `<h1>${props.title}</h1>`;
            }
        }
        const subtitleHtml = props.subtitle ? `<p class="subtitle">${props.subtitle}</p>` : '';
        return `
        <header class="header-simple">
            ${backLink}
            ${titleHtml}
            ${subtitleHtml}
        </header>`;
    },

    /**
     * Auth container component (internal)
     * Login button and user dropdown for hub pages.
     * Requires app.js for signInWithGoogle, signOut, toggleUserMenu.
     */
    authContainer: () => {
        return `
            <div class="auth-container" id="authContainer">
                <button id="loginBtn" class="auth-btn" onclick="signInWithGoogle()" style="display: none;">
                    Sign in with Google
                </button>
                <div id="userInfo" class="user-info" style="display: none;">
                    <span id="userEmail"></span>
                    <button class="auth-btn auth-btn-small auth-btn-signout" onclick="signOut()">Sign out</button>
                    <button class="user-avatar" onclick="toggleUserMenu()" aria-label="User menu">👤</button>
                    <div class="user-dropdown">
                        <span class="user-dropdown-email"></span>
                        <button onclick="signOut()">Sign out</button>
                    </div>
                </div>
            </div>`;
    },

    /**
     * Header component (full variant)
     * For hub pages with title, auth UI, and optional subtitle/back-link.
     * @param {Object} props
     * @param {string} props.title - Page title (h1 text)
     * @param {string} [props.titleHref="/"] - Title link destination
     * @param {string} [props.subtitle] - Plain subtitle text (mutually exclusive with backHref)
     * @param {string} [props.backHref] - Back link destination (appears above title)
     * @param {string} [props.backText] - Back link text (required if backHref set)
     */
    headerFull: (props = {}) => {
        const titleHref = props.titleHref || '/';
        const authContainer = Components.authContainer();

        // Back link appears above title (consistent with simple header)
        const backLinkHtml = props.backHref
            ? Components.backLink({ href: props.backHref, text: props.backText })
            : '';

        const subtitleHtml = props.subtitle
            ? `<p class="subtitle">${props.subtitle}</p>`
            : '';

        return `
        <header class="header-full">
            ${authContainer}
            ${backLinkHtml}
            <h1><a href="${titleHref}">${props.title}</a></h1>
            ${subtitleHtml}
        </header>`;
    },

    /**
     * Section nav component
     * Navigation grid for hub pages with revolver pointer icons.
     * @param {Object} props
     * @param {Array} props.items - Array of {href, label} objects
     */
    sectionNav: (props = {}) => {
        const items = props.items || [];
        const itemsHtml = items.map(item => `
                                <a href="${item.href}" class="section-nav-item">
                                    <span class="revolver-pointer">
                                        <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                            <path d="M4 8h12l4 4-4 4H4V8z"/>
                                        </svg>
                                    </span>
                                    <span class="section-text">${item.label}</span>
                                </a>`).join('');

        return `
                        <nav class="section-nav">
                            <div class="section-nav-inner">
                                ${itemsHtml}
                            </div>
                        </nav>`;
    },

    /**
     * Sign-in modal component
     * Displays Google OAuth sign-in prompt. Requires app.js for showSignInModal/closeSignInModal.
     */
    signInModal: () => {
        return `
    <div id="signInModal" class="modal-overlay" style="display: none;">
        <div class="modal-content">
            <button class="modal-close" onclick="closeSignInModal()">&times;</button>
            <h2>Sign In Required</h2>
            <p>To prevent abuse and bots, you need to create a free account to use the AI features.</p>
            <div class="modal-buttons">
                <button class="modal-btn modal-btn-google" onclick="signInWithGoogle()">
                    <svg viewBox="0 0 24 24" width="20" height="20">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                    Continue with Google
                </button>
            </div>
            <p class="modal-note">Your data stays private. We only use your email to identify your account.</p>
        </div>
    </div>`;
    },

    /**
     * Footer component
     * @param {Object} props
     * @param {string} [props.text] - Custom footer text (defaults to standard disclaimer)
     */
    footer: (props = {}) => {
        const text = props.text || 'Data sourced from the RDR2 community. Not affiliated with Rockstar Games.';
        return `
        <footer>
            <p>${text}</p>
        </footer>`;
    },

    /**
     * Initialize components - call on DOMContentLoaded for below-fold components
     */
    init: () => {
        document.querySelectorAll('[data-component]').forEach(el => {
            const name = el.dataset.component;
            const props = el.dataset.props ? JSON.parse(el.dataset.props) : {};
            const renderFn = Components[name];
            if (renderFn) {
                el.outerHTML = renderFn(props);
            } else {
                console.warn(`Unknown component: ${name}`);
            }
        });
    }
};

// Auto-init on DOMContentLoaded
document.addEventListener('DOMContentLoaded', Components.init);

// Export for use in other scripts
window.Components = Components;
