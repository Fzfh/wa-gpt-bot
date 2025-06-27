const snapinsta = require('snapinsta');

async function downloadInstagram(url) {
  try {
    const items = await snapinsta.getLinks(url);
    if (!items || items.length === 0) throw new Error('Konten tidak ditemukan.');

    const video = items.find(item => item.mime?.includes('video'));
    const audio = items.find(item => item.mime?.includes('audio'));

    return {
      videoUrl: video?.url || null,
      musicUrl: audio?.url || null,
      all: items
    };
  } catch (err) {
    console.error('SnapInsta Error:', err.message || err);
    return null;
  }
}

module.exports = downloadInstagram;
