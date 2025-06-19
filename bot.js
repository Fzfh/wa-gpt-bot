const {
  default: makeWASocket,
  useMultiFileAuthState,
  makeCacheableSignalKeyStore,
  fetchLatestBaileysVersion,
  DisconnectReason
} = require('@whiskeysockets/baileys')

const P = require('pino')
const qrcode = require('qrcode-terminal')
const fs = require('fs')
const chalk = require('chalk')
const { handleResponder } = require('./core/botresponse')
const tampilkanBanner = require('./core/utils/tampilanbanner')

function extractMessageContent(msg) {
  const isViewOnce = !!msg.message?.viewOnceMessageV2
  const realMsg = isViewOnce ? msg.message.viewOnceMessageV2.message : msg.message
  const text =
    realMsg?.conversation ||
    realMsg?.extendedTextMessage?.text ||
    realMsg?.imageMessage?.caption ||
    realMsg?.videoMessage?.caption ||
    ''
  return { text, realMsg }
}

async function startBot() {
  try {
    const { state, saveCreds } = await useMultiFileAuthState('./auth_info')
    const { version } = await fetchLatestBaileysVersion()

    const sock = makeWASocket({
      logger: P({ level: 'silent' }),
      version,
      auth: {
        creds: state.creds,
        keys: makeCacheableSignalKeyStore(state.keys, P({ level: 'silent' }))
      }
    })

    sock.ev.on('creds.update', saveCreds)

    sock.ev.on('connection.update', (update) => {
      const { connection, lastDisconnect, qr } = update

      if (qr) {
        console.log(chalk.yellowBright('\n🔌 Silakan scan QR ini untuk login:\n'))
        qrcode.generate(qr, { small: false }) // QR besar dan jelas
      }

      if (connection === 'close') {
        const reason = lastDisconnect?.error?.output?.statusCode
        if (reason === DisconnectReason.loggedOut) {
          fs.rmSync('./auth_info', { recursive: true, force: true })
          console.log(chalk.redBright('\n❌ Logout terdeteksi. Restarting...\n'))
          setTimeout(startBot, 1000)
        } else {
          console.log(chalk.redBright('\n❌ Koneksi terputus. Mencoba ulang...\n'))
          setTimeout(startBot, 3000)
        }
      } else if (connection === 'open') {
        console.log(chalk.greenBright('\n✅ Bot berhasil terhubung ke WhatsApp!'))
        console.log(chalk.cyanBright('✨ Siap menerima perintah, sayang~ 💬\n'))
      }
    })

    sock.ev.on('messages.upsert', async ({ messages, type }) => {
      if (!messages || type !== 'notify') return
      const msg = messages[0]
      if (!msg.message) return

      const sender = msg.key.remoteJid
      const { text, realMsg } = extractMessageContent(msg)
      console.log(chalk.magenta(`📩 Pesan dari ${sender}: ${text}`))

      try {
        msg.message = realMsg
        await handleResponder(sock, msg)
      } catch (e) {
        console.error(chalk.red('❌ Error di handleResponder:'), e)
      }
    })
  } catch (err) {
    console.error(chalk.bgRed('🔥 Gagal memulai bot:'), err)
  }
}

tampilkanBanner()
startBot()
