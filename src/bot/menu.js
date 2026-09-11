const { Markup } = require("telegraf");

module.exports = function menu(){

return Markup.inlineKeyboard([
[
Markup.button.callback("📥 DEPOSITAR","deposit"),
Markup.button.callback("📤 SACAR","withdraw")
],
[
Markup.button.callback("💼 CARTEIRA","wallet"),
Markup.button.callback("🌐 MINHA REDE","network")
],
[
Markup.button.callback("🔄 ATUALIZAR","refresh")
]
]);

};
