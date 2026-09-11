import { Telegraf, Markup } from 'telegraf'
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

// ======================================================
// IMAGENS - FILE_ID DO TELEGRAM
// ======================================================

const IMAGES = {
  main:
    'AgACAgEAAxkBAAMFaqQCX19z81DHg55oFoesxPFnISYAAn0MaxshpSBF7ZZ6qUIO-DgBAAMCAAN5AAM9BA',

  deposito:
    'AgACAgEAAxkBAAMHaqQCbgGnOFF0ep3CF4Hx4MdJvQwAAn4MaxshpSBF LN9UpxJ_sO4BAAMCAAN5AAM9BA'
}

// ======================================================
// CONFIGURAÇÕES
// ======================================================

const bot = new Telegraf(process.env.BOT_TOKEN as string)

const supabase = createClient(
  process.env.SUPABASE_URL as string,
  process.env.SUPABASE_KEY as string
)

// ======================================================
// MENU PRINCIPAL - BOTÕES DENTRO DA MENSAGEM
// ======================================================

const mainKeyboard = Markup.inlineKeyboard([
  [
    Markup.button.callback('💰 DEPOSITAR', 'depositar'),
    Markup.button.callback('💸 SACAR', 'sacar')
  ],
  [
    Markup.button.callback('💼 CARTEIRA', 'carteira'),
    Markup.button.callback('🌐 MINHA REDE', 'minha_rede')
  ],
  [
    Markup.button.callback('🔄 ATUALIZAR', 'atualizar')
  ]
])

// ======================================================
// BOTÕES DA CARTEIRA
// ======================================================

const carteiraKeyboard = Markup.inlineKeyboard([
  [
    Markup.button.callback('📜 HISTÓRICO', 'historico'),
    Markup.button.callback('🤝 AFILIADOS', 'afiliados')
  ],
  [
    Markup.button.callback('🧾 VER TAXAS', 'ver_taxas'),
    Markup.button.callback('🕵️ TRANSPARÊNCIA', 'transparencia')
  ],
  [
    Markup.button.callback('↩️ VOLTAR', 'voltar')
  ]
])

// ======================================================
// TRATAMENTO GLOBAL DE ERROS
// ======================================================

bot.catch((err, ctx) => {
  console.error(
    `Erro no update ${ctx.update.update_id}:`,
    err
  )
})

// ======================================================
// TEMPORÁRIO - PEGAR FILE_ID DAS FOTOS
// ======================================================

bot.on('photo', async (ctx) => {
  try {
    const photos = ctx.message.photo

    const fileId = photos[photos.length - 1].file_id

    await ctx.reply(`file_id desta foto:\n${fileId}`)
  } catch (err) {
    console.error('Erro ao pegar file_id:', err)
  }
})

// ======================================================
// /START
// ======================================================

bot.start(async (ctx) => {
  try {
    const telegramId = ctx.from.id
    const username = ctx.from.username || null
    const firstName = ctx.from.first_name || ''
    const lastName = ctx.from.last_name || ''

    // --------------------------------------------------
    // PROCURA USUÁRIO
    // --------------------------------------------------

    const { data: existingUser, error: fetchError } =
      await supabase
        .from('profiles')
        .select('*')
        .eq('telegram_id', telegramId)
        .single()

    if (
      fetchError &&
      fetchError.code !== 'PGRST116'
    ) {
      console.error(
        'Erro ao buscar usuário:',
        fetchError
      )
    }

    // --------------------------------------------------
    // CRIA USUÁRIO SE NÃO EXISTIR
    // --------------------------------------------------

    if (!existingUser) {
      const startPayload = ctx.startPayload

      let sponsorId = null

      if (startPayload) {
        const { data: sponsor } = await supabase
          .from('profiles')
          .select('id')
          .eq(
            'telegram_id',
            Number(startPayload)
          )
          .single()

        if (sponsor) {
          sponsorId = sponsor.id
        }
      }

      const { error: insertError } =
        await supabase
          .from('profiles')
          .insert({
            telegram_id: telegramId,
            username,
            first_name: firstName,
            last_name: lastName,
            sponsor_id: sponsorId
          })

      if (insertError) {
        console.error(
          'Erro ao criar usuário:',
          insertError
        )
      }
    }

    // --------------------------------------------------
    // ENVIA IMAGEM PRINCIPAL
    // --------------------------------------------------

    await ctx.replyWithPhoto(
      IMAGES.main,
      {
        caption:
          `Olá, ${firstName}!\n\n` +
          `💼 Bem-vindo à sua carteira.\n\n` +
          `👇 Escolha uma opção:`,
        ...mainKeyboard
      }
    )

  } catch (err) {
    console.error(
      'Erro no /start:',
      err
    )

    // Fallback caso a imagem dê erro
    await ctx.reply(
      `Olá, ${ctx.from.first_name || ''}!\n\n` +
      `💼 Bem-vindo à sua carteira.\n\n` +
      `👇 Escolha uma opção:`,
      mainKeyboard
    )
  }
})

