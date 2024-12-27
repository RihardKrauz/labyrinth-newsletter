const TelegramBot = require('node-telegram-bot-api');

// Take TG bot's token
const TOKEN = process.env.TELEGRAM_API_TOKEN;
const MESSAGES_LIMIT = 50;

// Storage for messages
const messages = {};

// Function to get today's date in YYYY-MM-DD format
const getTodayDate = () => {
    return new Date().toISOString().split('T')[0];
};

// Initialize bot with polling
const bot = new TelegramBot(TOKEN);
console.log('Bot initialized');

if (bot.isPolling()) {
    console.log('It was polling, closing previous connection...');
    bot.stopPolling().then(() => {
        console.log('Polling closed');
        subscribeHandlers();
    });
} else {
    console.log('It was NOT polling, starting connection...');
    bot.startPolling().then(() => {
        console.log('Polling started');
        subscribeHandlers();
    });
}

async function analyzeMessages(messages) {
    try {
        console.log('Analyzing messages...');
        const response = await fetch("https://labyrinth-newsletter-ai.vercel.app/api/summary.js", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ messages: messages })
        });

        const data = await response.json();
        return data.message;
    } catch (ex) {
        console.error(ex);
        return ex.message || ex || 'Произошла ошибка при анализе сообщений';
    }
}

function subscribeHandlers() {
    // Handle incoming messages
    bot.on('message', (msg) => {
        try {
            const chatId = msg.chat?.id;
            const today = getTodayDate();

            // Initialize storage for today's messages if not present
            if (!messages[chatId]) messages[chatId] = {};
            if (!messages[chatId][today]) messages[chatId][today] = [];

            if (msg.text?.includes('@LabyrinthNewsletterBot')) {
                return;
            }

            const chatMessage = msg.text
                ? `Пользователь ${msg?.from?.username} сказал: ${msg.text} \n`
                : `Пользователь ${msg?.from?.username} прислал нетекстовое сообщение \n`;

            // Add the message to today's list
            messages[chatId][today].push(chatMessage);
            if (messages[chatId][today].length >= MESSAGES_LIMIT) {
                messages[chatId][today].shift();
            }
        } catch (ex) {
            console.error(ex)
        }
    });

    // Handle the "@LabyrinthNewsletterBot" command
    bot.onText(/@LabyrinthNewsletterBot/, async (msg) => {
        console.log('Newsletter command received');
        try {
            const chatId = msg.chat?.id;
            const today = getTodayDate();

            // Retrieve messages for today
            const todayMessages = messages[chatId]?.[today];

            // If no messages are found for today, notify the user
            if (!todayMessages || todayMessages.length === 0) {
                bot.sendMessage(chatId, 'Газеты пусты, минотавр дремлет.');
                return;
            }

            // If no messages are found for today, notify the user
            if (todayMessages.length >= MESSAGES_LIMIT) {
                bot.sendMessage(chatId, `Будет проанализировано только последние ${MESSAGES_LIMIT} сообщений (API, хостинг, и AI токены не бесплатные!). Пожертвуйте лысому на пиво и массаж для разблокировки безлимитной версии :)`);
            }

            // Send all accumulated messages for today
            bot.sendMessage(chatId, await analyzeMessages(todayMessages.join('\n')));

            // Clean up messages for today
            messages[chatId][today] = [];
        } catch (ex) {
            console.error(ex)
        }
    });
}

// Graceful shutdown on app termination
process.on('SIGINT',  () => {
    console.log('Gracefully shutting down...');
    bot.stopPolling().then(() => { process.exit(0); }); // Stops the polling process
});

process.on('SIGTERM',  () => {
    console.log('Gracefully shutting down...');
    bot.stopPolling().then(() => { process.exit(0); });
});

console.log('Bot is running');