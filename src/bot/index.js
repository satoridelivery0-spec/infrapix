const { Telegraf, Markup } = require("telegraf");
const supabase = require("../database/supabase");


// Controle temporário de usuários digitando valor
const waitingDeposit = {};


// =============================
// MENUS
// =============================

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



function backButton(){

return Markup.inlineKeyboard([

[
Markup.button.callback("⬅️ Voltar","back")
]

]);

}



function depositMenu(){

return Markup.inlineKeyboard([

[
Markup.button.callback(
"💰 Gerar Pix",
"generate_pix"
)
],

[
Markup.button.callback(
"⬅️ Voltar",
"back"
)
]

]);

}



// =============================
// BUSCAR IMAGEM SUPABASE
// =============================

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




// =============================
// BUSCAR CONFIGURAÇÃO
// =============================

async function getSetting(key){

const {data}=await supabase

.from("settings")

.select("value")

.eq("key",key)

.single();


return data?.value || null;

}




// =============================
// CRIAR USUÁRIO
// =============================

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





// =============================
// BOT
// =============================


function initBot(){


const bot = new Telegraf(
process.env.TELEGRAM_TOKEN
);



// =============================
// START
// =============================


bot.start(async(ctx)=>{


await getUser(ctx);



const banner =
await getMedia(
"banner_start"
);



const message =

`
🚀 <b>Bem-vindo ao InfraPix</b>


Sua carteira digital Pix dentro do Telegram.


💳 Deposite
💰 Controle seu saldo
⚡ Receba pagamentos automaticamente


Escolha uma opção:
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





// =============================
// DEPÓSITO
// =============================


bot.action("deposit",async(ctx)=>{


await ctx.answerCbQuery();



waitingDeposit[ctx.from.id]=true;



const image =
await getMedia(
"deposit_screen"
);



const minimum =
await getSetting(
"minimum_deposit"
);



const text =

`
💰 <b>DEPÓSITO VIA PIX</b>


Informe abaixo o valor que deseja adicionar na sua carteira.


Exemplo:

50


Após enviar o valor, iremos gerar seu Pix automaticamente.


🔒 Pagamento seguro
⚡ Aprovação automática


Valor mínimo:
R$ ${minimum}
`;



if(image){


await ctx.replyWithPhoto(

image,

{

caption:text,

parse_mode:"HTML",

reply_markup:
depositMenu().reply_markup

}

);


}else{


await ctx.reply(

text,

{

parse_mode:"HTML",

reply_markup:
depositMenu().reply_markup

}

);


}


});






// =============================
// RECEBER VALOR DEPÓSITO
// =============================


bot.on("text",async(ctx)=>{


const userId =
ctx.from.id;



if(!waitingDeposit[userId])
return;



const value =
Number(
ctx.message.text.replace(",",".")
);



if(isNaN(value)){


return ctx.reply(
"❌ Digite apenas números.\n\nExemplo: 50"
);


}



const minimum =
Number(
await getSetting("minimum_deposit") || 5
);



if(value < minimum){


return ctx.reply(
`❌ O valor mínimo é R$ ${minimum}`
);


}



delete waitingDeposit[userId];



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
✅ <b>Solicitação criada!</b>


Valor:

💰 R$ ${value.toFixed(2)}


Estamos preparando seu Pix.


Aguarde...
`,

{

parse_mode:"HTML"

}

);



});







// =============================
// GERAR PIX
// =============================


bot.action("generate_pix",async(ctx)=>{


await ctx.answerCbQuery();


await ctx.reply(

`
⚡ O Pix será gerado automaticamente após informar o valor.
`

);


});






// =============================
// CARTEIRA
// =============================


bot.action("wallet",async(ctx)=>{


await ctx.answerCbQuery();



const user =
await getUser(ctx);



const {data:wallet}=await supabase

.from("wallets")

.select("*")

.eq("user_id",user.id)

.single();



const balance =
wallet?.balance || 0;



const {data:transactions}=await supabase

.from("wallet_transactions")

.select("*")

.eq("user_id",user.id)

.order("created_at",
{
ascending:false
})

.limit(5);



let history="";



transactions?.forEach(t=>{

history +=
`\n${t.type}: R$ ${t.amount}`;

});




await ctx.reply(

`
💼 <b>MINHA CARTEIRA</b>


💰 Saldo atual:

<b>R$ ${balance.toFixed(2)}</b>


📜 Últimas movimentações:

${history || "Nenhuma movimentação"}
`,

{

parse_mode:"HTML",

reply_markup:
backButton().reply_markup

}

);


});






// =============================
// SAQUE
// =============================


bot.action("withdraw",async(ctx)=>{


await ctx.answerCbQuery();


await ctx.reply(

`
📤 <b>SAQUE PIX</b>


Em breve você poderá solicitar seu saque diretamente pelo Telegram.


Seu saldo será validado automaticamente.
`,

{

parse_mode:"HTML",

reply_markup:
backButton().reply_markup

}

);


});






// =============================
// REDE
// =============================


bot.action("network",async(ctx)=>{


await ctx.answerCbQuery();


await ctx.reply(

`
🌐 <b>MINHA REDE</b>


Seu link de indicação:

Em desenvolvimento.


Ganhe comissões indicando usuários.
`,

{

parse_mode:"HTML",

reply_markup:
backButton().reply_markup

}

);


});






// =============================
// VOLTAR
// =============================


bot.action("back",async(ctx)=>{


await ctx.answerCbQuery();


await ctx.reply(

"Escolha uma opção:",

mainMenu()

);


});






// =============================
// ATUALIZAR
// =============================


bot.action("refresh",async(ctx)=>{


await ctx.answerCbQuery();



await ctx.reply(

"🔄 Sistema atualizado.",

mainMenu()

);


});





bot.launch();


console.log(
"🚀 InfraPix iniciado"
);


}



module.exports={
initBot
};
