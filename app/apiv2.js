/**
 * Builds the messages array for standard OpenAI-compatible models.
 * @param {string} systemPrompt - The system prompt content.
 * @param {string} userPrompt - The user's input content.
 * @param {string} modPrefix - The prefix to add to the user prompt based on mode.
 * @returns {Array<object>} - The messages array for the API request.
 */
const buildStandardMessages = (systemPrompt, userPrompt, modPrefix) => {
    const messages = [];
    if (systemPrompt) {
        messages.push({ role: "system", content: systemPrompt });
    }
    messages.push({ role: "user", content: modPrefix + userPrompt });
    return messages;
};

/**
 * Builds the messages array for Google models (Gemini).
 * Note: This currently only supports text input. For multi-modal input,
 * this function would need modification to handle image data.
 * @param {string} systemPrompt - The system prompt content.
 * @param {string} userPrompt - The user's input content.
 * @param {string} modPrefix - The prefix to add to the user prompt based on mode.
 * @returns {Array<object>} - The messages array for the API request.
 */
const buildGoogleMessages = (systemPrompt, userPrompt, modPrefix) => {
    const messages = [];
    // Google models expect system instructions potentially within the first user message
    // or sometimes have dedicated fields outside 'messages'. OpenRouter standardizes
    // this, but the content structure MUST be an array.
    // We'll include the system prompt as a separate message if provided,
    // following the array content structure.
    if (systemPrompt) {
        messages.push({
            role: "system", // Or potentially 'user' depending on exact model needs via OpenRouter
            content: [
                { type: "text", text: systemPrompt }
            ]
        });
    }
    messages.push({
        role: "user",
        content: [
            { type: "text", text: modPrefix + userPrompt }
            // If you needed to add an image, you would add another object here:
            // { type: "image_url", image_url: { url: "..." } }
        ]
    });
    return messages;
};

/**
 * Calls the OpenRouter API with appropriate payload structure based on the model.
 * @param {string} inputText - The text input from the user.
 * @param {string} mode - The current operating mode ('prompt', 'commit', 'chat').
 * @param {string} currentModelId - The ID of the AI model to use (e.g., 'deepseek/deepseek-chat', 'google/gemini-flash-1.5').
 * @param {string} openRouterApiEndpoint - The OpenRouter API endpoint URL (e.g., 'https://openrouter.ai/api/v1/chat/completions').
 * @param {string} openRouterApiKey - The OpenRouter API key.
 * @returns {Promise<string|null>} - The AI's response or an error message string.
 */
const callOpenRouterAPI = async (inputText, mode, currentModelId, openRouterApiEndpoint, openRouterApiKey) => {
    let systemPrompt = "";
    let userPrompt = inputText;
    let modPrefix = ""; // Prefix only used for specific modes

    // Trim input just in case
    userPrompt = userPrompt.trim();
    if (!userPrompt) {
        console.log("Ignoring empty input string for OpenRouter API call.");
        return "Input cannot be empty."; // Or return null, depending on desired behavior
    }

    // --- System Prompt Logic (remains the same) ---
    if (mode === 'prompt') {
        systemPrompt = `You are an AI assistant specialized in refining text for AI prompts. Translate the user's input into clear, concise, and unambiguous English suitable for prompting another AI. Respond *only* with the translated text and absolutely nothing else. Do not add any introductory phrases, explanations, or conversational filler.`;
        modPrefix = "Translate the following prompt into English\n--- --- ---\n";
    } else if (mode === 'commit') {
        systemPrompt = `You are an AI assistant specialized in formatting text into git commit messages. Translate the user's input into a clear and concise English git commit message following conventional standards (e.g., 'feat: add user authentication'). Respond *only* in the format \`git commit -m "COMMIT_CONTENT"\`. If you can think of 1 or 2 significantly better alternative phrasings for the commit message, provide them on new lines, each prefixed with 'Alternative:'. Do not add any other introductory text, explanations, or conversation.`;
        modPrefix = "Translate the following commit message into English\n--- --- ---\n";
    } else if (mode === 'chat') {
        systemPrompt = `You are a helpful AI assistant. Respond conversationally and helpfully to the user's message. Always respond in User's language. If the user uses Chinese, respond in Traditional Chinese.`;
        // No prefix needed for general chat
    } else {
        console.error("Invalid mode provided to callOpenRouterAPI:", mode);
        return "Internal error: Invalid processing mode."; // Inform user of internal issue
    }
    // --- End System Prompt Logic ---

    const isGoogleModel = currentModelId.startsWith('google/');
    let messages;

    // Build the messages payload based on the model type
    if (isGoogleModel) {
        console.log(`Building payload for Google model: ${currentModelId}`);
        messages = buildGoogleMessages(systemPrompt, userPrompt, modPrefix);
    } else {
        console.log(`Building payload for standard model: ${currentModelId}`);
        messages = buildStandardMessages(systemPrompt, userPrompt, modPrefix);
    }

    console.log(`Calling API in ${mode} mode with model ${currentModelId}.`);
    // console.log("Sending messages:", JSON.stringify(messages, null, 2)); // Uncomment for debugging prompts

    try {
        const response = await fetch(openRouterApiEndpoint, { // Use the generic endpoint variable
            method: "POST",
            headers: {
                "Authorization": `Bearer ${openRouterApiKey}`, // Use the generic key variable
                "Content-Type": "application/json",
                // OpenRouter specific headers (optional, see their docs)
                // "HTTP-Referer": $YOUR_SITE_URL,
                // "X-Title": $YOUR_SITE_NAME,
            },
            body: JSON.stringify({
                "model": currentModelId, // Use the dynamic model ID
                "messages": messages,
                // Optional parameters like temperature could be added here if needed
                // "temperature": 0.7,
                // "max_tokens": 1024,
            })
        });

        if (!response.ok) {
            const errorBody = await response.text();
            console.error(`API Error: ${response.status} ${response.statusText}`, errorBody);
            // Try to provide a more user-friendly message if possible, else generic
            let friendlyError = `Sorry, I encountered an API error (${response.status}).`;
            try {
                const errorJson = JSON.parse(errorBody);
                if (errorJson.error && errorJson.error.message) {
                    friendlyError += ` Details: ${errorJson.error.message}`;
                }
            } catch (e) {
                // Ignore if errorBody is not JSON
            }
            return friendlyError;
        }

        const data = await response.json();

        // --- Response Handling ---
        // OpenRouter usually normalizes the response structure.
        // We assume the standard 'choices[0].message.content' will work.
        // If issues arise specifically with Google models, this part might need adjustment.
        if (data.choices && data.choices.length > 0 && data.choices[0].message && typeof data.choices[0].message.content === 'string') {
            console.log("API Response Received.");
            // console.log("Raw response content:", data.choices[0].message.content); // Uncomment for debugging AI output
            const content = data.choices[0].message.content.trim();
            return content || "[Received empty response from AI]"; // Handle empty content string
        } else {
            console.error("API Error: Invalid response structure", JSON.stringify(data));
            return "Sorry, I received an unexpected or empty response from the AI.";
        }
        // --- End Response Handling ---

    } catch (error) {
        console.error("Error calling OpenRouter API:", error);
        // Check for specific FetchError types if needed (e.g., network issues)
        if (error.name === 'AbortError') {
            return "Sorry, the request to the AI timed out.";
        }
        return `Sorry, I encountered a network or processing error while contacting the AI. Details: ${error.message}`;
    }
};

module.exports = {
    callOpenRouterAPI, // Export the renamed function
};