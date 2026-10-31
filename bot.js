const { Telegraf } = require('telegraf');

const token = process.env.BOT_TOKEN;

if (!token) {
    throw new Error('Set the BOT_TOKEN environment variable before starting the bot.');
}

if (token === 'your-telegram-bot-token') {
    throw new Error('BOT_TOKEN is still the example placeholder. Get a real token from @BotFather and set it in PowerShell before starting the bot.');
}

const bot = new Telegraf(token);

console.log('Bot is starting with Telegraf...');

bot.start((ctx) => {
    return ctx.reply('Open the Biology exam directly:', {
        reply_markup: {
            inline_keyboard: [[{
                text: 'Open Biology Exam',
                url: 'http://super-cactus-a6e729.netlify.app'
            }]]
        }
    });
});

// Error handling
bot.catch((err, ctx) => {
    console.error(`Telegraf error for ${ctx.updateType}:`, err);
});

bot.launch().then(() => {
    console.log('Bot is live and listening for messages!');
}).catch(err => {
    if (err.response && err.response.error_code === 404) {
        console.error('Telegram rejected BOT_TOKEN. Get a valid bot token from @BotFather, then set $env:BOT_TOKEN in this PowerShell window and run npm start again.');
    } else {
        console.error('Failed to launch bot:', err);
    }
    process.exitCode = 1;
});

// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
