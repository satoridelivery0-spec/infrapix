const supabase = require("../database/supabase");
const menu = require("./menu");

async function start(ctx){

const telegram_id = ctx.from.id;

const {data:user} = await supabase
.from("users")
.select("*")
.eq("telegram_id", telegram_id)
.single();


if(!user){

await supabase
.from("users")
.insert({
telegram_id,
username: ctx.from.username || "",
first_name: ctx.from.first_name || ""
});

}


await ctx.reply(
`🚀 Bem-vindo ao InfraPix

Sua carteira Pix dentro do Telegram.

Escolha uma opção:`,
menu()
);

}


async function wallet(ctx){

await ctx.answerCbQuery();

const user = await supabase
.from("users")
.select("id")
.eq("telegram_id",ctx.from.id)
.single();


let balance = 0;

if(user.data){

const wallet = await supabase
.from("wallets")
.select("balance")
.eq("user_id",user.data.id)
.single();

balance = wallet.data?.balance || 0;

}


ctx.reply(
`💼 Sua Carteira Digital

💰 Saldo Atual:
R$ ${balance}

📥 Depósitos:
R$ 0,00

📤 Saques:
R$ 0,00`,
menu()
);

}


async function deposit(ctx){

await ctx.answerCbQuery();

ctx.reply(
`💰 DEPÓSITO VIA PIX

Digite o valor desejado.

Após confirmar será gerado seu Pix.`,
menu()
);

}


async function withdraw(ctx){

await ctx.answerCbQuery();

ctx.reply(
`📤 SAQUE

Sistema preparado para saque via Pix.`,
menu()
);

}


async function network(ctx){

await ctx.answerCbQuery();

ctx.reply(
`🌐 MINHA REDE

Sistema de afiliados InfraPix.`,
menu()
);

}


async function refresh(ctx){

await ctx.answerCbQuery();

ctx.editMessageText(
"🔄 Carteira atualizada",
menu()
);

}


module.exports={
start,
wallet,
deposit,
withdraw,
network,
refresh
};
