const axios = require('axios');

async function downloadInstagram(url) {
  try {
    const { data } = await axios.get(`https://api.tiklydown.me/ig?url=${encodeURIComponent(url)}`);
    
    if (data.status !== 'ok' || !data.result || !data.result.url) {
      throw new Error('Gagal mengambil data IG');
    }

    return {
      videoUrl: data.result.url,
      musicUrl: data.result.music,
      title: data.result.caption || 'Video dari Instagram',
      author: data.result.username || 'Instagram user',
      thumbnail: data.result.thumbnail
    };
  } catch (err) {
    console.error('IG Downloader Error:', err);
    return null;
  }
}

module.exports = downloadInstagram;
