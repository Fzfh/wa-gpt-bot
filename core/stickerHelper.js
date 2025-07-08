const fs = require('fs');
const path = require('path');
const { tmpdir } = require('os');
const { promisify } = require('util');
const { exec } = require('child_process');
const { v4: uuidv4 } = require('uuid');
const { downloadMediaMessage } = require('@whiskeysockets/baileys');
const { createCanvas, loadImage, registerFont } = require('@napi-rs/canvas');
registerFont(require.resolve('@canvas-fonts/arial-narrow/ArialNarrow.ttf'), {
  family: 'Arial Narrow'
});
const { Sticker, StickerTypes } = require('wa-sticker-formatter');
const twemoji = require('twemoji');
const emojiDir = path.join(process.cwd(), 'media', 'emoji');

if (typeof fetch !== 'function') {
  global.fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));
}

const writeFile = promisify(fs.writeFile);
const readFile = promisify(fs.readFile);

async function createStickerFromMessage(sock, msg) {
  try {
    const messageContent = msg.message;
    const type = Object.keys(messageContent)[0];

    let mediaMessage;
    if (type === 'imageMessage' || type === 'videoMessage') {
      mediaMessage = msg;
    } else if (
      type === 'extendedTextMessage' &&
      messageContent.extendedTextMessage.contextInfo &&
      messageContent.extendedTextMessage.contextInfo.quotedMessage
    ) {
      const quoted = messageContent.extendedTextMessage.contextInfo;
      mediaMessage = {
        key: {
          remoteJid: msg.key.remoteJid,
          id: quoted.stanzaId,
          fromMe: false,
          participant: quoted.participant,
        },
        message: quoted.quotedMessage,
      };
    }

    if (!mediaMessage) throw new Error('❌ Tidak ada media untuk dijadikan stiker.');

    const buffer = await downloadMediaMessage(mediaMessage, 'buffer', {}, {
      logger: sock.logger,
      reuploadRequest: sock,
    });

    const isVideo = type === 'videoMessage' || mediaMessage.message?.videoMessage;
    const stickerBuffer = isVideo
      ? await convertVideoToSticker(buffer)
      : await new Sticker(buffer, {
          pack: 'AuraBot',
          author: 'AURA',
          type: StickerTypes.DEFAULT,
          quality: 70,
        }).toBuffer();

    await sock.sendMessage(msg.key.remoteJid, { sticker: stickerBuffer }, { quoted: msg });

  } catch (err) {
    console.error('❌ Error saat bikin stiker:', err);
    await sock.sendMessage(msg.key.remoteJid, {
      text: 'Gagal bikin stiker 😢. Pastikan kamu kirim gambar/video maksimal 6 detik ya!',
    }, { quoted: msg });
  }
}

async function convertVideoToSticker(buffer) {
  const tempId = uuidv4();
  const inputPath = path.join(tmpdir(), `${tempId}.mp4`);
  const outputPath = path.join(tmpdir(), `${tempId}.webp`);

  try {
    await writeFile(inputPath, buffer);

    const ffmpegCmd = `ffmpeg -i "${inputPath}" -vf "fps=12,scale=iw*min(512/iw\\,512/ih):ih*min(512/iw\\,512/ih):flags=lanczos,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=0x00000000" -ss 0 -t 6 -an -loop 0 -y "${outputPath}"`;

    await execPromise(ffmpegCmd);

    if (!fs.existsSync(outputPath)) throw new Error(`❌ FFmpeg gagal membuat file: ${outputPath}`);

    return await readFile(outputPath);
  } finally {
    cleanupFiles([inputPath, outputPath]);
  }
}



// Fungsi wrap teks di canvas
function wrapText(ctx, text, maxWidth) {
  const words = text.split(' ');
  const lines = [];
  let line = '';
  for (const word of words) {
    const testLine = line + word + ' ';
    const width = ctx.measureText(testLine).width;
    if (width > maxWidth && line) {
      lines.push(line.trim());
      line = word + ' ';
    } else {
      line = testLine;
    }
  }
  if (line) lines.push(line.trim());
  return lines;
}

// 🛠️ ALIGN TENGAH teks sticker
async function createStickerFromText(text) {
  const W = 512, H = 512, fontSize = 44, pad = 30;
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = 'white';
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = 'black';
  ctx.font = `${fontSize}px "Arial Narrow", Arial`;
  ctx.textBaseline = 'top';
  ctx.textAlign = 'left'; // KEMBALI RATA KIRI

  const lines = wrapText(ctx, text, W - pad * 2);
  const lh = fontSize + 18;
  const startY = (H - lines.length * lh) / 2;

  for (let i = 0; i < lines.length; i++) {
    const y = startY + i * lh;
    const parts = twemoji.parse(lines[i]).split(/(<img.*?>)/g).filter(Boolean);
    let x = pad;

    for (const part of parts) {
      if (part.startsWith('<img')) {
        const match = part.match(/alt="([^"]+)"/);
        if (match) {
          const codepoint = twemoji.convert.toCodePoint(match[1]);
          let filePath = path.join(emojiDir, `${codepoint}.png`);

          if (!fs.existsSync(filePath)) {
            const fallbackCode = codepoint.replace(/-fe0f/g, '');
            const fallbackPath = path.join(emojiDir, `${fallbackCode}.png`);
            if (fs.existsSync(fallbackPath)) filePath = fallbackPath;
            else {
              const first = codepoint.split('-')[0];
              const finalFallback = path.join(emojiDir, `${first}.png`);
              if (fs.existsSync(finalFallback)) filePath = finalFallback;
              else {
                ctx.fillText('?', x, y);
                x += fontSize;
                continue;
              }
            }
          }

          try {
            const img = await loadImage(filePath);
            ctx.drawImage(img, x, y + 4, fontSize, fontSize);
            x += fontSize;
          } catch (err) {
            ctx.fillText('?', x, y);
            x += fontSize;
          }
        }
      } else {
        ctx.fillText(part, x, y);
        x += ctx.measureText(part).width;
      }
    }
  }

  const imgBuf = canvas.toBuffer('image/png');
  const sticker = new Sticker(imgBuf, {
    pack: 'AuraBot',
    author: 'AURA',
    type: StickerTypes.DEFAULT,
    quality: 10
  });
  return sticker.toBuffer();
}


function execPromise(command) {
  return new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      if (error) reject(stderr || stdout);
      else resolve(stdout);
    });
  });
}

function cleanupFiles(filePaths) {
  for (const file of filePaths) {
    if (fs.existsSync(file)) fs.unlinkSync(file);
  }
}

module.exports = {
  createStickerFromMessage,
  createStickerFromText,
};