// ======================================================
// 💰 DEPOSITAR
// ======================================================

bot.action('depositar', async (ctx) => {
  try {
    await ctx.answerCbQuery()

    await ctx.replyWithPhoto(
      IMAGES.deposito,
      {
        caption:
          '💰 *Depósito*\n\n' +
          'Digite o valor que deseja depositar.\n\n' +
          'Exemplo: `50.00`',

        parse_mode: 'Markdown',

        ...mainKeyboard
      }
    )

  } catch (err) {
    console.error(
      'Erro em DEPOSITAR:',
      err
    )

    await ctx.reply(
      '💰 Digite o valor que deseja depositar.\n\n' +
      'Exemplo: 50.00',
      mainKeyboard
    )
  }
})

// ======================================================
// 💸 SACAR
// ======================================================

bot.action('sacar', async (ctx) => {
  try {
    await ctx.answerCbQuery()

    await ctx.reply(
      '💸 *Saque*\n\n' +
      'Digite o valor que deseja sacar.',
      {
        parse_mode: 'Markdown',
        ...mainKeyboard
      }
    )

  } catch (err) {
    console.error(
      'Erro em SACAR:',
      err
    )
  }
})

// ======================================================
// 💼 CARTEIRA
// ======================================================

bot.action('carteira', async (ctx) => {
  try {
    await ctx.answerCbQuery()

    const telegramId = ctx.from.id

    const { data: user, error } =
      await supabase
        .from('profiles')
        .select('*')
        .eq(
          'telegram_id',
          telegramId
        )
        .single()

    if (error || !user) {
      console.error(
        'Erro ao buscar carteira:',
        error
      )

      return ctx.reply(
        'Usuário não encontrado.',
        mainKeyboard
      )
    }

    const balance =
      Number(user.balance || 0).toFixed(2)

    const deposited =
      Number(user.total_deposited || 0).toFixed(2)

    const withdrawn =
      Number(user.total_withdrawn || 0).toFixed(2)

    const commission =
      Number(user.total_commission || 0).toFixed(2)

    const message =
      `💼 *Sua Carteira Digital*\n` +
      `━━━━━━━━━━━━━━━━━━━━\n\n` +

      `👤 *${user.username || ctx.from.first_name || 'Usuário'}*\n` +
      `🆔 ${telegramId}\n\n` +

      `💰 *Saldo Atual:* R$ ${balance}\n\n` +

      `📊 *Resumo Financeiro*\n` +
      `📥 Depositado: R$ ${deposited}\n` +
      `📤 Sacado: R$ ${withdrawn}\n` +
      `💸 Comissões: R$ ${commission}\n\n` +

      `━━━━━━━━━━━━━━━━━━━━\n\n` +
      `👇 *Escolha uma opção:*`

    await ctx.reply(
      message,
      {
        parse_mode: 'Markdown',
        ...carteiraKeyboard
      }
    )

  } catch (err) {
    console.error(
      'Erro em CARTEIRA:',
      err
    )

    await ctx.reply(
      'Ocorreu um erro ao buscar sua carteira.',
      mainKeyboard
    )
  }
})

