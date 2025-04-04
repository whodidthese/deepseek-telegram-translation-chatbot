// bot.js
require('dotenv').config(); // Load environment variables from .env file
const TelegramBot = require('node-telegram-bot-api');

// --- Configuration ---
const token = process.env.TELEGRAM_BOT_TOKEN;
const authorizedUserId = parseInt(process.env.AUTHORIZED_USER_ID, 10); // Ensure it's a number
const deepSeekApiKey = process.env.DEEPSEEK_API_KEY;
const deepSeekApiEndpoint = process.env.DEEPSEEK_API_ENDPOINT;
const deepSeekModel = process.env.DEEPSEEK_MODEL;

// Basic validation
if (!token || !authorizedUserId || !deepSeekApiKey || !deepSeekApiEndpoint || !deepSeekModel) {
	console.error("Error: Missing required environment variables. Check your .env file.");
	process.exit(1); // Exit if essential config is missing
}

// --- Bot State ---
let currentMode = 'prompt'; // Default mode on startup

// --- Bot Initialization ---
const bot = new TelegramBot(token, { polling: true });

console.log(`Bot started. Authorized User ID: ${authorizedUserId}`);
console.log(`Default mode: ${currentMode}`);
console.log(`Current time: ${new Date().toLocaleString('en-US', { timeZone: 'Asia/Taipei' })} (Taiwan Time)`);


// --- Helper Functions ---

/**
 * Checks if the message sender is the authorized user.
 * @param {number} userId - The user ID from the Telegram message.
 * @returns {boolean} - True if authorized, false otherwise.
 */
const isAuthorized = (userId) => {
	return userId === authorizedUserId;
};

/**
 * Sends a message with common options.
 * @param {number} chatId - The chat ID to send the message to.
 * @param {string} text - The message text.
 */
const sendMessage = (chatId, text) => {
	// Basic check to prevent sending empty/null messages which can cause errors
	if (typeof text !== 'string' || text.trim() === '') {
		console.warn(`Attempted to send empty message to chat ID ${chatId}.`);
		return;
	}
	bot.sendMessage(chatId, text, {
		parse_mode: 'Markdown', // Optional: Use Markdown for formatting help text etc.
		disable_web_page_preview: true
	}).catch(error => {
		console.error(`Error sending message to chat ID ${chatId}:`, error.message);
	});
};

/**
 * Calls the DeepSeek API.
 * @param {string} inputText - The text input from the user.
 * @param {'prompt' | 'commit'} mode - The current operating mode.
 * @returns {Promise<string|null>} - The AI's response or null on error.
 */
