/**
 * carouselTemplate.js  — v3  (Modular Block Engine)
 *
 * The AI returns a `layout_blocks` array like:
 *   ["badge", "title-group", "mockup-window", "bullets-grid", "quote-box", "url-pill"]
 *
 * Each entry maps to one of the block renderers below.
 * Blocks are stacked vertically in a flex column — order them however you want.
 *
 * Available blocks:
 *   badge           — small label pill
 *   accent-line     — coloured divider bar
 *   title-group     — tool_name + headline (default big title)
 *   headline-giant  — just the headline, very large
 *   taglines        — subtitle row(s)
 *   tagline-band    — headline in a full-width accent-coloured band
 *   mockup-window   — browser frame containing image or text bullets
 *   bullets-list    — vertical bordered bullet list
 *   bullets-grid    — 2-column card grid of bullets
 *   bullets-icon    — numbered / icon-led bullets with side accent bar
 *   speech-bubbles  — floating label bubbles left/right of a central mockup
 *   quote-box       — italic pull-quote with left border
 *   quote-center    — centred italic quote with large decorative marks
 *   url-pill        — CTA link chip
 *   chip-group      — small rounded chips for tags / features
 *   big-number      — giant faded decorative number
 *   divider         — thin separator line
 *   spacer          — empty vertical spacer (small)
 */

