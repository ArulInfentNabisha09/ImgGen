const path = require('path');
const fs = require('fs');
const imageGenerationService = require('../services/ImageGenerationService');

class GenerateController {
  async generateImages(req, res) {
    try {
      const files = req.files;
      const { prompt } = req.body;

      if (!files || files.length === 0) {
        return res.status(400).json({ error: 'No images uploaded' });
      }

      if (!prompt) {
        return res.status(400).json({ error: 'Prompt is required' });
      }

      // Delegate business logic to the Service
      const result = await imageGenerationService.processImageBatch(files, prompt);

      res.status(200).json({
        success: true,
        ...result,
      });
    } catch (error) {
      console.error('Controller Error:', error);
      res.status(500).json({ error: 'Failed to process images' });
    }
  }

  async downloadZip(req, res) {
    const { filename } = req.params;
    const zipPath = path.join(process.env.ZIP_DIR, filename);

    if (!fs.existsSync(zipPath)) {
      return res.status(404).json({ error: 'File not found' });
    }

    res.download(zipPath);
  }

  async viewImage(req, res) {
    const { filename } = req.params;
    const imagePath = path.join(process.env.OUTPUT_DIR, filename);

    if (!fs.existsSync(imagePath)) {
      return res.status(404).json({ error: 'Image not found' });
    }

    res.sendFile(imagePath);
  }
}

module.exports = new GenerateController();
