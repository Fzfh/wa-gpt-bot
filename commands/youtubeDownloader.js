const axios = require('axios');

async function downloadYoutubeViaApi(url, format = 'mp4') {
  try {
    const res = await axios.get(`https://y2mate.guru/api/convert`, {
      params: { url }
    });

    const data = res.data;

    if (!data || !data.url) throw new Error('❌ Link download tidak ditemukan');

    const downloadUrl = format === 'mp3' ? data.audio : data.video;

    if (!downloadUrl) throw new Error('❌ Format tidak tersedia');

    return { success: true, url: downloadUrl };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

module.exports = downloadYoutubeViaApi;
