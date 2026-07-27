require('dotenv').config();
const app = require('./src/app');
const { initializeStorage } = require('./src/config/storage');

const PORT = process.env.PORT || 5000;

// Initialize external storage directories before starting the server
initializeStorage();

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
