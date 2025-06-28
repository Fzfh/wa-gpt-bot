const { exec } = require('youtube-dl-exec');
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
    noCheckCertificates: true,
    noWarnings: true,
    preferFreeFormats: true,
    addMetadata: true,
    format: format === 'mp3'
      ? 'bestaudio'
      : 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/mp4',
    cookies: path.join(__dirname, 'youtube-cookies.txt'),
  };

  if (format === 'mp3') {
    options.extractAudio = true;
    options.audioFormat = 'mp3';
    options.embedThumbnail = true;
  }

  try {
    await exec(url, options, {
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
    const msg = error.stderr || error.message || 'Unknown error';
    console.error('❌ Download error:', msg);
    return {
      success: false,
      error: msg,
    };
  }
}

module.exports = downloadYoutube;
