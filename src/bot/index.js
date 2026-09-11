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
                "⬅️ VOLTAR",
                "back_menu"
            )
        ]

    ]);

}



function initBot(){


const bot = new Telegraf(
    process.env.TELEGRAM_TOKEN
);



// START COM BANNER

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



await ctx.replyWithPhoto(

"https://i.imgur.com/XYffKvd.jpeg",

{

caption:

`🚀 <b>Bem-vindo ao InfraPix</b>


Sua carteira Pix dentro do Telegram.


Escolha uma opção abaixo:`,

parse_mode:"HTML",

reply_markup:
mainMenu().reply_markup

}

);


});




// DEPÓSITO

bot.action("deposit", async(ctx)=>{


await ctx.answerCbQuery();



await ctx.replyWithPhoto(

"https://i.imgur.com/rLuFNkQ.png",

{

caption:

`💰 <b>DEPÓSITO VIA PIX</b>


Digite o valor que deseja depositar.


Após confirmar, será gerado seu pagamento Pix.


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


await ctx.reply(

`⏳ Gerando seu Pix...


Aguarde alguns segundos.`,

depositMenu()

);


});





// CARTEIRA

bot.action("wallet",async(ctx)=>{


await ctx.answerCbQuery();


await ctx.reply(

`💼 <b>SUA CARTEIRA DIGITAL</b>


💰 Saldo:
R$ 0,00


📥 Depósitos:
R$ 0,00


📤 Saques:
R$ 0,00`,

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





// SAQUE

bot.action("withdraw",async(ctx)=>{


await ctx.answerCbQuery();


await ctx.reply(

`📤 <b>SAQUE VIA PIX</b>


Área de saque.`,

{

parse_mode:"HTML",

reply_markup:
withdrawMenu().reply_markup

}

);


});





// MINHA REDE

bot.action("network",async(ctx)=>{


await ctx.answerCbQuery();


await ctx.reply(

`🌐 <b>MINHA REDE</b>


Sistema de afiliados InfraPix.`,

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





// VOLTAR

bot.action("back_menu",async(ctx)=>{


await ctx.answerCbQuery();


await ctx.reply(

"Escolha uma opção:",

mainMenu()

);


});





// ATUALIZAR

bot.action("refresh",async(ctx)=>{


await ctx.answerCbQuery();


await ctx.editMessageCaption(

`🚀 <b>InfraPix atualizado</b>


Escolha uma opção:`,

{

parse_mode:"HTML",

reply_markup:
mainMenu().reply_markup

}

);


});





bot.launch();


console.log(
"InfraPix Bot iniciado 🚀"
);


}



module.exports={
initBot
};
