/**
 * CarouselRedesignService.js
 * Pipeline: Upload → OCR (NVIDIA Vision) → HTML Template → Puppeteer Screenshot → ZIP
 */

const path = require('path');
const fs = require('fs');
const archiver = require('archiver');
const sharp = require('sharp');
const { v4: uuidv4 } = require('uuid');

const nvidiaProvider = require('../providers/NvidiaProvider');
const puppeteerProvider = require('../providers/PuppeteerProvider');
const pollinationsProvider = require('../providers/PollinationsProvider');
const { createCarouselSlideHTML } = require('../templates/carouselTemplate');
const { PDFDocument } = require('pdf-lib');

class CarouselRedesignService {

  async processFiles(files, instagramHandle, userPrompt = '', onProgress = () => { }, onSlideReady = () => { }) {
    const tempDir = process.env.TEMP_DIR;
    const outputDir = process.env.OUTPUT_DIR;

    const results = [];
    const pdfBuffers = [];

    for (const file of files) {
      const originalPath = file.path;
      const processedImagePath = path.join(tempDir, `ocr_prep_${uuidv4()}.png`);
      const outputFilename = `redesign_${uuidv4()}.png`;
      const outputPath = path.join(outputDir, outputFilename);

      try {
        // ── Step 1: Preprocess to PNG (resize to max 1024 for faster Vision processing) ──
        await sharp(originalPath)
          .resize({ width: 1024, height: 1024, fit: 'inside', withoutEnlargement: true })
          .png()
          .toFile(processedImagePath);

        // ── Step 2: OCR — extract all text as structured JSON ─────────────────
        onProgress(`[${results.length + 1}/${files.length}] 🔍 OCR: Extracting text from slide ${results.length + 1}...`);
        console.log(`[Carousel OCR] Extracting text from: ${file.filename}`);
        const rawOcrData = await nvidiaProvider.extractTextOCR(processedImagePath);
        console.log(`[Carousel OCR] ✅ Extracted. Badge="${rawOcrData.badge}", Tool="${rawOcrData.tool_name}", Bullets: ${(rawOcrData.bullet_points || []).length}`);
        onProgress(`[${results.length + 1}/${files.length}] ✅ OCR done: "${rawOcrData.tool_name || 'slide'}"`);

        // ── Step 3: NVIDIA Llama — Creative Design Spec + Content Rewrite ─────
        onProgress(`[${results.length + 1}/${files.length}] 🎨 AI Design: Generating creative layout...`);
        console.log(`[Carousel Designer] Sending to NVIDIA Llama for creative design + content rewrite...`);
        let designSpec = null;
        let slideData = rawOcrData;

        try {
          const imageBufferForVision = fs.readFileSync(processedImagePath);
          const base64ImageForVision = imageBufferForVision.toString('base64');
          const result = await nvidiaProvider.designSlide(rawOcrData, userPrompt, base64ImageForVision);
          // Split out content fields from design spec fields
          slideData = result;  // Contains both text content + design properties
          designSpec = result;  // Pass the whole thing — template picks what it needs
          console.log(`[Carousel Designer] ✅ Design spec generated. Layout: "${result.layout}", Primary: "${result.primary}"`);
          onProgress(`[${results.length + 1}/${files.length}] ✅ Design ready. Layout: ${result.layout || 'default'}`);
        } catch (designErr) {
          console.warn(`[Carousel Designer] ⚠️ Design step failed, using raw OCR + default theme: ${designErr.message}`);
        }

        // ── Step 4: Generate matching visual mockup illustration ──────────────
        let base64Mockup = null;
        // Only generate an image if the LLM explicitly asks for an illustration via wants_illustration
        const wantsImage = designSpec?.wants_illustration === true;
        if (wantsImage) {
          try {
            const imagePrompt = designSpec?.image_prompt
              || `A premium, clean, high-tech modern SaaS developer tool dashboard mockup for "${slideData.tool_name || 'AI Tool'}". Dark theme, neon accents, beautiful abstract analytics charts, graphs, data visualization, minimalist web browser frame, futuristic vector graphic design aesthetic, sharp focus, 3D perspective depth.`;

            onProgress(`[${results.length + 1}/${files.length}] 🖼️ Generating mockup illustration...`);
            console.log(`[Carousel Illustration] Generating mockup image via Pollinations...`);
            const generationResult = await pollinationsProvider.generate(imagePrompt);
            if (generationResult?.imageBuffer) {
              base64Mockup = `data:image/png;base64,${generationResult.imageBuffer.toString('base64')}`;
              console.log(`[Carousel Illustration] ✅ Mockup image generated.`);
            }
          } catch (imgErr) {
            console.warn(`[Carousel Illustration] ⚠️ Image generation failed, rendering text-only: ${imgErr.message}`);
          }
        }

        // ── Step 5: Build dynamic HTML slide ─────────────────────────────────
        console.log(`[Carousel HTML] Rendering slide HTML...`);
        const htmlContent = createCarouselSlideHTML(slideData, instagramHandle, base64Mockup, designSpec);

        // ── Step 6: Screenshot with Puppeteer (at AI-specified or default size) ─
        const slideW = parseInt(designSpec?.width) || 1080;
        const slideH = parseInt(designSpec?.height) || 1350;
        onProgress(`[${results.length + 1}/${files.length}] 📸 Rendering final slide (${slideW}×${slideH})...`);

        console.log(`[Carousel Render] Launching Puppeteer (${slideW}×${slideH})...`);

        // Generate both PNG and PDF in parallel for efficiency
        const [imageBuffer, pdfBuffer] = await Promise.all([
          puppeteerProvider.htmlToImage(htmlContent, slideW, slideH),
          puppeteerProvider.htmlToPdf(htmlContent, slideW, slideH)
        ]);

        // ── Step 6: Save PNG & collect PDF output ────────────────────────────
        fs.writeFileSync(outputPath, imageBuffer);
        console.log(`[Carousel] ✅ PNG saved: ${outputFilename}`);

        pdfBuffers.push(pdfBuffer); // Store for merging later

        // Emit slide-ready immediately so frontend shows it without waiting
        onSlideReady(`/api/image/${outputFilename}`);
        onProgress(`[${results.length + 1}/${files.length}] ✅ Slide ${results.length + 1} complete!`);

        results.push({
          filename: outputFilename,
          path: outputPath,
          url: `/api/image/${outputFilename}`,
          success: true
        });

      } catch (err) {
        console.error(`[Carousel Pipeline] ❌ Failed for ${file.filename}: ${err.message}`);
        results.push({ filename: file.filename, success: false, error: err.message });
      } finally {
        // Clean up temp files regardless of success/failure
        for (const p of [originalPath, processedImagePath]) {
          try { if (p && fs.existsSync(p)) fs.unlinkSync(p); } catch { }
        }
      }
    }

    const successful = results.filter(r => r.success);

    // ── Step 7: Merge PDFs into a single file ────────────────────────────────
    onProgress(`📄 Merging ${pdfBuffers.length} slides into a single PDF...`);
    let mergedPdfPath = null;
    let mergedPdfFilename = null;
    if (pdfBuffers.length > 0) {
      const mergedPdf = await PDFDocument.create();
      for (const pdfBytes of pdfBuffers) {
        const pdfDoc = await PDFDocument.load(pdfBytes);
        const copiedPages = await mergedPdf.copyPages(pdfDoc, pdfDoc.getPageIndices());
        copiedPages.forEach((page) => mergedPdf.addPage(page));
      }
      mergedPdfFilename = `carousel_${uuidv4()}_editable.pdf`;
      mergedPdfPath = path.join(outputDir, mergedPdfFilename);
      const mergedPdfBytes = await mergedPdf.save();
      fs.writeFileSync(mergedPdfPath, mergedPdfBytes);
      console.log(`[Carousel] ✅ Merged PDF saved: ${mergedPdfFilename}`);
    }

    onProgress(`📦 Packaging ${successful.length} slides into ZIP...`);
    // ── Step 8: ZIP all successful slides & merged PDF ───────────────────────
    const zipFilename = `carousel_${uuidv4()}.zip`;
    const zipDir = process.env.ZIP_DIR || path.join(__dirname, '../../zip');
    const zipPath = path.join(zipDir, zipFilename);

    await new Promise((resolve, reject) => {
      const output = fs.createWriteStream(zipPath);
      const archive = new archiver.ZipArchive({ zlib: { level: 9 } });
      archive.on('error', reject);
      output.on('close', resolve);
      archive.pipe(output);

      // Add PNGs to /png/ folder
      successful.forEach((r, i) => archive.file(r.path, { name: `png/slide_${i + 1}.png` }));

      // Add merged PDF to root of zip
      if (mergedPdfPath && fs.existsSync(mergedPdfPath)) {
        archive.file(mergedPdfPath, { name: `Editable_Canva_Import.pdf` });
      }

      archive.finalize();
    });

    return {
      zipFilename,
      downloadUrl: `/api/download/${zipFilename}`,
      images: successful.map(r => `/api/image/${r.filename}`),
      mergedPdfUrl: mergedPdfFilename ? `/api/image/${mergedPdfFilename}` : null,
      total: files.length,
      success: successful.length,
      failed: files.length - successful.length
    };
  }
}

module.exports = new CarouselRedesignService();
