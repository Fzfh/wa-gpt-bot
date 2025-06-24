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
      filter: (f) => f.hasVideo && f.hasAudio && f.container === 'mp4',
      quality: '18' // 360p, umum tersedia
    });

    const videoPath = path.join(tempDir, `${uuidv4()}.mp4`);
    const videoStream = ytdl.downloadFromInfo(info, {
      format: videoFormat,
      highWaterMark: 1 << 25 // Buffer besar biar gak timeout
    });
    const videoWrite = fs.createWriteStream(videoPath);
    videoStream.pipe(videoWrite);

    await new Promise((resolve, reject) => {
      videoWrite.on('finish', resolve);
      videoWrite.on('error', reject);
    });

    const audioFormat = ytdl.chooseFormat(info.formats, {
      quality: 'highestaudio',
      filter: 'audioonly'
    });

    const audioPath = path.join(tempDir, `${uuidv4()}.mp3`);
    const audioStream = ytdl.downloadFromInfo(info, {
      format: audioFormat,
      highWaterMark: 1 << 25
    });
    const audioWrite = fs.createWriteStream(audioPath);
    audioStream.pipe(audioWrite);

    await new Promise((resolve, reject) => {
      audioWrite.on('finish', resolve);
      audioWrite.on('error', reject);
    });

    return {
      title,
      videoPath,
      audioPath
    };
  } catch (error) {
    console.error('Download Error:', error);
    return null;
  }
}

module.exports = downloadYoutubeMedia;
