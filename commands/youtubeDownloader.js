const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

async function downloadYoutube(url, type = 'mp4') {
  try {
    const res = await axios.get(`https://ytdl.damn.dev/api/ytdl?url=${encodeURIComponent(url)}`);
    const data = res.data;

    if (!data || !data[type]) {
      return { success: false, error: 'Link download tidak ditemukan' };
    }

    const downloadUrl = data[type];
    const file = path.join('/tmp', `${uuidv4()}.${type}`);
    const response = await axios.get(downloadUrl, { responseType: 'stream' });

    await new Promise((resolve, reject) => {
      const writer = fs.createWriteStream(file);
      response.data.pipe(writer);
      writer.on('finish', resolve);
      writer.on('error', reject);
    });

    return { success: true, file };
  } catch (err) {
    return { success: false, error: err.message || 'Unknown error' };
  }
}

module.exports = downloadYoutube;
