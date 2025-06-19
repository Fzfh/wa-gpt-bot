const spamTracker = new Map()
const mutedUsers = new Map()
const muteDuration = 2 * 60 * 1000
const add = require('../commands/add');
// const { handleAutoKick } = require('../commands/auto_kick')
const { handleTopupInput } = require('../core/handler/topupHandler')
const {  handleInvoiceTopupWrapper } = require('../core/handler/invoiceHandler')
const { handlePulsaKuotaInvoice } = require('../core/handler/pulsaHandler')
const { handleMarkPaid } = require('../core/handler/paid')
const { handleStaticCommand } = require('../core/handler/staticCommand')
const { handleCommand } = require('../core/handler/commandHandler')
const tagall = require('../commands/tagall')
const kick = require('../commands/kick')
const menfess = require('../commands/menfess')
const handleWelcome = require('../commands/welcome');
const { adminList, toxicWords } = require('../setting/setting')
const askOpenAI = require('../core/utils/openai')
const { createStickerFromMessage, createStickerFromText } = require('../core/stickerHelper')
const { addInvoice, getInvoiceByMsgId, setPaidByMsgId, getAllInvoices, generateInvoiceId, clearAllInvoices } = require('../core/invoices')
const { listTopup, getHargaFromDB, selectedTopupMap, lastTopupCommandMap } = require('../commands/topup')
const { getProdukDariTabel } = require('../commands/produk')
const { handlePulsa, selectedNominalMap: pulsaNominalMap, lastCommandMap: pulsaCommandMap } = require('../commands/pulsa')
const { handlekouta, selectedKoutaNominalMap, lastKoutaCommandMap } = require('../commands/kouta')
const greetedUsers = new Set()
// const lastCommandMap = new Map()
// const selectedNominalMap = new Map()
const fs = require('fs')
const path = require('path')
const mime = require('mime-types')

async function botFirstResponse({ sock, sender, msg }, options = {}) {
  const botName = options.botBehavior?.botName || 'Bot'
  const botMenu = options.botBehavior?.botMenu || '/menu'
  const greetingText = `Halo! Saya *${botName}* 🤖.\nKetik *${botMenu}* untuk melihat menu yang tersedia yaa~`
  await sock.sendMessage(sender, { text: greetingText }, { quoted: msg })
}

