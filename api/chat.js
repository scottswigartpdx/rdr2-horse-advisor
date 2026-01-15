// Vercel Serverless Function - OpenAI Responses API Proxy
// Keeps API key secure on server side

export default async function handler(req, res) {
    // Only allow POST
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
        return res.status(500).json({ error: 'API key not configured' });
    }

    try {
        const { system, messages } = req.body;

        // Build input array for OpenAI Responses API
        // Start with system message, then add conversation history
        const input = [
            { role: 'system', content: system }
        ];

        // Add conversation history
        for (const msg of messages) {
            input.push({
                role: msg.role,
                content: msg.content
            });
        }

        // Call OpenAI Responses API with GPT-5.2 and web search
        const response = await fetch('https://api.openai.com/v1/responses', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: 'gpt-5.2',
                input: input,
                tools: [
                    { type: 'web_search' }
                ],
                tool_choice: 'auto'
            })
        });

        const data = await response.json();

        // Extract text from OpenAI Responses API format
        // When web search is used, output array contains:
        // - web_search_call items (type: "web_search_call")
        // - message item (type: "message") with the actual response
        let outputText = 'No response generated';
        if (data.output && Array.isArray(data.output)) {
            // Find the message item in the output array
            const messageItem = data.output.find(item => item.type === 'message');
            if (messageItem?.content?.[0]?.text) {
                outputText = messageItem.content[0].text;
            }
        } else if (data.error) {
            outputText = data.error.message || JSON.stringify(data.error);
        }

        // Transform response to match our frontend's expected format
        const transformedResponse = {
            content: [{
                text: outputText
            }]
        };

        return res.status(response.ok ? 200 : response.status).json(transformedResponse);

    } catch (error) {
        console.error('API Error:', error);
        return res.status(500).json({ error: 'Failed to call OpenAI API' });
    }
}
