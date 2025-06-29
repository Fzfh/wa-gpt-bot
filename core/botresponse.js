const spamTracker = new Map()
const mutedUsers = new Map()
const memoryMap = new Map()
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
const { handlePulsa, selectedPulsaMap, lastPulsaMap } = require('../commands/pulsa')
const { handlekouta, selectedKoutaMap, lastKoutaMap } = require('../commands/kouta')
const sessionMap = require('../core/sessionStore');
const hapusProduk = require('../commands/hapusProduk');
const tambahProduk = require('../commands/tambahProduk');
const downloadTiktok = require('../commands/tiktokDownloader');
const downloadInstagram = require('../commands/igDownloader');
const downloadYouTubeMP3 = require('../commands/youtubeDownloader');;
const sendAll = require('../commands/sendAll');

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
    const from = sender
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

     const handledStatic = await handleStaticCommand(sock, msg, lowerText, userId, from, body)
      if (handledStatic) return

      const handledCommand = await handleCommand(sock, msg, lowerText, userId, from, body, sender)
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
    const isMentionedToBot = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.includes(botJid)
    const isReplyToBot = contextInfo?.quotedMessage && (contextInfo?.participant === botJid || contextInfo?.remoteJid === botJid)
    const isPrivate = !sender.endsWith('@g.us')

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

     const handledMenfess = await menfess(sock, msg, text)
    if (handledMenfess) return

      const handledkouta = await handlekouta(sock, msg, lowerText, userId, sender)
      if (handledkouta) return

    const handledPulsa = await handlePulsa(sock, msg, lowerText, userId, sender)
      if (handledPulsa) return

    if (body.startsWith('.sendAll')) {
      const pesan = body.split(' ').slice(1).join(' ');
      if (!pesan) return sock.sendMessage(from, { text: '❌ Format: .sendAll isi pesan' }, { quoted: msg });
    
      await sock.sendMessage(from, { text: '🔄 Mengirim ke semua kontak yang 1 grup...' }, { quoted: msg });
      await sendAll(sock, sender, pesan);
      await sock.sendMessage(from, { text: '✅ Pesan berhasil dikirim!' }, { quoted: msg });
    }

// if (text.startsWith('.dyt ')) {
//   const url = text.split('.dyt ')[1].trim();
//   try {
//     await sock.sendMessage(from, { text: '🔄 Sedang mengunduh video dari YouTube...' }, { quoted: msg })
//     const { filePath, title } = await downloadYouTubeVideo(url, 'video');
//     await sock.sendMessage(from, {
//       video: { url: filePath },
//       caption: `🎥 ${title}`
//     }, { quoted: msg });
//     fs.unlinkSync(filePath);
//   } catch (e) {
//     await sock.sendMessage(from, { text: '❌ Gagal download video!\n' + e.message }, { quoted: msg });
//   }
// }

