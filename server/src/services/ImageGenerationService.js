const fs = require('fs');
const path = require('path');
const archiver = require('archiver');
const crypto = require('crypto');
const generationRepo = require('../repositories/GenerationRepository');

class ImageGenerationService {
  /**
   * Main orchestrator for the generation process
   */
  async processImageBatch(files, prompt) {
    // 1. Save job in DB
    const inputPaths = files.map(f => f.filename);
    const jobId = await generationRepo.createJob({
      prompt,
      input_image_paths: inputPaths,
      total_images: files.length,
    });

    try {
      await generationRepo.updateJobStatus(jobId, 'processing');

      // 2. Two-Step Pipeline: NVIDIA Vision → Pollinations FLUX T2I
      const nvidiaProvider       = require('../providers/NvidiaProvider');
      const pollinationsProvider = require('../providers/PollinationsProvider');
      const sharp = require('sharp');
      const generatedFilenames = [];

      for (const file of files) {
        const processedImagePath = path.join(process.env.TEMP_DIR, `prep_${crypto.randomUUID()}.png`);

        // Prepare image: resize to 1024x1024 PNG
        await sharp(file.path)
          .resize(1024, 1024, { fit: 'cover' })
          .toFormat('png')
          .toFile(processedImagePath);

        const outputFilename = `generated_${crypto.randomUUID()}.png`;
        const outputPath = path.join(process.env.OUTPUT_DIR, outputFilename);

        try {
          // Step 1: NVIDIA Vision — STRICTLY describe the image
          console.log(`[Step 1] NVIDIA Vision analyzing image: ${file.filename}`);
          const baseDescription = await nvidiaProvider.describeImage(processedImagePath);
          console.log(`[Step 1] ✅ Described: ${baseDescription.substring(0, 100)}...`);

          // Step 2: NVIDIA LLM Router — Intelligently apply user's batch prompt
          const smartPrompt = await nvidiaProvider.routePrompt(baseDescription, prompt);
          console.log(`[Step 2] ✅ Smart Routed Prompt: ${smartPrompt.substring(0, 100)}...`);

          // Step 3: T2I — Pollinations FLUX (free), fallback to NVIDIA
          let result;
          try {
            result = await pollinationsProvider.generate(smartPrompt);
          } catch (pollErr) {
            console.warn(`[Step 2] ⚠️  Pollinations failed (${pollErr.message.substring(0, 80)}), falling back to NVIDIA T2I...`);
            result = await nvidiaProvider.generateImage(smartPrompt);
          }

          fs.writeFileSync(outputPath, result.imageBuffer);
          console.log(`[Step 2] ✅ Image generated: ${outputFilename}`);
        } catch (error) {
          console.error(`[Pipeline] Failed for ${file.filename}:`, error.message);
          // Fallback: copy original so the ZIP still has a file for this slot
          fs.copyFileSync(file.path, outputPath);
        }

        generatedFilenames.push(outputFilename);
        fs.unlinkSync(processedImagePath);
      }



      // 3. Create ZIP file
      const zipFilename = `result_${jobId}_${crypto.randomUUID()}.zip`;
      const zipPath = path.join(process.env.ZIP_DIR, zipFilename);
      
      await this.createZipFile(generatedFilenames, zipPath);

      // 4. Update DB
      await generationRepo.updateJobStatus(jobId, 'completed', {
        output_image_paths: generatedFilenames,
        zip_filename: zipFilename,
        zip_path: zipPath,
      });

      return {
        jobId,
        zipFilename,
        downloadUrl: `/api/download/${zipFilename}`,
        images: generatedFilenames.map(name => `/api/image/${name}`)
      };

    } catch (error) {
      console.error('Generation Error:', error);
      await generationRepo.updateJobStatus(jobId, 'failed', {
        error_message: error.message
      });
      throw error;
    }
  }

  /**
   * Helper to zip files using archiver
   */
  createZipFile(filenames, zipPath) {
    return new Promise((resolve, reject) => {
      const output = fs.createWriteStream(zipPath);
      // archiver v8 ZipArchive initialization
      const archive = new archiver.ZipArchive({ zlib: { level: 9 } });

      output.on('close', () => resolve(zipPath));
      archive.on('error', (err) => reject(err));

      archive.pipe(output);

      filenames.forEach(filename => {
        const filePath = path.join(process.env.OUTPUT_DIR, filename);
        archive.file(filePath, { name: filename });
      });

      archive.finalize();
    });
  }
}

module.exports = new ImageGenerationService();
