const express = require('express');
const router = express.Router();
const upload = require('../middlewares/upload');
const generateController = require('../controllers/GenerateController');

// POST /api/generate - Uploads multiple files ('images' field) and processes them
router.post('/generate', upload.array('images'), generateController.generateImages.bind(generateController));

// GET /api/download/:filename - Download the result zip
router.get('/download/:filename', generateController.downloadZip.bind(generateController));

// GET /api/image/:filename - View generated image
router.get('/image/:filename', generateController.viewImage.bind(generateController));

module.exports = router;
