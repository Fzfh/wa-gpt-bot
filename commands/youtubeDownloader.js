const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

function sanitizeFilename(name) {
  return name.replace(/[^a-z0-9_\-\.]/gi, '_');
}

async function downloadYouTubeVideo(url, type = 'video') {
  return new Promise((resolve, reject) => {
    const id = uuidv4();
    const ext = type === 'audio' ? 'mp3' : 'mp4';
    const tempFile = path.join(__dirname, '../temp', `${id}.${ext}`);

    const cmd = type === 'audio'
      ? `yt-dlp -f bestaudio --extract-audio --audio-format mp3 -o "${tempFile}" "${url}"`
      : `yt-dlp -f bestvideo+bestaudio -o "${tempFile}" "${url}"`;

    exec(cmd, (err, stdout, stderr) => {
      if (err) return reject(new Error(stderr || stdout || err.message));
      if (!fs.existsSync(tempFile)) return reject(new Error('File tidak ditemukan setelah download.'));

      const titleMatch = stdout.match(/title: (.+)/i);
      const title = sanitizeFilename(titleMatch?.[1] || 'Video YouTube');

      resolve({ filePath: tempFile, title });
    });
  });
}

module.exports = downloadYouTubeVideo;