async function handleResponder(sock, msg) {
  try {
    if (!msg.message) return
    const sender = msg.key.remoteJid
    const userId = sender
    const actualUserId =
    msg.key.participant ||
    msg.participant ||
    msg.message?.extendedTextMessage?.contextInfo?.participant ||
    sender
    const isGroup = sender.endsWith('@g.us')

    const content = msg.message?.viewOnceMessageV2?.message || msg.message
    const text =
      content?.conversation ||
      content?.extendedTextMessage?.text ||
      content?.imageMessage?.caption ||
      content?.videoMessage?.caption || ''

    const body = text
    const command = body.trim().split(' ')[0].toLowerCase()
    const args = body.trim().split(' ').slice(1)
    const lowerText = text.toLowerCase()

    if (!text) return;

     const handledStatic = await handleStaticCommand(sock, msg, lowerText, userId)
      if (handledStatic) return

      const handledCommand = await handleCommand(sock, msg, lowerText, userId, sender)
       if (handledCommand) return
       
    // Anti-spam
   // Hanya hitung spam jika dia mengirim command (pakai / atau . di awal)
if (text.startsWith('/') || text.startsWith('.')) {
  const now = Date.now()
  const userSpam = spamTracker.get(userId) || []
  const filtered = userSpam.filter(t => now - t < 10000)
  filtered.push(now)
  spamTracker.set(userId, filtered)

  if (filtered.length > 5 && !adminList.includes(userId)) {
    mutedUsers.set(userId, now + muteDuration)
    return sock.sendMessage(sender, { text: '🔇 Kamu terlalu banyak mengirim command! Bot diam 2 menit.' }, { quoted: msg })
  }
}


    // Sapaan bot
    const botNumber = sock.user.id.split(':')[0]
    const botJid = botNumber.includes('@s.whatsapp.net') ? botNumber : `${botNumber}@s.whatsapp.net`
    const contextInfo = content?.extendedTextMessage?.contextInfo || {}
    const mentionedJids = contextInfo.mentionedJid || []
    const isMentioned = mentionedJids.includes(botJid)

    if ((!isGroup || isMentioned) && !greetedUsers.has(userId)) {
      greetedUsers.add(userId)
      await botFirstResponse({ sock, sender, msg }, {
        botBehavior: { botName: 'AuraBot', botMenu: '/menu' }
      })
    }
    
    const handledPaid = await handleMarkPaid(sock, msg, lowerText, userId, sender, adminList)
    if (handledPaid) return

    const handledTopup = await handleTopupInput(sock, msg, lowerText, userId, sender)
    if (handledTopup) return
    
    const handledInvoice = await handleInvoiceTopupWrapper(sock, msg, lowerText, userId, sender)
    if (handledInvoice) return

    // await handleAutoKick(sock, msg)

    sock.ev.on('group-participants.update', async (update) => {
      await handleWelcome(sock, update);
    });

     const handledMenfess = await menfess(sock, msg, text)
    if (handledMenfess) return
    
    if (!text.startsWith('/')) {
      const handledKouta = await handlekouta(sock, msg)
      if (handledKouta) return

    const handledPulsa = await handlePulsa(sock, msg, lowerText, userId, sender)
      if (handledPulsa) return

    if (text.startsWith('.kick')) {
      return await kick(sock, msg, text, isGroup)
    }

    if (text.startsWith('.tagall')) {
      return await tagall(sock, msg, text, isGroup)
    }

    if (text.startsWith('.add')) {
      return await add(sock, msg, command, args, sender, userId)
    }


    if (lowerText.startsWith('topup')) {
      const args = text.trim().split(/\s+/)
      const game = args[1]?.toLowerCase()
      if (!game) {
        return sock.sendMessage(sender, { text: 'Pilih game:\n- topup ff\n- topup ml\n- topup genshin' }, { quoted: msg })
      }
      return await listTopup(sock, msg, game)
    }

   if (['s', 'sticker'].includes(lowerText)) {
      try {
        const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage
        const hasMediaQuoted = quoted?.imageMessage || quoted?.videoMessage

        const hasMediaDirect = msg.message?.imageMessage || msg.message?.videoMessage
        const caption = msg.message?.imageMessage?.caption || msg.message?.videoMessage?.caption || ''

        // 🧠 Kalau pakai caption langsung "s"
        const captionMatch = ['s', 'sticker'].includes(caption.toLowerCase())

        if (hasMediaQuoted || captionMatch) {
          await createStickerFromMessage(sock, msg)
        } else {
          await sock.sendMessage(sender, {
            text: 'Kirim gambar/video lalu reply dengan "s", atau kirim gambar/video langsung dengan caption "s" atau "sticker"',
          }, { quoted: msg })
        }
      } catch (err) {
        console.error('❌ Gagal buat stiker:', err)
        await sock.sendMessage(sender, { text: 'Ups! Gagal bikin stiker 😖 Coba lagi ya~' }, { quoted: msg })
      }
      return
    }

    if (command === 'stickertext' || command === 'st') {
      if (!args[0]) return sock.sendMessage(sender, { text: 'Ketik: stikertext Halo dunia!' }, { quoted: msg })
      const text = args.join(' ')
      const stickerBuffer = await createStickerFromText(text)
      await sock.sendMessage(sender, { sticker: stickerBuffer }, { quoted: msg })
    }


    if (text.startsWith('.jawab ')) {
      const query = text.slice(7).trim()
      const aiReply = await askOpenAI(query)
      await sock.sendPresenceUpdate('composing', sender) // Typing...
      return sock.sendMessage(sender, { text: aiReply }, { quoted: msg })
    }

    if (text.startsWith('/') && !['/menu', '/reset', '/riwayat', '/clear'].includes(lowerText)) {
      return sock.sendMessage(sender, { text: 'Maaf, aku gak ngerti perintah itu 😵. Coba ketik /menu yaa!' }, { quoted: msg })
    }
    }
  } catch (error) {
    console.error('❌ Error di handleResponder:', error)
  }
}


module.exports = {
  handleResponder,
  greetedUsers,
  botFirstResponse,
  handlePulsa,
  handlekouta,
  selectedNominalMap: selectedKoutaNominalMap,
  lastCommandMap: lastKoutaCommandMap
}
