const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  await page.setViewport({width: 1280, height: 900});
  
  await page.goto('https://fastdl.app/');
  await page.screenshot({path: 'fastdl_step1.png'});
  
  // Try to find the input box and button
  await page.type('#search-form-input', 'https://www.instagram.com/p/Dax2J2LEl5G/');
  await page.click('.search-form__button');
  
  console.log('Clicked download, waiting for results...');
  
  try {
    await page.waitForNavigation({waitUntil: 'networkidle2', timeout: 15000});
    await page.screenshot({path: 'fastdl_step2.png'});
  } catch (err) {
    console.log('Timeout waiting for results:', err.message);
    await page.screenshot({path: 'fastdl_step2.png'});
  }
  
  await browser.close();
})().catch(e => console.log(e.message));
