// bot.js
const {
  default: makeWASocket,
  useMultiFileAuthState,
  makeCacheableSignalKeyStore,
  fetchLatestBaileysVersion,
  DisconnectReason,
} = require('@whiskeysockets/baileys');

const express = require('express');
const fs = require('fs');
const P = require('pino');
const qrcode = require('qrcode');
const chalk = require('chalk');

const { handleResponder, registerGroupUpdateListener } = require('./core/botresponse');
const tampilkanBanner = require('./core/utils/tampilanbanner');

const app = express();
const PORT = 3000;

// Delay util
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

function extractMessageContent(msg) {
  const isViewOnce = !!msg.message?.viewOnceMessageV2;
  const realMsg = isViewOnce ? msg.message.viewOnceMessageV2.message : msg.message;
  const text =
    realMsg?.conversation ||
    realMsg?.extendedTextMessage?.text ||
    realMsg?.imageMessage?.caption ||
    realMsg?.videoMessage?.caption ||
    '';
  return { text, realMsg };
}

async function startBot() {
  try {
    const { state, saveCreds } = await useMultiFileAuthState('./auth_info');
    const { version } = await fetchLatestBaileysVersion();

    const sock = makeWASocket({
      logger: P({ level: 'silent' }),
      version,
      auth: {
        creds: state.creds,
        keys: makeCacheableSignalKeyStore(state.keys, P({ level: 'silent' })),
      },
    });

    // Simpan kredensial saat berubah
    sock.ev.on('creds.update', saveCreds);

    // Pasang listener group-participants.update sekali per socket instance
    registerGroupUpdateListener(sock);

    sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        console.log(chalk.yellowBright('\n🔌 Scan QR ini untuk login:\n'));
        qrcode.toDataURL(qr, (err, url) => {
          if (err) return console.error('❌ Gagal buat QR ke HTML:', err);
          const html = `
            <html><body style="text-align:center;font-family:sans-serif;">
              <h2>Silakan Scan QR WA Kamu</h2>
              <img src="${url}" style="width:300px;" />
            </body></html>`;
          fs.writeFileSync('./qr.html', html);
        });
      }

      if (connection === 'close') {
        const reason = lastDisconnect?.error?.output?.statusCode;
        if (reason === DisconnectReason.loggedOut) {
          fs.rmSync('./auth_info', { recursive: true, force: true });
          console.log(chalk.redBright('\n❌ Logout terdeteksi. Restarting...\n'));
          setTimeout(startBot, 1000);
        } else {
          console.log(chalk.redBright('\n❌ Koneksi terputus. Mencoba ulang...\n'));
          setTimeout(startBot, 3000);
        }
      } else if (connection === 'open') {
        console.log(chalk.greenBright('\n✅ Bot berhasil terhubung ke WhatsApp!'));
        console.log(chalk.cyanBright('✨ Siap menerima perintah, Auraa sayang~ 💬\n'));
      }
    });

    sock.ev.on('messages.upsert', async ({ messages, type }) => {
      if (!messages || type !== 'notify') return;
      const msg = messages[0];
      if (!msg.message) return;

      // Skip pesan dari bot sendiri
      if (msg.key.fromMe) return;

      const { text, realMsg } = extractMessageContent(msg);

      if (!text || text.trim() === '') return;

      const remoteJid = msg.key.remoteJid;
      console.log(chalk.magenta(`📩 Pesan masuk dari ${remoteJid}: "${text}"`));

      try {
        msg.message = realMsg;
        // Delay singkat untuk mengurangi kemungkinan spam loop
        await delay(300);
        await handleResponder(sock, msg);
      } catch (e) {
        const errMsg = e?.message || '';
        if (errMsg.toLowerCase().includes('stale open session')) {
          console.warn(chalk.yellow(`⚠️ Detected stale session untuk ${remoteJid}, skip balasan.`));
        } else {
          console.error(chalk.red('❌ Error di handleResponder:'), e);
        }
      }
    });
  } catch (err) {
    console.error(chalk.bgRed('🔥 Gagal memulai bot:'), err);
  }
}

// Hanya satu route /qr
app.get('/qr', (req, res) => {
  if (fs.existsSync('./qr.html')) {
    const qrHtml = fs.readFileSync('./qr.html', 'utf8');
    res.send(qrHtml);
  } else {
    res.send('⚠️ QR belum tersedia. Tunggu sebentar...');
  }
});

app.listen(PORT, '0.0.0.0', () =>
  console.log(chalk.cyanBright(`🌐 Web server aktif di http://localhost:${PORT} dan /qr untuk scan`))
);

tampilkanBanner();
startBot();
