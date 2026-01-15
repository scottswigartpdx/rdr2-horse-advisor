// RDR2 Horse Advisor - Main Application

let horseData = null;
let conversationHistory = [];

// Load horse data
async function loadHorseData() {
    try {
        const response = await fetch('horses.json');
        horseData = await response.json();
        console.log('Horse data loaded:', horseData.horses.length, 'horses');
    } catch (error) {
        console.error('Failed to load horse data:', error);
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
        messageDiv.innerHTML = formatResponse(content);
    } else {
        messageDiv.textContent = content;
    }

    container.appendChild(messageDiv);
    container.scrollTop = container.scrollHeight;

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

// Format response with basic markdown
function formatResponse(text) {
    // First, convert horse image tags [IMG:Breed - Coat] to clickable images
    let html = text.replace(/\[IMG:([^\]]+)\]/g, (match, horseInfo) => {
        const parts = horseInfo.split(' - ');
        if (parts.length === 2) {
            const [breed, coat] = parts;
            const imagePath = getHorseImagePath(breed.trim(), coat.trim());
            const horseLink = getHorseLink(breed, coat);
            return `<a href="${horseLink}" class="horse-image-link"><img src="${imagePath}" alt="${breed} ${coat}" class="horse-image" onerror="this.style.display='none'"></a>`;
        }
        return '';
    });

    // Convert markdown links [text](url) to HTML links
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (match, text, url) => {
        // Check if it's a horse detail link or external citation
        if (url.startsWith('horse.html') || url.startsWith('./horse.html')) {
            return `<a href="${url}" class="horse-name-link"><strong>${text}</strong></a>`;
        } else {
            // External link - open in new tab, style as citation
            return `<a href="${url}" class="citation-link" target="_blank" rel="noopener">${text}</a>`;
        }
    });

    // Convert bare URLs to clickable links (not already in an href)
    html = html.replace(/(?<!href=["'])(https?:\/\/[^\s<>"]+)/g, (match, url) => {
        // Clean up trailing punctuation that might have been captured
        const cleanUrl = url.replace(/[.,;:!?)]+$/, '');
        return `<a href="${cleanUrl}" class="citation-link" target="_blank" rel="noopener">${cleanUrl}</a>`;
    });

    // Convert bold horse names (e.g., **Arabian - White**) to clickable links (fallback)
    html = html.replace(/\*\*([^*]+) - ([^*]+)\*\*/g, (match, breed, coat) => {
        // Check if this looks like a horse name (exists in our data)
        const isHorse = horseData && horseData.horses && horseData.horses.some(h =>
            h.breed.toLowerCase() === breed.trim().toLowerCase()
        );
        if (isHorse) {
            const horseLink = getHorseLink(breed, coat);
            return `<a href="${horseLink}" class="horse-name-link"><strong>${breed} - ${coat}</strong></a>`;
        }
        return `<strong>${breed} - ${coat}</strong>`;
    });

    // Convert markdown-style formatting
    html = html
        // Headers
        .replace(/^### (.*$)/gm, '<h4>$1</h4>')
        .replace(/^## (.*$)/gm, '<h3>$1</h3>')
        // Bold (remaining)
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        // Italic
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        // Code
        .replace(/`(.*?)`/g, '<code>$1</code>')
        // Line breaks
        .replace(/\n\n/g, '</p><p>')
        .replace(/\n/g, '<br>');

    // Handle bullet points
    html = html.replace(/(<br>)?- (.*?)(<br>|<\/p>|$)/g, (match, pre, content, post) => {
        return `<li>${content}</li>${post === '</p>' ? '</p>' : ''}`;
    });

    // Wrap lists
    html = html.replace(/(<li>.*?<\/li>)+/g, '<ul>$&</ul>');

    return `<p>${html}</p>`;
}

// Build system prompt with horse data
function buildSystemPrompt() {
    return `You are an expert Red Dead Redemption 2 horse advisor. You have complete knowledge of all horses in the game.

Here is the complete horse database:
${JSON.stringify(horseData, null, 2)}

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

HORSE LINKS AND IMAGES:
Each horse has a "detailUrl" field with a pre-built link to its detail page. When recommending a horse, ALWAYS make the horse name a clickable link using markdown format.

Format horse names as clickable links like this:
[Breed - Coat](detailUrl)

For example: [Arabian - White](horse.html?breed=Arabian&coat=White)

Each horse also has an image. Include an image tag like this after the link:
[IMG:Breed - Coat]

When recommending horses, format like this:
[Horse Name - Coat](use the detailUrl from the horse data)
[IMG:Horse Name - Coat]
- Base: Health [X], Stamina [X], Speed [X], Acceleration [X]
- Max:  Health [X], Stamina [X], Speed [X], Acceleration [X]
- Handling: [Type]
- Location: [Where to get it]
- Available: [Chapter/Epilogue]
- Price: [Amount or "Free (wild)"]
- Community: [communityNotes - player opinions/tips]

Max stats = bonding (+1 HP/Stam) + best saddle/stirrups (+2 Spd/Accel).

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
    const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            system: buildSystemPrompt(),
            messages: conversationHistory
        })
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'API request failed');
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
                <li onclick="setQuery(this.textContent)">"I have a Kentucky Saddler, what's better?"</li>
                <li onclick="setQuery(this.textContent)">"Where do I find the White Arabian?"</li>
                <li onclick="setQuery(this.textContent)">"Best horse for combat?"</li>
                <li onclick="setQuery(this.textContent)">"Compare Turkoman vs Arabian"</li>
            </ul>
        </div>
    `;
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    loadHorseData();
});
