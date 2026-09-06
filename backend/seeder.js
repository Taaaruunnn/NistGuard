const mongoose = require('mongoose');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const NistControl = require('./models/NistControl');
const nistControls = require('./data/controls');

dotenv.config();
connectDB();

const importData = async () => {
  try {
    await NistControl.deleteMany(); // Clear existing controls to avoid duplicates
    await NistControl.insertMany(nistControls); // Insert our sample data
    console.log('NIST Controls imported successfully!');
    process.exit();
  } catch (error) {
    console.error(`Error importing data: ${error.message}`);
    process.exit(1);
  }
};

importData();