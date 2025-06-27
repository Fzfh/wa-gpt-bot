const axios = require('axios');

async function downloadInstagram(url) {
  try {
    const res = await axios.get('https://instavideodownloader-com.onrender.com/api/video', {
      params: { postUrl: url }
    });

    if (!res.data?.video) throw new Error('Video tidak ditemukan');

    return {
      videoUrl: res.data.video,
      musicUrl: res.data.audio || null,
      title: res.data.caption || null,
      thumbnail: res.data.thumbnail || null
    };
  } catch (err) {
    console.error('IG Downloader Error:', err.message || err);
    return null;
  }
}

module.exports = downloadInstagram;
