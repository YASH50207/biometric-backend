const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const seedData = require('./seed');

// Load environment variables
dotenv.config();

const app = express();

// ============ MIDDLEWARE ============
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true,
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ============ DATABASE CONNECTION ============
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(async () => {
    console.log('✅ MongoDB Connected Successfully at', process.env.MONGO_URI);
    
    // Seed database if enabled

    if (process.env.SEED_DB === 'true') {
      await seedData();
    }
  })
  .catch((err) => console.error('❌ MongoDB Connection Error:', err));

// ============ IMPORT ROUTES ============
const attendanceRoutes = require('./routes/attendance');
const studentRoutes = require('./routes/student');
const reportRoutes = require('./routes/reports');

// ============ REGISTER ROUTES ============
app.use('/api/attendance', attendanceRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/reports', reportRoutes);

// ============ HEALTH CHECK ENDPOINT ============
app.get('/api/health', (req, res) => {
  res.json({ status: 'Server is running', timestamp: new Date() });
});

// ============ 404 HANDLER ============
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// ============ ERROR HANDLER ============
app.use((err, req, res, next) => {
  console.error('❌ Error:', err.message);
  res.status(500).json({ error: 'Internal Server Error', details: err.message });
});

// ============ START SERVER ============
const PORT = process.env.PORT || 8080;
const server = app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`❌ Port ${PORT} is already in use. Stop the existing backend process, then start only one server instance.`);
    process.exit(1);
  }

  console.error('❌ Server error:', err);
  process.exit(1);
});

