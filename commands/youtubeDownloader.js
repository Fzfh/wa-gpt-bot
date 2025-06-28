const { exec } = require('youtube-dl-exec');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { v4: uuidv4 } = require('uuid');

async function downloadYoutube(url, format = 'mp4') {
  const id = uuidv4();
  const tempDir = os.tmpdir();
  const outputPath = path.join(tempDir, `${id}.${format}`);

  const baseOptions = {
    output: outputPath,
    noCheckCertificates: true,
    noWarnings: true,
    preferFreeFormats: true,
    addMetadata: true,
  };

  const formatOptions =
    format === 'mp3'
      ? {
          extractAudio: true,
          audioFormat: 'mp3',
          embedThumbnail: true,
          format: 'bestaudio',
        }
      : {
          format: 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/mp4',
        };

  try {
    await exec(url, {
      ...baseOptions,
      ...formatOptions,
    }, {
      youtubeDl: 'yt-dlp',
    });

    if (!fs.existsSync(outputPath)) {
      throw new Error('File hasil download tidak ditemukan.');
    }

    return {
      success: true,
      file: outputPath,
      info: { url, format },
    };
  } catch (error) {
    console.error('❌ Download error:', error.stderr || error.message);
    return {
      success: false,
      error: error.stderr || error.message || 'Unknown error',
    };
  }
}

module.exports = downloadYoutube;
