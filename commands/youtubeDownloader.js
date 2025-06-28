const youtubedl = require('youtube-dl-exec').exec;
const path = require('path');
const fs = require('fs');
const os = require('os');
const { v4: uuidv4 } = require('uuid');

async function downloadYoutube(url, format = 'mp4') {
  const id = uuidv4();
  const tempDir = os.tmpdir();
  const outputPath = path.join(tempDir, `${id}.${format}`);

  const options = {
    output: outputPath,
    format: format === 'mp3'
      ? 'bestaudio'
      : 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/mp4',
    extractAudio: format === 'mp3',
    audioFormat: format === 'mp3' ? 'mp3' : undefined,
    embedThumbnail: format === 'mp3',
    addMetadata: true,
    preferFreeFormats: true,
    noCheckCertificates: true,
    noWarnings: true,
    // verbose: true,
  };

  try {
    await youtubedl(url, options, {
      shell: true,
      youtubeDl: 'yt-dlp'
    });

    if (!fs.existsSync(outputPath)) {
      throw new Error('File hasil download tidak ditemukan!');
    }

    return {
      success: true,
      file: outputPath,
      info: { url },
    };
  } catch (error) {
    console.error('❌ Download error:', error);
    return {
      success: false,
      error: error.stderr || error.message || 'Unknown error',
    };
  }
}

module.exports = downloadYoutube;
