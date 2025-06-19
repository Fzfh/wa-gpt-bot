const chalk = require("chalk");
const figlet = require("figlet");
const gradient = require("gradient-string");
const boxen = require("boxen");

function tampilkanBanner(botName = "AURABOT") {
  console.clear();

  const banner = figlet.textSync(botName, {
    font: "Standard",
    horizontalLayout: "default",
    verticalLayout: "default",
  });

  // Gradient teks besar
  console.log(gradient.pastel.multiline(banner));

  // Kotak info login
  const box = boxen(
    chalk.whiteBright.bold(
      `🟢 Status: Menunggu login ke WhatsApp\n\n` +
      `📲 Pilih salah satu metode:\n` +
      `   ▶ Jalankan: ${chalk.cyan("node start --qrcode")} untuk QR Code\n` +
      `   ▶ Jalankan: ${chalk.cyan("node start --prcode=628xxxx")} untuk Pairing Code\n\n` +
      `💡 Catatan:\n` +
      ` - Jangan pakai +62, spasi, atau 08xxx\n` +
      ` - Format WA harus: 628xxxxxx`
    ),
    {
      padding: 1,
      margin: 1,
      borderStyle: "round",
      borderColor: "cyan",
      title: `✨ ${botName} Terminal`,
      titleAlignment: "center",
    }
  );

  console.log(box);

  // Tambahan teks branding Fazri
  console.log(gradient.fruit("\n📛 BOT BY FAZRI"));
}

module.exports = tampilkanBanner;
