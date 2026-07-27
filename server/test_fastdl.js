const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  
  await page.goto('https://fastdl.app/');
  
  // Try to find the input box and button
  await page.type('#search-form-input', 'https://www.instagram.com/p/Dax2J2LEl5G/');
  await page.click('.search-form__button');
  
  console.log('Clicked download, waiting for results...');
  
  try {
    await page.waitForSelector('.download-items', { timeout: 15000 });
    const links = await page.$$eval('.download-items a.button.button--filled', els => els.map(e => e.href));
    console.log('Fastdl links found:', links.length);
    console.log(links);
  } catch (err) {
    console.log('Timeout waiting for results:', err.message);
  }
  
  await browser.close();
})().catch(e => console.log(e.message));