const callDeepSeekAPI = async (inputText, mode) => {
	let systemPrompt = "";
	let userPrompt = inputText;
	let modPrefix = "Translate the following prompt into English\n--- --- ---\n";

	// Trim input just in case
	userPrompt = userPrompt.trim();
	if (!userPrompt) {
		console.log("Ignoring empty input string for DeepSeek API call.");
		return "Input cannot be empty."; // Or return null, depending on desired behavior
	}


	if (mode === 'prompt') {
		systemPrompt = `You are an AI assistant specialized in refining text for AI prompts. Translate the user's input into clear, concise, and unambiguous English suitable for prompting another AI. Respond *only* with the translated text and absolutely nothing else. Do not add any introductory phrases, explanations, or conversational filler.`;
	} else if (mode === 'commit') {
		systemPrompt = `You are an AI assistant specialized in formatting text into git commit messages. Translate the user's input into a clear and concise English git commit message following conventional standards (e.g., 'feat: add user authentication'). Respond *only* in the format \`git commit -m "COMMIT_CONTENT"\`. If you can think of 1 or 2 significantly better alternative phrasings for the commit message, provide them on new lines, each prefixed with 'Alternative:'. Do not add any other introductory text, explanations, or conversation.`;

		modPrefix = "Translate the following commit message into English\n--- --- ---\n";
	} else {
		console.error("Invalid mode provided to callDeepSeekAPI:", mode);
		return "Internal error: Invalid processing mode."; // Inform user of internal issue
	}

	const messages = [
		{ role: "system", content: systemPrompt },
		{ role: "user", content: modPrefix + userPrompt }
	];

	console.log(`Calling DeepSeek API in ${mode} mode for user ${authorizedUserId}`);
	// console.log("Sending messages:", JSON.stringify(messages, null, 2)); // Uncomment for debugging prompts

	try {
		const response = await fetch(deepSeekApiEndpoint, {
			method: "POST",
			headers: {
				"Authorization": `Bearer ${deepSeekApiKey}`,
				"Content-Type": "application/json"
			},
			body: JSON.stringify({
				"model": deepSeekModel,
				"messages": messages,
				// Optional parameters like temperature could be added here if needed
				// "temperature": 0.7
			})
		});

		if (!response.ok) {
			const errorBody = await response.text();
			console.error(`DeepSeek API Error: ${response.status} ${response.statusText}`, errorBody);
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
			console.log("DeepSeek API Response Received.");
			// console.log("Raw response content:", data.choices[0].message.content); // Uncomment for debugging AI output
			const content = data.choices[0].message.content.trim();
			return content || "[Received empty response from AI]"; // Handle empty content string
		} else {
			console.error("DeepSeek API Error: Invalid response structure", JSON.stringify(data));
			return "Sorry, I received an unexpected or empty response from the AI.";
		}

	} catch (error) {
		console.error("Error calling DeepSeek API:", error);
		// Check for specific FetchError types if needed (e.g., network issues)
		if (error.name === 'AbortError') {
			return "Sorry, the request to the AI timed out.";
		}
		return `Sorry, I encountered a network or processing error while contacting the AI. Details: ${error.message}`;
	}
};

// --- Bot Event Handlers ---

// /start command: Matches if the message *starts with* /start
// Allows for potential deep linking parameters later, although not used now.
bot.onText(/^\/start/, (msg) => {
	const chatId = msg.chat.id;
	const userId = msg.from.id;

	if (isAuthorized(userId)) {
		sendMessage(chatId, "You are authorized.");
	} else {
		// Inform the unauthorized user, but don't provide functionality
		// Use Markdown for formatting the ID
		bot.sendMessage(chatId, `User ID \`${userId}\` is not authorized to use this bot.`, { parse_mode: 'Markdown', disable_web_page_preview: true });
		console.log(`Unauthorized access attempt via /start by User ID: ${userId}`);
	}
});

// /help command: Must exactly match '/help'
bot.onText(/^\/help$/, (msg) => {
	const chatId = msg.chat.id;
	if (!isAuthorized(msg.from.id)) return; // Ignore unauthorized users silently for commands other than /start

	const helpText = `*Available Commands:*
/help - Show this help message.
/prompt\\_mode - Switch to Prompt Translation Mode. Input will be translated into English suitable for AI prompts.
/commit\\_mode - Switch to Commit Translation Mode. Input will be translated into a \`git commit -m "..."\` format, with possible alternatives.

*Current Mode:* \`${currentMode}\` (Mode: ${currentMode === 'prompt' ? 'Prompt Translation' : 'Commit Translation'})

Simply send me any text message, and I will process it according to the current mode.
I only respond to text messages and the exact commands listed above.`; // Added clarification

	sendMessage(chatId, helpText);
});

// /prompt_mode command: Must exactly match '/prompt_mode'
bot.onText(/^\/prompt_mode$/, (msg) => {
	const chatId = msg.chat.id;
	if (!isAuthorized(msg.from.id)) return;

	currentMode = 'prompt';
	console.log(`User ${msg.from.id} switched mode to: ${currentMode}`);
	sendMessage(chatId, "Switched to Prompt Translation Mode.");
});

