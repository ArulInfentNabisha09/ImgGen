require('dotenv').config({ path: '.env' });
const nvidiaProvider = require('./src/providers/NvidiaProvider');
const fs = require('fs');

async function test() {
  try {
    // Create a dummy image
    const dummyPath = './dummy_test.png';
    const dummyPng = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAFUlEQVR42mP8z8BQz0AEYBxVSF+FAAhKDveksOjmAAAAAElFTkSuQmCC", "base64");
    fs.writeFileSync(dummyPath, dummyPng);

    console.log("Testing NVIDIA Vision...");
    const description = await nvidiaProvider.describeImage(dummyPath);
    console.log("Vision Result:", description);

    console.log("Testing NVIDIA Text-to-Image...");
    const result = await nvidiaProvider.generateImage("a beautiful red square in a cyberpunk city");
    console.log("Image buffer size:", result.imageBuffer.length);

    fs.unlinkSync(dummyPath);
    console.log("✅ All NVIDIA APIs working!");
  } catch (error) {
    console.error("❌ Test failed:", error);
  }
}

test();
