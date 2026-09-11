const { Telegraf } = require("telegraf");
const menu = require("./menu");
const handlers = require("./handlers");

function initBot(){

 const bot = new Telegraf(process.env.TELEGRAM_TOKEN);

 bot.start(handlers.start);

 bot.action("deposit", handlers.deposit);
 bot.action("withdraw", handlers.withdraw);
 bot.action("wallet", handlers.wallet);
 bot.action("network", handlers.network);
 bot.action("refresh", handlers.refresh);

 bot.launch();

 console.log("Bot Telegram iniciado");
}

module.exports = { initBot };
