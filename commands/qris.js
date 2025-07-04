const { downloadMediaMessage } = require('@whiskeysockets/baileys');
const Jimp = require('jimp');
const jsQR = require('jsqr');
const {
  MultiFormatReader,
  BarcodeFormat,
  DecodeHintType,
  RGBLuminanceSource,
  BinaryBitmap,
  HybridBinarizer
} = require('@zxing/library');

function extractQRISInfo(data) {
  const tag59Match = data.match(/591[0-9](.*?)60/);
  const tag60Match = data.match(/601[0-9](.*?)62/);

  const merchantName = tag59Match ? tag59Match[1].replace(/\*/g, ' ').trim() : null;
  const merchantCity = tag60Match ? tag60Match[1].replace(/\*/g, ' ').trim() : null;

  return { merchantName, merchantCity };
}

async function handleQR(sock, msg) {
  const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
  const from = msg.key.remoteJid;

  if (!quoted?.imageMessage) {
    return sock.sendMessage(from, {
      text: '❌ Balas gambar QR-nya dulu ya, Auraa sayang~',
    }, { quoted: msg });
  }

  try {
    const mediaBuffer = await downloadMediaMessage(
      { key: msg.key, message: quoted },
      'buffer',
      {},
      { logger: console }
    );

    let image = await Jimp.read(mediaBuffer);
    if (image.bitmap.width < 300) {
      image = image.resize(400, Jimp.AUTO);
    }

    const { width, height, data } = image.bitmap;
    const grayscale = new Uint8ClampedArray(width * height);

    for (let i = 0; i < width * height; i++) {
      const r = data[i * 4];
      const g = data[i * 4 + 1];
      const b = data[i * 4 + 2];
      grayscale[i] = (r + g + b) / 3;
    }

    const source = new RGBLuminanceSource(grayscale, width, height);
    const bitmap = new BinaryBitmap(new HybridBinarizer(source));

    const reader = new MultiFormatReader();
    reader.setHints(new Map([
      [DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.QR_CODE]]
    ]));

    let resultText = null;

    try {
      const result = reader.decode(bitmap);
      resultText = result.getText();
    } catch {
      const jsqrResult = jsQR(data, width, height);
      if (jsqrResult) {
        resultText = jsqrResult.data;
      }
    }

    if (resultText) {
      if (/^000201/.test(resultText)) {
        const { merchantName, merchantCity } = extractQRISInfo(resultText);
        const info = `✅ *QRIS berhasil dibaca!*\n\n🏪 *Merchant/Toko:* ${merchantName || 'Tidak ditemukan'}\n📍 *Kota:* ${merchantCity || 'Tidak tersedia'}`;
        return sock.sendMessage(from, { text: info }, { quoted: msg });
      }
      
      return sock.sendMessage(from, {
        text: `✅ *QR berhasil dibaca!*\n\n \`Isi QR nya Adalah\`: \n${resultText.length > 300 ? resultText.slice(0, 300) + '... (terpotong)' : resultText}`,
      }, { quoted: msg });
    }

    return sock.sendMessage(from, {
      text: '❌ QR tidak terbaca, bahkan oleh scanner cadangan 😭\n\nCoba pastikan:\n- Gambar cukup besar\n- QR tidak terlalu buram\n- Bukan QR view-once yang blur~',
    }, { quoted: msg });

  } catch (err) {
    console.error('❌ Error QR:', err);
    return sock.sendMessage(from, {
      text: '⚠️ Gagal membaca QR. Pastikan gambarnya jelas yaa~',
    }, { quoted: msg });
  }
}

module.exports = handleQR;
