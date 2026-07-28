const express  = require('express');
const router   = express.Router();
const upload   = require('../middlewares/upload');
const carouselRedesignService = require('../services/CarouselRedesignService');

/**
 * POST /api/redesign
 * Accepts: multipart/form-data
 *   - images[]        : image files (JPEG / PNG / WEBP)
 *   - instagram_handle: string, e.g. "@sandeeptech.ai"
 *
 * Streams Server-Sent Events so long-running jobs don't time out in the browser.
 * Event types:
 *   progress  → { message }
 *   done      → { zipFilename, downloadUrl, images, total, success, failed }
 *   error     → { error }
 */
router.post('/redesign', upload.array('images', 20), async (req, res) => {
  const files = req.files;
  if (!files || files.length === 0) {
    return res.status(400).json({ error: 'Please upload at least one image.' });
  }

  // Normalise the Instagram handle
  let handle = (req.body.instagram_handle || '').trim();
  if (!handle) handle = '@yourbrand';
  if (!handle.startsWith('@')) handle = `@${handle}`;

  const userPrompt = req.body.prompt || '';

  console.log(`\n[Carousel Redesign] ▶ Processing ${files.length} slides for ${handle} [Prompt: ${userPrompt}]`);

  // ── Set up SSE ────────────────────────────────────────────────────────────
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // disable nginx buffering if applicable
  res.flushHeaders();

  // Keep-alive ping every 15s so proxies don't drop the connection
  const pingInterval = setInterval(() => {
    res.write(': ping\n\n');
  }, 15000);

  const sendEvent = (type, data) => {
    res.write(`event: ${type}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  const onProgress = (message) => {
    sendEvent('progress', { message });
    console.log(`  [SSE progress] ${message}`);
  };

  try {
    const onSlideReady = (url) => sendEvent('slide-ready', { url });
    const result = await carouselRedesignService.processFiles(files, handle, userPrompt, onProgress, onSlideReady);
    console.log(`[Carousel Redesign] ✅ Done — ${result.success}/${result.total} succeeded.`);
    sendEvent('done', result);
  } catch (err) {
    console.error('[Carousel Redesign Route Error]:', err);
    sendEvent('error', { error: err.message || 'Carousel redesign failed.' });
  } finally {
    clearInterval(pingInterval);
    res.end();
  }
});

module.exports = router;
