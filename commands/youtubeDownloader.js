const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

async function downloadYouTubeMP3(url) {
  return new Promise((resolve, reject) => {
    const id = uuidv4();
    const filename = `${id}.mp3`;
    const filepath = path.join(__dirname, '../../temp', filename);

    const command = `yt-dlp -x --audio-format mp3 -o "${filepath}" "${url}"`;

    exec(command, (error, stdout, stderr) => {
      if (error) {
        return reject(new Error(stderr || error.message));
      }

      if (!fs.existsSync(filepath)) {
        return reject(new Error('File tidak ditemukan setelah proses unduhan.'));
      }

      resolve({ filePath: filepath, title: path.basename(filename) });
    });
  });
}

module.exports = downloadYouTubeMP3;
