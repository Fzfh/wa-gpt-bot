const axios = require('axios');

async function downloadInstagram(url) {
  try {
    const response = await axios.get(`https://instavideodownloader-com.onrender.com/api/video?postUrl=${encodeURIComponent(url)}`);
    const data = response.data;

    if (data.status !== 'success' || !data.data.videoUrl) {
      throw new Error('Video tidak ditemukan');
    }

    return {
      videoUrl: data.data.videoUrl,
      musicUrl: null,
      all: data.data
    };
  } catch (err) {
    console.error('IG Downloader Error:', err.message || err);
    return null;
  }
}

module.exports = downloadInstagram;
