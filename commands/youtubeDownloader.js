const { ytmp4, ytmp3v2 } = require('@ruhend/scraper');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { v4: uuidv4 } = require('uuid');

async function downloadYoutube(url, format = 'mp4') {
  const id = uuidv4();
  const tempDir = os.tmpdir();
  const ext = format === 'mp3' ? 'mp3' : 'mp4';
  const outputPath = path.join(tempDir, `${id}.${ext}`);

  try {
    let data;
    if (format === 'mp3') {
      data = await ytmp3v2(url);
      if (!data.audio) throw new Error('Audio URL tidak tersedia');
      const res = await fetch(data.audio);
      const buffer = await res.arrayBuffer();
      fs.writeFileSync(outputPath, Buffer.from(buffer));
    } else { // MP4
      data = await ytmp4(url);
      if (!data.video) throw new Error('Video URL tidak tersedia');
      const res = await fetch(data.video);
      const buffer = await res.arrayBuffer();
      fs.writeFileSync(outputPath, Buffer.from(buffer));
    }

    return {
      success: true,
      file: outputPath,
      info: {
        title: data.title,
        duration: data.duration,
        size: data.size || null,
        ext,
      },
    };
  } catch (err) {
    console.error('Download error:', err);
    return {
      success: false,
      error: err.message,
    };
  }
}

module.exports = downloadYoutube;
