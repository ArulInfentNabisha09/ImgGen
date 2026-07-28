const fs = require('fs');

// Timeout for Vision + T2I NVIDIA API calls
const NVIDIA_TIMEOUT_MS = 60_000;
// Separate, longer timeout for the text LLM routing step (8B model is fast but NVIDIA inference can be slow)
const LLM_ROUTER_TIMEOUT_MS = 180_000;
// Max prompt length for FLUX.1-schnell (keeps it fast & avoids gateway timeouts)
const MAX_PROMPT_LENGTH = 900;

class NvidiaProvider {
  constructor() {
    this.apiKey = process.env.NVIDIA_API_KEY;
    this.visionEndpoint  = 'https://integrate.api.nvidia.com/v1/chat/completions';
    this.t2iEndpoint     = 'https://ai.api.nvidia.com/v1/genai/black-forest-labs/flux.1-schnell';
  }

  // ─── Vision: image → strict text description ─────────────────────────────
  async describeImage(imagePath) {
    console.log(`[NVIDIA Vision] Analyzing ${imagePath}...`);
    const imageBuffer  = fs.readFileSync(imagePath);
    const base64Image  = `data:image/jpeg;base64,${imageBuffer.toString('base64')}`;

    const payload = {
      model: 'meta/llama-3.2-11b-vision-instruct',
      messages: [{
        role: 'user',
        content: [
          { type: 'text', text: 'Describe the contents of this image in extreme detail. Include subjects, objects, layout, and colors. Output only the description.' },
          { type: 'image_url', image_url: { url: base64Image } }
        ]
      }],
      max_tokens: 300,
      temperature: 0.1,
      top_p: 1
    };

    const response = await fetch(this.visionEndpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(NVIDIA_TIMEOUT_MS)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`NVIDIA Vision API Error ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    if (!data.choices?.[0]?.message?.content) {
      throw new Error(`Unexpected response from NVIDIA Vision: ${JSON.stringify(data)}`);
    }
    return data.choices[0].message.content;
  }

  // ─── LLM Router: description + user batch prompt → specific T2I prompt ───
  async routePrompt(baseDescription, userPrompt) {
    console.log(`[NVIDIA LLM] Routing instructions for this specific image...`);
    
    const systemInstruction = `You are a strict Image Prompt Engineer. 
You will be given the description of a single image, and a batch of user instructions that were meant for multiple different images.

YOUR JOB:
1. Read the image description to understand what is actually in this specific image.
2. Read the user instructions.
3. Identify which parts of the user instructions logically apply to THIS image. Ignore instructions meant for other subjects.
4. Output the final image generation prompt that combines the original scene + the relevant user instructions.

CRITICAL RULES:
- If a user instruction targets a specific subject (e.g., "make the car red"), but that subject does NOT exist in the base description, DO NOT hallucinate or add it! Ignore that specific instruction and only apply the global styles.
- If a user instruction completely reimagines a subject that DOES exist in the base image (e.g., "turn the coffee cup into a bowl of soup"), YOU MUST completely rewrite that part of the scene to match the user's intent, replacing the original subject.
- If the user wants a character to SAY something or wants TEXT in the image, you MUST translate that into explicit visual instructions for the image generator. (e.g., "with a white speech bubble containing the exact text 'Hello'" or "holding a sign that says 'Hello'").
- Do not output any conversational text, just the final image generation prompt.`;

    const payload = {
      // Using 8B instead of 70B — routing logic is simple enough and 8B is significantly faster
      model: 'meta/llama-3.1-8b-instruct',
      messages: [
        { role: 'system', content: systemInstruction },
        { role: 'user', content: `Base Image Description: ${baseDescription}\n\nUser's Batch Instructions: ${userPrompt}` }
      ],
      max_tokens: 300,
      temperature: 0.1,
      top_p: 1
    };

