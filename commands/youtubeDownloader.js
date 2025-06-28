const youtubedl = require('youtube-dl-exec');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

async function downloadYoutube(url, format = 'mp4') {
  const id = uuidv4();
  const ext = format === 'mp3' ? 'mp3' : 'mp4';
  const output = path.join(os.tmpdir(), `${id}.${ext}`);

  const opts = {
    output,
    format: format === 'mp3'
      ? 'bestaudio'
      : 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/mp4',
    extractAudio: format === 'mp3',
    audioFormat: format === 'mp3' ? 'mp3' : undefined,
    noCheckCertificates: true,
    noWarnings: true,
    preferFreeFormats: true,
    addMetadata: true,
    embedThumbnail: format === 'mp3',
    cookies: path.resolve(__dirname, '../core/utils/cookies.txt'), 
  };

  try {
    await youtubedl(url, opts);

    if (!fs.existsSync(output)) throw new Error('❌ File tidak ditemukan setelah download');

    return { success: true, file: output };
  } catch (err) {
    console.error('❌ Download error:', err);
    return { success: false, error: err.stderr || err.message };
  }
}

module.exports = downloadYoutube;
