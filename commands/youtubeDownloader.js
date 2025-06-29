const fs = require('fs');
const path = require('path');
const ytdl = require('ytdl-core');

const tempFolder = path.join(__dirname, '../temp');
if (!fs.existsSync(tempFolder)) {
  fs.mkdirSync(tempFolder);
}

function sanitizeYouTubeUrl(url) {
  return url.split('?')[0];
}

async function downloadYouTubeVideo(rawUrl, type = 'video') {
  const url = sanitizeYouTubeUrl(rawUrl);

  if (!ytdl.validateURL(url)) throw new Error('❌ URL YouTube tidak valid.');

  const info = await ytdl.getInfo(url);
  const title = info.videoDetails.title.replace(/[^\w\s]/gi, '').substring(0, 50);
  const fileName = `${title}.${type === 'video' ? 'mp4' : 'mp3'}`;
  const filePath = path.join(tempFolder, fileName);

  const format = ytdl.chooseFormat(info.formats, {
    quality: type === 'video' ? 'highestvideo' : 'highestaudio',
  });

  const stream = ytdl.downloadFromInfo(info, { format });

  await new Promise((resolve, reject) => {
    const file = fs.createWriteStream(filePath);
    stream.pipe(file);
    stream.on('end', resolve);
    stream.on('error', reject);
  });

  return { filePath, title };
}

module.exports = {
  downloadYouTubeVideo,
};
