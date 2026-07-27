/**
 * PuppeteerProvider.js
 * Renders an HTML string to a PNG image buffer using a headless Chrome browser.
 */

const puppeteer = require('puppeteer');

class PuppeteerProvider {
  /**
   * @param {string} htmlContent  - Full HTML document string
   * @param {number} width        - Viewport width in px (default 1080)
   * @param {number} height       - Viewport height in px (default 1350)
   * @returns {Promise<Buffer>}   - PNG image buffer
   */
  async htmlToImage(htmlContent, width = 1080, height = 1350) {
    let browser;
    try {
      browser = await puppeteer.launch({
        headless: 'shell',
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
          '--disable-software-rasterizer',
          '--font-render-hinting=none',
          '--no-startup-window',
          '--hide-scrollbars'
        ]
      });

      const page = await browser.newPage();

      // Set exact Instagram carousel dimensions, 2× for retina sharpness
      await page.setViewport({ width, height, deviceScaleFactor: 2 });

      // Load HTML and wait for fonts & images to settle
      await page.setContent(htmlContent, { waitUntil: 'domcontentloaded' });

      // Give Google Fonts time to load
      await new Promise(resolve => setTimeout(resolve, 2500));

      const buffer = await page.screenshot({
        type: 'png',
        clip: { x: 0, y: 0, width, height }
      });

      console.log(`[Puppeteer] ✅ Screenshot captured (${(buffer.length / 1024).toFixed(0)} KB)`);
      return Buffer.from(buffer);
    } finally {
      if (browser) {
        await browser.close().catch(() => {}); // Always close, even on error
      }
    }
  }

  /**
   * Generates a PDF from an HTML string for editable vector imports (e.g. Canva).
   * @param {string} htmlContent  - Full HTML document string
   * @param {number} width        - Viewport width in px (default 1080)
   * @param {number} height       - Viewport height in px (default 1350)
   * @returns {Promise<Buffer>}   - PDF document buffer
   */
  async htmlToPdf(htmlContent, width = 1080, height = 1350) {
    let browser;
    try {
      browser = await puppeteer.launch({
        headless: 'shell',
        args: [
          '--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage',
          '--disable-gpu', '--font-render-hinting=none', '--no-startup-window'
        ]
      });

      const page = await browser.newPage();
      await page.setViewport({ width, height, deviceScaleFactor: 2 });
      await page.setContent(htmlContent, { waitUntil: 'domcontentloaded' });
      await new Promise(resolve => setTimeout(resolve, 2500)); // wait for fonts

      const buffer = await page.pdf({
        width: `${width}px`,
        height: `${height}px`,
        printBackground: true,
        pageRanges: '1',
        margin: { top: 0, right: 0, bottom: 0, left: 0 }
      });

      console.log(`[Puppeteer] 📄 PDF captured (${(buffer.length / 1024).toFixed(0)} KB)`);
      return Buffer.from(buffer);
    } finally {
      if (browser) await browser.close().catch(() => {});
    }
  }
}

module.exports = new PuppeteerProvider();