// ======================================================
// 🌐 MINHA REDE
// ======================================================

bot.action('minha_rede', async (ctx) => {
  try {
    await ctx.answerCbQuery()

    await ctx.reply(
      '🌐 *Minha Rede*\n\n' +
      'Sua rede de afiliados aparecerá aqui.',
      {
        parse_mode: 'Markdown',
        ...mainKeyboard
      }
    )

  } catch (err) {
    console.error(
      'Erro em MINHA REDE:',
      err
    )
  }
})

// ======================================================
// 🔄 ATUALIZAR
// ======================================================

bot.action('atualizar', async (ctx) => {
  try {
    await ctx.answerCbQuery(
      'Dados atualizados!'
    )

    await ctx.reply(
      '🔄 *Dados atualizados!*\n\n' +
      'Sua carteira foi atualizada.',
      {
        parse_mode: 'Markdown',
        ...mainKeyboard
      }
    )

  } catch (err) {
    console.error(
      'Erro em ATUALIZAR:',
      err
    )
  }
})

// ======================================================
// 📜 HISTÓRICO
// ======================================================

bot.action('historico', async (ctx) => {
  try {
    await ctx.answerCbQuery()

    await ctx.reply(
      '📜 *Histórico*\n\n' +
      'Seu histórico de movimentações aparecerá aqui.',
      {
        parse_mode: 'Markdown',
        ...carteiraKeyboard
      }
    )

  } catch (err) {
    console.error(
      'Erro em HISTÓRICO:',
      err
    )
  }
})

// ======================================================
// 🤝 AFILIADOS
// ======================================================

bot.action('afiliados', async (ctx) => {
  try {
    await ctx.answerCbQuery()

    await ctx.reply(
      '🤝 *Afiliados*\n\n' +
      'Aqui você poderá acompanhar sua rede e suas comissões.',
      {
        parse_mode: 'Markdown',
        ...carteiraKeyboard
      }
    )

  } catch (err) {
    console.error(
      'Erro em AFILIADOS:',
      err
    )
  }
})

// ======================================================
// 🧾 VER TAXAS
// ======================================================

bot.action('ver_taxas', async (ctx) => {
  try {
    await ctx.answerCbQuery()

    await ctx.reply(
      '🧾 *Taxas da Plataforma*\n\n' +
      'As taxas aplicáveis serão exibidas aqui.\n\n' +
      'As taxas são aplicadas automaticamente no momento da operação.',
      {
        parse_mode: 'Markdown',
        ...carteiraKeyboard
      }
    )

  } catch (err) {
    console.error(
      'Erro em VER TAXAS:',
      err
    )
  }
})

// ======================================================
// 🕵️ TRANSPARÊNCIA
// ======================================================

bot.action('transparencia', async (ctx) => {
  try {
    await ctx.answerCbQuery()

    await ctx.reply(
      '🕵️ *Transparência*\n\n' +
      'Todas as movimentações da sua carteira podem ser consultadas através do histórico.',
      {
        parse_mode: 'Markdown',
        ...carteiraKeyboard
      }
    )

  } catch (err) {
    console.error(
      'Erro em TRANSPARÊNCIA:',
      err
    )
  }
})

// ======================================================
// ↩️ VOLTAR
// ======================================================

bot.action('voltar', async (ctx) => {
  try {
    await ctx.answerCbQuery()

    await ctx.replyWithPhoto(
      IMAGES.main,
      {
        caption:
          `Olá, ${ctx.from.first_name || ''}!\n\n` +
          `💼 Bem-vindo à sua carteira.\n\n` +
          `👇 Escolha uma opção:`,
        ...mainKeyboard
      }
    )

  } catch (err) {
    console.error(
      'Erro em VOLTAR:',
      err
    )
  }
})

// ======================================================
// INICIAR BOT
// ======================================================

bot.launch()

console.log('🤖 InfraPix bot rodando...')

// ======================================================
// ENCERRAMENTO
// ======================================================

process.once(
  'SIGINT',
  () => bot.stop('SIGINT')
)

process.once(
  'SIGTERM',
  () => bot.stop('SIGTERM')
)
