const fs = require('fs');
const path = require('path');
const ytdl = require('@distube/ytdl-core'); // pakai versi stabil
const { v4: uuidv4 } = require('uuid');

async function downloadYoutubeMedia(url) {
  try {
    const info = await ytdl.getInfo(url);
    const title = info.videoDetails.title.replace(/[^\w\s]/gi, '');

    const tempDir = path.join(__dirname, '../temp');
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

    // Video (360p+audio)
    const videoPath = path.join(tempDir, `${uuidv4()}.mp4`);
    await streamToFile(ytdl(url, { quality: '18' }), videoPath);

    // Audio (mp3)
    const audioPath = path.join(tempDir, `${uuidv4()}.mp3`);
    await streamToFile(ytdl(url, { filter: 'audioonly' }), audioPath);

    return { title, videoPath, audioPath };

  } catch (err) {
    console.error('Download Error:', err);
    return null;
  }
}

function streamToFile(stream, filepath) {
  return new Promise((resolve, reject) => {
    const write = fs.createWriteStream(filepath);
    stream.pipe(write);
    write.on('finish', resolve);
    write.on('error', reject);
  });
}

module.exports = downloadYoutubeMedia;
