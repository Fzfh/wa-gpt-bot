const axios = require('axios');
const fs = require('fs');
const path = require('path');

async function downloadYouTubeMP3(url) {
  const api = `https://youtube-mp3-download.vercel.app/api?url=${encodeURIComponent(url)}`;

  try {
    const res = await axios.get(api);
    if (!res.data || !res.data.link) throw new Error('Gagal ambil link download');

    const audioUrl = res.data.link;
    const title = res.data.title.replace(/[^\w\s]/gi, '');
    const filePath = path.join(__dirname, '../temp', `${title}.mp3`);

    const writer = fs.createWriteStream(filePath);
    const audioRes = await axios.get(audioUrl, { responseType: 'stream' });
    audioRes.data.pipe(writer);

    await new Promise((resolve, reject) => {
      writer.on('finish', resolve);
      writer.on('error', reject);
    });

    return { filePath, title };
  } catch (err) {
    throw new Error(`❌ Gagal download: ${err.message}`);
  }
}
