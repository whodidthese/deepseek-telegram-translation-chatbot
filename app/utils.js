const TelegramBot = require('node-telegram-bot-api');

/**
 * Checks if the message sender is the authorized user.
 * @param {number} userId - The user ID from the Telegram message.
 * @param {number} authorizedUserId - The authorized user ID from config.
 * @returns {boolean} - True if authorized, false otherwise.
 */
const isAuthorized = (userId, authorizedUserId) => {
    // Basic validation in case authorizedUserId wasn't loaded correctly
    if (typeof authorizedUserId !== 'number' || isNaN(authorizedUserId)) {
        console.error("isAuthorized check failed: authorizedUserId is invalid.");
        return false;
    }
	return userId === authorizedUserId;
};

/**
 * Sends a message with common options, ensuring plain text.
 * @param {TelegramBot} bot - The bot instance.
 * @param {number} chatId - The chat ID to send the message to.
 * @param {string} text - The message text.
 */
const sendMessage = (bot, chatId, text) => {
	// Basic check to prevent sending empty/null messages which can cause errors
	if (typeof text !== 'string' || text.trim() === '') {
		console.warn(`Attempted to send empty message to chat ID ${chatId}.`);
		return;
	}
	// Send as plain text, disable web page preview
	bot.sendMessage(chatId, text, {
		// parse_mode: 'Markdown', // Removed Markdown
		disable_web_page_preview: true
	}).catch(error => {
		console.error(`Error sending message to chat ID ${chatId}:`, error.message);
        // Optionally, inform the user via a fallback message if sending fails critically
        // bot.sendMessage(chatId, "Sorry, I encountered an error trying to send a message.").catch(fallbackError => {
        //     console.error(`Error sending fallback error message to chat ID ${chatId}:`, fallbackError.message);
        // });
	});
};

module.exports = {
    isAuthorized,
    sendMessage,
}; 