if (text.startsWith('.dyts ')) {
  const url = text.split('.dyts ')[1].trim();
  try {
    await sock.sendMessage(from, { text: '🎧 Mengunduh audio dari YouTube...' }, { quoted: msg });
    const { filePath, title } = await downloadYouTubeMP3(url);
    await sock.sendMessage(from, {
      audio: { url: filePath },
      mimetype: 'audio/mp4',
      ptt: false
    }, { quoted: msg });
    fs.unlinkSync(filePath);
  } catch (e) {
    console.error('❌ Gagal download audio:', e);
    await sock.sendMessage(from, { text: `❌ Gagal download audio:\n${e.message}` }, { quoted: msg });
  }
}




    
    if (text.startsWith('.d ')) {
       const link = text.split(' ')[1]
          
       if (!link || !link.includes('tiktok.com')) {
         
          await sock.sendMessage(from, { text: '❌ Link TikTok tidak valid!' }, { quoted: msg })
          return
        }
          await sock.sendMessage(from, { text: '⏳ Sedang mengunduh video TikTok...' }, { quoted: msg })
          
          try {
           const result = await downloadTiktok(link)
            if (!result || !result.videoUrl) {
               await sock.sendMessage(from, { text: '❌ Gagal mengunduh video TikTok.' }, { quoted: msg })
              return
            }
          
              await sock.sendMessage(from, {
                video: { url: result.videoUrl }
              }, { quoted: msg })
            } catch (e) {
              console.error('❌ Error TikTok:', e)
              await sock.sendMessage(from, { text: '⚠️ Terjadi kesalahan saat mengunduh TikTok.' }, { quoted: msg })
            }
          
            return
          }
      
          if (text.startsWith('.ds ')) {
        const link = text.split(' ')[1]
      
        if (!link || !link.includes('tiktok.com')) {
          await sock.sendMessage(from, { text: '❌ Link TikTok tidak valid!' }, { quoted: msg })
          return
        }
      
        await sock.sendMessage(from, { text: '🎧 Mengunduh sound TikTok...' }, { quoted: msg })
      
        try {
          const result = await downloadTiktok(link)
          if (!result || !result.musicUrl) {
            await sock.sendMessage(from, { text: '❌ Gagal mengunduh sound.' }, { quoted: msg })
            return
          }
      
          await sock.sendMessage(from, {
            audio: { url: result.musicUrl },
            mimetype: 'audio/mp4'
          }, { quoted: msg })
        } catch (e) {
          console.error('❌ Error:', e)
          await sock.sendMessage(from, { text: '⚠️ Error saat unduh sound.' }, { quoted: msg })
        }
      
        return
      }

    if (text.startsWith('.df ')) {
      const link = text.split(' ')[1];
    
      if (!link || !link.includes('tiktok.com')) {
        await sock.sendMessage(from, { text: '❌ Link TikTok tidak valid!' }, { quoted: msg });
        return;
      }

      await sock.sendMessage(from, { text: '📷 Mengunduh foto TikTok...' }, { quoted: msg });

      try {
        const result = await downloadTiktok(link);
    
        if (!result || !result.isPhoto || result.images.length === 0) {
          await sock.sendMessage(from, { text: '❌ Gagal mengunduh foto TikTok.' }, { quoted: msg });
          return;
        }
    
        // Kirim sebagai album (jika mendukung)
        for (const imageUrl of result.images) {
          await sock.sendMessage(from, {
            image: { url: imageUrl }
          }, { quoted: msg });
        }
      } catch (e) {
        console.error('❌ Error TikTok Foto:', e);
        await sock.sendMessage(from, { text: '⚠️ Terjadi kesalahan saat mengunduh foto TikTok.' }, { quoted: msg });
      }
    
      return;
    }


        if (text.startsWith('.dig ')) {
      const link = text.split(' ')[1];
    
      if (!link || !link.includes('instagram.com')) {
        await sock.sendMessage(from, { text: '❌ Link Instagram tidak valid!' }, { quoted: msg });
        return;
      }
    
      await sock.sendMessage(from, { text: '⏳ Sedang mengunduh video Instagram...' }, { quoted: msg });
    
      try {
        const result = await downloadInstagram(link);
        if (!result || !result.videoUrl) {
          await sock.sendMessage(from, { text: '❌ Gagal mengunduh video Instagram.' }, { quoted: msg });
          return;
        }
    
        await sock.sendMessage(from, {
          video: { url: result.videoUrl }
        }, { quoted: msg });
      } catch (e) {
        console.error('❌ Error IG:', e);
        await sock.sendMessage(from, { text: '⚠️ Terjadi kesalahan saat mengunduh Instagram.' }, { quoted: msg });
      }
    
      return;
    }
    
    if (!text.startsWith('/')) {
    const sesi = sessionMap.get(sender);

    if (sesi && sesi.type === 'hapus') {
      return await hapusProduk(sock, msg, from, body);
    }

    if (sesi && sesi.type === 'tambah') {
      return await tambahProduk(sock, msg, from, body);
    }
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

        // Kalau pakai caption langsung "s"
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

    if (text === '.reset') {
      memoryMap.delete(sender)
      return sock.sendMessage(sender, { text: 'Ingatan AuraBot Telah Direset, Ayo Buat Obrolan Baru!' })
    }


    if (text.startsWith('/') && !['/menu', '/reset', '/riwayat', '/clear'].includes(lowerText)) {
      return sock.sendMessage(sender, { text: 'Maaf, aku gak ngerti perintah itu 😵. Coba ketik /menu yaa!' }, { quoted: msg })
    }
  }
      
    if (isMentionedToBot || isMentioned || isReplyToBot || isPrivate) {
      const query =
        msg.message?.conversation ||
        msg.message?.extendedTextMessage?.text ||
        msg.message?.extendedTextMessage?.contextInfo?.quotedMessage?.conversation || ''
    
      if (query?.trim()) {
        await sock.sendPresenceUpdate('composing', sender)
    
        const history = memoryMap.get(userId) || []
        history.push({ role: 'user', content: query })
    
        const aiReply = await askOpenAI(history)
        history.push({ role: 'assistant', content: aiReply })
        memoryMap.set(userId, history.slice(-15))
    
        return sock.sendMessage(sender, { text: aiReply }, { quoted: msg })
      }
    }

  } catch (error) {
    console.error('❌ Error di handleResponder:', error)
  }
}

let groupUpdateListenerRegistered = false

function registerGroupUpdateListener(sock) {
  if (groupUpdateListenerRegistered) return
  groupUpdateListenerRegistered = true

  sock.ev.removeAllListeners('group-participants.update')
  sock.ev.on('group-participants.update', async (update) => {
    await handleWelcome(sock, update)
  })

  console.log('[✅] Listener grup berhasil didaftarkan')
}


module.exports = {
  handleResponder,
  greetedUsers,
  botFirstResponse,
  handlePulsa,
  handlekouta,
  // selectedPulsaMap,
  // lastPulsaMap,
  selectedKoutaMap,
  lastKoutaMap,
  registerGroupUpdateListener
}
