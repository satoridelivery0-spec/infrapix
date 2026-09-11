import { Telegraf, Markup } from 'telegraf'
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

// ======================
// CONFIGURAÇÕES
// ======================
const bot = new Telegraf(process.env.BOT_TOKEN as string)

const supabase = createClient(
  process.env.SUPABASE_URL as string,
  process.env.SUPABASE_KEY as string
)

// ======================
// TECLADO PRINCIPAL
// ======================
const mainKeyboard = Markup.keyboard([
  ['💰 DEPOSITAR', '💸 SACAR'],
  ['👛 CARTEIRA', '🌐 MINHA REDE'],
  ['🔄 ATUALIZAR']
]).resize()

// ======================
// COMANDO /start
// ======================
bot.start(async (ctx) => {
  const telegramId = ctx.from.id
  const username = ctx.from.username || null
  const firstName = ctx.from.first_name || ''
  const lastName = ctx.from.last_name || ''

  // Verifica se o usuário já existe
  const { data: existingUser } = await supabase
    .from('profiles')
    .select('*')
    .eq('telegram_id', telegramId)
    .single()

  if (!existingUser) {
    // Pega o sponsor se veio por link de indicação
    const startPayload = ctx.startPayload
    let sponsorId = null

    if (startPayload) {
      const { data: sponsor } = await supabase
        .from('profiles')
        .select('id')
        .eq('telegram_id', Number(startPayload))
        .single()

      if (sponsor) sponsorId = sponsor.id
    }

    // Cria o usuário
    await supabase.from('profiles').insert({
      telegram_id: telegramId,
      username,
      first_name: firstName,
      last_name: lastName,
      sponsor_id: sponsorId
    })
  }

  // Imagem principal + botões embaixo
  await ctx.replyWithPhoto(
    'https://i.imgur.com/Sj7h6e5.png',
    {
      caption: `Olá, ${firstName}!\n\nBem-vindo à sua carteira.`,
      parse_mode: 'Markdown',
      ...mainKeyboard
    }
  )
})

// ======================
// BOTÕES DO MENU
// ======================
bot.hears('💰 DEPOSITAR', async (ctx) => {
  await ctx.replyWithPhoto(
    'https://i.imgur.com/rPRF70K.png',
    {
      caption: 'Digite o valor que deseja depositar (ex: 50.00):',
      ...mainKeyboard
    }
  )
})

bot.hears('💸 SACAR', async (ctx) => {
  await ctx.reply('Digite o valor que deseja sacar:', mainKeyboard)
})

bot.hears('👛 CARTEIRA', async (ctx) => {
  const telegramId = ctx.from.id

  const { data: user } = await supabase
    .from('profiles')
    .select('*')
    .eq('telegram_id', telegramId)
    .single()

  if (!user) return ctx.reply('Usuário não encontrado.')

  const message = `
👛 *Sua Carteira*

💰 Saldo disponível: R$ ${Number(user.balance).toFixed(2)}
📥 Total depositado: R$ ${Number(user.total_deposited).toFixed(2)}
💸 Total sacado: R$ ${Number(user.total_withdrawn).toFixed(2)}
🎁 Total em comissões: R$ ${Number(user.total_commission).toFixed(2)}

📊 Nível: ${user.level}
⭐ Pontos: ${user.points}
  `

  await ctx.replyWithMarkdown(message, mainKeyboard)
})

bot.hears('🌐 MINHA REDE', async (ctx) => {
  await ctx.reply('Sua rede aparecerá aqui em breve...', mainKeyboard)
})

bot.hears('🔄 ATUALIZAR', async (ctx) => {
  await ctx.reply('Dados atualizados!', mainKeyboard)
})

// ======================
// INICIAR O BOT
// ======================
bot.launch()
console.log('Bot rodando...')

process.once('SIGINT', () => bot.stop('SIGINT'))
process.once('SIGTERM', () => bot.stop('SIGTERM'))
