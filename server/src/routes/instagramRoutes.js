/**
 * instagramRoutes.js
 * 
 * Provides endpoints for the 2-step Instagram URL flow:
 * 1. POST /api/instagram/fetch-images - Downloads images and returns their temp URLs
 * 2. GET  /api/instagram/temp/:filename - Serves the downloaded images to the frontend
 */

const express = require('express');
const router  = express.Router();
const path    = require('path');
const fs      = require('fs');

const instagramDownloaderService = require('../services/InstagramDownloaderService');

// ── POST /api/instagram/fetch-images ────────────────────────────────────────
router.post('/instagram/fetch-images', async (req, res) => {
  try {
    const { url } = req.body;

    if (!url || !url.trim()) {
      return res.status(400).json({ error: 'Please provide an Instagram post URL.' });
    }

    const tempDir = process.env.TEMP_DIR;
    
    // We can't do SSE here easily if we want to return a JSON response at the end,
    // but this operation is relatively fast.
    console.log(`\n[Instagram Route] ▶ Fetching images for URL: ${url}`);
    
    const files = await instagramDownloaderService.downloadFromUrl(url, tempDir, (msg) => {
      console.log(`[Instagram Route] Progress: ${msg}`);
    });

    if (files.length === 0) {
      return res.status(422).json({
        error: 'No images could be extracted from this post. Make sure it is a public photo post.'
      });
    }

    console.log(`[Instagram Route] ✅ ${files.length} image(s) downloaded.`);

    // Map the downloaded files to their temporary access URLs
    const imageUrls = files.map(f => `/api/instagram/temp/${f.filename}`);

    res.json({ urls: imageUrls });
  } catch (err) {
    console.error('[Instagram Route Error]:', err);
    res.status(500).json({ error: err.message || 'Failed to fetch Instagram images.' });
  }
});

// ── GET /api/instagram/temp/:filename ───────────────────────────────────────
// Serves the downloaded images so the frontend can preview them and turn them into Blobs
router.get('/instagram/temp/:filename', (req, res) => {
  const tempDir = process.env.TEMP_DIR;
  const filePath = path.join(tempDir, req.params.filename);

  if (fs.existsSync(filePath)) {
    res.setHeader('Content-Type', 'image/jpeg');
    res.sendFile(filePath);
  } else {
    res.status(404).send('File not found');
  }
});

module.exports = router;
