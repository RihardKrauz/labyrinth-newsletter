const TelegramBot = require('node-telegram-bot-api');

// Take TG bot's token
const TOKEN = process.env.TELEGRAM_API_TOKEN;
const MESSAGES_LIMIT = 500;

/* DB
 * storage {
 *  chatId: {
 *     messages: ['message1', 'message2'],
 *     lastCommand: 'command',
 *     summaries: {
 *      '2021-09-01': ['summary1', 'summary2'],
 *      '2021-09-02': ['summary1', 'summary2'],
 *      '2021-09-03': ['summary1', 'summary2'],
 *     }
 * }
 */
const storage = {};

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

const botTag = '@LabyrinthNewsletterBot';

const botTagRegex = new RegExp(`${botTag}`);
const botTagWithDebugRegex = new RegExp(`^${botTag}\\sdebug`);
const botTagWithNumberRegex = new RegExp(`^${botTag}\\s(\\d+)`);
const botTagWithSummaryRegex = new RegExp(`^${botTag}\\ssummary`);
const botTagWithSummaryAndDayRegex = new RegExp(`^${botTag}\\s(\\d{4}-\\d{2}-\\d{2})`);
const commandHelpRegex = new RegExp(`^${botTag}\\shelp`);
const commandMessagesSelectorRegex = new RegExp(`^${botTag}\\s(\\d+)|${botTag}`);
const commandSummarySelectorRegex = new RegExp(`^${botTag}\\s(\\d{4}-\\d{2}-\\d{2})|^${botTag}\\ssummary`);
const onlyMeFlag = 'me';

const reply = async (msg, message, forceOnlyMeFlag) => {
    const chatId = msg.chat?.id;
    const senderId = msg.from?.id;

    if (msg.text?.includes(onlyMeFlag) || forceOnlyMeFlag) {
        const sentMessage = await bot.sendMessage(senderId, message);
        setTimeout(() => {
            bot.deleteMessage(chatId, sentMessage.message_id)
                .then()
                .catch((err) => {
                    console.error('Failed to delete message:', err);
                });
        }, 500);
    } else {
        await bot.sendMessage(chatId, message);
    }
}

function subscribeHandlers() {
    // Handle incoming messages
    bot.on('message', (msg) => {
        try {
            const chatId = msg.chat?.id;

            // Initialize storage for today's messages if not present
            if (!storage[chatId]) storage[chatId] = {};
            if (!storage[chatId].messages) storage[chatId].messages = [];

            if (msg.text?.includes('@LabyrinthNewsletterBot')) {
                return;
            }

            const chatMessage = msg.text
                ? `${msg?.from?.username}: ${msg.text} \n`
                : `${msg?.from?.username} прислал нетекстовое сообщение \n`;

            // Add the message to the list
            storage[chatId].messages.push(chatMessage);
            if (storage[chatId].messages.length >= MESSAGES_LIMIT) {
                storage[chatId].messages.shift();
            }
        } catch (ex) {
            console.error(ex)
        }
    });

    // Handle the "@LabyrinthNewsletterBot help" command
    bot.onText(commandHelpRegex, async (msg) => {
        try {
            reply(msg, `Лабиринт приветствует тебя, странник! Я - бот, который поможет сделать сводку сообщений из чата. \n Введи @LabyrinthNewsletterBot и одну из команд: \n 1. "<ничего>" - чтобы получить анализ последних 100 сообщений  \n 2. "N" - чтобы проанализировать последние N сообщений \n 3. "summary" - чтобы получить все сводки за сегодня \n 4. "summary YYYY-MM-DD" - чтобы получить сводку за конкретный день \n 5. "help" - чтобы получить это сообщение снова. \n Добавь к команде "me", чтобы получить ответ в личные сообщения`);
        } catch (ex) {
            console.error(ex)
        }
    });

    // Handle the "@LabyrinthNewsletterBot debug" command
    bot.onText(botTagWithDebugRegex, async (msg) => {
        try {
            const chatId = msg.chat?.id;
            const chatName = msg.chat?.title;

            reply(msg, `Debug for chat ${chatName}: messages in total: ${storage[chatId].messages?.length || 0}, summaries: ${JSON.stringify(storage[chatId].summaries || {})}, entire size of storage: ${JSON.stringify(storage).length}`, true);
        } catch (ex) {
            console.error(ex)
        }
    });

    // Handle the "@LabyrinthNewsletterBot with summary or day" command
    bot.onText(commandSummarySelectorRegex, async (msg) => {
        try {
            const chatId = msg.chat?.id;

            if (msg.text.match(botTagWithSummaryRegex)) {
                const todaysSummary = storage[chatId]?.summaries?.[getTodayDate()] || [];
                if (!todaysSummary || todaysSummary.length === 0) {
                    reply(msg, 'За сегодня сводок не было, минотавр дремлет.');
                    return;
                }

                reply(msg, 'Сводки за сегодня: \n' + todaysSummary.join('\n'));
                return;
            }

            const day = msg.text.match(botTagWithSummaryAndDayRegex)?.[1];
            const daySummary = storage[chatId]?.summaries[day];
            if (!daySummary || daySummary.length === 0) {
                reply(msg, `За ${daySummary} сводок не сохранено.`);
                return;
            }

            reply(msg, `Сводки за ${day}: \n` + daySummary.join('\n'));

        } catch (ex) {
            console.error(ex)
        }
    });

    // Handle the "@LabyrinthNewsletterBot ..." analyze command
    bot.onText(commandMessagesSelectorRegex, async (msg) => {
        try {
            // exit when debug
            if (msg.text.match(botTagWithDebugRegex)) {
                return;
            }
            storage.lastCommand = msg.text;

            // exit when any other commands with similar selector
            if (msg.text.match(botTagWithSummaryRegex)
                || msg.text.match(botTagWithSummaryAndDayRegex)
                || msg.text.match(commandHelpRegex)) {
                return;
            }
            const chatId = msg.chat?.id;
            const numberOfMessages = msg.text?.match(botTagWithNumberRegex)?.[1] || 100;

            const messagesToAnalyze = storage[chatId]?.messages.slice(0, numberOfMessages);

            console.log(`Going to analyze ${messagesToAnalyze.length} messages...`);

            // If no messages are found for today, notify the user
            if (!messagesToAnalyze || messagesToAnalyze.length === 0) {
                reply(msg, 'Газеты пусты, минотавр дремлет.');
                return;
            }

            if (messagesToAnalyze.length >= MESSAGES_LIMIT) {
                reply(msg, `Будет проанализировано только последние ${MESSAGES_LIMIT} сообщений (API, хостинг, и AI токены не бесплатные!). Пожертвуйте лысому на пиво и массаж для разблокировки безлимитной версии :)`);
            }

            const summary = await analyzeMessages(messagesToAnalyze.join('\n'));

            // Send all accumulated messages for today
            reply(msg, summary);

            if (!storage[chatId].summaries) storage[chatId].summaries = {};
            storage[chatId].summaries[getTodayDate()] = [...(storage[chatId].summaries[getTodayDate()] || []), summary];

            // Clean up summaries (when more than 3)
            const summaries = storage[chatId].summaries;
            if (Object.keys(summaries).length >= 3) {
                const daysToKeep = Object.keys(summaries)
                    .sort((a, b) => b.localeCompare(a)) // Sort in descending order
                    .slice(0, 3);

                storage[chatId].summaries = Object.fromEntries(
                    daysToKeep.map(day => [day, summaries[day]])
                );
            }
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