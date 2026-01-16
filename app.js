// RDR2 Horse Advisor - Main Application

// ========== PENDING ACTION SYSTEM ==========
// General system for resuming user actions after OAuth redirect
// Uses sessionStorage with a unique prefix to avoid conflicts with Supabase

const PENDING_ACTION_KEY = 'rdr2_pending_action';

const PendingAction = {
    // Save an action to resume after login
    save(type, data) {
        const action = {
            type,
            data,
            timestamp: Date.now(),
            page: window.location.pathname
        };
        sessionStorage.setItem(PENDING_ACTION_KEY, JSON.stringify(action));
        console.log('[PendingAction] Saved:', action);
    },

    // Get and clear the pending action (call early, before Supabase can clear storage)
    retrieve() {
        const stored = sessionStorage.getItem(PENDING_ACTION_KEY);
        if (stored) {
            sessionStorage.removeItem(PENDING_ACTION_KEY);
            try {
                const action = JSON.parse(stored);
                // Expire actions older than 10 minutes
                if (Date.now() - action.timestamp > 10 * 60 * 1000) {
                    console.log('[PendingAction] Expired, ignoring');
                    return null;
                }
                console.log('[PendingAction] Retrieved:', action);
                return action;
            } catch (e) {
                console.error('[PendingAction] Parse error:', e);
                return null;
            }
        }
        return null;
    },

    // Restore action to storage (if user isn't logged in yet)
    restore(action) {
        if (action) {
            sessionStorage.setItem(PENDING_ACTION_KEY, JSON.stringify(action));
            console.log('[PendingAction] Restored to storage');
        }
    },

    // Execute a pending action based on its type
    execute(action) {
        if (!action) return;

        console.log('[PendingAction] Executing:', action.type);

        const handlers = {
            // Chat query - submit a question to the AI
            'chat_query': (data) => {
                const input = document.getElementById('queryInput');
                if (input) {
                    input.value = data.query;
                    // Wait for horse data to load
                    const trySubmit = () => {
                        if (horseData) {
                            sendQuery();
                        } else {
                            setTimeout(trySubmit, 200);
                        }
                    };
                    setTimeout(trySubmit, 100);
                }
            },

            // Navigate - go to a specific page (for future use)
            'navigate': (data) => {
                if (data.url) {
                    window.location.href = data.url;
                }
            },

            // Add more action types as needed:
            // 'save_favorite': (data) => { ... },
            // 'submit_form': (data) => { ... },
        };

        const handler = handlers[action.type];
        if (handler) {
            handler(action.data);
        } else {
            console.warn('[PendingAction] Unknown action type:', action.type);
        }
    }
};

// ========== SUPABASE AUTH ==========
const SUPABASE_URL = 'https://vejhtrzmesjpxlonwhig.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_QYHw3yzSd61GgQj3Izb3ng_zkfT_IZv';

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let currentUser = null;

// Initialize auth state
async function initAuth() {
    console.log('[AUTH] initAuth starting');

    // IMPORTANT: Retrieve pending action BEFORE getSession - Supabase may clear storage
    const pendingAction = PendingAction.retrieve();

    // Check current session
    const { data: { session } } = await supabaseClient.auth.getSession();
    console.log('[AUTH] getSession result:', session ? 'has session' : 'no session');

    if (session) {
        currentUser = session.user;
        console.log('[AUTH] User logged in:', currentUser.email);
        updateAuthUI(session.user);
        // Execute any pending action from before OAuth redirect
        if (pendingAction) {
            PendingAction.execute(pendingAction);
        }
    } else {
        console.log('[AUTH] No session, user not logged in');
        updateAuthUI(null);
        // Restore pending action if user isn't logged in yet
        PendingAction.restore(pendingAction);
    }

    // Listen for auth changes
    supabaseClient.auth.onAuthStateChange((event, session) => {
        console.log('[AUTH] onAuthStateChange:', event);
        currentUser = session?.user || null;
        updateAuthUI(currentUser);

        // If user just signed in, check for pending action
        if (event === 'SIGNED_IN' && currentUser) {
            closeSignInModal();
            const action = PendingAction.retrieve();
            if (action) {
                PendingAction.execute(action);
            }
        }
    });
}

