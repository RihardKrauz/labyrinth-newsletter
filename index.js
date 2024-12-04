// const TelegramBot = require('node-telegram-bot-api');
//
// module.exports = async (req, res) => {
//     // Replace with your bot's token
//     const TOKEN = env.TELEGRAM_API_TOKEN;
//
// // Initialize bot with polling
//     const bot = new TelegramBot(TOKEN, { polling: true });
//
// // Storage for messages
//     const messages = {};
//
// // Function to get today's date in YYYY-MM-DD format
//     const getTodayDate = () => {
//         return new Date().toISOString().split('T')[0];
//     };
//
// // Handle incoming messages
//     bot.on('message', (msg) => {
//         try {
//             const chatId = msg.chat.id;
//             const today = getTodayDate();
//
//             // Initialize storage for today's messages if not present
//             if (!messages[chatId]) messages[chatId] = {};
//             if (!messages[chatId][today]) messages[chatId][today] = [];
//
//             // Add the message to today's list
//             messages[chatId][today].push(msg.text || '[Не-текстовое-сообщение]');
//         } catch (ex) {
//             console.error(ex)
//         }
//
//     });
//
// // Handle the "/show_newsletter" command
//     bot.onText(/\/show_newsletter/, (msg) => {
//         try {
//             const chatId = msg.chat.id;
//             const today = getTodayDate();
//
//             // Retrieve messages for today
//             const todayMessages = messages[chatId]?.[today];
//
//             // If no messages are found for today, notify the user
//             if (!todayMessages || todayMessages.length === 0) {
//                 bot.sendMessage(chatId, 'Газеты пусты, минотавр дремлет.');
//                 return;
//             }
//
//             // If no messages are found for today, notify the user
//             if (todayMessages.length >= 50) {
//                 bot.sendMessage(chatId, 'Будет проанализировано только последние 50 сообщений (API, хостинг, и AI токены не бесплатные!). Пожертвуйте лысому на пиво и массаж для разблокировки безлимитной версии :)');
//             }
//
//             // Send all accumulated messages for today
//             bot.sendMessage(chatId, `Сообщения за сегодня:\n\n${todayMessages.join('\n')}`);
//         } catch (ex) {
//             console.error(ex)
//         }
//     });
//
//     res.status(200).json({ message: 'Bot is running!' });
// };


export const runtime = 'nodejs';

export function GET(request: Request) {
    return new Response(`I am a Serverless Function`, {
        status: 200,
    });
}
