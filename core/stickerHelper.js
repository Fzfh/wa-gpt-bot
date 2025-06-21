const fs = require('fs');
const path = require('path');
const { tmpdir } = require('os');
const { promisify } = require('util');
const { exec } = require('child_process');
const { v4: uuidv4 } = require('uuid');
const { downloadMediaMessage } = require('@whiskeysockets/baileys');
const { createCanvas, loadImage } = require('@napi-rs/canvas')
const { Sticker, StickerTypes } = require('wa-sticker-formatter');
const twemoji = require('twemoji');
// const { StickerTypes, Sticker } = require('wa-sticker-formatter');
// const Jimp = require('jimp');

const writeFile = promisify(fs.writeFile);
const readFile = promisify(fs.readFile);

// === Stiker Gambar/Video ===
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
      const quotedMsg = {
        key: {
          remoteJid: msg.key.remoteJid,
          id: quoted.stanzaId,
          fromMe: false,
          participant: quoted.participant,
        },
        message: quoted.quotedMessage,
      };

      if (
        quoted.quotedMessage.imageMessage ||
        quoted.quotedMessage.videoMessage
      ) {
        mediaMessage = quotedMsg;
      }
    }

    if (!mediaMessage) {
      throw new Error('❌ Tidak ada media untuk dijadikan stiker.');
    }

    const buffer = await downloadMediaMessage(mediaMessage, 'buffer', {}, {
      logger: sock.logger,
      reuploadRequest: sock,
    });

    const isVideo = type === 'videoMessage' || mediaMessage.message?.videoMessage;
    let stickerBuffer;

    if (isVideo) {
      stickerBuffer = await convertVideoToSticker(buffer);
    } else {
      const sticker = new Sticker(buffer, {
        pack: 'AuraBot',
        author: 'AURA',
        type: StickerTypes.DEFAULT,
        quality: 70,
      });
      stickerBuffer = await sticker.toBuffer();
    }

    await sock.sendMessage(msg.key.remoteJid, {
      sticker: stickerBuffer,
    }, { quoted: msg });

  } catch (err) {
    console.error('❌ Error saat bikin stiker:', err);
    await sock.sendMessage(msg.key.remoteJid, {
      text: 'Gagal bikin stiker 😢. Pastikan kamu kirim gambar/video maksimal 6 detik ya!',
    }, { quoted: msg });
  }
}

// === Konversi Video ke Stiker ===
async function convertVideoToSticker(buffer) {
  const tempId = uuidv4();
  const inputPath = path.join(tmpdir(), `${tempId}.mp4`);
  const outputPath = path.join(tmpdir(), `${tempId}.webp`);

  try {
    await writeFile(inputPath, buffer);

    const safeInput = `"${inputPath.replace(/\\/g, "/")}"`;
    const safeOutput = `"${outputPath.replace(/\\/g, "/")}"`;

    const ffmpegCmd = `ffmpeg -i ${safeInput} -vf "scale=320:320:force_original_aspect_ratio=decrease,pad=320:320:(ow-iw)/2:(oh-ih)/2:color=black,fps=10" -ss 0 -t 6 -an -loop 0 -y ${safeOutput}`;

    await execPromise(ffmpegCmd);

    if (!fs.existsSync(outputPath)) {
      throw new Error(`❌ FFmpeg gagal membuat file: ${outputPath}`);
    }

    const stickerBuffer = await readFile(outputPath);
    return stickerBuffer;

  } catch (err) {
    console.error('❌ Gagal konversi video ke sticker:', err);
    throw err;
  } finally {
    cleanupFiles([inputPath, outputPath]);
  }
}

function wrapText(ctx, text, maxWidth) {
  const words = text.split(' ');
  const lines = [];
  let line = '';

  for (let word of words) {
    const testLine = line + word + ' ';
    const { width } = ctx.measureText(testLine);
    if (width > maxWidth && line !== '') {
      lines.push(line.trim());
      line = word + ' ';
    } else {
      line = testLine;
    }
  }

  if (line) lines.push(line.trim());
  return lines;
}


async function createStickerFromText(text) {
  const width = 512;
  const height = 512;
  const fontSize = 48;
  const padding = 30;

  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = 'white';
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = 'black';
  ctx.font = `${fontSize}px Arial`;
  ctx.textBaseline = 'top';

  const emojiRegex = twemoji.regex;
  const words = text.split(/(\s+)/); // pisah berdasarkan spasi, tapi tetap simpan spasi

  let x = padding;
  let y = padding;
  const lineHeight = fontSize + 10;

  for (let word of words) {
    const match = emojiRegex.exec(word);
    emojiRegex.lastIndex = 0;

    if (match) {
      const codePoint = twemoji.convert.toCodePoint(match[0]);
      const emojiUrl = `https://twemoji.maxcdn.com/v/latest/72x72/${codePoint}.png`;

      try {
        const res = await fetch(emojiUrl);
        const arrayBuffer = await res.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const img = await loadImage(buffer);
        if (x + fontSize > width - padding) {
          x = padding;
          y += lineHeight;
        }
        ctx.drawImage(img, x, y, fontSize, fontSize);
        x += fontSize;
      } catch (err) {
        ctx.fillText(word, x, y);
        x += ctx.measureText(word).width;
      }
    } else {
      const wordWidth = ctx.measureText(word).width;
      if (x + wordWidth > width - padding) {
        x = padding;
        y += lineHeight;
      }
      ctx.fillText(word, x, y);
      x += wordWidth;
    }
  }

  const buffer = canvas.toBuffer('image/png');

  const sticker = new Sticker(buffer, {
    pack: 'AuraBot',
    author: 'AURA',
    type: StickerTypes.DEFAULT,
    quality: 100,
  });

  return await sticker.toBuffer();
}




// === Utils ===
function execPromise(command) {
  return new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      if (error) return reject(stderr || stdout);
      resolve(stdout);
    });
  });
}

function cleanupFiles(filePaths) {
  for (const file of filePaths) {
    if (fs.existsSync(file)) {
      fs.unlinkSync(file);
    }
  }
}

module.exports = {
  createStickerFromMessage,
  createStickerFromText,
};
