const ytdl = require('ytdl-core');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

function sanitizeFilename(name) {
  return name.replace(/[^a-z0-9_\-\.]/gi, '_');
}

async function downloadYouTubeVideo(url, type = 'video') {
  if (!ytdl.validateURL(url)) {
    throw new Error('❌ URL YouTube tidak valid.');
  }

  const info = await ytdl.getInfo(url);
  const title = sanitizeFilename(info.videoDetails.title);
  const id = uuidv4();
  const ext = type === 'audio' ? 'mp3' : 'mp4';
  const filePath = path.join(__dirname, '../temp', `${id}.${ext}`);

  const stream = ytdl(url, {
    quality: type === 'audio' ? 'highestaudio' : 'highestvideo',
    filter: type === 'audio' ? 'audioonly' : 'audioandvideo'
  });

  await new Promise((resolve, reject) => {
    stream.pipe(fs.createWriteStream(filePath))
      .on('finish', resolve)
      .on('error', reject);
  });

  return { filePath, title };
}

module.exports = downloadYouTubeVideo;
