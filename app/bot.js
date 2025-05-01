require('dotenv').config(); // Load environment variables from .env file
const TelegramBot = require('node-telegram-bot-api');
const fs = require('fs');
const path = require('path');
const { isAuthorized, sendMessage } = require('./utils'); // Import helpers
const { callDeepSeekAPI } = require('./api'); // Import API caller

// --- Configuration ---
const token = process.env.TELEGRAM_BOT_TOKEN;
const authorizedUserId = parseInt(process.env.AUTHORIZED_USER_ID, 10); // Ensure it's a number
const deepSeekApiKey = process.env.DEEPSEEK_API_KEY;
const deepSeekApiEndpoint = process.env.DEEPSEEK_API_ENDPOINT;
const defaultModelId = process.env.DEEPSEEK_MODEL; // Default model from .env

// Basic validation
if (!token || !authorizedUserId || !deepSeekApiKey || !deepSeekApiEndpoint || !defaultModelId) {
	console.error("Error: Missing required environment variables. Check your .env file.");
	process.exit(1); // Exit if essential config is missing
}

// --- Bot State ---
let currentMode = 'prompt'; // Default mode on startup
let availableModels = []; // To store models from models.json
let currentModelId = defaultModelId; // Initialize with default from .env

// --- Load Models ---
const modelsFilePath = path.join(__dirname, 'models.json');
try {
    if (fs.existsSync(modelsFilePath)) {
        const modelsFileContent = fs.readFileSync(modelsFilePath, 'utf-8');
        availableModels = JSON.parse(modelsFileContent);
        // Validate if the default model ID from .env exists in models.json
        const defaultModelExists = availableModels.some(model => model.id === defaultModelId);
        if (!defaultModelExists) {
            console.warn(`Warning: Default model ID "${defaultModelId}" from .env not found in models.json. Using the first model from models.json instead.`);
            if (availableModels.length > 0) {
                currentModelId = availableModels[0].id;
            } else {
                console.error("Error: models.json is empty. Please add at least one model definition.");
                process.exit(1);
            }
        }
        console.log("Successfully loaded models from models.json.");
    } else {
        console.warn("Warning: models.json not found. Using only the default model from .env.");
        // Add the default model from .env as the only available model
        availableModels.push({ id: defaultModelId, name: `${defaultModelId} (Default from .env)`, notes: "" });
    }
} catch (error) {
    console.error("Error reading or parsing models.json:", error);
    console.warn("Falling back to using only the default model from .env.");
    availableModels = [{ id: defaultModelId, name: `${defaultModelId} (Default from .env)`, notes: "" }];
    currentModelId = defaultModelId; // Ensure currentModelId is set even on error
}


// --- Bot Initialization ---
const bot = new TelegramBot(token, { polling: true });

console.log(`Bot started. Authorized User ID: ${authorizedUserId}`);
console.log(`Default mode: ${currentMode}`);
console.log(`Current model ID: ${currentModelId}`);
console.log(`Current time: ${new Date().toLocaleString('en-US', { timeZone: 'Asia/Taipei' })} (Taiwan Time)`);


// --- Helper Functions (Moved to utils.js and api.js) ---
// isAuthorized is now imported from utils.js
// sendMessage is now imported from utils.js
// callDeepSeekAPI is now imported from api.js


// --- Bot Event Handlers ---

// /start command
bot.onText(/^\/start/, (msg) => {
	const chatId = msg.chat.id;
	const userId = msg.from.id;

	if (isAuthorized(userId, authorizedUserId)) {
		sendMessage(bot, chatId, "You are authorized.");
	} else {
		bot.sendMessage(chatId, `User ID ${userId} is not authorized to use this bot.`); // Use plain text
		console.log(`Unauthorized access attempt via /start by User ID: ${userId}`);
	}
});

// /help command: Must exactly match '/help'
bot.onText(/^\/help$/, (msg) => {
	const chatId = msg.chat.id;
	// Check authorization using the imported function and pass authorizedUserId
	if (!isAuthorized(msg.from.id, authorizedUserId)) return;

	const helpText = `Available Commands:
/help - Show this help message.
/prompt_mode - Switch to Prompt Translation Mode.
/commit_mode - Switch to Commit Translation Mode.
/chat_mode - Switch to General Chat Mode.
/list_models - Show available AI models and the current one.
/set_model <model_id> - Switch the AI model to use.

Current Mode: ${currentMode}
Current Model: ${currentModelId}

Send any text message to process it with the current mode and model.`;

	sendMessage(bot, chatId, helpText); // Use imported sendMessage
});

// /prompt_mode command
bot.onText(/^\/prompt_mode$/, (msg) => {
	const chatId = msg.chat.id;
	if (!isAuthorized(msg.from.id, authorizedUserId)) return;

	currentMode = 'prompt';
	console.log(`User ${msg.from.id} switched mode to: ${currentMode}`);
	sendMessage(bot, chatId, "Switched to Prompt Translation Mode.");
});

// /commit_mode command
bot.onText(/^\/commit_mode$/, (msg) => {
	const chatId = msg.chat.id;
	if (!isAuthorized(msg.from.id, authorizedUserId)) return;

	currentMode = 'commit';
	console.log(`User ${msg.from.id} switched mode to: ${currentMode}`);
	sendMessage(bot, chatId, "Switched to Commit Translation Mode.");
});

