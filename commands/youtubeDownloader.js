const youtubedl = require('youtube-dl-exec');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { v4: uuidv4 } = require('uuid');

async function downloadYoutube(url, format = 'mp4') {
  try {
    const id = uuidv4();
    const tempDir = os.tmpdir();
    const outputPath = path.join(tempDir, `${id}.${format}`);

    const options = {
      output: outputPath,
      youtubeDl: 'yt-dlp',
      noCheckCertificates: true,
      noWarnings: true,
      preferFreeFormats: true,
      addMetadata: true,
      format: format === 'mp3'
        ? 'bestaudio'
        : 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/mp4',
      extractAudio: format === 'mp3',
      audioFormat: format === 'mp3' ? 'mp3' : undefined,
      embedThumbnail: format === 'mp3',
    };

    await youtubedl(url, options);

    if (!fs.existsSync(outputPath)) {
      throw new Error('File hasil download tidak ditemukan!');
    }

    return {
      success: true,
      file: outputPath,
      info: {
        url,
        format,
      },
    };
  } catch (error) {
    console.error('❌ Download error:', error);
    return {
      success: false,
      error: error.message || 'Unknown error',
    };
  }
}

module.exports = downloadYoutube;
