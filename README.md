# Carousel Generator & AI Redesign Engine

A premium full-stack application that downloads public Instagram image carousels and redesigns them using advanced AI (NVIDIA Llama Vision and FLUX.1) to create highly aesthetic, customizable masterclasses.

## 🌟 Features
- **Instagram Fetching**: Paste any public Instagram reel/post URL and automatically download the images.
- **Vision OCR Extraction**: Uses NVIDIA Llama-3.2 Vision (11B) to read text and analyze structural layouts.
- **Intelligent Redesign**: Re-creates slides using a premium visual system via Llama-3.2 Vision (90B).
- **Generative Illustrations**: Automatically generates cover background art using FLUX.1.
- **Live SSE Streaming**: Watch your new carousel get built slide-by-slide in real-time.
- **Custom Branding**: Swap out Instagram handles and branding with your own.

## 🏗️ Architecture

| Layer | Tech |
|---|---|
| Frontend | React + Vite (Port 5173) |
| Backend | Express + Node.js (Port 5000) |
| AI Provider | NVIDIA API (Llama 3.2 11B/90B Vision, FLUX.1) |
| Rendering | Puppeteer (HTML → PNG) |
| Instagram | fast-dl + Puppeteer scraper |

---

## 🚀 Setup Guide

### Prerequisites
- **Node.js v18+** — [Download here](https://nodejs.org)
- **NVIDIA API Key** — [Get one here](https://build.nvidia.com)
- **Git** — [Download here](https://git-scm.com)

---

### Step 1 — Clone the Repository

```bash
git clone https://github.com/YOUR_REPO_URL/ImageGenerator.git
cd ImageGenerator
```

---

### Step 2 — Install Dependencies

Open **two terminals**:

**Terminal 1 (Backend):**
```bash
cd server
npm install
```

**Terminal 2 (Frontend):**
```bash
cd client
npm install
```

---

### Step 3 — Configure Environment Variables

Create a `.env` file inside the `server/` folder:

```bash
# Mac/Linux
cd server
cp .env.example .env   # if example exists, or create manually:
nano .env
```

Paste the following into `.env`:

```env
PORT=5000

# Database (optional - only needed for job history)
DB_HOST=localhost
DB_PORT=5432
DB_NAME=image_generator
DB_USER=postgres
DB_PASSWORD=your_db_password

# NVIDIA API Key (required)
NVIDIA_API_KEY=your_nvidia_api_key_here

# OpenAI (optional fallback)
OPENAI_API_KEY=your_openai_key_here

# Storage (auto-created on first run — do NOT change these)
UPLOAD_DIR=./storage/uploads
OUTPUT_DIR=./storage/outputs
ZIP_DIR=./storage/zip
TEMP_DIR=./storage/temp
```

> **Note**: The `storage/` folders are created **automatically** when the server starts. You do not need to create them manually.

---

### Step 4 — Run the App

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

Open your browser to: **http://localhost:5173**

---

### ⚠️ Mac-Specific Notes

1. **Puppeteer on Mac**: The first `npm install` in the server will automatically download Chromium for Puppeteer. This may take a few minutes on first install.

2. **Node version**: Use Node.js **v18 or v20**. If you have an older version, use `nvm`:
   ```bash
   nvm install 20
   nvm use 20
   ```

3. **Port conflicts**: If port 5000 is taken on Mac (AirPlay uses it on macOS Monterey+), change `PORT=5000` to `PORT=5001` in `.env` and update the proxy in `client/vite.config.js`.

---

## 🛠️ Usage

1. Open **http://localhost:5173**
2. Under **"Instagram Fetch"**, paste a public Instagram post URL.
3. Click **Fetch Images**. The app will download the carousel slides.
4. Enter your branding handle (e.g., `@your.brand`) and styling instructions.
5. Click **Redesign Downloaded Images**.
6. Watch the AI redesign each slide in real-time!