// Update UI based on auth state
function updateAuthUI(user) {
    const loginBtn = document.getElementById('loginBtn');
    const userInfo = document.getElementById('userInfo');
    const userEmail = document.getElementById('userEmail');
    const inputContainer = document.querySelector('.input-container');

    if (user) {
        // User is logged in
        loginBtn.style.display = 'none';
        userInfo.style.display = 'flex';
        userEmail.textContent = user.email;
        if (inputContainer) inputContainer.style.display = 'flex';
    } else {
        // User is logged out
        loginBtn.style.display = 'block';
        userInfo.style.display = 'none';
        userEmail.textContent = '';
        // Optionally hide chat input when not logged in
        // if (inputContainer) inputContainer.style.display = 'none';
    }
}

// Sign in with Google
async function signInWithGoogle() {
    const { data, error } = await supabaseClient.auth.signInWithOAuth({
        provider: 'google',
        options: {
            redirectTo: window.location.origin
        }
    });

    if (error) {
        console.error('Sign in error:', error);
        alert('Sign in failed: ' + error.message);
    }
}

// Sign out
async function signOut() {
    const { error } = await supabaseClient.auth.signOut();
    if (error) {
        console.error('Sign out error:', error);
    }
    conversationHistory = [];
}

// Get current auth token for API calls
async function getAuthToken() {
    const { data: { session } } = await supabaseClient.auth.getSession();
    return session?.access_token || null;
}

// Show sign-in modal
function showSignInModal() {
    document.getElementById('signInModal').style.display = 'flex';
}

// Close sign-in modal
function closeSignInModal() {
    document.getElementById('signInModal').style.display = 'none';
}

// Close modal when clicking outside
document.addEventListener('click', (e) => {
    const modal = document.getElementById('signInModal');
    if (e.target === modal) {
        closeSignInModal();
    }
});

// ========== APP DATA ==========
let horseData = null;
let gearData = null;
let conversationHistory = [];

// Load horse and gear data
async function loadHorseData() {
    try {
        const [horseResponse, gearResponse] = await Promise.all([
            fetch('horses.json'),
            fetch('gear.json')
        ]);

        if (!horseResponse.ok || !gearResponse.ok) {
            throw new Error('Failed to fetch data files');
        }

        horseData = await horseResponse.json();
        gearData = await gearResponse.json();
        console.log('Horse data loaded:', horseData.horses.length, 'horses');
        console.log('Gear data loaded');
    } catch (error) {
        console.error('Failed to load data:', error);
        // Show error to user in chat container
        const container = document.getElementById('chatContainer');
        if (container) {
            const errorDiv = document.createElement('div');
            errorDiv.className = 'message assistant error-message';
            errorDiv.innerHTML = '<strong>Unable to load horse data.</strong> Please refresh the page to try again.';
            container.appendChild(errorDiv);
        }
    }
}

// Set query from example
function setQuery(text) {
    document.getElementById('queryInput').value = text;
    document.getElementById('queryInput').focus();
}

// Handle enter key
function handleKeyDown(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        sendQuery();
    }
}

