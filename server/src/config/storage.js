const fs = require('fs');

/**
 * Ensures all required external storage directories exist.
 * This is called when the server starts.
 */
const initializeStorage = () => {
  const directories = [
    process.env.UPLOAD_DIR,
    process.env.OUTPUT_DIR,
    process.env.ZIP_DIR,
    process.env.TEMP_DIR,
  ];

  directories.forEach((dir) => {
    if (dir && !fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log(`Created directory: ${dir}`);
    }
  });
};

module.exports = {
  initializeStorage,
};