function createCarouselSlideHTML(data = {}, instagramHandle = '@yourbrand', imageUrl = null, designSpec = null) {
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

  // ── Design defaults ──────────────────────────────────────────────────────
  const D = {
    width:  1080, height: 1350,
    layout_blocks: ['accent-line', 'title-group', 'taglines', 'mockup-window', 'bullets-list', 'url-pill'],
    bg:      '#060914',
    bgGradient: 'radial-gradient(ellipse 80% 60% at 10% 5%, rgba(99,102,241,0.3) 0%, transparent 60%), radial-gradient(ellipse 70% 55% at 90% 95%, rgba(0,212,255,0.22) 0%, transparent 60%)',
    primary:   '#00d4ff',  secondary:  '#6366f1',  accent: '#a855f7',
    textColor: '#ffffff',  mutedColor: 'rgba(255,255,255,0.6)',
    cardBg:    'rgba(255,255,255,0.06)',  borderColor: 'rgba(255,255,255,0.12)',
    fontHeading: 'Outfit', fontBody: 'Inter',
    badgeBg: 'rgba(99,102,241,0.25)', badgeBorder: 'rgba(99,102,241,0.5)', badgeText: '#a5b4fc',
    bulletStyle:    'chevron',
    headlineWeight: '900',  headlineStyle: 'normal',
    showAccentLine:      true,
    accentLineGradient: 'linear-gradient(90deg, #00d4ff, #6366f1, transparent)',
    showDecorations:  true,
    decorationStyle: 'tech',
  };

  const raw  = designSpec || {};
  const spec = { ...D, ...raw };

  // ── Sanitation: fix common AI colour mistakes ────────────────────────────
  const sanitiseColor = (val, fallback) => {
    if (!val) return fallback;
    if (/^#[0-9a-fA-F]{3,8}$/.test(String(val))) return val; // valid hex
    if (/^[a-zA-Z]+$/.test(String(val))) return val;          // named colour
    // rgba → extract rgb channels → hex
    const m = String(val).match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
    if (m) return '#' + [m[1],m[2],m[3]].map(n => parseInt(n).toString(16).padStart(2,'0')).join('');
    return fallback;
  };
  spec.bg        = sanitiseColor(spec.bg,        D.bg);
  spec.primary   = sanitiseColor(spec.primary,   D.primary);
  spec.secondary = sanitiseColor(spec.secondary, D.secondary);
  spec.accent    = sanitiseColor(spec.accent,    D.accent);
  spec.textColor = '#ffffff'; // always white — background handles contrast

  // Ensure bgGradient is a valid string
  if (!spec.bgGradient || String(spec.bgGradient).length < 10) {
    spec.bgGradient = `radial-gradient(ellipse 80% 60% at 10% 5%, ${spec.secondary}44 0%, transparent 60%), radial-gradient(ellipse 70% 55% at 90% 95%, ${spec.primary}33 0%, transparent 60%)`;
  }

  // Ensure layout_blocks is a valid non-empty array
  if (!Array.isArray(spec.layout_blocks) || spec.layout_blocks.length === 0) {
    spec.layout_blocks = D.layout_blocks;
  }

  // Backward compat: if old `layout` string was returned instead of layout_blocks
  if (!spec.layout_blocks && spec.layout) {
    const legacyMap = {
      'hero-magazine':   ['accent-line', 'title-group', 'taglines', 'mockup-window', 'bullets-list', 'url-pill'],
      'bold-editorial':  ['big-number', 'accent-line', 'badge', 'title-group', 'bullets-icon', 'quote-box'],
      'floating-labels': ['accent-line', 'title-group', 'speech-bubbles', 'url-pill'],
      'minimal-clean':   ['accent-line', 'badge', 'title-group', 'tagline-band', 'bullets-list', 'chip-group'],
      'hero-split':      ['accent-line', 'title-group', 'taglines', 'mockup-window', 'bullets-list'],
      'full-focus':      ['accent-line', 'title-group', 'taglines', 'bullets-icon', 'quote-box'],
      'bold-grid':       ['big-number', 'accent-line', 'title-group', 'bullets-grid'],
      'minimal-card':    ['accent-line', 'badge', 'title-group', 'tagline-band', 'bullets-list'],
    };
    spec.layout_blocks = legacyMap[spec.layout] || D.layout_blocks;
  }

  const blocks = Array.isArray(spec.layout_blocks) ? spec.layout_blocks : D.layout_blocks;

  const W = parseInt(spec.width)  || 1080;
  const H = parseInt(spec.height) || 1350;

  const esc = (t) => (t || '').toString()
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  const bullets    = (Array.isArray(bullet_points) ? bullet_points : []).slice(0, 9);
  const tlines     = (Array.isArray(taglines)       ? taglines       : []).slice(0, 3);
  const otherItems = (Array.isArray(other)           ? other          : []).slice(0, 6);
  const compRows   = Array.isArray(spec.comparison_rows) ? spec.comparison_rows.slice(0, 6) : [];
  const stats      = Array.isArray(spec.statistics)      ? spec.statistics.slice(0, 6)      : [];
  const cleanUrl   = url ? String(url).replace(/@[\w.]+/g, '').replace(/^https?:\/\//, '').replace(/\/$/, '').trim() : null;

  // ── Font imports ─────────────────────────────────────────────────────────
  const allFonts = [...new Set([spec.fontHeading, spec.fontBody, 'Inter', 'Outfit'])];
  const fontImport = allFonts.map(f => `family=${encodeURIComponent(f)}:ital,wght@0,300;0,400;0,500;0,600;0,700;0,800;0,900;1,400`).join('&');

  // ── Headline sizing ───────────────────────────────────────────────────────
  const hLen     = (headline   || '').length;
  const tLen     = (tool_name  || '').length;
  const hSize    = hLen > 100 ? '28px' : hLen > 70 ? '34px' : hLen > 45 ? '42px' : hLen > 28 ? '52px' : '64px';
  const toolSize = tLen > 30  ? '40px' : tLen > 18  ? '52px' : '68px';

  // ── Browser-window mockup helper ─────────────────────────────────────────
  const browserMockup = (content, radius = '16px') => `
    <div style="background:${spec.cardBg};border:1.5px solid ${spec.borderColor};border-radius:${radius};overflow:hidden;box-shadow:0 24px 60px rgba(0,0,0,0.4);">
      <div style="background:rgba(255,255,255,0.06);padding:12px 16px;display:flex;align-items:center;gap:8px;border-bottom:1px solid ${spec.borderColor};">
        <div style="width:12px;height:12px;border-radius:50%;background:#ff5f56;"></div>
        <div style="width:12px;height:12px;border-radius:50%;background:#ffbd2e;"></div>
        <div style="width:12px;height:12px;border-radius:50%;background:#27c93f;"></div>
      </div>
      ${content}
    </div>`;

  // ═══════════════════════════════════════════════════════════════════════════
  //  BLOCK RENDERERS
  //  Each returns an HTML string (empty string if nothing to render).
  // ═══════════════════════════════════════════════════════════════════════════

  const BLOCKS = {

    // ── badge ──────────────────────────────────────────────────────────────
    'badge': () => badge ? `
      <div style="display:inline-flex;align-items:center;background:${spec.badgeBg};border:1px solid ${spec.badgeBorder};border-radius:24px;padding:8px 20px;align-self:flex-start;">
        <span style="font-family:'${spec.fontHeading}',sans-serif;font-size:13px;font-weight:700;color:${spec.badgeText};letter-spacing:0.08em;">${esc(badge.toUpperCase())}</span>
      </div>` : '',

    // ── accent-line ────────────────────────────────────────────────────────
    'accent-line': () => spec.showAccentLine ? `
      <div style="width:72px;height:5px;border-radius:3px;background:${spec.accentLineGradient || `linear-gradient(90deg,${spec.primary},${spec.secondary},transparent)`};"></div>` : '',

    // ── title-group ────────────────────────────────────────────────────────
    'title-group': () => `
      <div>
        ${tool_name ? `<div style="font-family:'${spec.fontHeading}',sans-serif;font-size:${toolSize};font-weight:900;font-style:${spec.headlineStyle};color:${spec.primary};line-height:1.05;letter-spacing:-2px;">${esc(tool_name)}</div>` : ''}
        ${headline  ? `<div style="font-family:'${spec.fontHeading}',sans-serif;font-size:${hSize};font-weight:${spec.headlineWeight};font-style:${spec.headlineStyle};color:${spec.textColor};line-height:1.12;letter-spacing:-0.5px;">${esc(headline)}</div>` : ''}
      </div>`,

    // ── headline-giant ─────────────────────────────────────────────────────
    'headline-giant': () => headline ? `
      <div style="font-family:'${spec.fontHeading}',sans-serif;font-size:80px;font-weight:900;font-style:${spec.headlineStyle};color:${spec.textColor};line-height:1.05;letter-spacing:-3px;">${esc(headline)}</div>` : '',

    // ── taglines ───────────────────────────────────────────────────────────
    'taglines': () => tlines.length > 0 ? `
      <div style="display:flex;flex-direction:column;gap:6px;">
        ${tlines.map(t => `<div style="font-family:'${spec.fontBody}',sans-serif;font-size:20px;font-weight:500;color:${spec.mutedColor};line-height:1.5;">${esc(t)}</div>`).join('')}
      </div>` : '',

    // ── tagline-band ───────────────────────────────────────────────────────
    'tagline-band': () => tlines.length > 0 ? `
      <div>
        <div style="display:inline-block;background:${spec.primary};border-radius:10px;padding:12px 24px;margin-bottom:10px;">
          <span style="font-family:'${spec.fontHeading}',sans-serif;font-size:20px;font-weight:800;color:#000;">${esc(tlines[0])}</span>
        </div>
        ${tlines.slice(1).map(t => `<div style="font-family:'${spec.fontBody}',sans-serif;font-size:17px;color:${spec.mutedColor};margin-top:4px;">${esc(t)}</div>`).join('')}
      </div>` : '',

    // ── mockup-window ──────────────────────────────────────────────────────
    'mockup-window': () => {
      const content = imageUrl
        ? `<img src="${imageUrl}" style="width:100%;display:block;"/>`
        : `<div style="padding:24px 22px;">
            ${bullets.slice(0, 5).map(b => `
              <div style="display:flex;align-items:center;gap:12px;padding:11px 0;border-bottom:1px solid ${spec.borderColor};">
                <div style="min-width:26px;height:26px;border-radius:7px;background:${spec.primary}20;border:1px solid ${spec.primary}40;display:flex;align-items:center;justify-content:center;color:${spec.primary};font-size:12px;font-weight:700;">›</div>
                <span style="font-family:'${spec.fontBody}',sans-serif;font-size:16px;color:${spec.textColor};line-height:1.4;">${esc(b)}</span>
              </div>`).join('')}
           </div>`;
      return browserMockup(content, '18px');
    },

    // ── code-block ─────────────────────────────────────────────────────────
    // A standalone, VS Code-style syntax-highlighted code editor block.
    'code-block': () => bullets.length > 0 ? (() => {
      const tokenize = (line) => {
        return line
          .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
          // HTML tags
          .replace(/(&lt;\/?[\w\s="'.\-:]+&gt;)/g, `<span style="color:#4ec9b0;">$1</span>`)
          // CSS properties / values
          .replace(/([\w-]+)(:)/g, `<span style="color:#9cdcfe;">$1</span><span style="color:#d4d4d4;">$2</span>`)
          // Strings
          .replace(/(".*?"|'.*?')/g, `<span style="color:#ce9178;">$1</span>`)
          // Numbers
          .replace(/\b(\d+(%|px|em|rem|vh|vw)?)\b/g, `<span style="color:#b5cea8;">$1</span>`)
          // Comments
          .replace(/(\/\/.*|\/\*[\s\S]*?\*\/)/g, `<span style="color:#6a9955;font-style:italic;">$1</span>`);
      };
      return `
      <div style="border-radius:14px;overflow:hidden;border:1.5px solid ${spec.borderColor};box-shadow:0 16px 40px rgba(0,0,0,0.4);">
        <div style="background:#1e1e1e;padding:10px 16px;display:flex;align-items:center;justify-content:space-between;">
          <div style="display:flex;gap:7px;">
            <span style="width:12px;height:12px;border-radius:50%;background:#ff5f57;display:inline-block;"></span>
            <span style="width:12px;height:12px;border-radius:50%;background:#ffbd2e;display:inline-block;"></span>
            <span style="width:12px;height:12px;border-radius:50%;background:#28c840;display:inline-block;"></span>
          </div>
          <span style="font-family:'JetBrains Mono','Fira Code',monospace;font-size:11px;color:#6a6a6a;">index.html</span>
        </div>
        <div style="background:#1e1e1e;padding:18px 16px;overflow:hidden;">
          <table style="border-collapse:collapse;width:100%;">
            ${bullets.map((line, i) => `
            <tr>
              <td style="width:30px;padding:1.5px 12px 1.5px 0;font-family:'JetBrains Mono','Fira Code',monospace;font-size:13px;color:#4a4a5a;text-align:right;user-select:none;vertical-align:top;">${i+1}</td>
              <td style="padding:1.5px 0;font-family:'JetBrains Mono','Fira Code',monospace;font-size:13px;line-height:1.7;color:#d4d4d4;white-space:pre;">${tokenize(line)}</td>
            </tr>`).join('')}
          </table>
        </div>
      </div>`;
    })() : '',

    // ── bullets-list ───────────────────────────────────────────────────────
    'bullets-list': () => bullets.length > 0 ? `
      <div style="display:flex;flex-direction:column;gap:10px;">
        ${bullets.map((b, i) => `
          <div style="display:flex;align-items:flex-start;gap:12px;background:${spec.cardBg};border:1px solid ${spec.borderColor};border-left:3px solid ${spec.primary};border-radius:12px;padding:14px 16px;">
            ${spec.bulletStyle === 'numbered'
              ? `<span style="font-family:'${spec.fontHeading}',sans-serif;font-size:13px;font-weight:800;color:${spec.primary};min-width:22px;line-height:1.6;">${String(i+1).padStart(2,'0')}</span>`
              : `<span style="color:${spec.primary};font-size:17px;line-height:1.5;font-weight:700;">›</span>`}
            <span style="font-family:'${spec.fontBody}',sans-serif;font-size:16px;color:${spec.textColor};line-height:1.45;">${esc(b)}</span>
          </div>`).join('')}
      </div>` : '',

    // ── bullets-grid ───────────────────────────────────────────────────────
    'bullets-grid': () => bullets.length > 0 ? `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
        ${bullets.map((b, i) => `
          <div style="display:flex;flex-direction:column;gap:8px;background:${spec.cardBg};border:1px solid ${spec.borderColor};border-radius:14px;padding:16px;">
            <div style="width:28px;height:28px;border-radius:8px;background:${spec.primary}25;border:1px solid ${spec.primary}40;display:flex;align-items:center;justify-content:center;">
              ${spec.bulletStyle === 'numbered'
                ? `<span style="font-family:'${spec.fontHeading}',sans-serif;font-size:12px;font-weight:800;color:${spec.primary};">${String(i+1).padStart(2,'0')}</span>`
                : `<span style="color:${spec.primary};font-size:14px;font-weight:700;">›</span>`}
            </div>
            <span style="font-family:'${spec.fontBody}',sans-serif;font-size:14px;color:${spec.textColor};line-height:1.4;">${esc(b)}</span>
          </div>`).join('')}
      </div>` : '',

    // ── comparison-table ───────────────────────────────────────────────────
    'comparison-table': () => compRows.length > 0 ? `
      <div style="background:${spec.cardBg};border:1.5px solid ${spec.borderColor};border-radius:16px;overflow:hidden;box-shadow:0 12px 30px rgba(0,0,0,0.2);">
        <table style="width:100%;border-collapse:collapse;text-align:left;">
          <thead>
            <tr style="background:rgba(255,255,255,0.05);border-bottom:2px solid ${spec.primary}50;">
              <th style="padding:16px;font-family:'${spec.fontHeading}',sans-serif;font-size:14px;font-weight:700;color:${spec.mutedColor};text-transform:uppercase;letter-spacing:1px;width:34%;">FEATURE</th>
              <th style="padding:16px;font-family:'${spec.fontHeading}',sans-serif;font-size:15px;font-weight:800;color:${spec.primary};text-align:center;width:33%;">A</th>
              <th style="padding:16px;font-family:'${spec.fontHeading}',sans-serif;font-size:15px;font-weight:800;color:${spec.secondary};text-align:center;width:33%;">B</th>
            </tr>
          </thead>
          <tbody>
            ${compRows.map((row, i) => `
            <tr style="border-bottom:1px solid ${spec.borderColor};background:${i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)'};">
              <td style="padding:16px;font-family:'${spec.fontBody}',sans-serif;font-size:15px;font-weight:600;color:${spec.textColor};">${esc(row.feature)}</td>
              <td style="padding:16px;font-family:'${spec.fontBody}',sans-serif;font-size:15px;color:${spec.textColor};text-align:center;">${esc(row.col1)}</td>
              <td style="padding:16px;font-family:'${spec.fontBody}',sans-serif;font-size:15px;color:${spec.textColor};text-align:center;">${esc(row.col2)}</td>
            </tr>
            `).join('')}
          </tbody>
        </table>
      </div>` : '',

    // ── statistics-grid ────────────────────────────────────────────────────
    'statistics-grid': () => stats.length > 0 ? `
      <div style="display:grid;grid-template-columns:repeat(${stats.length === 2 || stats.length === 4 ? 2 : 3}, 1fr);gap:16px;">
        ${stats.map(s => `
          <div style="background:${spec.cardBg};border:1px solid ${spec.borderColor};border-radius:16px;padding:24px 16px;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;">
            <div style="font-family:'${spec.fontHeading}',sans-serif;font-size:42px;font-weight:900;color:${spec.primary};line-height:1;margin-bottom:8px;letter-spacing:-1px;">${esc(s.number)}</div>
            <div style="font-family:'${spec.fontBody}',sans-serif;font-size:14px;font-weight:600;color:${spec.mutedColor};text-transform:uppercase;letter-spacing:1px;line-height:1.3;">${esc(s.label)}</div>
          </div>
        `).join('')}
      </div>` : '',

    // ── bullets-icon ───────────────────────────────────────────────────────
    'bullets-icon': () => bullets.length > 0 ? `
      <div style="display:flex;flex-direction:column;gap:14px;">
        ${bullets.map((b, i) => `
          <div style="display:flex;align-items:flex-start;gap:16px;">
            <div style="flex-shrink:0;width:36px;height:36px;border-radius:10px;background:linear-gradient(135deg,${spec.primary}33,${spec.secondary}33);border:1px solid ${spec.primary}44;display:flex;align-items:center;justify-content:center;font-family:'${spec.fontHeading}',sans-serif;font-size:14px;font-weight:900;color:${spec.primary};">${String(i+1).padStart(2,'0')}</div>
            <span style="font-family:'${spec.fontBody}',sans-serif;font-size:17px;color:${spec.textColor};line-height:1.5;padding-top:8px;">${esc(b)}</span>
          </div>`).join('')}
      </div>` : '',

    // ── speech-bubbles ─────────────────────────────────────────────────────
    'speech-bubbles': () => {
      const labels      = [...bullets.slice(0, 6), ...tlines].filter(Boolean);
      const leftLabels  = labels.slice(0, Math.ceil(labels.length / 2));
      const rightLabels = labels.slice(Math.ceil(labels.length / 2));

      const bubble = (text, dir) => `
        <div style="display:flex;align-items:center;gap:8px;flex-direction:${dir === 'left' ? 'row-reverse' : 'row'};margin-bottom:14px;">
          <div style="background:${spec.cardBg};border:1.5px solid ${spec.borderColor};border-radius:12px;padding:9px 13px;max-width:165px;">
            <span style="font-family:'${spec.fontBody}',sans-serif;font-size:13px;color:${spec.textColor};line-height:1.4;">${esc(text)}</span>
          </div>
          <div style="width:28px;height:2px;background:${spec.primary};opacity:0.5;flex-shrink:0;"></div>
        </div>`;

      const mockupBody = imageUrl
        ? `<img src="${imageUrl}" style="width:100%;display:block;"/>`
        : `<div style="padding:20px;">
            ${bullets.slice(0, 4).map(b => `<div style="padding:9px 10px;background:rgba(255,255,255,0.04);border-radius:8px;margin-bottom:7px;font-family:'${spec.fontBody}',sans-serif;font-size:13px;color:${spec.mutedColor};">${esc(b)}</div>`).join('')}
           </div>`;

      return `
        <div style="display:grid;grid-template-columns:180px 1fr 180px;gap:12px;align-items:center;">
          <div style="display:flex;flex-direction:column;align-items:flex-end;">${leftLabels.map(l => bubble(l, 'right')).join('')}</div>
          <div>${browserMockup(mockupBody, '14px')}</div>
          <div style="display:flex;flex-direction:column;align-items:flex-start;">${rightLabels.map(l => bubble(l, 'left')).join('')}</div>
        </div>`;
    },

    // ── quote-box ──────────────────────────────────────────────────────────
    'quote-box': () => quote ? `
      <div style="padding:20px 24px;border-left:4px solid ${spec.primary};background:${spec.cardBg};border-radius:0 14px 14px 0;">
        <p style="font-family:'${spec.fontBody}',sans-serif;font-size:18px;font-style:italic;color:${spec.mutedColor};line-height:1.65;margin:0;">${esc(quote)}</p>
      </div>` : '',

    // ── quote-center ───────────────────────────────────────────────────────
    'quote-center': () => quote ? `
      <div style="padding:28px 32px;background:linear-gradient(135deg,${spec.primary}14,${spec.secondary}14);border-radius:18px;border:1px solid ${spec.borderColor};text-align:center;position:relative;">
        <span style="font-size:64px;line-height:0.6;color:${spec.primary};opacity:0.25;font-family:Georgia,serif;position:absolute;top:14px;left:20px;">"</span>
        <p style="font-family:'${spec.fontBody}',sans-serif;font-size:20px;font-style:italic;color:${spec.textColor};line-height:1.65;margin:0;padding:10px 20px 0;">${esc(quote)}</p>
        <span style="font-size:64px;line-height:0.6;color:${spec.primary};opacity:0.25;font-family:Georgia,serif;position:absolute;bottom:14px;right:20px;">"</span>
      </div>` : '',

    // ── url-pill ───────────────────────────────────────────────────────────
    'url-pill': () => cleanUrl ? `
      <div style="display:inline-flex;align-items:center;gap:10px;background:${spec.primary}15;border:1px solid ${spec.primary}44;border-radius:28px;padding:10px 22px;align-self:flex-start;">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="${spec.primary}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
        <span style="font-family:'${spec.fontBody}',sans-serif;font-size:15px;color:${spec.primary};font-weight:600;">${esc(cleanUrl)}</span>
      </div>` : '',

    // ── chip-group ─────────────────────────────────────────────────────────
    'chip-group': () => otherItems.length > 0 ? `
      <div style="display:flex;flex-wrap:wrap;gap:10px;">
        ${otherItems.map(item => `<span style="background:${spec.secondary}22;border:1px solid ${spec.secondary}44;border-radius:20px;padding:8px 16px;font-family:'${spec.fontBody}',sans-serif;font-size:14px;color:${spec.secondary};font-weight:600;">${esc(item)}</span>`).join('')}
      </div>` : '',

    // ── big-number ─────────────────────────────────────────────────────────
    'big-number': () => big_number ? `
      <div style="font-family:'${spec.fontHeading}',sans-serif;font-size:200px;font-weight:900;color:${spec.primary};opacity:0.06;line-height:0.9;letter-spacing:-10px;pointer-events:none;user-select:none;align-self:flex-end;margin-right:-20px;">${esc(big_number)}</div>` : '',

    // ── divider ────────────────────────────────────────────────────────────
    'divider': () => `
      <div style="width:100%;height:1px;background:${spec.borderColor};border-radius:1px;"></div>`,

    // ── spacer ─────────────────────────────────────────────────────────────
    'spacer': () => `<div style="height:8px;"></div>`,
  };

  // ═══════════════════════════════════════════════════════════════════════════
  //  DECORATIONS
  // ═══════════════════════════════════════════════════════════════════════════
  const techDecorations = () => `
    <svg style="position:absolute;top:82px;left:52px;width:28px;height:28px;opacity:0.55;" viewBox="0 0 24 24" fill="${spec.primary}"><path d="M12 2l1.6 5h5.2l-4.2 3 1.6 5-4.2-3-4.2 3 1.6-5-4.2-3h5.2z"/></svg>
    <svg style="position:absolute;top:200px;right:58px;width:18px;height:18px;opacity:0.35;" viewBox="0 0 24 24" fill="${spec.secondary}"><path d="M12 2l1.6 5h5.2l-4.2 3 1.6 5-4.2-3-4.2 3 1.6-5-4.2-3h5.2z"/></svg>
    <svg style="position:absolute;bottom:210px;left:78px;width:14px;height:14px;opacity:0.3;" viewBox="0 0 24 24" fill="${spec.accent}"><path d="M12 2l1.6 5h5.2l-4.2 3 1.6 5-4.2-3-4.2 3 1.6-5-4.2-3h5.2z"/></svg>
    <div style="position:absolute;top:62px;right:58px;display:grid;grid-template-columns:repeat(5,8px);gap:6px;opacity:0.2;">
      ${Array(15).fill(`<div style="width:8px;height:8px;border-radius:50%;background:${spec.primary};"></div>`).join('')}
    </div>
    <span style="position:absolute;top:72px;left:58px;font-family:'${spec.fontHeading}',monospace;font-size:28px;font-weight:900;color:${spec.primary};opacity:0.2;">&lt;/&gt;</span>
    <div style="position:absolute;top:-120px;left:-120px;width:380px;height:380px;border-radius:50%;background:radial-gradient(circle,${spec.secondary}2e 0%,transparent 70%);pointer-events:none;"></div>
    <div style="position:absolute;bottom:-100px;right:-100px;width:300px;height:300px;border-radius:50%;background:radial-gradient(circle,${spec.primary}1e 0%,transparent 70%);pointer-events:none;"></div>`;

  const organicDecorations = () => `
    <svg style="position:absolute;bottom:92px;left:-8px;width:155px;opacity:0.65;" viewBox="0 0 200 200">
      <ellipse cx="60" cy="150" rx="55" ry="25" fill="${spec.primary}" opacity="0.18" transform="rotate(-30 60 150)"/>
      <ellipse cx="30" cy="130" rx="40" ry="18" fill="${spec.secondary}" opacity="0.2" transform="rotate(-50 30 130)"/>
      <ellipse cx="80" cy="170" rx="35" ry="15" fill="${spec.primary}" opacity="0.15" transform="rotate(-15 80 170)"/>
    </svg>
    <svg style="position:absolute;top:58px;right:-8px;width:125px;opacity:0.6;" viewBox="0 0 200 200">
      <ellipse cx="140" cy="50" rx="50" ry="22" fill="${spec.accent}" opacity="0.2" transform="rotate(25 140 50)"/>
      <ellipse cx="160" cy="80" rx="35" ry="16" fill="${spec.primary}" opacity="0.18" transform="rotate(45 160 80)"/>
    </svg>
    <svg style="position:absolute;top:160px;left:58px;width:20px;opacity:0.45" viewBox="0 0 24 24" fill="${spec.primary}"><path d="M12 2l1.6 5h5.2l-4.2 3 1.6 5-4.2-3-4.2 3 1.6-5-4.2-3h5.2z"/></svg>
    <svg style="position:absolute;top:300px;right:68px;width:14px;opacity:0.3" viewBox="0 0 24 24" fill="${spec.secondary}"><path d="M12 2l1.6 5h5.2l-4.2 3 1.6 5-4.2-3-4.2 3 1.6-5-4.2-3h5.2z"/></svg>
    <div style="position:absolute;top:62px;right:55px;display:grid;grid-template-columns:repeat(5,8px);gap:6px;opacity:0.18;">
      ${Array(15).fill(`<div style="width:8px;height:8px;border-radius:50%;background:${spec.primary};"></div>`).join('')}
    </div>`;

  const geometricDecorations = () => `
    <div style="position:absolute;top:-60px;right:-60px;width:300px;height:300px;border-radius:50%;border:2px solid ${spec.primary};opacity:0.1;"></div>
    <div style="position:absolute;top:-30px;right:-30px;width:200px;height:200px;border-radius:50%;border:1.5px solid ${spec.secondary};opacity:0.13;"></div>
    <div style="position:absolute;bottom:-80px;left:-80px;width:340px;height:340px;border-radius:50%;border:2px solid ${spec.accent};opacity:0.09;"></div>
    <div style="position:absolute;top:62px;right:55px;display:grid;grid-template-columns:repeat(5,8px);gap:6px;opacity:0.18;">
      ${Array(15).fill(`<div style="width:8px;height:8px;border-radius:50%;background:${spec.primary};"></div>`).join('')}
    </div>
    <div style="position:absolute;bottom:200px;left:58px;width:58px;height:58px;border-radius:50%;border:2px solid ${spec.primary};opacity:0.28;"></div>`;

  const decorations = () => {
    if (!spec.showDecorations) return '';
    if (spec.decorationStyle === 'organic')   return organicDecorations();
    if (spec.decorationStyle === 'geometric') return geometricDecorations();
    return techDecorations();
  };

  // ── Top bar (always rendered) ────────────────────────────────────────────
  const topBar = () => `
    <div style="position:absolute;top:50px;left:60px;right:60px;display:flex;align-items:center;justify-content:space-between;z-index:10;">
      <div style="display:flex;align-items:center;gap:10px;">
        <div style="width:36px;height:36px;border-radius:50%;background:${spec.primary};display:flex;align-items:center;justify-content:center;font-family:'${spec.fontHeading}',sans-serif;font-weight:900;font-size:11px;color:#000;">AI</div>
        <span style="font-family:'${spec.fontHeading}',sans-serif;font-size:18px;font-weight:700;color:${spec.textColor};">${esc(instagramHandle)}</span>
      </div>
      ${big_number && !blocks.includes('big-number') ? `<span style="font-family:'${spec.fontHeading}',sans-serif;font-size:26px;font-weight:900;color:${spec.primary};opacity:0.4;letter-spacing:-1px;">${esc(big_number)}</span>` : ''}
    </div>`;

  // ── Bottom bar (always rendered) ─────────────────────────────────────────
  const bottomBar = () => `
    <div style="position:absolute;bottom:0;left:0;right:0;height:86px;background:${spec.cardBg};border-top:1.5px solid ${spec.borderColor};display:flex;align-items:center;justify-content:space-between;padding:0 52px;z-index:10;backdrop-filter:blur(8px);">
      <div style="display:flex;align-items:center;gap:10px;">
        <div style="width:30px;height:30px;border-radius:50%;border:1.5px solid ${spec.primary};display:flex;align-items:center;justify-content:center;font-size:10px;font-family:'${spec.fontHeading}',sans-serif;font-weight:800;color:${spec.primary};">AI</div>
        <span style="font-family:'${spec.fontBody}',sans-serif;font-size:16px;font-weight:600;color:${spec.mutedColor};">${esc(instagramHandle)}</span>
      </div>
      <div style="display:flex;align-items:center;gap:7px;">
        <div style="width:22px;height:6px;border-radius:3px;background:${spec.primary};"></div>
        <div style="width:6px;height:6px;border-radius:50%;background:${spec.mutedColor};opacity:0.35;"></div>
        <div style="width:6px;height:6px;border-radius:50%;background:${spec.mutedColor};opacity:0.35;"></div>
        <div style="width:6px;height:6px;border-radius:50%;background:${spec.mutedColor};opacity:0.35;"></div>
        <span style="font-family:'${spec.fontBody}',sans-serif;font-size:12px;color:${spec.mutedColor};margin-left:4px;opacity:0.55;">Swipe →</span>
      </div>
    </div>`;

  // ── Render all blocks sequentially ───────────────────────────────────────
  const renderedBlocks = blocks
    .map(name => {
      const renderer = BLOCKS[name];
      if (!renderer) return ''; // unknown block — skip
      return renderer();
    })
    .filter(Boolean)
    .join('\n');

  // ── Final HTML ────────────────────────────────────────────────────────────
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=${W}"/>
<title>Carousel Slide</title>
<link rel="preconnect" href="https://fonts.googleapis.com"/>
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin/>
<link href="https://fonts.googleapis.com/css2?${fontImport}&display=swap" rel="stylesheet"/>
<style>
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
  html,body{width:${W}px;height:${H}px;overflow:hidden;}
  body{
    width:${W}px;height:${H}px;
    background:${spec.bg};
    font-family:'${spec.fontBody}',sans-serif;
    position:relative;
  }
  .slide-root{
    position:relative;
    width:${W}px;height:${H}px;
    overflow:hidden;
    background:${spec.bg};
  }
  .bg-overlay{
    position:absolute;inset:0;
    background:${spec.bgGradient||''};
    pointer-events:none;
  }
  .content-area{
    position:absolute;
    top:120px;
    left:60px;
    right:60px;
    bottom:96px;
    display:flex;
    flex-direction:column;
    gap:18px;
    overflow:hidden;
  }
</style>
</head>
<body>
<div class="slide-root">
  <!-- Background -->
  <div class="bg-overlay"></div>

  <!-- Decorative elements -->
  ${decorations()}

  <!-- Top bar -->
  ${topBar()}

  <!-- Block stack -->
  <div class="content-area">
    ${renderedBlocks}
  </div>

  <!-- Bottom bar -->
  ${bottomBar()}
</div>
</body>
</html>`;
}

module.exports = { createCarouselSlideHTML };