    const response = await fetch(this.visionEndpoint, { // same endpoint for chat completions
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(LLM_ROUTER_TIMEOUT_MS)
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`[NVIDIA LLM] Failed to route prompt. Status: ${response.status}. Error: ${errText}`);
    }

    const data = await response.json();
    return data.choices[0].message.content.trim();
  }

  // ─── Slide Designer: OCR data + Image + user prompt → full creative design spec ──
  async designSlide(ocrData, userPrompt, base64Image = null) {
    console.log(`[NVIDIA Slide Designer] Generating creative design spec...`);

    const systemInstruction = `You are a world-class Instagram carousel slide designer AND copywriter with the aesthetic sensibility of a top creative agency.

You will receive:
1. The original OCR text extracted from a slide image (raw content)
2. The ACTUAL image of the original slide (if available)
3. The user's creative instructions

YOUR TASK:
A) PRESERVE slide content EXACTLY: The tool_name and headline must be taken DIRECTLY from the OCR text or the image itself. Do NOT invent new topic titles or new headlines. You may clean up OCR artifacts (extra whitespace, weird characters) but preserve all words, meaning, code snippets, and key facts 100% faithfully. If the original slide says "HTML Video", your headline MUST say something related to "HTML Video" and NEVER suddenly switch to "HTML Tables" or any other unrelated topic. Do not hallucinate content!
B) DESIGN the slide: Look closely at the structural layout of the provided image (e.g., is there a laptop mockup? is there a code block? is there a logo?). Intentionally pick HTML layout blocks that match the structural intent of the original slide, but redesign it with a unique, visually striking, PREMIUM color scheme and aesthetic. Be BOLD and CREATIVE. If the slide contains a code snippet, put that code inside bullet_points so the mockup-window can display it.
C) GENERATE an image prompt: Write a highly detailed AI image generation prompt for the slide's visual mockup ONLY if wants_illustration is true.

AVAILABLE BLOCKS — you will construct the slide by stacking these blocks vertically:
- "badge" (small label pill)
- "title-group" (tool_name + headline)
- "headline-giant" (just headline, extra large)
- "taglines" (subtitles)
- "mockup-window" (browser frame showing an illustration image when wants_illustration=true)
- "code-block" (VS Code-style syntax-highlighted code editor — USE THIS for slides with code snippets, HTML tags, CSS, JS, etc. Put each line of code as a separate bullet_point)
- "bullets-list" (standard vertical bullet points for plain text lists)
- "bullets-grid" (2-column grid of bullets)
- "bullets-icon" (bullets with icons for features/benefits)
- "speech-bubbles" (floating speech-bubble style labels)
- "quote-box" (italic pull-quote block)
- "url-pill" (call-to-action link)
- "chip-group" (small extra info chips)
- "comparison-table" (table comparing features — requires comparison_rows)
- "statistics-grid" (grid of numbers/stats — requires statistics)

IMAGE RULE — Look at the original slide image carefully:
- Set "wants_illustration" to true if the original slide contains ANY prominent visual element such as: a laptop, tablet, phone, monitor, device mockup, logo, icon, video player, diagram, chart, infographic, screenshot, person, object, or decorative illustration.
- Set "wants_illustration" to false ONLY if the original slide's content is purely textual (bullet lists, tables, checklists, plain text) with NO central image/device.
- When wants_illustration is true, the "image_prompt" MUST describe a visual that closely matches what was in the original (e.g. if original had a laptop with code, write a prompt for a laptop with code). Keep the same subject matter but elevate the style to match the new premium aesthetic.

DECORATION STYLE — pick based on content:
- "tech": Sparkle stars, dot grids, code brackets, glow orbs (for coding/AI/software content)
- "organic": Leaf shapes, sparkles, dot grids (for lifestyle/education/wellness content)
- "geometric": Rings, circles, dot grids (for minimal/business/finance content)

AVAILABLE BULLET STYLES: chevron, dot, dash, star, numbered

DESIGN RULES:
- Build a layout by picking 3-6 blocks and placing them in a logical top-to-bottom order in the 'layout_blocks' array.
  - Cover slide example: ["accent-line", "badge", "title-group", "taglines", "url-pill"]
  - Comparison slide example: ["title-group", "comparison-table", "chip-group"]
  - Data/Metrics slide example: ["title-group", "statistics-grid", "divider", "quote-center"]
  - Standard list example: ["title-group", "mockup-window", "bullets-list"]

If you pick 'comparison-table', you MUST populate 'comparison_rows' (e.g. feature, col1, col2).
If you pick 'statistics-grid', you MUST populate 'statistics' (e.g. number, label).

- Use RICH, HARMONIOUS color palettes — never boring defaults. Try: sunset oranges, forest greens, deep purples, warm ambers, ocean teals.
- Use Google Fonts — be specific (e.g., "Space Grotesk", "Syne", "DM Sans", "Playfair Display", "Rajdhani", "Nunito")
- The bgGradient MUST be a beautiful CSS radial or linear gradient string, not just a color.
- showAccentLine should almost always be true.
- showDecorations should almost always be true.

OUTPUT ONLY a raw JSON object (no markdown, no code fences) with this EXACT structure:
{
  "badge": "Short label text or null",
  "big_number": "Decorative number like #01 or 04 or null",
  "tool_name": "Main product/topic title",
  "headline": "The main headline",
  "taglines": ["Punchy subtitle 1", "Subtitle 2"],
  "bullet_points": ["Key point 1", "Key point 2"],
  "comparison_rows": [{"feature": "Feature 1", "col1": "A info", "col2": "B info"}],
  "statistics": [{"number": "99%", "label": "Uptime"}],
  "quote": "Italic pull-quote text or null",
  "url": "URL or null",
  "other": ["Extra chip text"],
  "wants_illustration": false,
  "width": 1080,
  "height": 1350,
  "layout_blocks": ["badge", "title-group", "mockup-window", "bullets-grid"],
  "bg": "#hex background base color",
  "bgGradient": "radial-gradient(...) or linear-gradient(...) CSS string",
  "primary": "#hex main accent",
  "secondary": "#hex secondary accent",
  "accent": "#hex third accent",
  "textColor": "#hex main text",
  "mutedColor": "rgba or hex muted text",
  "cardBg": "rgba card background",
  "borderColor": "rgba border color",
  "fontHeading": "Google Font name for headings",
  "fontBody": "Google Font name for body text",
  "badgeBg": "CSS background for badge",
  "badgeBorder": "CSS border color for badge",
  "badgeText": "#hex badge text color",
  "bulletStyle": "chevron",
  "headlineWeight": "900",
  "headlineStyle": "normal",
  "showAccentLine": true,
  "accentLineGradient": "CSS linear-gradient for accent line",
  "showDecorations": true,
  "decorationStyle": "tech",
  "image_prompt": "When wants_illustration is true: describe the EXACT visual that was in the original (e.g. 'sleek MacBook laptop showing HTML code on screen, dark background, neon green terminal text, ultra realistic 3D render, dramatic lighting'). Match the subject of the original image but elevate the style to match the new premium aesthetic."
}

IMPORTANT for width/height: Default is 1080x1350. Only change if the user explicitly requests a different size.`;

    const userTextContent = `USER INSTRUCTIONS: "${userPrompt || 'Keep content accurate. Design a beautiful, premium Instagram carousel slide with a professional dark aesthetic.'}"

ORIGINAL OCR TEXT FROM SLIDE:
${JSON.stringify(ocrData, null, 2)}

Output the complete creative design JSON:`;

    let userMessageContent;
    if (base64Image) {
      userMessageContent = [
        { type: "text", text: userTextContent },
        { type: "image_url", image_url: { url: `data:image/jpeg;base64,${base64Image}` } }
      ];
    } else {
      userMessageContent = userTextContent;
    }

    const payload = {
      model: 'meta/llama-3.2-90b-vision-instruct',
      messages: [
        { role: 'system', content: systemInstruction },
        { role: 'user', content: userMessageContent }
      ],
      max_tokens: 1200,
      temperature: 0.6,
      top_p: 0.95
    };

      const MAX_RETRIES = 3;
      let lastError;

      for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
          const response = await fetch(this.visionEndpoint, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${this.apiKey}`,
              'Content-Type': 'application/json',
              'Accept': 'application/json'
            },
            body: JSON.stringify(payload),
            signal: AbortSignal.timeout(LLM_ROUTER_TIMEOUT_MS)
          });

          if (!response.ok) {
            const errText = await response.text();
            throw new Error(`Status: ${response.status}. Error: ${errText}`);
          }

          const data = await response.json();
          let rawContent = (data.choices?.[0]?.message?.content || '').trim();
          console.log(`[NVIDIA Slide Designer] Raw response (first 300 chars): ${rawContent.substring(0, 300)}`);

          // Extract first JSON object via greedy matching balanced braces (robust)
          // Look for { followed by anything, ending with }
          const objMatch = rawContent.match(/\{[\s\S]*\}/);
          if (objMatch) {
            try { 
              const parsed = JSON.parse(objMatch[0]); 
              return parsed;
            } catch (parseErr) {
              console.warn(`[NVIDIA Slide Designer] JSON parse failed on attempt ${attempt}: ${parseErr.message}`);
              throw new Error('Failed to parse JSON');
            }
          } else {
             throw new Error('No JSON object found in response');
          }

        } catch (err) {
          lastError = err;
          console.warn(`[NVIDIA Slide Designer] Attempt ${attempt} failed: ${err.message}`);
          if (attempt < MAX_RETRIES) {
             console.log(`[NVIDIA Slide Designer] Retrying (${attempt + 1}/${MAX_RETRIES})...`);
             await new Promise(r => setTimeout(r, 2000 * attempt)); // exponential backoff
          }
        }
      }

      console.warn(`[NVIDIA Slide Designer] All ${MAX_RETRIES} attempts failed. Returning raw OCR data with no design spec. Last error: ${lastError?.message}`);
      return ocrData; // fallback: original OCR data, default theme
    }

  // ─── Text-to-Image: prompt → image buffer ────────────────────────────────
  async generateImage(prompt) {
    // Trim prompt to avoid 504 timeouts from overly long inputs
    const trimmedPrompt = prompt.length > MAX_PROMPT_LENGTH
      ? prompt.substring(0, MAX_PROMPT_LENGTH)
      : prompt;

    console.log(`[NVIDIA T2I] Generating image (prompt: ${trimmedPrompt.length} chars)...`);

    // Retry up to 2 times on gateway errors (504 / 503)
    const MAX_RETRIES = 2;
    let lastError;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        const payload = {
          prompt: trimmedPrompt,
          seed: 0,         // 0 = random seed each time
          width: 1024,
          height: 1024,
          steps: 4         // FLUX.1-schnell: max 4 steps
        };

        const response = await fetch(this.t2iEndpoint, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify(payload),
          signal: AbortSignal.timeout(NVIDIA_TIMEOUT_MS)
        });

        if (!response.ok) {
          const errorText = await response.text();
          const status = response.status;

          // Retry on gateway/server errors
          if ((status === 504 || status === 503 || status === 502) && attempt < MAX_RETRIES) {
            console.warn(`[NVIDIA T2I] Attempt ${attempt} got ${status}, retrying...`);
            lastError = new Error(`NVIDIA T2I ${status} on attempt ${attempt}`);
            continue;
          }

          throw new Error(`NVIDIA Generation API Error ${status}: ${errorText}`);
        }

        const data = await response.json();

        // Response format: { artifacts: [{ base64: '...' }] }
        if (data.artifacts?.[0]?.base64) {
          console.log(`[NVIDIA T2I] ✅ Image generated successfully`);
          return {
            imageBuffer: Buffer.from(data.artifacts[0].base64, 'base64'),
            format: 'buffer'
          };
        }

        // Alternate format: { image: '...' }
        if (data.image) {
          console.log(`[NVIDIA T2I] ✅ Image generated successfully`);
          return {
            imageBuffer: Buffer.from(data.image, 'base64'),
            format: 'buffer'
          };
        }

        throw new Error(`NVIDIA T2I returned unexpected format. Keys: ${Object.keys(data).join(', ')}`);

      } catch (err) {
        if (err.name === 'TimeoutError') {
          console.warn(`[NVIDIA T2I] Attempt ${attempt} timed out after ${NVIDIA_TIMEOUT_MS / 1000}s`);
          lastError = new Error(`NVIDIA T2I timed out on attempt ${attempt}`);
          continue;
        }
        throw err; // non-retryable error
      }
    }

    throw new Error(`NVIDIA T2I failed after ${MAX_RETRIES} attempts: ${lastError?.message}`);
  }

  // ─── OCR: image → structured JSON of all visible text ────────────────────
  async extractTextOCR(imagePath) {
    console.log(`[NVIDIA OCR] Extracting text from ${imagePath}...`);
    const imageBuffer = fs.readFileSync(imagePath);
    const base64Image = `data:image/jpeg;base64,${imageBuffer.toString('base64')}`;

    const prompt = `You are a precise OCR and content extraction system. Your job is to read EVERY piece of text from this image EXACTLY as written — do not paraphrase, summarize or rewrite anything. NEVER hallucinate topics. If the slide is about "Video", do not write "Tables". Read ONLY what is there.

Return ONLY a single valid JSON object (no markdown, no code fences, no explanation) with this exact structure:
{
  "badge": "small top label like 'TOP TOOL #1', or null if not present",
  "big_number": "large decorative number like '#01' or '04', or null if not present",
  "tool_name": "the main product or tool name as shown (with any numbering prefix like '#1: AutoHedge')",
  "headline": "the main headline text — join multiple lines with \\n",
  "taglines": ["short sub-tagline 1", "tagline 2"],
  "bullet_points": ["exact bullet or feature text 1", "exact text 2"],
  "quote": "any italic, cursive, arrow-style or quote text, or null",
  "url": "any URL, GitHub link, or domain shown, or null",
  "other": ["any remaining text that does not fit above"]
}

Critical rules: Extract character-for-character. Do NOT include old Instagram handles or @usernames in any field. Return valid JSON only.`;

    const payload = {
      model: 'meta/llama-3.2-11b-vision-instruct',
      messages: [{
        role: 'user',
        content: [
          { type: 'text',      text: prompt },
          { type: 'image_url', image_url: { url: base64Image } }
        ]
      }],
      max_tokens: 700,
      temperature: 0.05,
      top_p: 1
    };

    const response = await fetch(this.visionEndpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(NVIDIA_TIMEOUT_MS)
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`NVIDIA OCR Error ${response.status}: ${errText}`);
    }

    const data       = await response.json();
    let rawContent   = (data.choices?.[0]?.message?.content || '').trim();
    console.log(`[NVIDIA OCR] Raw response: ${rawContent.substring(0, 200)}...`);

    // Extract first JSON object via greedy matching balanced braces (robust)
    const objMatch = rawContent.match(/\{[\s\S]*\}/);
    if (objMatch) {
      try { return JSON.parse(objMatch[0]); } catch (e) { console.warn(`[NVIDIA OCR] Parse err: ${e.message}`); }
    }

    // Fallback: return minimal object so the pipeline doesn't crash
    console.warn('[NVIDIA OCR] Could not parse JSON, using raw text as headline fallback.');
    return { headline: rawContent, taglines: [], bullet_points: [], other: [] };
  }
}

module.exports = new NvidiaProvider();
