const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const cookieParser = require('cookie-parser');

const connectDB = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const nistRoutes = require('./routes/nistRoutes');
const assessmentRoutes = require('./routes/assessmentRoutes');

dotenv.config();

const app = express();

/**
 * The Angular client and this API are deployed as two separate Vercel projects
 * on different domains, so CORS has to reflect whatever origin calls in and
 * allow credentials for the auth cookie fallback. `origin: true` echoes the
 * request origin rather than sending "*", which is required for credentials.
 */
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());

/**
 * Connect lazily, per request, instead of at module load.
 *
 * On Vercel the module is evaluated during a cold start where a top-level
 * await-less connectDB() would race the first request; worse, a connection
 * failure at load time takes the whole function down with no useful response.
 * Doing it here means a DB outage returns a readable 503 instead of a crash.
 */
app.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (err) {
    console.error('Database connection failed:', err.message);
    res.status(503).json({
      message:
        'Database unavailable. If this is a fresh deploy, check that MONGO_URI is set and that MongoDB Atlas Network Access allows the platform IPs (0.0.0.0/0).',
    });
  }
});

app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'success', message: 'NISTGuard API is running' });
});

app.use('/api/auth', authRoutes);
app.use('/api/nist', nistRoutes);
app.use('/api/assessments', assessmentRoutes);

app.use((req, res) => res.status(404).json({ message: `No route for ${req.method} ${req.originalUrl}` }));

// eslint-disable-next-line no-unused-vars -- Express identifies error handlers by arity
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ message: 'Unexpected server error.' });
});

// Only listen when run directly. When Vercel imports this file as a serverless
// function it just needs the exported app.
if (require.main === module) {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => console.log(`NISTGuard API listening on port ${PORT}`));
}

module.exports = app;
