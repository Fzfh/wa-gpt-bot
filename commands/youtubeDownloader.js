const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');
const https = require('https');

function downloadFile(url, output) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(output);
    https.get(url, (response) => {
      response.pipe(file);
      file.on('finish', () => {
        file.close(() => resolve(output));
      });
    }).on('error', (err) => {
      fs.unlinkSync(output);
      reject(err);
    });
  });
}

async function downloadYoutube(url, format = 'mp4') {
  try {
    const res = await axios.get(`https://www.y2mate.is/mates/en68/analyze/ajax`, {
      params: { url },
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });

    const videoId = res.data.vid || '';
    const links = res.data.links?.mp4 || res.data.links?.mp3;

    if (!links) throw new Error('Link download tidak ditemukan');

    // Ambil kualitas terbaik
    const best = Object.values(links).sort((a, b) => b.size - a.size)[0];
    const downloadUrl = best.url;

    const tmpFile = path.join('/tmp', `${uuidv4()}.${format}`);
    await downloadFile(downloadUrl, tmpFile);

    return { success: true, file: tmpFile };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

module.exports = downloadYoutube;
