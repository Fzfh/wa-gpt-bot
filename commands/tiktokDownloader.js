const axios = require('axios');

async function downloadTiktok(url) {
  try {
    const res = await axios.get(`https://tikwm.com/api/?url=${encodeURIComponent(url)}`);
    if (res.data && res.data.data && res.data.data.play) {
      return {
        videoUrl: res.data.data.play,
        title: res.data.data.title,
        author: res.data.data.author.nickname,
        cover: res.data.data.cover,
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
