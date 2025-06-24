const fs = require('fs');
const path = require('path');
const ytdl = require('ytdl-core');
const { v4: uuidv4 } = require('uuid');

async function downloadYoutubeMedia(url) {
  try {
    const info = await ytdl.getInfo(url);
    const title = info.videoDetails.title.replace(/[^\w\s]/gi, '');

    const tempDir = path.join(__dirname, '../temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    const videoFormat = ytdl.chooseFormat(info.formats, {
      quality: '18',
      filter: 'audioandvideo',
    });
    const videoPath = path.join(tempDir, `${uuidv4()}.mp4`);
    const videoStream = ytdl.downloadFromInfo(info, { format: videoFormat });
    const videoWrite = fs.createWriteStream(videoPath);
    videoStream.pipe(videoWrite);
    await new Promise((resolve, reject) => {
      videoWrite.on('finish', resolve);
      videoWrite.on('error', reject);
    });

    const audioFormat = ytdl.chooseFormat(info.formats, { quality: 'highestaudio' });
    const audioPath = path.join(tempDir, `${uuidv4()}.mp3`);
    const audioStream = ytdl.downloadFromInfo(info, { format: audioFormat });
    const audioWrite = fs.createWriteStream(audioPath);
    audioStream.pipe(audioWrite);
    await new Promise((resolve, reject) => {
      audioWrite.on('finish', resolve);
      audioWrite.on('error', reject);
    });

    return { title, videoPath, audioPath };
  } catch (error) {
    console.error('Download Error:', error);
    return null;
  }
}

module.exports = downloadYoutubeMedia;
