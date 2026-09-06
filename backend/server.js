const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const connectDB = require('./config/db');
const controlRoutes = require('./routes/controlRoutes'); // 1. Imported here
const assessmentRoutes = require('./routes/assessmentRoutes');
dotenv.config();
connectDB();

const app = express();

app.use(cors());
app.use(express.json());

// Basic Health Check Route
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'success', message: 'NISTGuard API is running' });
});

app.use('/api/controls', controlRoutes); // 2. Mounted here
app.use('/api/assessments', assessmentRoutes);
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));