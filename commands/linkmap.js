module.exports = async function linkMap(sock, msg, text) {
  const from = msg.key.remoteJid;
  const sender = msg.key.participant || msg.key.remoteJid;
  const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
  const locationMsg = quoted?.locationMessage;

  let input = text.trim();

  // Kalau reply ke shareloc
  if (locationMsg) {
    const lat = locationMsg.degreesLatitude;
    const lon = locationMsg.degreesLongitude;
    input = `${lat},${lon}`;
  }

  if (!input) {
    return sock.sendMessage(from, {
      text: '❌ Format salah!\nKetik: *.linkmap <lokasi atau koordinat>*\nAtau balas shareloc dan ketik *.linkmap*',
    }, { quoted: msg });
  }

  try {
    let mapsURL = '';

    if (/^-?\d+(\.\d+)?,-?\d+(\.\d+)?$/.test(input)) {
      mapsURL = `https://www.google.com/maps?q=${input}`;
    } else {
      const query = encodeURIComponent(input);
      mapsURL = `https://www.google.com/maps/search/?api=1&query=${query}`;
    }

    return sock.sendMessage(from, {
      text: `📍 Ini link map-nya ya:\n${mapsURL}`,
    }, { quoted: msg });

  } catch (err) {
    console.error('❌ Gagal generate link map:', err);
    return sock.sendMessage(from, {
      text: '⚠️ Gagal bikin link map. Coba lagi nanti ya~',
    }, { quoted: msg });
  }
};