// Add message to chat
function addMessage(content, type) {
    const container = document.getElementById('chatContainer');

    // Remove welcome message if present
    const welcome = container.querySelector('.welcome-message');
    if (welcome) welcome.remove();

    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}`;

    if (type === 'assistant') {
        messageDiv.innerHTML = DOMPurify.sanitize(formatResponse(content));
    } else {
        messageDiv.textContent = content;
    }

    container.appendChild(messageDiv);

    // For user messages, scroll to bottom (show the question)
    // For assistant messages, scroll to top of the response so user can read from beginning
    if (type === 'assistant') {
        // Use setTimeout to ensure DOM has fully rendered before scrolling
        // Scroll the window to the top of the assistant message
        setTimeout(() => {
            const rect = messageDiv.getBoundingClientRect();
            const scrollTop = window.pageYOffset + rect.top - 20; // 20px padding above
            window.scrollTo({ top: scrollTop, behavior: 'instant' });
        }, 100);
    } else {
        // For user messages, scroll to bottom of page
        window.scrollTo({ top: document.body.scrollHeight, behavior: 'instant' });
    }

    return messageDiv;
}

// Show loading indicator
function showLoading() {
    const container = document.getElementById('chatContainer');
    const loadingDiv = document.createElement('div');
    loadingDiv.className = 'loading';
    loadingDiv.id = 'loadingIndicator';
    loadingDiv.innerHTML = `
        <div class="loading-dots">
            <span></span>
            <span></span>
            <span></span>
        </div>
        <span>Searching the frontier...</span>
    `;
    container.appendChild(loadingDiv);
    container.scrollTop = container.scrollHeight;
}

// Hide loading
function hideLoading() {
    const loading = document.getElementById('loadingIndicator');
    if (loading) loading.remove();
}

// Get image path for a horse
function getHorseImagePath(breed, coat) {
    // Normalize breed and coat to match filename pattern
    const normalizedBreed = breed.toLowerCase().replace(/\s+/g, '_');
    const normalizedCoat = coat.toLowerCase().replace(/\s+/g, '_').replace(/[()]/g, '');

    // Find the horse in data to get exact image path
    if (horseData && horseData.horses) {
        const horse = horseData.horses.find(h =>
            h.breed.toLowerCase() === breed.toLowerCase() &&
            h.coat.toLowerCase() === coat.toLowerCase()
        );
        if (horse && horse.image) {
            return horse.image;
        }
    }

    // Fallback to constructed path
    return `images/horses/${normalizedBreed}_${normalizedCoat}.webp`;
}

// Create horse link URL
function getHorseLink(breed, coat) {
    return `horse.html?breed=${encodeURIComponent(breed.trim())}&coat=${encodeURIComponent(coat.trim())}`;
}

// Render a horse card from data
function renderHorseCard(breed, coat) {
    if (!horseData || !horseData.horses) return `<em>Horse not found: ${breed} - ${coat}</em>`;

    const horse = horseData.horses.find(h =>
        h.breed.toLowerCase() === breed.toLowerCase() &&
        h.coat.toLowerCase() === coat.toLowerCase()
    );

    if (!horse) return `<em>Horse not found: ${breed} - ${coat}</em>`;

    const imagePath = horse.image || `images/horses/${breed.toLowerCase().replace(/\s+/g, '_')}_${coat.toLowerCase().replace(/\s+/g, '_')}.webp`;
    const horseLink = `horse.html?breed=${encodeURIComponent(breed)}&coat=${encodeURIComponent(coat)}`;

    // Extract stats from nested structure
    const baseHealth = horse.baseStats?.health || 0;
    const baseStamina = horse.baseStats?.stamina || 0;
    const baseSpeed = horse.baseStats?.speed || 0;
    const baseAccel = horse.baseStats?.acceleration || 0;

    // Use maxStats from JSON if available, otherwise calculate
    const maxHealth = horse.maxStats?.health || (baseHealth + 1);
    const maxStamina = horse.maxStats?.stamina || (baseStamina + 1);
    const maxSpeed = horse.maxStats?.speed || (baseSpeed + 2);
    const maxAccel = horse.maxStats?.acceleration || (baseAccel + 2);

    // Format price
    const priceText = !horse.price ? 'Free (Wild)' : `$${horse.price.toFixed(2)}`;

    // Get location and availability from acquisition array (use first entry)
    const acq = Array.isArray(horse.acquisition) ? horse.acquisition[0] : horse.acquisition;
    const location = acq?.location || 'Unknown';
    const availability = acq?.chapter || 'Unknown';

    // Build card HTML without newlines to prevent markdown processing issues
    const communityHtml = horse.communityNotes ? `<div class="horse-card-notes"><strong>Community:</strong> ${horse.communityNotes}</div>` : '';

    return `<div class="horse-card"><a href="${horseLink}" class="horse-card-image-link"><img src="${imagePath}" alt="${breed} ${coat}" class="horse-card-image" onerror="this.style.display='none'"></a><div class="horse-card-content"><a href="${horseLink}" class="horse-card-title">${breed} - ${coat}</a><div class="horse-card-badges"><span class="badge badge-handling">${horse.handling}</span><span class="badge badge-price">${priceText}</span><span class="badge badge-chapter">${availability}</span></div><div class="horse-card-stats"><div class="stat-row"><span class="stat-label">Health</span><div class="stat-bar-container"><div class="stat-bar" style="width: ${(baseHealth / 10) * 100}%"></div><div class="stat-bar stat-bar-max" style="width: ${(maxHealth / 10) * 100}%"></div></div><span class="stat-value">${baseHealth}→${maxHealth}</span></div><div class="stat-row"><span class="stat-label">Stamina</span><div class="stat-bar-container"><div class="stat-bar" style="width: ${(baseStamina / 10) * 100}%"></div><div class="stat-bar stat-bar-max" style="width: ${(maxStamina / 10) * 100}%"></div></div><span class="stat-value">${baseStamina}→${maxStamina}</span></div><div class="stat-row"><span class="stat-label">Speed</span><div class="stat-bar-container"><div class="stat-bar" style="width: ${(baseSpeed / 10) * 100}%"></div><div class="stat-bar stat-bar-max" style="width: ${(maxSpeed / 10) * 100}%"></div></div><span class="stat-value">${baseSpeed}→${maxSpeed}</span></div><div class="stat-row"><span class="stat-label">Accel</span><div class="stat-bar-container"><div class="stat-bar" style="width: ${(baseAccel / 10) * 100}%"></div><div class="stat-bar stat-bar-max" style="width: ${(maxAccel / 10) * 100}%"></div></div><span class="stat-value">${baseAccel}→${maxAccel}</span></div></div><div class="horse-card-location"><strong>Location:</strong> ${location}</div>${communityHtml}</div></div>`;
}

// Render a saddle card from data
function renderSaddleCard(name) {
    if (!gearData) return `<em>Saddle not found: ${name}</em>`;

    // Search all saddle types
    let saddle = null;
    let saddleType = '';

    for (const type of ['stable', 'trapper', 'special']) {
        if (gearData.saddles && gearData.saddles[type]) {
            const found = gearData.saddles[type].find(s =>
                s.name.toLowerCase() === name.toLowerCase()
            );
            if (found) {
                saddle = found;
                saddleType = type.charAt(0).toUpperCase() + type.slice(1);
                break;
            }
        }
    }

    if (!saddle) return `<em>Saddle not found: ${name}</em>`;

    // Build stats HTML
    const staminaDrainHtml = saddle.staminaDrain ? `<div class="gear-stat"><span class="gear-stat-label">Stam Drain</span><span class="gear-stat-value ${saddle.staminaDrain < 0 ? 'stat-good' : ''}">${saddle.staminaDrain}%</span></div>` : '';
    const speedHtml = saddle.speedBonus ? `<div class="gear-stat"><span class="gear-stat-label">Speed</span><span class="gear-stat-value stat-good">+${saddle.speedBonus}</span></div>` : '';
    const accelHtml = saddle.accelBonus ? `<div class="gear-stat"><span class="gear-stat-label">Accel</span><span class="gear-stat-value stat-good">+${saddle.accelBonus}</span></div>` : '';
    const costText = saddle.cost || `$${saddle.price?.toFixed(2) || '0.00'}`;

    return `<div class="gear-card saddle-card"><div class="gear-card-header"><span class="gear-card-icon">🐎</span><span class="gear-card-title">${saddle.name}</span><span class="badge badge-type">${saddleType}</span></div><div class="gear-card-stats"><div class="gear-stat"><span class="gear-stat-label">Stamina Core</span><span class="gear-stat-value ${saddle.staminaCoreDrain < 0 ? 'stat-good' : ''}">${saddle.staminaCoreDrain}%</span></div><div class="gear-stat"><span class="gear-stat-label">Health Core</span><span class="gear-stat-value ${saddle.healthCoreDrain < 0 ? 'stat-good' : ''}">${saddle.healthCoreDrain}%</span></div><div class="gear-stat"><span class="gear-stat-label">Stam Regen</span><span class="gear-stat-value ${saddle.staminaRegen > 0 ? 'stat-good' : ''}">+${saddle.staminaRegen}%</span></div>${staminaDrainHtml}${speedHtml}${accelHtml}</div><div class="gear-card-footer"><span class="gear-cost">${costText}</span><span class="gear-availability">${saddle.availability || 'Stable'}</span></div></div>`;
}

// Render a stirrups card from data
function renderStirrupsCard(name) {
    if (!gearData || !gearData.stirrups) return `<em>Stirrups not found: ${name}</em>`;

    const stirrups = gearData.stirrups.find(s =>
        s.name.toLowerCase() === name.toLowerCase()
    );

    if (!stirrups) return `<em>Stirrups not found: ${name}</em>`;

    const priceText = stirrups.price ? `$${stirrups.price.toFixed(2)}` : 'Free';

    return `<div class="gear-card stirrups-card"><div class="gear-card-header"><span class="gear-card-icon">⚙️</span><span class="gear-card-title">${stirrups.name} Stirrups</span></div><div class="gear-card-stats"><div class="gear-stat"><span class="gear-stat-label">Speed</span><span class="gear-stat-value stat-good">+${stirrups.speedBonus}</span></div><div class="gear-stat"><span class="gear-stat-label">Accel</span><span class="gear-stat-value stat-good">+${stirrups.accelBonus}</span></div><div class="gear-stat"><span class="gear-stat-label">Stam Drain</span><span class="gear-stat-value ${stirrups.staminaDrain < 0 ? 'stat-good' : ''}">${stirrups.staminaDrain}%</span></div></div><div class="gear-card-footer"><span class="gear-cost">${priceText}</span></div></div>`;
}

// Format response with markdown support
function formatResponse(text) {
    let content = text;

    // Pre-process: Convert custom tags to placeholders before markdown parsing
    // Use HTML comments as placeholders - marked.js preserves these
    const placeholders = [];

    // [IMG:Breed - Coat] -> horse images
    content = content.replace(/\[IMG:([^\]]+)\]/g, (match, horseInfo) => {
        const parts = horseInfo.split(' - ');
        if (parts.length === 2) {
            const [breed, coat] = parts;
            const imagePath = getHorseImagePath(breed.trim(), coat.trim());
            const horseLink = getHorseLink(breed, coat);
            const placeholder = `<!--CARD_PLACEHOLDER_${placeholders.length}-->`;
            placeholders.push(`<a href="${horseLink}" class="horse-image-link"><img src="${imagePath}" alt="${breed} ${coat}" class="horse-image" onerror="this.style.display='none'"></a>`);
            return placeholder;
        }
        return '';
    });

    // [HORSE:Breed|Coat] -> horse cards
    content = content.replace(/\[HORSE:([^|\]]+)\|([^\]]+)\]/g, (match, breed, coat) => {
        const placeholder = `<!--CARD_PLACEHOLDER_${placeholders.length}-->`;
        placeholders.push(renderHorseCard(breed.trim(), coat.trim()));
        return placeholder;
    });

    // [SADDLE:Name] -> saddle cards
    content = content.replace(/\[SADDLE:([^\]]+)\]/g, (match, name) => {
        const placeholder = `<!--CARD_PLACEHOLDER_${placeholders.length}-->`;
        placeholders.push(renderSaddleCard(name.trim()));
        return placeholder;
    });

    // [STIRRUPS:Name] -> stirrups cards
    content = content.replace(/\[STIRRUPS:([^\]]+)\]/g, (match, name) => {
        const placeholder = `<!--CARD_PLACEHOLDER_${placeholders.length}-->`;
        placeholders.push(renderStirrupsCard(name.trim()));
        return placeholder;
    });

    // Use marked.js for all standard markdown parsing
    // Configure marked for our needs
    marked.setOptions({
        breaks: true,  // Convert \n to <br>
        gfm: true      // GitHub Flavored Markdown (tables, etc.)
    });

    // Custom renderer to handle links specially
    // Note: marked.js v5+ passes an object { href, title, text, tokens } instead of separate params
    const renderer = new marked.Renderer();
    renderer.link = function(token) {
        const href = token.href || '';
        const text = token.text || '';
        // Horse detail links
        if (href.startsWith('horse.html') || href.startsWith('./horse.html')) {
            return `<a href="${href}" class="horse-name-link"><strong>${text}</strong></a>`;
        }
        // External links
        return `<a href="${href}" class="citation-link" target="_blank" rel="noopener">${text}</a>`;
    };

    marked.setOptions({ renderer });

    // Parse markdown
    let html = marked.parse(content);

    // Post-process: Restore placeholders
    placeholders.forEach((replacement, i) => {
        html = html.replace(`<!--CARD_PLACEHOLDER_${i}-->`, replacement);
    });

    // Handle bold horse names "**Breed - Coat**" -> clickable links (AI sometimes does this)
    html = html.replace(/<strong>([^<]+) - ([^<]+)<\/strong>/g, (match, breed, coat) => {
        const isHorse = horseData && horseData.horses && horseData.horses.some(h =>
            h.breed.toLowerCase() === breed.trim().toLowerCase()
        );
        if (isHorse) {
            const horseLink = getHorseLink(breed, coat);
            return `<a href="${horseLink}" class="horse-name-link"><strong>${breed} - ${coat}</strong></a>`;
        }
        return match;
    });

    return html;
}

// Build system prompt with horse data
function buildSystemPrompt() {
    return `You are an expert Red Dead Redemption 2 horse and gear advisor. You have complete knowledge of all horses and horse equipment in the game.

