# Carousel Generator & AI Redesign Engine

A premium full-stack application that downloads public Instagram image carousels and redesigns them using advanced AI (NVIDIA Llama Vision and FLUX.1) to create highly aesthetic, customizable masterclasses. 

## 🌟 Features
- **Instagram Fetching**: Paste any public Instagram reel/post URL and automatically download the images.
- **Vision OCR Extraction**: Uses NVIDIA Llama-3.2 Vision (11B) to read text and analyze structural layouts (laptops, mockups, code snippets, etc.) from the original slides.
- **Intelligent Redesign**: Re-creates slides using a premium visual system (with `mockup-windows`, `code-blocks`, `comparison-tables`) via Llama-3.2 Vision (90B).
- **Generative Illustrations**: Automatically generates stunning cover background art and device illustrations (laptops, phones) using FLUX.1-schnell Text-to-Image.
- **Live SSE Streaming**: Watch your new carousel get built slide-by-slide in real-time in a live preview grid.
- **Custom Branding**: Swap out the old Instagram handles and branding with your own, while preserving all educational content.

## 🏗️ Architecture

- **Frontend**: React + Vite (Port 5173). Features a sleek, modern UI with neon accents, dynamic gradient backgrounds, and an SSE listener for real-time progress.
- **Backend**: Express + Node.js (Port 5000). Handles Instagram downloading (`fast-dl`), image preprocessing (Sharp), and orchestration of the AI models.
- **AI Provider**: `NvidiaProvider.js` manages connections to the NVIDIA API (Llama 3.1 8B, Llama 3.2 11B/90B Vision, and FLUX.1-schnell).
- **Templates**: `carouselTemplate.js` uses an advanced block-based HTML/CSS system (e.g. `code-block` for VS Code style syntax highlighting, `mockup-window` for UI frames). Puppeteer renders the HTML to high-res PNGs.

## 🚀 Getting Started

### Prerequisites
- Node.js (v16+)
- NVIDIA API Key (for Llama Vision and FLUX.1 models)

### Installation
1. Clone the repository.
2. Install dependencies for the server:
   ```bash
   cd server
   npm install
   ```
3. Install dependencies for the client:
   ```bash
   cd client
   npm install
   ```
4. Create a `.env` file in the `server` directory and add your NVIDIA API key:
   ```env
   PORT=5000
   NVIDIA_API_KEY=your_api_key_here
   ```

### Running Locally
You need to run both the frontend and backend servers.

**Terminal 1 (Backend):**
```bash
cd server
npm run dev
```

**Terminal 2 (Frontend):**
```bash
cd client
npm run dev
```

Open your browser to `http://localhost:5173`.

## 🛠️ Usage
1. Open the web app.
2. Under "Instagram Fetch", paste a public Instagram post URL (e.g., a carousel).
3. Click **Fetch Images**. The app will download the slide images.
4. Enter your branding handle (e.g., `@your.brand`) and any specific design instructions (e.g., "Use deep space black with neon lime green accents").
5. Click **Redesign Downloaded Images**.
6. The AI will process each slide via OCR, redesign the layout, generate necessary illustrations, and stream the results back to your browser!
