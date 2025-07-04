const express = require("express");
const fs = require("fs");
const app = express();
let lastQr = "";

// Buat fungsi buat update QR
function setQr(qr) {
  lastQr = qr;
}

// Route buat nampilin QR di browser
app.get("/qr", (req, res) => {
  if (!lastQr) return res.send("QR belum tersedia. Tunggu bot generate...");
  res.send(`
    <html>
      <body style="display:flex;align-items:center;justify-content:center;height:100vh;flex-direction:column;font-family:sans-serif;">
        <h2>Scan QR WhatsApp:</h2>
        <img src="https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(lastQr)}" />
        <p>Jika tidak muncul, tunggu beberapa detik lalu refresh.</p>
      </body>
    </html>
  `);
});

app.listen(3000, () => {
  console.log("🌐 Web server QR aktif di http://IP_VPS_KAMU:3000/qr");
});

module.exports = { setQr };
