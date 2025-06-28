const fs = require('fs');
const puppeteer = require('puppeteer');

async function exportYoutubeCookies(outputPath = 'youtube-cookies.txt') {
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: null,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();
  await page.goto('https://www.youtube.com', { waitUntil: 'networkidle2' });

  console.log('👉 Silakan login YouTube di browser yang muncul.');
  console.log('✅ Setelah login, tekan ENTER di terminal ini...');

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
