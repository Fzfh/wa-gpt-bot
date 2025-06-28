const ytdl = require('ytdl-core');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

async function downloadYoutube(url, format = 'mp4') {
  try {
    const info = await ytdl.getInfo(url);
    const ext = format === 'mp3' ? 'mp3' : 'mp4';
    const file = path.join('/tmp', `${uuidv4()}.${ext}`);

    const formatFilter = format === 'mp3'
      ? ytdl.filterFormats(info.formats, 'audioonly')
      : ytdl.filterFormats(info.formats, 'audioandvideo');

    const chosen = ytdl.chooseFormat(formatFilter, { quality: format === 'mp4' ? 'highestvideo' : 'highestaudio' });
    if (!chosen || !chosen.url) throw new Error('Tidak ada format tersedia');

    const writeStream = fs.createWriteStream(file);
    ytdl.downloadFromInfo(info, { format: chosen }).pipe(writeStream);

    return await new Promise((resolve, reject) => {
      writeStream.on('finish', () => resolve({ success: true, file }));
      writeStream.on('error', reject);
    });
  } catch (err) {
    return { success: false, error: err.message };
  }
}

module.exports = downloadYoutube;
