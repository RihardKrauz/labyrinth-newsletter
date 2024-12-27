const TelegramBot = require('node-telegram-bot-api');

// Take TG bot's token
const TOKEN = process.env.TELEGRAM_API_TOKEN;

// Storage for messages
let messages = {};
let bot;

// Function to get today's date in YYYY-MM-DD format
const getTodayDate = () => {
    return new Date().toISOString().split('T')[0];
};

module.exports = async (req, res) => {
    // Initialize bot with polling
    bot = new TelegramBot(TOKEN, { polling: true });
    console.log('Bot initialized');

    // Handle incoming messages
    bot.on('message', (msg) => {
        console.log('Message received: ', msg.text);
        try {
            const chatId = msg.chat.id;
            const today = getTodayDate();

            // Initialize storage for today's messages if not present
            if (!messages[chatId]) messages[chatId] = {};
            if (!messages[chatId][today]) messages[chatId][today] = [];

            // Add the message to today's list
            messages[chatId][today].push(msg.text || '[Не-текстовое-сообщение]');
        } catch (ex) {
            console.error(ex)
        }

    });

    // Handle the "/show_newsletter" command
    bot.onText(/\/show_newsletter/, (msg) => {
        console.log('/show_newsletter command received');
        try {
            const chatId = msg.chat.id;
            const today = getTodayDate();

            // Retrieve messages for today
            const todayMessages = messages[chatId]?.[today];

            // If no messages are found for today, notify the user
            if (!todayMessages || todayMessages.length === 0) {
                bot.sendMessage(chatId, 'Газеты пусты, минотавр дремлет.');
                return;
            }

            // If no messages are found for today, notify the user
            if (todayMessages.length >= 50) {
                bot.sendMessage(chatId, 'Будет проанализировано только последние 50 сообщений (API, хостинг, и AI токены не бесплатные!). Пожертвуйте лысому на пиво и массаж для разблокировки безлимитной версии :)');
            }

            // Send all accumulated messages for today
            bot.sendMessage(chatId, `Сообщения за сегодня:\n\n${todayMessages.join('\n')}`);
        } catch (ex) {
            console.error(ex)
        }
    });

    console.log('Bot is running');
    res.status(200).json({ message: 'Bot is running!' });
};

//
//
// const express = require('express');
// const app = express();
// const PORT = 4000;
//
// app.get('/home', (req, res) => {
//     res.status(200).json('Welcome, your app is working well');
// });
//
// app.listen(PORT, () => {
//     console.log(`Server running at http://localhost:${PORT}`);
// });
//
// module.exports = app;