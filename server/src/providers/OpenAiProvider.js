/**
 * OpenAiProvider.js
 * Uses ChatGPT (GPT-4o) to rewrite OCR extracted text and pick custom 
 * design colors/aesthetics based on a user's prompt.
 */
const { OpenAI } = require('openai');

class OpenAiProvider {
  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
  }

  /**
   * Rewrites slide content and determines design styles based on a user prompt.
   * @param {Object} ocrData - Extracted JSON from the slide image
   * @param {string} userPrompt - The user's creative instruction
   * @returns {Promise<Object>} Modified slide data including 'theme' and 'image_prompt'
   */
  async processSlide(ocrData, userPrompt) {
    console.log(`[OpenAI] Processing slide with prompt: "${userPrompt}"`);

    const systemPrompt = `You are an expert AI social media designer and copywriter.
Your task is to take the provided OCR text from an Instagram slide, and apply the USER'S INSTRUCTIONS to rewrite/reformat it.
Additionally, you must select the perfect design colors, fonts, and an image generation prompt to match the user's requested aesthetic.

Return ONLY a raw JSON object with the following structure (no markdown fences, no extra text):
{
  "badge": "Short 1-2 word badge text",
  "tool_name": "Main title",
  "headline": "Main headline text",
  "taglines": ["Tagline 1", "Tagline 2"],
  "bullet_points": ["Bullet 1", "Bullet 2", "Bullet 3"],
  "quote": "A catchy quote",
  "other": ["Extra chip 1", "Extra chip 2"],
  "theme": {
    "primary": "#HexColor",
    "secondary": "#HexColor",
    "bg": "#HexColor",
    "textColor": "#HexColor",
    "fontHeading": "Google Font name (e.g. 'Space Grotesk')",
    "fontBody": "Google Font name (e.g. 'Inter')",
    "mockupRotation": "CSS transform string (e.g. 'rotateY(-10deg) rotateX(4deg)')"
  },
  "image_prompt": "A highly detailed prompt for an AI image generator to create the perfect illustration/mockup for this slide's right column."
}`;

    const userContent = `USER INSTRUCTIONS: "${userPrompt}"

ORIGINAL OCR TEXT:
${JSON.stringify(ocrData, null, 2)}

Output the rewritten JSON:`;

    const response = await this.openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userContent }
      ],
      temperature: 0.7,
      response_format: { type: "json_object" }
    });

    const resultText = response.choices[0].message.content.trim();
    try {
      return JSON.parse(resultText);
    } catch (err) {
      console.error("[OpenAI] Failed to parse JSON:", resultText);
      throw new Error("OpenAI returned invalid JSON.");
    }
  }
}

module.exports = new OpenAiProvider();
