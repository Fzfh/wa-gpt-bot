const fs = require('fs');
const path = require('path');
const ytdl = require('ytdl-core');
const ffmpeg = require('fluent-ffmpeg');

async function downloadYoutubeMedia(url, outputDir = './downloads') {
  try {
    const info = await ytdl.getInfo(url);
    const titleSafe = info.videoDetails.title.replace(/[^\w\s]/gi, '');
    const videoPath = path.join(outputDir, `${titleSafe}.mp4`);
    const audioPath = path.join(outputDir, `${titleSafe}.mp3`);

    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const video = ytdl(url, { quality: 'highestvideo' });
    const audio = ytdl(url, { quality: 'highestaudio' });

    await new Promise((resolve, reject) => {
      ffmpeg()
        .input(video)
        .input(audio)
        .outputOptions('-c:v copy') 
        .save(videoPath)
        .on('end', () => resolve())
        .on('error', reject);
    });

    await new Promise((resolve, reject) => {
      ffmpeg(videoPath)
        .noVideo()
        .audioCodec('libmp3lame')
        .save(audioPath)
        .on('end', () => resolve())
        .on('error', reject);
    });

    return {
      title: info.videoDetails.title,
      videoPath,
      audioPath,
      thumbnail: info.videoDetails.thumbnails.pop().url,
    };
  } catch (err) {
    console.error('Download Error:', err);
    return null;
  }
}

module.exports = downloadYoutubeMedia;