// /commit_mode command: Must exactly match '/commit_mode'
bot.onText(/^\/commit_mode$/, (msg) => {
	const chatId = msg.chat.id;
	if (!isAuthorized(msg.from.id)) return;

	currentMode = 'commit';
	console.log(`User ${msg.from.id} switched mode to: ${currentMode}`);
	sendMessage(chatId, "Switched to Commit Translation Mode.");
});

// Handle regular text messages
bot.on('message', async (msg) => {
	const chatId = msg.chat.id;
	const userId = msg.from.id;

	// 1. Check authorization FIRST
	if (!isAuthorized(userId)) {
		// We already handle unauthorized /start explicitly. Silently ignore other messages.
		// console.log(`Ignoring message from unauthorized User ID: ${userId}`); // Optional logging
		return;
	}

	// 2. Check if it's a text message.
	// If it's not text (sticker, photo etc.), ignore it.
	// We no longer check for starting '/' here, as specific command handlers above
	// deal with *valid* commands. Any message reaching here is either non-command
	// text or an invalid command format (like '/help extra') which should be treated as text.
	if (!msg.text) {
		return; // Ignore non-text messages
	}

	// 3. Check if the message *exactly* matches a command handled by onText.
	// This is a safety check, though theoretically, messages handled by onText
	// shouldn't reach here due to how the library works. But explicit is better.
	// We don't need to check for /start here as it's handled above even with args.
	if (msg.text === '/help' || msg.text === '/prompt_mode' || msg.text === '/commit_mode') {
		// This message should have been caught by bot.onText.
		// Log potentially unexpected flow, but don't process as text.
		console.warn(`Message "${msg.text}" reached general handler unexpectedly.`);
		return;
	}


	// 4. Process the text message based on the current mode
	console.log(`Processing text from user ${userId} in ${currentMode} mode: "${msg.text}"`);
	// Acknowledge receipt and indicate processing
	const ackMsg = await bot.sendMessage(chatId, `Processing in ${currentMode} mode...`);

	const aiResponse = await callDeepSeekAPI(msg.text, currentMode);

	// Edit the acknowledgment message with the result or error
	if (ackMsg && ackMsg.message_id) {
		bot.editMessageText(aiResponse || "Sorry, an error occurred and no response was generated.", {
			chat_id: chatId,
			message_id: ackMsg.message_id,
			parse_mode: 'Markdown', // Keep formatting consistent if needed
			disable_web_page_preview: true
		}).catch(editError => {
			// If editing fails (e.g., message too old, bot blocked), send a new message
			console.error("Failed to edit message:", editError.message);
			sendMessage(chatId, aiResponse || "Sorry, an error occurred processing your request.");
		});
	} else {
		// Fallback if sending the acknowledgment failed for some reason
		sendMessage(chatId, aiResponse || "Sorry, an error occurred processing your request.");
	}
});

// Optional: Handle polling errors
bot.on('polling_error', (error) => {
	console.error(`Polling error: ${error.code} - ${error.message}. Timestamp: ${new Date().toISOString()}`);
	// Example: Specific handling for network issues or Telegram server problems
	if (error.message.includes('ETIMEDOUT') || error.message.includes('ECONNRESET')) {
		console.warn('Network-related polling error. The bot will attempt to continue polling.');
	} else if (error.code === 'EFATAL') {
		console.error('Fatal polling error occurred. Stopping the bot.');
		// Potentially attempt a restart or notify an admin
		process.exit(1); // Exit on fatal polling errors
	}
	// Add more specific error handling as needed
});


// Graceful shutdown
const shutdown = (signal) => {
	console.log(`${signal} received. Shutting down bot...`);
	bot.stopPolling({ cancel: true }).then(() => { // `cancel: true` can help stop pending requests
		console.log("Bot stopped polling gracefully.");
		process.exit(0);
	}).catch(err => {
		console.error("Error stopping polling:", err);
		process.exit(1); // Exit with error if shutdown fails
	});
};

process.on('SIGINT', () => shutdown('SIGINT')); // Ctrl+C
process.on('SIGTERM', () => shutdown('SIGTERM')); // Termination signal