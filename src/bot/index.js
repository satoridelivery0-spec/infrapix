const { Telegraf, Markup } = require("telegraf");
const supabase = require("../database/supabase");


// MENU PRINCIPAL
function mainMenu() {

return Markup.inlineKeyboard([

[
Markup.button.callback("📥 DEPOSITAR", "deposit"),
Markup.button.callback("📤 SACAR", "withdraw")
],

[
Markup.button.callback("💼 CARTEIRA", "wallet"),
Markup.button.callback("🌐 MINHA REDE", "network")
],

[
Markup.button.callback("🔄 ATUALIZAR", "refresh")
]

]);

}


// MENU DEPÓSITO
function depositMenu(){

return Markup.inlineKeyboard([

[
Markup.button.callback(
"💰 GERAR PIX",
"generate_pix"
)
],

[
Markup.button.callback(
"⬅️ VOLTAR",
"back_menu"
)
]

]);

}


// MENU SAQUE
function withdrawMenu(){

return Markup.inlineKeyboard([

[
Markup.button.callback(
"💸 SOLICITAR SAQUE",
"request_withdraw"
)
],

[
Markup.button.callback(
"⬅️ VOLTAR",
"back_menu"
)
]

]);

}


// INICIAR BOT
function initBot(){


const bot = new Telegraf(
process.env.TELEGRAM_TOKEN
);



// START

bot.start(async(ctx)=>{


const telegram_id = ctx.from.id;


const {data:user}=await supabase
.from("users")
.select("*")
.eq("telegram_id",telegram_id)
.single();



if(!user){

await supabase
.from("users")
.insert({

telegram_id,

username:ctx.from.username || "",

first_name:ctx.from.first_name || ""

});

}



ctx.reply(

`🚀 Bem-vindo ao InfraPix


Sua carteira Pix dentro do Telegram.


Escolha uma opção:`,

mainMenu()

);


});



// =======================
// DEPÓSITO
// =======================

bot.action("deposit",async(ctx)=>{


await ctx.answerCbQuery();


await ctx.replyWithPhoto(

{
url:"https://i.imgur.com/rLuFNkQ.png"
},

{

caption:

`💰 <b>DEPÓSITO VIA PIX</b>


Digite o valor que deseja depositar.


Após confirmar, será gerado seu QR Code Pix.


Valor mínimo: R$5,00`,

parse_mode:"HTML",

reply_markup:
depositMenu().reply_markup

}

);


});



// GERAR PIX

bot.action("generate_pix",async(ctx)=>{


await ctx.answerCbQuery();


ctx.reply(

`⏳ Gerando seu Pix...


Aguarde alguns segundos.`,

depositMenu()

);


});



// =======================
// CARTEIRA
// =======================


bot.action("wallet",async(ctx)=>{


await ctx.answerCbQuery();


ctx.reply(

`💼 <b>SUA CARTEIRA DIGITAL</b>


💰 Saldo:
R$ 0,00


📥 Depositado:
R$ 0,00


📤 Sacado:
R$ 0,00


💸 Comissões:
R$ 0,00`,

{
parse_mode:"HTML",
reply_markup:Markup.inlineKeyboard([

[
Markup.button.callback(
"⬅️ VOLTAR",
"back_menu"
)

]

]).reply_markup

}

);


});



// =======================
// SAQUE
// =======================


bot.action("withdraw",async(ctx)=>{


await ctx.answerCbQuery();


ctx.reply(

`📤 <b>SAQUE VIA PIX</b>


Informe sua chave Pix para continuar.`,

{

parse_mode:"HTML",

reply_markup:
withdrawMenu().reply_markup

}

);


});



// =======================
// MINHA REDE
// =======================


bot.action("network",async(ctx)=>{


await ctx.answerCbQuery();


ctx.reply(

`🌐 <b>MINHA REDE</b>


Convide usuários e receba comissões.`,

{

parse_mode:"HTML",

reply_markup:
Markup.inlineKeyboard([

[
Markup.button.callback(
"⬅️ VOLTAR",
"back_menu"
)

]

]).reply_markup

}

);


});



// VOLTAR AO MENU

bot.action("back_menu",async(ctx)=>{


await ctx.answerCbQuery();


ctx.reply(

"Escolha uma opção:",

mainMenu()

);


});



// ATUALIZAR

bot.action("refresh",async(ctx)=>{


await ctx.answerCbQuery();


ctx.editMessageText(

"🔄 Sistema atualizado.\n\nEscolha uma opção:",

mainMenu()

);


});



bot.launch();


console.log(
"Bot InfraPix iniciado 🚀"
);


}


module.exports={
initBot
};
