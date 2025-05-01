/**
 * Calls the DeepSeek API.
 * @param {string} inputText - The text input from the user.
 * @param {string} mode - The current operating mode ('prompt', 'commit', 'chat').
 * @param {string} currentModelId - The ID of the AI model to use.
 * @param {string} deepSeekApiEndpoint - The API endpoint URL.
 * @param {string} deepSeekApiKey - The API key.
 * @returns {Promise<string|null>} - The AI's response or an error message string.
 */
const callDeepSeekAPI = async (inputText, mode, currentModelId, deepSeekApiEndpoint, deepSeekApiKey) => {
	let systemPrompt = "";
	let userPrompt = inputText;
	let modPrefix = ""; // Prefix only used for specific modes

	// Trim input just in case
	userPrompt = userPrompt.trim();
	if (!userPrompt) {
		console.log("Ignoring empty input string for DeepSeek API call.");
		return "Input cannot be empty."; // Or return null, depending on desired behavior
	}

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
		console.error("Invalid mode provided to callDeepSeekAPI:", mode);
		return "Internal error: Invalid processing mode."; // Inform user of internal issue
	}

	const messages = [
		{ role: "system", content: systemPrompt },
		{ role: "user", content: modPrefix + userPrompt } // Add prefix only if defined
	];

	console.log(`Calling API in ${mode} mode with model ${currentModelId}.`);
	// console.log("Sending messages:", JSON.stringify(messages, null, 2)); // Uncomment for debugging prompts

	try {
		const response = await fetch(deepSeekApiEndpoint, {
			method: "POST",
			headers: {
				"Authorization": `Bearer ${deepSeekApiKey}`,
				"Content-Type": "application/json"
			},
			body: JSON.stringify({
				"model": currentModelId, // Use the dynamic model ID
				"messages": messages,
				// Optional parameters like temperature could be added here if needed
				// "temperature": 0.7
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

		if (data.choices && data.choices.length > 0 && data.choices[0].message && typeof data.choices[0].message.content === 'string') {
			console.log("API Response Received.");
			// console.log("Raw response content:", data.choices[0].message.content); // Uncomment for debugging AI output
			const content = data.choices[0].message.content.trim();
			return content || "[Received empty response from AI]"; // Handle empty content string
		} else {
			console.error("API Error: Invalid response structure", JSON.stringify(data));
			return "Sorry, I received an unexpected or empty response from the AI.";
		}

	} catch (error) {
		console.error("Error calling API:", error);
		// Check for specific FetchError types if needed (e.g., network issues)
		if (error.name === 'AbortError') {
			return "Sorry, the request to the AI timed out.";
		}
		return `Sorry, I encountered a network or processing error while contacting the AI. Details: ${error.message}`;
	}
};

module.exports = {
    callDeepSeekAPI,
}; 