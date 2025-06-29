const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

async function downloadMP3FromYouTube(url) {
  try {
    const response = await axios.get(`https://api.vevioz.com/api/button/mp3?url=${encodeURIComponent(url)}`);
    const $ = cheerio.load(response.data);
    const downloadLink = $('a.btn.btn-success.btn-sm').attr('href');

    if (!downloadLink) throw new Error('Gagal ambil link MP3');

    const id = uuidv4();
    const filePath = path.join(__dirname, '../temp', `${id}.mp3`);
    const writer = fs.createWriteStream(filePath);

    const audioStream = await axios.get(downloadLink, { responseType: 'stream' });
    audioStream.data.pipe(writer);

    await new Promise((resolve, reject) => {
      writer.on('finish', resolve);
      writer.on('error', reject);
    });

    return { filePath, title: `Audio dari YT` };
  } catch (err) {
    throw new Error(`❌ Gagal download audio: ${err.message}`);
  }
}

module.exports = downloadMP3FromYouTube;
