const { Telegraf, Markup } = require("telegraf");
const supabase = require("../database/supabase");


// =============================
// MENUS
// =============================


function mainMenu(){

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

}



function backMenu(){

return Markup.inlineKeyboard([

[
Markup.button.callback(
"⬅️ VOLTAR",
"back"
)

]

]);

}




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
"back"
)

]

]);

}



// =============================
// BUSCAR IMAGEM TELEGRAM
// =============================


async function getMedia(slug){

const {data}=await supabase

.from("telegram_media")

.select("*")

.eq("slug",slug)

.eq("active",true)

.single();


return data?.telegram_file_id || null;

}



// =============================
// CRIAR USUARIO
// =============================


async function createUser(ctx){


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
// BUSCAR CARTEIRA
// =============================


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




// =============================
// BOT
// =============================


function initBot(){


const bot = new Telegraf(
process.env.TELEGRAM_TOKEN
);




// START

bot.start(async(ctx)=>{


const user =
await createUser(ctx);



const banner =
await getMedia(
"banner_start"
);



const texto =

`
🚀 <b>Bem-vindo ao InfraPix</b>


Sua carteira Pix dentro do Telegram.


Escolha uma opção abaixo:
`;



if(banner){


await ctx.replyWithPhoto(

banner,

{

caption:texto,

parse_mode:"HTML",

reply_markup:
mainMenu().reply_markup

}

);


}else{


await ctx.reply(

texto,

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


bot.action(
"deposit",

async(ctx)=>{


await ctx.answerCbQuery();


const img =
await getMedia(
"deposit_screen"
);



const texto=

`
💰 <b>DEPÓSITO VIA PIX</b>


Digite o valor desejado.


Após confirmar será gerado seu Pix.


Valor mínimo configurável pelo sistema.
`;



if(img){


await ctx.replyWithPhoto(

img,

{

caption:texto,

parse_mode:"HTML",

reply_markup:
depositMenu().reply_markup

}

);


}else{


await ctx.reply(

texto,

{

parse_mode:"HTML",

reply_markup:
depositMenu().reply_markup

}

);


}


});





// GERAR PIX

bot.action(
"generate_pix",

async(ctx)=>{


await ctx.answerCbQuery();



await ctx.reply(

`
⏳ Gerando cobrança Pix...


Sistema conectado ao gateway.
`

);


});






// =============================
// CARTEIRA
// =============================


bot.action(
"wallet",

async(ctx)=>{


await ctx.answerCbQuery();



const user =
await createUser(ctx);



const wallet =
await getWallet(
user.id
);



const saldo =
wallet?.balance || 0;



await ctx.reply(

`
💼 <b>SUA CARTEIRA</b>


💰 Saldo disponível:

<b>R$ ${saldo}</b>


📥 Depósitos:
R$ 0,00


📤 Saques:
R$ 0,00
`,

{

parse_mode:"HTML",

reply_markup:
backMenu().reply_markup

}

);


});






// =============================
// SAQUE
// =============================


bot.action(
"withdraw",

async(ctx)=>{


await ctx.answerCbQuery();


await ctx.reply(

`
📤 <b>SAQUE VIA PIX</b>


Digite o valor que deseja sacar.


Seu saldo será validado automaticamente.
`,

{

parse_mode:"HTML",

reply_markup:
backMenu().reply_markup

}

);


});







// =============================
// REDE
// =============================


bot.action(
"network",

async(ctx)=>{


await ctx.answerCbQuery();


await ctx.reply(

`
🌐 <b>MINHA REDE</b>


Seu link de indicação será gerado aqui.


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

bot.action(
"back",

async(ctx)=>{


await ctx.answerCbQuery();


await ctx.reply(

"Escolha uma opção:",

mainMenu()

);


});





// ATUALIZAR

bot.action(
"refresh",

async(ctx)=>{


await ctx.answerCbQuery();


await ctx.editMessageText(

"🔄 Sistema atualizado.",

mainMenu()

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
