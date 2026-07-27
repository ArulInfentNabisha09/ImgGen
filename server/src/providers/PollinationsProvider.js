/**
 * PollinationsProvider — Free, no API key required
 * Uses Pollinations.ai which runs FLUX models for free.
 * Docs: https://image.pollinations.ai
 */

class PollinationsProvider {
  constructor() {
    this.baseUrl = 'https://image.pollinations.ai/prompt';
    this.model   = 'flux';   // Options: flux, flux-realism, flux-anime, turbo
  }

  async generate(prompt) {
    // Pollinations works with a simple GET request — no key needed
    const encodedPrompt = encodeURIComponent(prompt);
    const url = `${this.baseUrl}/${encodedPrompt}?width=1024&height=1024&model=${this.model}&nologo=true&seed=${Math.floor(Math.random() * 999999)}`;

    console.log(`[Pollinations] Generating image with FLUX (free, no key)...`);

    const response = await fetch(url, {
      method: 'GET',
      signal: AbortSignal.timeout(120_000)  // 2 min timeout (first request can be slow)
    });

    if (!response.ok) {
      throw new Error(`Pollinations API Error ${response.status}: ${await response.text()}`);
    }

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('image')) {
      throw new Error(`Pollinations returned unexpected content-type: ${contentType}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    console.log(`[Pollinations] ✅ Image received (${(arrayBuffer.byteLength / 1024).toFixed(0)} KB)`);

    return {
      imageBuffer: Buffer.from(arrayBuffer),
      format: 'buffer'
    };
  }
}

module.exports = new PollinationsProvider();
