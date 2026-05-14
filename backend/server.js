const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

// Validate critical env vars at startup
if (!process.env.JWT_SECRET) {
  console.error('FATAL: JWT_SECRET environment variable is not set. Exiting.');
  process.exit(1);
}

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { rateLimit } = require('express-rate-limit');
const pool = require('./db');

const app = express();
const PORT = process.env.BACKEND_PORT || 4000;

// Security headers
app.use(helmet());

// CORS – restrict to configured client origin
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3001',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// General rate limiter: 100 requests per 15 minutes per IP
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: 'Too many requests. Please try again later.', code: 'RATE_LIMITED' },
  standardHeaders: true,
  legacyHeaders: false
});
app.use('/api/', generalLimiter);

app.use(express.json({ limit: '2mb' }));

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
app.use('/api/analytics', require('./routes/analytics'));

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

// BATCH_00_AUDIT_MOUNTS
app.use('/api/acars-stream', require('./routes/acarsStream'));
app.use('/api/regulatory-feed', require('./routes/regulatoryFeed'));
app.use('/api/supply-risk', require('./routes/supplyRisk'));
app.use('/api/vr-training', require('./routes/vrTraining'));
app.use('/api/oem-bridge', require('./routes/oemBridge'));

// === Batch 00 Gaps & Frontend Mounts ===
app.use('/api/gap-ai-training-path-recommendation-technician', require('./routes/gap_ai_training_path_recommendation_technician'));
app.use('/api/gap-ai-supply-chain-disruption-forecasting', require('./routes/gap_ai_supply_chain_disruption_forecasting'));
app.use('/api/gap-ai-cross-fleet-asset-reallocation', require('./routes/gap_ai_cross_fleet_asset_reallocation'));
app.use('/api/gap-ai-hangar-bay-assignment-optimization', require('./routes/gap_ai_hangar_bay_assignment_optimization'));
app.use('/api/gap-oem-data-bridge-boeing-airbus', require('./routes/gap_oem_data_bridge_boeing_airbus'));
app.use('/api/gap-environmental-impact-carbon-footprint-reporting', require('./routes/gap_environmental_impact_carbon_footprint_reporting'));
app.use('/api/gap-mobile-technician-app-job-reference', require('./routes/gap_mobile_technician_app_job_reference'));
app.use('/api/gap-outbound-webhooks', require('./routes/gap_outbound_webhooks'));
app.use('/api/gap-notifications-subsystem-visible', require('./routes/gap_notifications_subsystem_visible'));
app.use('/api/gap-customer-portal-fleet-owner-visibility', require('./routes/gap_customer_portal_fleet_owner_visibility'));
