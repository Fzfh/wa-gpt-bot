const axios = require('axios');

async function downloadTiktok(url) {
  try {
    const res = await axios.get(`https://tikwm.com/api/?url=${encodeURIComponent(url)}`);
    const data = res.data.data;

    if (data && data.play) {
      return {
        videoUrl: data.play,
        musicUrl: data.music, // ✅ perbaikan di sini
        title: data.title,
        cover: data.cover
      };
    } else {
      throw new Error('Gagal ambil data');
    }
  } catch (e) {
    console.error('Download Error:', e);
    return null;
  }
}

module.exports = downloadTiktok;
