/**
 * components.js - UI Component System for RDR2 Companion
 *
 * Provides reusable components via data-component attributes.
 * Components are injected at DOMContentLoaded for below-fold content,
 * or via document.write() for above-fold content (no FOUC).
 */

const Components = {

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
