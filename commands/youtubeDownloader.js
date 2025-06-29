const ytdl = require('ytdl-core');
const fs = require('fs');
const path = require('path');

async function downloadYouTubeVideo(url, type = 'video') {
  if (!ytdl.validateURL(url)) throw new Error('❌ URL tidak valid');

  const info = await ytdl.getInfo(url);
  const title = info.videoDetails.title.replace(/[^\w\s]/gi, '').slice(0, 30);
  const fileName = `${title}-${Date.now()}.${type === 'video' ? 'mp4' : 'mp3'}`;
  const filePath = path.join(__dirname, '../temp', fileName);

  const stream = ytdl(url, {
    filter: type === 'video' ? 'videoandaudio' : 'audioonly',
    quality: type === 'video' ? 'highestvideo' : 'highestaudio',
  });

  await new Promise((resolve, reject) => {
    stream.pipe(fs.createWriteStream(filePath))
      .on('finish', resolve)
      .on('error', reject);
  });

  return { filePath, title };
}

module.exports = { downloadYouTubeVideo };