Here is the complete horse database:
${JSON.stringify(horseData, null, 2)}

Here is the complete gear database (saddles, stirrups, saddlebags, etc.):
${JSON.stringify(gearData, null, 2)}

CRITICAL CHAPTER RESTRICTIONS:
- If the user mentions their current chapter, ONLY recommend horses they can actually get RIGHT NOW
- Chapter 2: Valentine, Strawberry stables + wild horses in those areas
- Chapter 3: Add Scarlett Meadows stable (Rhodes area)
- Chapter 4: Add Saint Denis stable (has Arabians, Turkoman, MFT)
- Epilogue ONLY: Blackwater and Tumbleweed stables
- NEVER recommend a horse from a later chapter unless you clearly state "not available until Chapter X"

IMPORTANT GUIDELINES:
1. Always recommend specific horses with their exact stats
2. Include WHERE to get the horse (stable location, wild spawn point, or mission)
3. Include WHEN it's available (which chapter or epilogue)
4. Include the PRICE if purchasable
5. For wild horses, give specific spawn locations
6. Compare stats when asked about "better" horses
7. Be concise but thorough

TEMPERAMENT/BRAVERY CONTROVERSY:
According to data miners, ALL horses have the SAME base courage stat. Bonding (levels 2-4) adds +1 courage each. However, players consistently report breed differences - this is unverified but widely believed. When asked about temperament:
1. Explain the controversy (no official breed differences confirmed)
2. Share community reports (in "communityNotes" field)
3. Emphasize bonding level matters most

