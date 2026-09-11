const { Telegraf, Markup } = require("telegraf");
const supabase = require("../database/supabase");


const waitingDeposit = {};
const waitingWithdraw = {};



// ==========================
// MENUS
// ==========================


function mainMenu(){

return Markup.inlineKeyboard([

[
Markup.button.callback("💰 Depositar Pix","deposit"),
Markup.button.callback("📤 Saque Pix","withdraw")
],

[
Markup.button.callback("💼 Minha Carteira","wallet"),
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
// SUPABASE
// ==========================


async function getMedia(slug){

const {data,error}=await supabase

.from("telegram_media")
.select("telegram_file_id")
.eq("slug",slug)
.eq("active",true)
.single();


if(error){

console.log(error.message);

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


const bot =
new Telegraf(
process.env.TELEGRAM_TOKEN
);





// ==========================
// START
// ==========================


bot.start(async(ctx)=>{


await getUser(ctx);



const banner =
await getMedia("banner_start");



const text =

`
🚀 <b>Bem-vindo ao InfraPix</b>


Sua carteira Pix inteligente dentro do Telegram.


Receba, envie e gerencie seus valores de forma rápida e prática.


✨ Recursos disponíveis:


💰 Depósitos via Pix

⚡ Pagamentos automatizados

📤 Saques rápidos

📊 Controle de movimentações


Tudo em um único lugar.


Escolha uma opção abaixo:
`;



if(banner){


await ctx.replyWithPhoto(

banner,

{

caption:text,

parse_mode:"HTML",

reply_markup:
mainMenu().reply_markup

}

);


}else{


await ctx.reply(

text,

{

parse_mode:"HTML",

reply_markup:
mainMenu().reply_markup

}

);


}


});





// ==========================
// DEPOSITAR
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


Após informar o valor, seu Pix será gerado automaticamente.


📌 Limites:


Mínimo:
R$ ${minimum.toFixed(2)}


Máximo:
R$ ${maximum.toFixed(2)}


⚡ O saldo será liberado após confirmação do pagamento.
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
// SACAR
// ==========================


bot.action("withdraw",async(ctx)=>{


await ctx.answerCbQuery();


waitingWithdraw[ctx.from.id]=true;



await ctx.reply(

`
📤 <b>SAQUE VIA PIX</b>


Informe o valor que deseja sacar.


Exemplo:

100


Seu saldo será validado automaticamente.


Após aprovação, o valor será enviado para sua chave Pix cadastrada.
`,

{

parse_mode:"HTML",

reply_markup:
backMenu().reply_markup

}

);


});







// ==========================
// RECEBER TEXTO
// ==========================


bot.on("text",async(ctx)=>{


const id = ctx.from.id;



// DEPÓSITO

if(waitingDeposit[id]){


const value =
Number(
ctx.message.text.replace(",",".")
);



if(isNaN(value)){

return ctx.reply(
"❌ Digite somente números.\nExemplo: 50"
);

}



const minimum =
Number(await getSetting("minimum_deposit") || 5);


const maximum =
Number(await getSetting("maximum_deposit") || 10000);



if(value < minimum){

return ctx.reply(
`❌ Valor mínimo: R$ ${minimum}`
);

}



if(value > maximum){

return ctx.reply(
`❌ Valor máximo: R$ ${maximum}`
);

}



delete waitingDeposit[id];



const user =
await getUser(ctx);



await supabase

.from("pix_deposits")

.insert({

user_id:user.id,

amount:value,

status:"pending"

});



return ctx.reply(

`
✅ <b>Depósito solicitado</b>


Valor:

💰 R$ ${value.toFixed(2)}


Estamos preparando seu Pix.


Você receberá o QR Code e Pix copia e cola.
`,

{

parse_mode:"HTML"

}

);


}





// SAQUE


if(waitingWithdraw[id]){


const value =
Number(
ctx.message.text.replace(",",".")
);



if(isNaN(value)){

return ctx.reply(
"❌ Digite somente números."
);

}



const user =
await getUser(ctx);



const wallet =
await getWallet(user.id);



if(value > wallet.balance){


return ctx.reply(

`
❌ Saldo insuficiente.


Seu saldo:

R$ ${wallet.balance.toFixed(2)}
`

);

}



delete waitingWithdraw[id];



await supabase

.from("withdrawals")

.insert({

user_id:user.id,

amount:value,

status:"pending"

});



return ctx.reply(

`
✅ <b>Saque solicitado</b>


Valor:

💰 R$ ${value.toFixed(2)}


Status:

⏳ Processando


Você será atualizado quando concluído.
`,

{

parse_mode:"HTML"

}

);


}



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


Saldo disponível:


💰 <b>R$ ${(wallet?.balance || 0).toFixed(2)}</b>


Sua carteira InfraPix.
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


Indique novos usuários e acompanhe suas comissões.


Sistema de afiliados InfraPix.
`,

{

parse_mode:"HTML",

reply_markup:
backMenu().reply_markup

}

);


});





// VOLTAR

bot.action("back",async(ctx)=>{


await ctx.answerCbQuery();


await ctx.reply(
"Escolha uma opção:",
mainMenu()
);


});





// ATUALIZAR

bot.action("refresh",async(ctx)=>{


await ctx.answerCbQuery();


await ctx.reply(
"🔄 Sistema atualizado.",
mainMenu()
);


});





bot.launch();


console.log(
"🚀 InfraPix Bot online"
);


}



module.exports={
initBot
};
