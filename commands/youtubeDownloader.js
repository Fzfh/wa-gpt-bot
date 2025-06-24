const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs');
const youtubedl = require('youtube-dl-exec');

async function downloadYoutubeMedia(url) {
  try {
    const id = uuidv4();
    const tempDir = path.join(__dirname, '../temp');
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);

    const videoPath = path.join(tempDir, `${id}.mp4`);
    const audioPath = path.join(tempDir, `${id}.mp3`);

    // Download video (resolusi <= 720p)
    await youtubedl(url, {
      output: videoPath,
      format: 'bestvideo[height<=720]+bestaudio/best',
      mergeOutputFormat: 'mp4'
    });

    // Download audio ke MP3
    await youtubedl(url, {
      output: audioPath,
      extractAudio: true,
      audioFormat: 'mp3'
    });

    return {
      title: `Berhasil diunduh dari YouTube`,
      videoPath,
      audioPath
    };
  } catch (err) {
    console.error('Download Error:', err);
    return null;
  }
}

module.exports = downloadYoutubeMedia;
