const { Telegraf, Markup } = require("telegraf");
const supabase = require("../database/supabase");

const waitingDeposit = {};


// ==========================
// MENUS
// ==========================

function mainMenu(){

return Markup.inlineKeyboard([

[
Markup.button.callback("📥 Depositar","deposit"),
Markup.button.callback("📤 Sacar","withdraw")
],

[
Markup.button.callback("💼 Carteira","wallet"),
Markup.button.callback("🌐 Minha Rede","network")
],

[
Markup.button.callback("🔄 Atualizar","refresh")
]

]);

}


function backMenu(){

return Markup.inlineKeyboard([

[
Markup.button.callback("⬅️ Voltar","back")
]

]);

}


// ==========================
// SUPABASE HELPERS
// ==========================


async function getMedia(slug){

const {data,error}=await supabase

.from("telegram_media")
.select("telegram_file_id")
.eq("slug",slug)
.eq("active",true)
.single();


if(error){

console.log("Erro mídia:",error.message);

return null;

}


return data?.telegram_file_id || null;

}



async function getSetting(key){

const {data}=await supabase

.from("settings")
.select("value")
.eq("key",key)
.single();


return data?.value || null;

}




async function getUser(ctx){

const telegram_id = ctx.from.id;


let {data:user}=await supabase

.from("users")
.select("*")
.eq("telegram_id",telegram_id)
.single();



if(!user){

const result =
await supabase

.from("users")
.insert({

telegram_id,

username:
ctx.from.username || "",

first_name:
ctx.from.first_name || ""

})

.select()
.single();


user=result.data;

}


return user;

}




async function getWallet(user_id){

const {data}=await supabase

.from("wallets")
.select("*")
.eq("user_id",user_id)
.single();


return data;

}




// ==========================
// BOT
// ==========================


function initBot(){


const bot = new Telegraf(
process.env.TELEGRAM_TOKEN
);



// ==========================
// START
// ==========================


bot.start(async(ctx)=>{


await getUser(ctx);


const banner =
await getMedia("banner_start");



const message =

`
🚀 <b>Bem-vindo ao InfraPix</b>


Sua carteira Pix inteligente dentro do Telegram.


Com o InfraPix você pode:


💰 Adicionar saldo rapidamente

⚡ Realizar pagamentos via Pix

📊 Acompanhar sua movimentação

🔒 Utilizar uma plataforma automatizada e segura


Escolha uma opção abaixo:
`;



if(banner){


await ctx.replyWithPhoto(

banner,

{

caption:message,

parse_mode:"HTML",

reply_markup:
mainMenu().reply_markup

}

);


}else{


await ctx.reply(

message,

{

parse_mode:"HTML",

reply_markup:
mainMenu().reply_markup

}

);


}


});





// ==========================
// DEPÓSITO
// ==========================


bot.action("deposit",async(ctx)=>{


await ctx.answerCbQuery();


waitingDeposit[ctx.from.id]=true;


const image =
await getMedia("deposit_screen");



const minimum =
Number(await getSetting("minimum_deposit") || 5);


const maximum =
Number(await getSetting("maximum_deposit") || 10000);



const text =

`
💰 <b>DEPÓSITO VIA PIX</b>


Adicione saldo à sua carteira de forma rápida e segura.


Digite abaixo o valor que deseja depositar.


Exemplo:

50


Após informar o valor, vamos gerar automaticamente seu Pix com QR Code e código copia e cola.


📌 <b>Limites da operação:</b>


Mínimo:
R$ ${minimum.toFixed(2)}


Máximo:
R$ ${maximum.toFixed(2)}


⚡ O saldo será liberado automaticamente após a confirmação do pagamento.
`;



if(image){


await ctx.replyWithPhoto(

image,

{

caption:text,

parse_mode:"HTML",

reply_markup:
backMenu().reply_markup

}

);



}else{


await ctx.reply(

text,

{

parse_mode:"HTML",

reply_markup:
backMenu().reply_markup

}

);


}


});




// ==========================
// RECEBER VALOR
// ==========================


bot.on("text",async(ctx)=>{


if(!waitingDeposit[ctx.from.id])
return;



const value =
Number(
ctx.message.text.replace(",",".")
);



if(isNaN(value)){


return ctx.reply(
"❌ Informe apenas números.\n\nExemplo: 50"
);

}



const minimum =
Number(await getSetting("minimum_deposit") || 5);



const maximum =
Number(await getSetting("maximum_deposit") || 10000);



if(value < minimum){


return ctx.reply(
`❌ O valor mínimo para depósito é R$ ${minimum.toFixed(2)}`
);

}



if(value > maximum){


return ctx.reply(
`❌ O valor máximo para depósito é R$ ${maximum.toFixed(2)}`
);

}



delete waitingDeposit[ctx.from.id];



const user =
await getUser(ctx);



await supabase

.from("pix_deposits")

.insert({

user_id:user.id,

amount:value,

status:"pending"

});



await ctx.reply(

`
✅ <b>Valor recebido!</b>


💰 Valor:

R$ ${value.toFixed(2)}


⏳ Estamos preparando seu Pix.


Você receberá o QR Code e o código copia e cola nesta conversa.
`,

{

parse_mode:"HTML"

}

);


});






// ==========================
// CARTEIRA
// ==========================


bot.action("wallet",async(ctx)=>{


await ctx.answerCbQuery();


const user =
await getUser(ctx);



const wallet =
await getWallet(user.id);



await ctx.reply(

`
💼 <b>MINHA CARTEIRA</b>


💰 Saldo disponível:

<b>R$ ${(wallet?.balance || 0).toFixed(2)}</b>


📥 Total depositado:
R$ 0,00


📤 Total sacado:
R$ 0,00
`,

{

parse_mode:"HTML",

reply_markup:
backMenu().reply_markup

}

);


});






// ==========================
// SAQUE
// ==========================


bot.action("withdraw",async(ctx)=>{


await ctx.answerCbQuery();



await ctx.reply(

`
📤 <b>SAQUE VIA PIX</b>


Em breve você poderá solicitar seu saque diretamente pelo Telegram.


O sistema validará automaticamente seu saldo.
`,

{

parse_mode:"HTML",

reply_markup:
backMenu().reply_markup

}

);


});






// ==========================
// REDE
// ==========================


bot.action("network",async(ctx)=>{


await ctx.answerCbQuery();



await ctx.reply(

`
🌐 <b>MINHA REDE</b>


Seu link de indicação será criado aqui.


Ganhe comissões indicando novos usuários.
`,

{

parse_mode:"HTML",

reply_markup:
backMenu().reply_markup

}

);


});






// ==========================
// VOLTAR
// ==========================


bot.action("back",async(ctx)=>{


await ctx.answerCbQuery();


await ctx.reply(

"Escolha uma opção:",

mainMenu()

);


});





// ==========================
// ATUALIZAR
// ==========================


bot.action("refresh",async(ctx)=>{


await ctx.answerCbQuery();


await ctx.reply(

"🔄 Sistema atualizado.",

mainMenu()

);


});





bot.launch();


console.log(
"🚀 InfraPix Bot iniciado"
);


}



module.exports={
initBot
};
