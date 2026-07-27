/**
 * InstagramDownloaderService.js
 * Downloads ALL images from a public Instagram post.
 * Uses FastDL.app via Puppeteer to bypass Instagram's strict scraping protections.
 */

const fs = require('fs');
const path = require('path');
const axios = require('axios');
const puppeteer = require('puppeteer');
const { v4: uuidv4 } = require('uuid');

const BASE_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
};

class InstagramDownloaderService {
  async downloadFromUrl(instagramUrl, saveDir, onProgress = () => {}) {
    let imageUrls = [];

    onProgress('Connecting to scraping API (FastDL)...');
    
    try {
      imageUrls = await this._fetchViaFastdl(instagramUrl, onProgress);
    } catch (err) {
      console.warn(`[IG Downloader] FastDL strategy failed: ${err.message}`);
    }

    if (!imageUrls || imageUrls.length === 0) {
      throw new Error('Could not extract images. The post might be private, or the scraper was blocked.');
    }

    onProgress(`Downloading ${imageUrls.length} image(s)...`);
    return await this._downloadImages(imageUrls, saveDir, onProgress);
  }

  async _fetchViaFastdl(instagramUrl, onProgress) {
    let browser;
    let extractedUrls = [];

    try {
      browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
          '--window-position=-2000,-2000',
          '--window-size=1,1',
        ],
      });

      const page = await browser.newPage();
      
      // We will intercept the API response from FastDL to get the direct image URLs
      const responsePromise = new Promise((resolve) => {
        page.on('response', async (response) => {
          if (response.url().includes('/api/convert') && response.request().method() === 'POST') {
            try {
              const text = await response.text();
              const json = JSON.parse(text);
              const urls = [];
              
              if (Array.isArray(json)) {
                for (const item of json) {
                  if (item.url && Array.isArray(item.url) && item.url.length > 0) {
                    urls.push(item.url[0].url);
                  }
                }
              } else if (json && json.url && Array.isArray(json.url)) {
                // Single image or video post format
                for (const media of json.url) {
                  if (media.url) urls.push(media.url);
                }
              }
              
              resolve(urls);
            } catch (e) {
              resolve([]);
            }
          }
        });
      });

      await page.goto('https://fastdl.app/', { waitUntil: 'networkidle2', timeout: 30000 });
      
      onProgress('Submitting URL to scraper...');
      
      await page.type('#search-form-input', instagramUrl.trim());
      await page.click('.search-form__button');
      
      // Wait for the API response or timeout after 15 seconds
      const timeoutPromise = new Promise((resolve) => setTimeout(() => resolve([]), 15000));
      extractedUrls = await Promise.race([responsePromise, timeoutPromise]);
      
      if (extractedUrls.length > 0) {
        onProgress(`✅ Found ${extractedUrls.length} image(s) via FastDL.`);
        console.log(`[IG Downloader] ✅ FastDL returned ${extractedUrls.length} images.`);
      }

    } finally {
      if (browser) await browser.close().catch(() => {});
    }

    return extractedUrls;
  }

  async _downloadImages(imageUrls, saveDir, onProgress = () => {}) {
    const files = [];

    for (let i = 0; i < imageUrls.length; i++) {
      let url = imageUrls[i];
      
      // FastDL URLs sometimes have dl=1 which forces an attachment download, we can remove it for direct fetch
      url = url.replace('&dl=1', '');
      
      const filename = `ig_slide_${uuidv4()}.jpg`;
      const filepath = path.join(saveDir, filename);

      onProgress(`Downloading slide ${i + 1} of ${imageUrls.length}...`);

      try {
        const response = await axios.get(url, {
          responseType: 'arraybuffer',
          timeout: 25000,
          headers: {
            ...BASE_HEADERS,
            'Accept': 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
            'Referer': 'https://fastdl.app/' // FastDL CDN might check referer
          }
        });

        fs.writeFileSync(filepath, response.data);
        const stat = fs.statSync(filepath);

        // FastDL returns real images, so anything extremely small is an error
        if (stat.size < 10 * 1024) { 
          fs.unlinkSync(filepath);
          continue;
        }

        files.push({
          path:         filepath,
          filename:     filename,
          originalname: filename,
          mimetype:     'image/jpeg',
          size:         stat.size,
          publicUrl:    `/outputs/${filename}`
        });

        onProgress(`✅ Slide ${i + 1} of ${imageUrls.length} downloaded (${(stat.size / 1024).toFixed(0)} KB)`);
        console.log(`[IG Downloader] ✅ Slide ${i + 1}: ${(stat.size / 1024).toFixed(0)} KB`);

      } catch (err) {
        onProgress(`⚠ Slide ${i + 1} download failed, skipping.`);
        console.warn(`[IG Downloader] ⚠ Slide ${i + 1} failed: ${err.message}`);
      }
    }

    return files;
  }
}

module.exports = new InstagramDownloaderService();
