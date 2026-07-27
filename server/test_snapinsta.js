const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  await page.setViewport({width: 1280, height: 900});
  
  await page.goto('https://snapinsta.app/', {waitUntil: 'networkidle2'});
  
  await page.type('#url', 'https://www.instagram.com/p/Dax2J2LEl5G/');
  await page.click('#btn-submit');
  
  console.log('Clicked download, waiting for results...');
  
  try {
    await page.waitForSelector('.download-bottom a', { timeout: 15000 });
    const links = await page.$$eval('.download-bottom a', els => els.map(e => e.href));
    console.log('Snapinsta links found:', links.length);
    console.log(links);
  } catch (err) {
    console.log('Timeout waiting for results:', err.message);
  }
  
  await browser.close();
})().catch(e => console.log(e.message));
