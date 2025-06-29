// commands/youtubeDownloader.js
const axios = require('axios');
const fs = require('fs');
const path = require('path');

async function downloadYouTubeVideo(rawUrl, type = 'video') {
  const url = rawUrl.split('?')[0]; // bersihkan URL dari ?si=

  // Gunakan savefrom unofficial API
  const api = `https://api.vevioz.com/api/button/${type === 'audio' ? 'mp3' : 'mp4'}/${encodeURIComponent(url)}`;

  const res = await axios.get(api);
  const html = res.data;

  // Cari link download dari HTML
  const match = html.match(/href="(https:\/\/[^"]+\.googlevideo\.com[^"]+)"/);

  if (!match) throw new Error('❌ Gagal mendapatkan link unduhan dari API.');

  const downloadUrl = match[1];

  // Ambil judul
  const titleMatch = html.match(/<title>(.*?)<\/title>/);
  const title = titleMatch
    ? titleMatch[1].replace(/ - SaveFrom.net$/, '').trim()
    : 'yt-download';

  const ext = type === 'audio' ? 'mp3' : 'mp4';
  const fileName = `${title.substring(0, 40).replace(/[^\w\s]/gi, '')}.${ext}`;
  const filePath = path.join(__dirname, '../temp', fileName);

  // Download file
  const writer = fs.createWriteStream(filePath);
  const videoStream = await axios({
    url: downloadUrl,
    method: 'GET',
    responseType: 'stream',
  });

  await new Promise((resolve, reject) => {
    videoStream.data.pipe(writer);
    writer.on('finish', resolve);
    writer.on('error', reject);
  });

  return { filePath, title };
}

module.exports = {
  downloadYouTubeVideo,
};