FORMATTING - USE CARD MARKERS:
The UI renders rich visual cards from simple markers. Use these markers when recommending horses or gear:

FOR HORSES - output this marker (the UI will render a full card with image, stats, badges):
[HORSE:Breed|Coat]

Example: [HORSE:Arabian|White] or [HORSE:Missouri Fox Trotter|Silver Dapple Pinto]

FOR SADDLES - output this marker:
[SADDLE:Name]

Example: [SADDLE:Panther Trail] or [SADDLE:Improved McClelland]

FOR STIRRUPS - output this marker:
[STIRRUPS:Name]

Example: [STIRRUPS:Hooded] or [STIRRUPS:Bell Flower]

IMPORTANT MARKER RULES:
- Use EXACT names from the database (case-sensitive for coat names)
- One marker per horse/gear item - the UI handles all the visual details
- You can include multiple markers in a response
- Add brief context BEFORE or AFTER the marker, not instead of it

GENERAL FORMATTING:
- Use ## for major section headers (e.g., "## Best Overall Setup")
- Use **bold** for emphasis in explanatory text
- Keep explanations concise - the cards show all the stats
- For comparisons, show multiple cards and explain the trade-offs
- Max horse stats = bonding (+1 HP/Stam) + best saddle/stirrups (+2 Spd/Accel)

