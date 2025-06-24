const fs = require('fs');
const path = require('path');
const ytdl = require('ytdl-core');
const { v4: uuidv4 } = require('uuid');

async function downloadYoutubeMedia(url) {
  try {
    const info = await ytdl.getInfo(url);
    const title = info.videoDetails.title.replace(/[^\w\s]/gi, '');

    //  Download Video (fallback ke resolusi 360p kalau 720p tidak tersedia)
    const videoFormat = ytdl.chooseFormat(info.formats, {
      quality: '18', // 360p + audio
      filter: 'audioandvideo',
    });

    const videoPath = path.join(__dirname, `../temp/${uuidv4()}.mp4`);
    const videoStream = ytdl.downloadFromInfo(info, { format: videoFormat });
    const videoWrite = fs.createWriteStream(videoPath);
    videoStream.pipe(videoWrite);

    await new Promise((resolve, reject) => {
      videoWrite.on('finish', resolve);
      videoWrite.on('error', reject);
    });

    //  Download Audio (format webm)
    const audioFormat = ytdl.chooseFormat(info.formats, { quality: 'highestaudio' });
    const audioPath = path.join(__dirname, `../temp/${uuidv4()}.mp3`);
    const audioStream = ytdl.downloadFromInfo(info, { format: audioFormat });
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
