/**
 * carouselSvgTemplate.js  — v2  (Modular Block Engine)
 *
 * Generates a native SVG file matching the block-based HTML template.
 * The `layout_blocks` array from the AI controls the vertical order of blocks.
 * Text in SVG stays as <text> elements — fully editable when imported into Canva.
 *
 * SVG text-wrapping is handled by wrapText() which splits long strings into
 * multiple <tspan> dy="1.2em" lines.
 */

const W = 1080;

// Word-wrap: splits text into lines of at most maxChars characters
function wrapText(text, maxChars) {
  if (!text) return [];
  const words = String(text).split(' ');
  const lines = [];
  let current = '';
  for (const w of words) {
    const candidate = current ? `${current} ${w}` : w;
    if (candidate.length > maxChars && current) {
      lines.push(current);
      current = w;
    } else {
      current = candidate;
    }
  }
  if (current) lines.push(current);
  return lines;
}

const esc = (t) => String(t || '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&apos;');

function createCarouselSlideSVG(data = {}, instagramHandle = '@yourbrand', designSpec = null) {
  const {
    badge         = null,
    big_number    = null,
    tool_name     = null,
    headline      = '',
    taglines      = [],
    bullet_points = [],
    quote         = null,
    url           = null,
    other         = []
  } = data;

  const spec = {
    bg:           '#060914',
    primary:      '#00d4ff',
    secondary:    '#6366f1',
    accent:       '#a855f7',
    textColor:    '#ffffff',
    mutedColor:   '#8899aa',
    cardBg:       'rgba(255,255,255,0.05)',
    borderColor:  'rgba(255,255,255,0.12)',
    fontHeading:  'Inter',
    fontBody:     'Inter',
    bulletStyle:  'chevron',
    layout_blocks: null,
    layout: null,
    ...(designSpec || {})
  };

  // Work out which blocks to render
  let blocks = spec.layout_blocks;
  if (!blocks && spec.layout) {
    const legacyMap = {
      'hero-magazine':   ['accent-line', 'title-group', 'taglines', 'bullets-list', 'url-pill'],
      'bold-editorial':  ['big-number', 'accent-line', 'badge', 'title-group', 'bullets-icon', 'quote-box'],
      'floating-labels': ['accent-line', 'title-group', 'bullets-list', 'url-pill'],
      'minimal-clean':   ['accent-line', 'badge', 'title-group', 'tagline-band', 'bullets-list', 'chip-group'],
    };
    blocks = legacyMap[spec.layout] || ['accent-line', 'title-group', 'taglines', 'bullets-list', 'url-pill'];
  }
  if (!Array.isArray(blocks)) {
    blocks = ['accent-line', 'title-group', 'taglines', 'bullets-list', 'url-pill'];
  }

  const bullets    = (Array.isArray(bullet_points) ? bullet_points : []).slice(0, 9);
  const tlines     = (Array.isArray(taglines)       ? taglines       : []).slice(0, 3);
  const otherItems = (Array.isArray(other)           ? other          : []).slice(0, 6);
  const cleanUrl   = url
    ? String(url).replace(/@[\w.]+/g, '').replace(/^https?:\/\//, '').replace(/\/$/, '').trim()
    : null;

  // Colours (strip rgba for SVG fill; use opacity attribute separately)
  const bg      = spec.bg      || '#060914';
  const primary = spec.primary || '#00d4ff';
  const secondary = spec.secondary || '#6366f1';
  const accent  = spec.accent  || '#a855f7';
  const txtCol  = spec.textColor && !spec.textColor.startsWith('rgba') ? spec.textColor : '#ffffff';
  const mutedCol = spec.mutedColor && !spec.mutedColor.startsWith('rgba') ? spec.mutedColor : '#8899aa';

  // ── SVG defs ────────────────────────────────────────────────────────────
  const svgDefs = `
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${bg}"/>
      <stop offset="100%" stop-color="${secondary}" stop-opacity="0.35"/>
    </linearGradient>
    <radialGradient id="glow1" cx="12%" cy="10%" r="55%">
      <stop offset="0%" stop-color="${secondary}" stop-opacity="0.22"/>
      <stop offset="100%" stop-color="${bg}" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="glow2" cx="88%" cy="92%" r="55%">
      <stop offset="0%" stop-color="${primary}" stop-opacity="0.15"/>
      <stop offset="100%" stop-color="${bg}" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="accentGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="${primary}"/>
      <stop offset="60%" stop-color="${secondary}"/>
      <stop offset="100%" stop-color="${bg}" stop-opacity="0"/>
    </linearGradient>
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&amp;display=swap');
      text { font-family: '${esc(spec.fontHeading)}', 'Inter', Arial, sans-serif; }
    </style>
  </defs>`;

  // ── Background ───────────────────────────────────────────────────────────
  // Height will be determined after rendering blocks; use 1350 as default
  let H = 1350;

  const svgBackground = `
  <rect width="${W}" height="${H}" fill="url(#bgGrad)"/>
  <rect width="${W}" height="${H}" fill="url(#glow1)"/>
  <rect width="${W}" height="${H}" fill="url(#glow2)"/>
  <!-- dot grid deco -->
  <g opacity="0.04" stroke="${primary}" stroke-width="1">
    <line x1="0" y1="270" x2="${W}" y2="270"/><line x1="0" y1="540" x2="${W}" y2="540"/>
    <line x1="0" y1="810" x2="${W}" y2="810"/><line x1="0" y1="1080" x2="${W}" y2="1080"/>
    <line x1="270" y1="0" x2="270" y2="${H}"/><line x1="540" y1="0" x2="540" y2="${H}"/><line x1="810" y1="0" x2="810" y2="${H}"/>
  </g>`;

  // ── Top bar ──────────────────────────────────────────────────────────────
  const svgTopBar = `
  <!-- Top Bar -->
  <circle cx="80" cy="74" r="26" fill="${primary}" fill-opacity="0.18" stroke="${primary}" stroke-width="1.5" stroke-opacity="0.6"/>
  <text x="80" y="79" text-anchor="middle" fill="${primary}" font-size="11" font-weight="700">AI</text>
  <text x="118" y="81" fill="${txtCol}" font-size="22" font-weight="700">${esc(instagramHandle)}</text>
  ${big_number && !blocks.includes('big-number') ? `<text x="${W - 60}" y="84" text-anchor="end" fill="${primary}" fill-opacity="0.35" font-size="34" font-weight="900">${esc(big_number)}</text>` : ''}`;

  // ── Block renderers (returns SVG string + height consumed) ────────────────
  // Each function receives `y` (current top position) and returns { svg, height }

  const svgBlocks = {

    'badge': (y) => {
      if (!badge) return { svg: '', height: 0 };
      const w = Math.min(badge.length * 11 + 50, 360);
      return {
        svg: `
  <!-- badge -->
  <rect x="60" y="${y}" rx="22" ry="22" width="${w}" height="44" fill="${secondary}" fill-opacity="0.25" stroke="${secondary}" stroke-width="1" stroke-opacity="0.6"/>
  <text x="80" y="${y + 29}" fill="${accent}" font-size="14" font-weight="700" letter-spacing="1">${esc(badge.toUpperCase())}</text>`,
        height: 64
      };
    },

    'accent-line': (y) => ({
      svg: `\n  <!-- accent line -->\n  <rect x="60" y="${y}" width="80" height="5" rx="2" fill="url(#accentGrad)"/>`,
      height: 22
    }),

    'title-group': (y) => {
      let svg = '';
      let h = 0;
      if (tool_name) {
        const tLen = tool_name.length;
        const sz = tLen > 30 ? 44 : tLen > 18 ? 56 : 68;
        const lines = wrapText(tool_name, 22);
        lines.slice(0, 2).forEach((line, i) => {
          svg += `\n  <text x="60" y="${y + h + sz}" fill="${primary}" font-size="${sz}" font-weight="900" letter-spacing="-2">${esc(line)}</text>`;
          h += sz + 4;
        });
        h += 8;
      }
      if (headline) {
        const hLen = headline.length;
        const sz = hLen > 100 ? 28 : hLen > 70 ? 34 : hLen > 45 ? 40 : hLen > 28 ? 50 : 60;
        const lines = wrapText(headline, 28);
        lines.slice(0, 4).forEach((line, i) => {
          svg += `\n  <text x="60" y="${y + h + sz}" fill="${txtCol}" font-size="${sz}" font-weight="900" letter-spacing="-1">${esc(line)}</text>`;
          h += sz + 4;
        });
        h += 12;
      }
      return { svg, height: h };
    },

    'headline-giant': (y) => {
      if (!headline) return { svg: '', height: 0 };
      const lines = wrapText(headline, 20);
      let svg = '';
      let h = 0;
      lines.slice(0, 4).forEach(line => {
        svg += `\n  <text x="60" y="${y + h + 80}" fill="${txtCol}" font-size="80" font-weight="900" letter-spacing="-3">${esc(line)}</text>`;
        h += 84;
      });
      return { svg, height: h + 10 };
    },

    'taglines': (y) => {
      if (tlines.length === 0) return { svg: '', height: 0 };
      let svg = '';
      let h = 0;
      tlines.forEach(t => {
        const lines = wrapText(t, 55);
        lines.slice(0, 2).forEach(line => {
          svg += `\n  <text x="60" y="${y + h + 28}" fill="${mutedCol}" font-size="22" font-weight="500">${esc(line)}</text>`;
          h += 30;
        });
      });
      return { svg, height: h + 10 };
    },

    'tagline-band': (y) => {
      if (tlines.length === 0) return { svg: '', height: 0 };
      const txt = tlines[0];
      const w = Math.min(txt.length * 12 + 50, W - 120);
      return {
        svg: `
  <!-- tagline band -->
  <rect x="60" y="${y}" width="${w}" height="52" rx="12" fill="${primary}"/>
  <text x="84" y="${y + 35}" fill="#000" font-size="20" font-weight="800">${esc(txt)}</text>
  ${tlines.slice(1).map((t, i) => `<text x="60" y="${y + 68 + i * 28}" fill="${mutedCol}" font-size="18">${esc(t)}</text>`).join('')}`,
        height: 52 + tlines.slice(1).length * 28 + 20
      };
    },

    'mockup-window': (y) => {
      // SVG can't embed a real window; draw a stylised card with bullets
      const itemH = 46;
      const items = bullets.slice(0, 5);
      const innerH = items.length * itemH + 40;
      const totalH = innerH + 50; // +50 for chrome bar
      let svg = `
  <!-- mockup window -->
  <rect x="60" y="${y}" width="${W - 120}" height="${totalH}" rx="18" fill="${primary}" fill-opacity="0.05" stroke="${secondary}" stroke-width="1.5" stroke-opacity="0.4"/>
  <!-- chrome dots -->
  <circle cx="88" cy="${y + 26}" r="7" fill="#ff5f56"/>
  <circle cx="108" cy="${y + 26}" r="7" fill="#ffbd2e"/>
  <circle cx="128" cy="${y + 26}" r="7" fill="#27c93f"/>
  <line x1="60" y1="${y + 50}" x2="${W - 60}" y2="${y + 50}" stroke="${secondary}" stroke-width="1" stroke-opacity="0.3"/>`;
      items.forEach((b, i) => {
        const lineY = y + 50 + itemH * i;
        const lines = wrapText(b, 52);
        svg += `
  <rect x="80" y="${lineY + 8}" width="28" height="28" rx="7" fill="${primary}" fill-opacity="0.15" stroke="${primary}" stroke-width="1" stroke-opacity="0.35"/>
  <text x="94" y="${lineY + 27}" text-anchor="middle" fill="${primary}" font-size="12" font-weight="700">›</text>
  <text x="120" y="${lineY + 26}" fill="${txtCol}" font-size="17" font-weight="500">${esc(lines[0] || '')}</text>`;
        if (lines[1]) svg += `\n  <text x="120" y="${lineY + 44}" fill="${mutedCol}" font-size="14">${esc(lines[1])}</text>`;
      });
      return { svg, height: totalH + 20 };
    },

    'bullets-list': (y) => {
      if (bullets.length === 0) return { svg: '', height: 0 };
      const itemH = 54;
      const totalH = bullets.length * itemH + 12;
      let svg = `\n  <!-- bullets list -->\n  <rect x="60" y="${y}" width="${W - 120}" height="${totalH}" rx="16" fill="${primary}" fill-opacity="0.04" stroke="${secondary}" stroke-width="1" stroke-opacity="0.25"/>`;
      bullets.forEach((b, i) => {
        const by = y + 10 + i * itemH;
        const lines = wrapText(b, 52);
        svg += `
  <rect x="78" y="${by + 12}" width="4" height="28" rx="2" fill="${primary}"/>
  <text x="96" y="${by + 32}" fill="${txtCol}" font-size="17" font-weight="500">${esc(lines[0] || '')}</text>`;
        if (lines[1]) svg += `\n  <text x="96" y="${by + 50}" fill="${mutedCol}" font-size="14">${esc(lines[1])}</text>`;
      });
      return { svg, height: totalH + 16 };
    },

    'bullets-grid': (y) => {
      if (bullets.length === 0) return { svg: '', height: 0 };
      const colW = (W - 120 - 14) / 2;
      const rowH = 80;
      const rows = Math.ceil(bullets.length / 2);
      let svg = `\n  <!-- bullets grid -->`;
      bullets.forEach((b, i) => {
        const col  = i % 2;
        const row  = Math.floor(i / 2);
        const bx   = 60 + col * (colW + 14);
        const by   = y + row * (rowH + 12);
        const lines = wrapText(b, 28);
        svg += `
  <rect x="${bx}" y="${by}" width="${colW}" height="${rowH}" rx="14" fill="${primary}" fill-opacity="0.05" stroke="${secondary}" stroke-width="1" stroke-opacity="0.3"/>
  <rect x="${bx + 14}" y="${by + 12}" width="26" height="26" rx="7" fill="${primary}" fill-opacity="0.18"/>
  <text x="${bx + 27}" y="${by + 30}" text-anchor="middle" fill="${primary}" font-size="13" font-weight="700">${String(i + 1).padStart(2, '0')}</text>
  <text x="${bx + 50}" y="${by + 30}" fill="${txtCol}" font-size="15" font-weight="600">${esc(lines[0] || '')}</text>
  ${lines[1] ? `<text x="${bx + 50}" y="${by + 50}" fill="${mutedCol}" font-size="13">${esc(lines[1])}</text>` : ''}`;
      });
      return { svg, height: rows * (rowH + 12) + 10 };
    },

    'bullets-icon': (y) => {
      if (bullets.length === 0) return { svg: '', height: 0 };
      const itemH = 52;
      let svg = `\n  <!-- bullets icon -->`;
      bullets.forEach((b, i) => {
        const by = y + i * itemH;
        const lines = wrapText(b, 50);
        svg += `
  <rect x="60" y="${by + 4}" width="36" height="36" rx="10" fill="${primary}" fill-opacity="0.18" stroke="${primary}" stroke-width="1" stroke-opacity="0.4"/>
  <text x="78" y="${by + 28}" text-anchor="middle" fill="${primary}" font-size="13" font-weight="800">${String(i + 1).padStart(2, '0')}</text>
  <text x="108" y="${by + 26}" fill="${txtCol}" font-size="17" font-weight="500">${esc(lines[0] || '')}</text>
  ${lines[1] ? `<text x="108" y="${by + 44}" fill="${mutedCol}" font-size="14">${esc(lines[1])}</text>` : ''}`;
      });
      return { svg, height: bullets.length * itemH + 10 };
    },

    'speech-bubbles': (y) => {
      // Simplified SVG version: stacked label rows
      const labels = [...bullets, ...tlines].filter(Boolean).slice(0, 8);
      if (labels.length === 0) return { svg: '', height: 0 };
      const itemH = 44;
      let svg = `\n  <!-- speech bubbles (label list) -->`;
      labels.forEach((label, i) => {
        const ly = y + i * itemH;
        const w = Math.min(label.length * 10 + 40, W - 160);
        svg += `
  <rect x="60" y="${ly}" rx="10" ry="10" width="${w}" height="36" fill="${secondary}" fill-opacity="0.18" stroke="${secondary}" stroke-width="1" stroke-opacity="0.4"/>
  <text x="80" y="${ly + 24}" fill="${txtCol}" font-size="15">${esc(label)}</text>`;
      });
      return { svg, height: labels.length * itemH + 10 };
    },

    'quote-box': (y) => {
      if (!quote) return { svg: '', height: 0 };
      const lines = wrapText(quote, 50);
      const h = lines.length * 30 + 36;
      let svg = `
  <!-- quote box -->
  <rect x="60" y="${y}" width="${W - 120}" height="${h}" rx="14" fill="${primary}" fill-opacity="0.06" stroke="${primary}" stroke-width="1" stroke-opacity="0.25"/>
  <rect x="60" y="${y}" width="5" height="${h}" rx="2" fill="${primary}"/>`;
      lines.slice(0, 4).forEach((line, i) => {
        svg += `\n  <text x="84" y="${y + 30 + i * 30}" fill="${mutedCol}" font-size="18" font-style="italic">${esc(line)}</text>`;
      });
      return { svg, height: h + 16 };
    },

    'quote-center': (y) => {
      if (!quote) return { svg: '', height: 0 };
      const lines = wrapText(quote, 48);
      const h = lines.length * 32 + 60;
      let svg = `
  <!-- quote center -->
  <rect x="60" y="${y}" width="${W - 120}" height="${h}" rx="18" fill="${primary}" fill-opacity="0.07" stroke="${secondary}" stroke-width="1" stroke-opacity="0.3"/>
  <text x="80" y="${y + 52}" fill="${primary}" fill-opacity="0.25" font-size="72" font-family="Georgia,serif">"</text>`;
      lines.slice(0, 4).forEach((line, i) => {
        svg += `\n  <text x="${W / 2}" y="${y + 52 + 36 + i * 32}" text-anchor="middle" fill="${txtCol}" font-size="18" font-style="italic">${esc(line)}</text>`;
      });
      return { svg, height: h + 16 };
    },

    'url-pill': (y) => {
      if (!cleanUrl) return { svg: '', height: 0 };
      const w = Math.min(cleanUrl.length * 10 + 60, W - 120);
      return {
        svg: `
  <!-- url pill -->
  <rect x="60" y="${y}" rx="22" ry="22" width="${w}" height="44" fill="${primary}" fill-opacity="0.12" stroke="${primary}" stroke-width="1" stroke-opacity="0.5"/>
  <text x="84" y="${y + 29}" fill="${primary}" font-size="15" font-weight="600">${esc(cleanUrl)}</text>`,
        height: 56
      };
    },

    'chip-group': (y) => {
      if (otherItems.length === 0) return { svg: '', height: 0 };
      let svg = `\n  <!-- chip group -->`;
      let xOff = 60;
      let currY = y;
      otherItems.forEach(item => {
        const w = Math.min(String(item).length * 9 + 32, 260);
        if (xOff + w > W - 60) { xOff = 60; currY += 44; }
        svg += `
  <rect x="${xOff}" y="${currY}" rx="18" ry="18" width="${w}" height="36" fill="${secondary}" fill-opacity="0.18" stroke="${secondary}" stroke-width="1" stroke-opacity="0.4"/>
  <text x="${xOff + 14}" y="${currY + 24}" fill="${secondary}" font-size="13" font-weight="600">${esc(item)}</text>`;
        xOff += w + 10;
      });
      return { svg, height: currY - y + 50 };
    },

    'big-number': (y) => {
      if (!big_number) return { svg: '', height: 0 };
      return {
        svg: `\n  <!-- big number deco -->\n  <text x="${W - 60}" y="${y + 160}" text-anchor="end" fill="${primary}" fill-opacity="0.06" font-size="200" font-weight="900" letter-spacing="-10">${esc(big_number)}</text>`,
        height: 0  // decorative only, no layout height
      };
    },

    'divider': (y) => ({
      svg: `\n  <line x1="60" y1="${y + 1}" x2="${W - 60}" y2="${y + 1}" stroke="${secondary}" stroke-width="1" stroke-opacity="0.25"/>`,
      height: 14
    }),

    'spacer': () => ({ svg: '', height: 14 }),
  };

  // ── Render all blocks ─────────────────────────────────────────────────────
  const TOP_OFFSET = 130;  // below the top bar
  const BOTTOM_RESERVED = 110;  // above the bottom bar
  const BLOCK_GAP = 18;

  let yPos = TOP_OFFSET;
  let allBlockSvg = '';

  for (const name of blocks) {
    const renderer = svgBlocks[name];
    if (!renderer) continue;
    const { svg, height } = renderer(yPos);
    allBlockSvg += svg;
    yPos += height + (height > 0 ? BLOCK_GAP : 0);
  }

  // ── Bottom bar ────────────────────────────────────────────────────────────
  const finalH = Math.max(1350, yPos + BOTTOM_RESERVED);
  const barY   = finalH - 86;

  const svgBottomBar = `
  <!-- Bottom Bar -->
  <rect x="0" y="${barY}" width="${W}" height="86" fill="${primary}" fill-opacity="0.06" stroke="none"/>
  <line x1="0" y1="${barY}" x2="${W}" y2="${barY}" stroke="${secondary}" stroke-width="1" stroke-opacity="0.3"/>
  <circle cx="80" cy="${barY + 43}" r="18" fill="${primary}" fill-opacity="0.15" stroke="${primary}" stroke-width="1.5" stroke-opacity="0.5"/>
  <text x="80" y="${barY + 48}" text-anchor="middle" fill="${primary}" font-size="10" font-weight="700">AI</text>
  <text x="110" y="${barY + 50}" fill="${mutedCol}" font-size="17" font-weight="600">${esc(instagramHandle)}</text>
  <!-- swipe dots -->
  <rect x="${W - 130}" y="${barY + 38}" width="24" height="8" rx="4" fill="${primary}"/>
  <circle cx="${W - 96}" cy="${barY + 42}" r="4" fill="${mutedCol}" fill-opacity="0.35"/>
  <circle cx="${W - 82}" cy="${barY + 42}" r="4" fill="${mutedCol}" fill-opacity="0.35"/>
  <circle cx="${W - 68}" cy="${barY + 42}" r="4" fill="${mutedCol}" fill-opacity="0.35"/>`;

  // ── Assemble SVG ──────────────────────────────────────────────────────────
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"
     viewBox="0 0 ${W} ${finalH}" width="${W}" height="${finalH}">
${svgDefs}
  <!-- Background -->
  <rect width="${W}" height="${finalH}" fill="${bg}"/>
  ${svgBackground}
  <!-- Top Bar -->
  ${svgTopBar}
  <!-- Blocks -->
  ${allBlockSvg}
  <!-- Bottom Bar -->
  ${svgBottomBar}
</svg>`;
}

module.exports = { createCarouselSlideSVG };
