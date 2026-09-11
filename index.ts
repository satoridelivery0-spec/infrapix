import { Telegraf, Markup } from 'telegraf'
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

// ======================
// IMAGENS (file_id do Telegram)
// ======================
// Envie cada imagem uma vez via curl/sendPhoto, pegue o file_id da resposta
// e cole aqui. Isso evita depender de host externo ou do disco do container.
const IMAGES = {
  main: 'COLE_AQUI_O_FILE_ID_DA_IMAGEM_PRINCIPAL',
  deposito: 'COLE_AQUI_O_FILE_ID_DA_IMAGEM_DE_DEPOSITO'
}

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
  ['💼 CARTEIRA', '🌐 MINHA REDE'],
  ['🔄 ATUALIZAR']
]).resize()

// ======================
// TRATAMENTO GLOBAL DE ERROS
// ======================
// Sem isso, qualquer erro dentro de um handler (bot.start, bot.hears, etc)
// simplesmente desaparece e você não vê nada no console.
bot.catch((err, ctx) => {
  console.error(`Erro no update ${ctx.update.update_id}:`, err)
})

// ======================
// TEMPORÁRIO: descobrir o file_id de uma foto
// ======================
// Mande qualquer foto pro bot no chat do Telegram e ele responde
// com o file_id dela. Depois de pegar os file_ids das suas 2 imagens,
// pode apagar esse bloco inteiro (ou deixar, não atrapalha nada).
bot.on('photo', (ctx) => {
  const photos = ctx.message.photo
  const fileId = photos[photos.length - 1].file_id
  ctx.reply(`file_id desta foto:\n${fileId}`)
})

// ======================
// COMANDO /start
// ======================
bot.start(async (ctx) => {
  try {
    const telegramId = ctx.from.id
    const username = ctx.from.username || null
    const firstName = ctx.from.first_name || ''
    const lastName = ctx.from.last_name || ''

    // Verifica se o usuário já existe
    const { data: existingUser, error: fetchError } = await supabase
      .from('profiles')
      .select('*')
      .eq('telegram_id', telegramId)
      .single()

    if (fetchError && fetchError.code !== 'PGRST116') {
      console.error('Erro ao buscar usuário:', fetchError)
    }

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
      const { error: insertError } = await supabase.from('profiles').insert({
        telegram_id: telegramId,
        username,
        first_name: firstName,
        last_name: lastName,
        sponsor_id: sponsorId
      })

      if (insertError) {
        console.error('Erro ao criar usuário:', insertError)
      }
    }

    // Imagem principal + botões embaixo
    // OBS: parse_mode removido da caption. Se o first_name tiver caracteres
    // como _ * ` [ , o Markdown fica malformado, o Telegram rejeita a
    // mensagem inteira (400 Bad Request) e a foto some junto com o texto.
    await ctx.replyWithPhoto(
      IMAGES.main,
      {
        caption: `Olá, ${firstName}!\n\nBem-vindo à sua carteira.`,
        ...mainKeyboard
      }
    )
  } catch (err) {
    console.error('Erro no /start:', err)
    // Fallback: garante que o usuário recebe pelo menos o menu,
    // mesmo se a foto falhar por algum motivo.
    await ctx.reply(
      `Olá, ${ctx.from.first_name || ''}! Bem-vindo à sua carteira.`,
      mainKeyboard
    ).catch((e) => console.error('Falha até no fallback de texto:', e))
  }
})

// ======================
// BOTÕES DO MENU
// ======================
bot.hears('💰 DEPOSITAR', async (ctx) => {
  try {
    await ctx.replyWithPhoto(
      IMAGES.deposito,
      {
        caption: 'Digite o valor que deseja depositar (ex: 50.00):',
        ...mainKeyboard
      }
    )
  } catch (err) {
    console.error('Erro em DEPOSITAR:', err)
    await ctx.reply('Digite o valor que deseja depositar (ex: 50.00):', mainKeyboard)
  }
})

bot.hears('💸 SACAR', async (ctx) => {
  await ctx.reply('Digite o valor que deseja sacar:', mainKeyboard)
})

bot.hears('💼 CARTEIRA', async (ctx) => {
  try {
    const telegramId = ctx.from.id

    const { data: user, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('telegram_id', telegramId)
      .single()

    if (error || !user) {
      console.error('Erro ao buscar carteira:', error)
      return ctx.reply('Usuário não encontrado.')
    }

    const message = `
💼 *Sua Carteira*

💰 Saldo disponível: R$ ${Number(user.balance).toFixed(2)}
📥 Total depositado: R$ ${Number(user.total_deposited).toFixed(2)}
💸 Total sacado: R$ ${Number(user.total_withdrawn).toFixed(2)}
🎁 Total em comissões: R$ ${Number(user.total_commission).toFixed(2)}

📊 Nível: ${user.level}
⭐ Pontos: ${user.points}
    `

    await ctx.replyWithMarkdown(message, mainKeyboard)
  } catch (err) {
    console.error('Erro em CARTEIRA:', err)
    await ctx.reply('Ocorreu um erro ao buscar sua carteira. Tente novamente.', mainKeyboard)
  }
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
