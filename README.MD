# DeepSeek Telegram Translation Chatbot

A personal Telegram bot built with Node.js that utilizes the DeepSeek AI model (via OpenRouter) to provide specialized text translation services in two modes: Prompt Translation and Git Commit Translation. This bot is designed to serve a single, authorized Telegram user.

Developed by: **Who Did These** (<whodidthese@talkingsource.com>)

## Features

* **Two Operating Modes:**
    * **Prompt Translation Mode:** Translates any input text into clear, concise English suitable for use in AI prompts.
    * **Commit Translation Mode:** Translates any input text into a standard English Git commit message format (`git commit -m "..."`), potentially suggesting alternatives.
* **Single User Authorization:** Only responds to messages and commands from the user ID specified in the configuration.
* **Command Control:**
    * `/start`: Checks if the user is authorized.
    * `/help`: Displays available commands and the current operating mode.
    * `/prompt_mode`: Switches the bot to Prompt Translation Mode.
    * `/commit_mode`: Switches the bot to Commit Translation Mode.
* **Robust Command Handling:** Commands must be at the beginning of the message and (except for `/start`) must not have trailing text to be recognized as commands. Other text, including invalid command formats, is treated as input for translation.
* **DeepSeek Integration:** Leverages the DeepSeek language model for translation tasks via an API endpoint.

## Important Note on API Endpoint

**Disclaimer:** The default AI model configuration in this bot (`deepseek/deepseek-chat-v3-0324:free` accessed via `https://openrouter.ai/api/v1/chat/completions`) points to an endpoint currently provided **for free** by [OpenRouter.ai](https://openrouter.ai/) (as of March 29, 2025, Taiwan Time).

* **Free access is subject to OpenRouter.ai's terms of service and rate limits.**
* **This free tier may change or be discontinued without notice.**
* You may need to sign up for an OpenRouter account to obtain an API key (`DEEPSEEK_API_KEY`) even for free tiers.
* If the free tier is discontinued or insufficient for your needs, you may need to switch to a paid model/plan on OpenRouter or adapt the code to use a different API provider.

## Prerequisites

* **Node.js:** Version 18.0.0 or higher (due to native `Workspace` usage).
* **npm:** Usually included with Node.js.
* **Git:** For cloning the repository.
* **Telegram Account:** To interact with the bot.
* **Telegram Bot Token:** Obtainable from [@BotFather](https://t.me/BotFather) on Telegram.
* **Your Telegram User ID:** You can get this from bots like [@userinfobot](https://t.me/userinfobot).
* **OpenRouter API Key:** Obtainable from [OpenRouter](https://openrouter.ai/).

## Setup

1.  **Clone the repository:**
    ```bash
    git clone [https://github.com/whodidthese/deepseek-telegram-translation-chatbot.git](https://github.com/whodidthese/deepseek-telegram-translation-chatbot.git)
    cd deepseek-telegram-translation-chatbot
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Create Environment File:**
    Create a file named `.env` in the project's root directory. You can copy the example if one exists:
    ```bash
    # cp .env.example .env # Uncomment if you create an .env.example file
    ```

4.  **Configure Environment Variables:**
    Open the `.env` file and add the following variables, replacing the placeholder values with your actual credentials:

    ```dotenv
        # Telegram Bot Token from BotFather
    TELEGRAM_BOT_TOKEN=YOUR_TELEGRAM_BOT_TOKEN

    # Your personal Telegram User ID
    AUTHORIZED_USER_ID=YOUR_TELEGRAM_USER_ID

    # Your OpenRouter.ai API Key
    DEEPSEEK_API_KEY=YOUR_OPENROUTER_API_KEY

    # DeepSeek API Endpoint (default uses OpenRouter)
    DEEPSEEK_API_ENDPOINT="[https://openrouter.ai/api/v1/chat/completions](https://openrouter.ai/api/v1/chat/completions)"

    # DeepSeek Model ID (default uses OpenRouter free tier model)
    DEEPSEEK_MODEL="deepseek/deepseek-chat-v3-0324:free"
    ```
    **Important:** Keep your `.env` file secure and **do not** commit it to version control. Ensure `.env` is listed in your `.gitignore` file.

## Running the Bot

1.  **Start the bot:**
    ```bash
    npm start
    ```
    Alternatively, you can run:
    ```bash
    node bot.js
    ```

2.  The console will log messages indicating the bot has started, the authorized user ID, and the default mode. Check the console for any errors during startup or operation.

## Usage

1.  Open Telegram and find the chat with the bot you created.
2.  Only the user whose Telegram ID matches `AUTHORIZED_USER_ID` can interact with the bot's features.
3.  Use the commands `/help`, `/prompt_mode`, or `/commit_mode` to control the bot.
4.  Send any text message to the bot. It will process the text based on the `currentMode` (Prompt or Commit Translation) and send back the result from the DeepSeek AI.
5.  Messages from unauthorized users (except for a notice on `/start`) will be ignored. Invalid command formats (e.g., `/help me`) will be treated as text input for translation.

## License

This project is licensed under the ISC License. See the `package.json` file for details.