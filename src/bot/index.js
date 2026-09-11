const { Telegraf, Markup } = require("telegraf");
const supabase = require("../database/supabase");

console.log("🚀 InfraPix v2.0 carregado");


const waitingDeposit = {};
const waitingWithdraw = {};



// ========================
// MENUS
// ========================

function mainMenu(){

return Markup.inlineKeyboard([

[
Markup.button.callback("💰 Depositar Pix","deposit"),
Markup.button.callback("📤 Sacar Pix","withdraw")
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



function cancelMenu(){

return Markup.inlineKeyboard([

[
Markup.button.callback(
"❌ Cancelar",
"cancel"
)

]

]);

}



// ========================
// SUPABASE
// ========================


async function getMedia(slug){

const {data,error}=await supabase

.from("telegram_media")
.select("telegram_file_id")
.eq("slug",slug)
.eq("active",true)
.single();


if(error){

console.log(
"Erro mídia:",
error.message
);

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
.eq(
"telegram_id",
telegram_id
)
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
.eq(
"user_id",
user_id
)
.single();


return data;

}





// ========================
// INICIAR BOT
// ========================


function initBot(){


const bot =
new Telegraf(
process.env.TELEGRAM_TOKEN
);



// ========================
// START
// ========================


bot.start(async(ctx)=>{


await getUser(ctx);


const banner =
await getMedia(
"banner_start"
);



const text =

`
🚀 <b>InfraPix</b>

Sua carteira Pix inteligente.

💰 Deposite saldo
📤 Solicite saques
📊 Acompanhe movimentações

Rápido, simples e seguro.

Escolha uma opção:
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




// ========================
// DEPÓSITO
// ========================


bot.action(
"deposit",
async(ctx)=>{


await ctx.answerCbQuery();


waitingDeposit[ctx.from.id]=true;



const image =
await getMedia(
"deposit_screen"
);



const text =

`
💰 <b>Depósito Pix</b>

Adicione saldo à sua carteira.

Digite o valor desejado:

Exemplo: 50

📌 Limites:
• Mínimo: R$ 10,00
• Máximo: R$ 1.000,00

⚡ Após informar o valor, seu Pix será gerado automaticamente.
`;



if(image){


await ctx.replyWithPhoto(

image,

{

caption:text,

parse_mode:"HTML",

reply_markup:
cancelMenu().reply_markup

}

);


}else{


await ctx.reply(

text,

{

parse_mode:"HTML",

reply_markup:
cancelMenu().reply_markup

}

);


}


});





// ========================
// SAQUE
// ========================


bot.action(
"withdraw",
async(ctx)=>{


await ctx.answerCbQuery();


waitingWithdraw[ctx.from.id]=true;



await ctx.reply(

`
📤 <b>Saque Pix</b>

Informe o valor que deseja sacar.

Exemplo: 100

📌 Seu saldo será validado automaticamente.

Após aprovação, o pagamento será enviado.
`,

{

parse_mode:"HTML",

reply_markup:
cancelMenu().reply_markup

}

);


});






// ========================
// RECEBER TEXTO
// ========================


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
"❌ Digite apenas números."
);

}



if(value < 10){

return ctx.reply(
"❌ Depósito mínimo: R$10,00"
);

}



if(value > 1000){

return ctx.reply(
"❌ Depósito máximo: R$1.000,00"
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
✅ <b>Valor recebido</b>

💰 R$ ${value.toFixed(2)}

⏳ Gerando seu Pix...

Você receberá o QR Code nesta conversa.
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
"❌ Digite apenas números."
);

}



const user =
await getUser(ctx);



const wallet =
await getWallet(user.id);



if(!wallet || value > wallet.balance){

return ctx.reply(

`
❌ Saldo insuficiente.

Saldo disponível:
R$ ${(wallet?.balance || 0).toFixed(2)}
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

💰 Valor:
R$ ${value.toFixed(2)}

⏳ Status:
Processando
`,

{
parse_mode:"HTML"
}

);


}


});






// ========================
// CARTEIRA
// ========================


bot.action(
"wallet",
async(ctx)=>{


await ctx.answerCbQuery();


const user =
await getUser(ctx);


const wallet =
await getWallet(user.id);



await ctx.reply(

`
💼 <b>Minha Carteira</b>

Saldo disponível:

💰 <b>R$ ${(wallet?.balance || 0).toFixed(2)}</b>
`,

{

parse_mode:"HTML",

reply_markup:
cancelMenu().reply_markup

}

);


});






// ========================
// REDE
// ========================


bot.action(
"network",
async(ctx)=>{


await ctx.answerCbQuery();


await ctx.reply(

`
🌐 <b>Minha Rede</b>

Convide usuários e acompanhe suas comissões.
`,

{

parse_mode:"HTML",

reply_markup:
cancelMenu().reply_markup

}

);


});







// ========================
// CANCELAR
// ========================


bot.action(
"cancel",
async(ctx)=>{


delete waitingDeposit[ctx.from.id];

delete waitingWithdraw[ctx.from.id];


await ctx.answerCbQuery();


await ctx.reply(

"Operação cancelada.",

mainMenu()

);


});






// ========================
// VOLTAR
// ========================


bot.action(
"refresh",
async(ctx)=>{


await ctx.answerCbQuery();


await ctx.reply(
"🔄 Atualizado.",
mainMenu()
);


});





bot.launch({

dropPendingUpdates:true

});



console.log(
"✅ InfraPix Bot online"
);


}


module.exports={
initBot
};
