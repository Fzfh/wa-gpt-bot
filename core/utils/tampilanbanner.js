const chalk = require("chalk");
const figlet = require("figlet");
const gradient = require("gradient-string");
const boxen = require("boxen");
const terminalWidth = process.stdout.columns || 80;

function centerText(text) {
  const lines = text.split("\n");
  return lines
    .map(line => {
      const pad = Math.max(0, Math.floor((terminalWidth - line.length) / 2));
      return " ".repeat(pad) + line;
    })
    .join("\n");
}

function tampilkanBanner(botName = "AURABOT") {
  console.clear();

  // Teks besar (figlet)
  const banner = figlet.textSync(botName, {
    font: "Standard",
    horizontalLayout: "default",
    verticalLayout: "default",
  });

  // Center + gradient
  console.log(gradient.pastel.multiline(centerText(banner)));

  // Kotak info login
  const info =
    chalk.whiteBright.bold(
      `🟢 Status: Menunggu login ke WhatsApp\n\n` +
      `📲 Pilih salah satu metode:\n` +
      `   ▶ Jalankan: ${chalk.cyan("node start --qrcode")} untuk QR Code\n` +
      `   ▶ Jalankan: ${chalk.cyan("node start --prcode=628xxxx")} untuk Pairing Code\n\n` +
      `💡 Catatan:\n` +
      ` - Jangan pakai +62, spasi, atau 08xxx\n` +
      ` - Format WA harus: 628xxxxxx`
    );

  const box = boxen(info, {
    padding: 1,
    margin: 1,
    borderStyle: "round",
    borderColor: "cyan",
    title: `✨ ${botName} Terminal`,
    titleAlignment: "center",
  });

  // Center box juga
  const boxLines = box.split("\n");
  boxLines.forEach(line => {
    const pad = Math.max(0, Math.floor((terminalWidth - line.length) / 2));
    console.log(" ".repeat(pad) + line);
  });

  // Branding
  console.log(centerText(gradient.fruit("📛 BOT BY FAZRI")));
}

module.exports = tampilkanBanner;