WEB SEARCH CITATIONS:
When you use web search and cite external sources, ALWAYS include the source as a clickable markdown link.
Format: [Source Name](full URL)
Example: [IGN Guide](https://www.ign.com/wikis/red-dead-redemption-2/Horses)
Never mention a website without including its URL as a clickable link.`;
}

// Send query to AI
async function sendQuery() {
    const input = document.getElementById('queryInput');
    const query = input.value.trim();

    if (!query) return;

    // Check if user is logged in
    if (!currentUser) {
        // Save the pending action so we can continue after sign-in
        PendingAction.save('chat_query', { query });
        showSignInModal();
        return;
    }

    if (!horseData) {
        addMessage('Horse data is still loading. Please try again.', 'error');
        return;
    }

    // Disable input
    input.value = '';
    input.disabled = true;
    document.getElementById('sendBtn').disabled = true;

    // Add user message
    addMessage(query, 'user');
    showLoading();

    try {
        // Add user message to history
        conversationHistory.push({ role: 'user', content: query });

        const response = await callAPI();
        hideLoading();
        addMessage(response, 'assistant');

        // Add assistant response to history
        conversationHistory.push({ role: 'assistant', content: response });

    } catch (error) {
        hideLoading();
        console.error('API Error:', error);
        addMessage(`Error: ${error.message}`, 'error');
    }

    // Re-enable input
    input.disabled = false;
    document.getElementById('sendBtn').disabled = false;
    input.focus();
}

// Call API via serverless proxy
async function callAPI() {
    const token = await getAuthToken();

    const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
            system: buildSystemPrompt(),
            messages: conversationHistory
        })
    });

    if (!response.ok) {
        const error = await response.json();

        // Handle rate limit specifically
        if (response.status === 429) {
            throw new Error(error.message || `Daily limit of ${error.limit} queries reached. Try again tomorrow!`);
        }

        throw new Error(error.message || error.error || 'API request failed');
    }

    const data = await response.json();
    return data.content[0].text;
}

// Clear conversation history (for new chat)
function clearChat() {
    conversationHistory = [];
    const container = document.getElementById('chatContainer');
    container.innerHTML = `
        <div class="welcome-message">
            <h2>Ask about horses...</h2>
            <p class="welcome-hint">e.g., "What's the bravest horse available in Chapter 3?"</p>
            <h3>Or try one of these:</h3>
            <ul class="example-queries">
                <li onclick="setQuery(this.textContent)">"What's the fastest horse I can get in Chapter 2?"</li>
                <li onclick="setQuery(this.textContent)">"I want a brave horse that won't buck me off near predators"</li>
                <li onclick="setQuery(this.textContent)">"Where do I find the White Arabian?"</li>
                <li onclick="setQuery(this.textContent)">"What's the best saddle and stirrups combo?"</li>
                <li onclick="setQuery(this.textContent)">"How do I get the Panther Trail saddle?"</li>
                <li onclick="setQuery(this.textContent)">"Compare Turkoman vs Arabian"</li>
            </ul>
        </div>
    `;
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    // Ensure page starts at the top
    window.scrollTo(0, 0);
    initAuth();
    loadHorseData();
});