// /chat_mode command (New)
bot.onText(/^\/chat_mode$/, (msg) => {
	const chatId = msg.chat.id;
	if (!isAuthorized(msg.from.id, authorizedUserId)) return;

	currentMode = 'chat';
	console.log(`User ${msg.from.id} switched mode to: ${currentMode}`);
	sendMessage(bot, chatId, "Switched to General Chat Mode.");
});


// /list_models command (New)
bot.onText(/^\/list_models$/, (msg) => {
    const chatId = msg.chat.id;
    if (!isAuthorized(msg.from.id, authorizedUserId)) return;

    let modelListText = "Available Models:\n";
    if (availableModels.length > 0) {
        availableModels.forEach(model => {
            const isCurrent = model.id === currentModelId ? " (Current)" : "";
            modelListText += `- ${model.name || model.id}${isCurrent}\n  ID: ${model.id}\n`;
            if(model.notes) {
                modelListText += `  Notes: ${model.notes}\n`;
            }
        });
    } else {
        modelListText = "No models loaded. Please check models.json or the .env configuration.";
    }
    modelListText += `\nCurrent Model ID: ${currentModelId}`;

    sendMessage(bot, chatId, modelListText);
});

// /set_model command (New)
bot.onText(/^\/set_model (.+)$/, (msg, match) => {
    const chatId = msg.chat.id;
    if (!isAuthorized(msg.from.id, authorizedUserId)) return;

    const requestedModelId = match[1].trim(); // Get the model ID from the command

    const foundModel = availableModels.find(model => model.id === requestedModelId);

    if (foundModel) {
        currentModelId = foundModel.id;
        console.log(`User ${msg.from.id} switched model to: ${currentModelId}`);
        sendMessage(bot, chatId, `Switched model to: ${currentModelId}`);
    } else {
        sendMessage(bot, chatId, `Error: Model ID "${requestedModelId}" not found. Use /list_models to see available models.`);
    }
});


// Handle regular text messages
bot.on('message', async (msg) => {
	const chatId = msg.chat.id;
	const userId = msg.from.id;

	// 1. Check authorization FIRST
	if (!isAuthorized(userId, authorizedUserId)) {
		// Silently ignore messages from unauthorized users (except /start)
		return;
	}

	// 2. Ignore non-text messages
	if (!msg.text) {
		return;
	}

	// 3. Ignore messages that are exact commands handled by onText
	// This prevents processing commands like '/help' as text input.
	// Add new commands here as they are implemented.
	const commands = ['/start', '/help', '/prompt_mode', '/commit_mode', '/chat_mode', '/list_models'];
    // Check if the message exactly matches a command or starts with /set_model (which requires an argument)
	if (commands.includes(msg.text) || msg.text.startsWith('/set_model ')) {
		// Message is a known command, handled by its specific onText handler. Do nothing here.
		return;
	}

	// 4. Process the text message using the imported API function
	console.log(`Processing text from user ${userId} in ${currentMode} mode with model ${currentModelId}: "${msg.text}"`);

	// Send processing message and store it for editing
    let ackMsg;
    try {
        ackMsg = await bot.sendMessage(chatId, `Processing in ${currentMode} mode with ${currentModelId}...`);
    } catch (sendError) {
        console.error("Failed to send acknowledgment message:", sendError.message);
        // If we can't even send the ack, just proceed without editing later
    }


	const aiResponse = await callDeepSeekAPI(msg.text, currentMode, currentModelId, deepSeekApiEndpoint, deepSeekApiKey);

	// Edit the acknowledgment message with the result or error
	if (ackMsg && ackMsg.message_id) {
		bot.editMessageText(aiResponse || "Sorry, an error occurred and no response was generated.", {
			chat_id: chatId,
			message_id: ackMsg.message_id,
			// No parse_mode here for plain text
			disable_web_page_preview: true
		}).catch(editError => {
			// If editing fails (e.g., message too old), send a new message
			console.error("Failed to edit message:", editError.message);
			sendMessage(bot, chatId, aiResponse || "Sorry, an error occurred processing your request."); // Use helper
		});
	} else {
		// Fallback if sending/editing the acknowledgment failed
		sendMessage(bot, chatId, aiResponse || "Sorry, an error occurred processing your request."); // Use helper
	}
});

// Optional: Handle polling errors
bot.on('polling_error', (error) => {
	console.error(`Polling error: ${error.code} - ${error.message}. Timestamp: ${new Date().toISOString()}`);
	if (error.message.includes('ETIMEDOUT') || error.message.includes('ECONNRESET')) {
		console.warn('Network-related polling error. The bot will attempt to continue polling.');
	} else if (error.code === 'EFATAL') {
		console.error('Fatal polling error occurred. Stopping the bot.');
		process.exit(1);
	}
});

// Graceful shutdown
const shutdown = (signal) => {
	console.log(`${signal} received. Shutting down bot...`);
	bot.stopPolling({ cancel: true }).then(() => {
		console.log("Bot stopped polling gracefully.");
		process.exit(0);
	}).catch(err => {
		console.error("Error stopping polling:", err);
		process.exit(1);
	});
};

process.on('SIGINT', () => shutdown('SIGINT')); // Ctrl+C
process.on('SIGTERM', () => shutdown('SIGTERM')); // Termination signal 