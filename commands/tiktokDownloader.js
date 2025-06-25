const axios = require('axios');

async function downloadTiktok(url) {
  try {
    const res = await axios.get(`https://tikwm.com/api/?url=${encodeURIComponent(url)}`);
    const data = res.data.data;

    if (!data) throw new Error('Gagal ambil data');

    return {
      isPhoto: Array.isArray(data.images) && data.images.length > 0,
      images: data.images || [],
      videoUrl: data.play || null,
      musicUrl: data.music || null,
      title: data.title,
      author: data.author?.nickname || '',
      cover: data.cover
    };
  } catch (e) {
    console.error('Download Error:', e);
    return null;
  }
}

module.exports = downloadTiktok;
