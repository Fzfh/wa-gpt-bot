const fs = require('fs');
const puppeteer = require('puppeteer');

async function exportYoutubeCookies(outputPath = 'youtube-cookies.txt') {
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: null,
  });

  const page = await browser.newPage();
  await page.goto('https://www.youtube.com', { waitUntil: 'networkidle2' });

  console.log('👉 Silakan login YouTube di jendela browser. Tekan ENTER di terminal setelah selesai login.');
  process.stdin.resume();
  await new Promise(resolve => process.stdin.once('data', resolve));

  const cookies = await page.cookies();

  const cookieText = cookies.map(c => `${c.name}=${c.value}`).join('; ');
  fs.writeFileSync(outputPath, cookieText);

  console.log(`✅ Cookies disimpan ke: ${outputPath}`);

  await browser.close();
  process.exit(0);
}

exportYoutubeCookies();
