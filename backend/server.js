const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const express = require('express');
const cors = require('cors');
const pool = require('./db');

const app = express();
const PORT = process.env.BACKEND_PORT || 4000;

// Middleware
app.use(cors());
app.use(express.json());

// Test database connection
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('Database connection error:', err.message);
  } else {
    console.log('Database connected at:', res.rows[0].now);
  }
});

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/aircraft-maintenance', require('./routes/aircraftMaintenance'));
app.use('/api/part-lifecycle', require('./routes/partLifecycle'));
app.use('/api/compliance', require('./routes/compliance'));
app.use('/api/work-orders', require('./routes/workOrders'));
app.use('/api/inventory', require('./routes/inventory'));
app.use('/api/incidents', require('./routes/incidents'));
app.use('/api/technicians', require('./routes/technicians'));
app.use('/api/fleet-health', require('./routes/fleetHealth'));
app.use('/api/vendors', require('./routes/vendors'));
app.use('/api/tool-calibration', require('./routes/toolCalibration'));
app.use('/api/mel-tracking', require('./routes/melTracking'));
app.use('/api/documents', require('./routes/documents'));
app.use('/api/purchase-orders', require('./routes/purchaseOrders'));
app.use('/api/audit-log', require('./routes/auditLog'));
app.use('/api/shift-scheduling', require('./routes/shiftScheduling'));
app.use('/api/hangar-management', require('./routes/hangarManagement'));
app.use('/api/training-records', require('./routes/trainingRecords'));
app.use('/api/customers', require('./routes/customers'));
app.use('/api/warranty-tracking', require('./routes/warrantyTracking'));
app.use('/api/ai', require('./routes/ai'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err.stack || err.message);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Aerospace MRO Backend running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Database: ${process.env.DB_NAME}@${process.env.DB_HOST}:${process.env.DB_PORT}`);
});

module.exports = { app, pool };
