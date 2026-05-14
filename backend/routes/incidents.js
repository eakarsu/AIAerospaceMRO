const express = require('express');
const router = express.Router();
const pool = require('../db');
const auth = require('../middleware/auth');
const { body, validationResult } = require('express-validator');

router.use(auth);

function handleValidation(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ error: 'Validation failed', details: errors.array() });
  return null;
}

const incidentValidators = [
  body('title').notEmpty().withMessage('title is required').isLength({ max: 200 }),
  body('incident_date').optional().isISO8601().withMessage('incident_date must be a valid date'),
  body('severity').optional().isIn(['Minor', 'Moderate', 'Major', 'Critical', 'Catastrophic']).withMessage('Invalid severity'),
  body('description').optional().isLength({ max: 5000 })
];

// GET /stats/summary
router.get('/stats/summary', async (req, res) => {
  try {
    const severityCounts = await pool.query(
      'SELECT severity, COUNT(*)::int AS count FROM safety_incidents GROUP BY severity'
    );
    const statusCounts = await pool.query(
      'SELECT status, COUNT(*)::int AS count FROM safety_incidents GROUP BY status'
    );
    const recentIncidents = await pool.query(
      'SELECT * FROM safety_incidents ORDER BY incident_date DESC LIMIT 10'
    );
    res.json({
      severityCounts: severityCounts.rows,
      statusCounts: statusCounts.rows,
      recentIncidents: recentIncidents.rows
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET / - list incidents with pagination
router.get('/', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const offset = (page - 1) * limit;

    const countResult = await pool.query('SELECT COUNT(*)::int AS total FROM safety_incidents');
    const total = countResult.rows[0].total;

    const result = await pool.query(
      'SELECT * FROM safety_incidents ORDER BY incident_date DESC LIMIT $1 OFFSET $2',
      [limit, offset]
    );
    res.json({
      records: result.rows,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /:id
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM safety_incidents WHERE id = $1', [id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Record not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /
router.post('/', incidentValidators, async (req, res) => {
  const validationError = handleValidation(req, res);
  if (validationError) return;

  try {
    const {
      incident_number, title, incident_date, aircraft_reg, location,
      severity, category, reported_by, description, root_cause,
      corrective_action, status, investigation_lead, closure_date
    } = req.body;

    const result = await pool.query(
      `INSERT INTO safety_incidents
        (incident_number, title, incident_date, aircraft_reg, location,
         severity, category, reported_by, description, root_cause,
         corrective_action, status, investigation_lead, closure_date)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
       RETURNING *`,
      [
        incident_number, title, incident_date, aircraft_reg, location,
        severity || 'Minor', category, reported_by, description, root_cause,
        corrective_action, status || 'Open', investigation_lead, closure_date
      ]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /:id
router.put('/:id', incidentValidators, async (req, res) => {
  const validationError = handleValidation(req, res);
  if (validationError) return;

  try {
    const { id } = req.params;
    const {
      incident_number, title, incident_date, aircraft_reg, location,
      severity, category, reported_by, description, root_cause,
      corrective_action, status, investigation_lead, closure_date
    } = req.body;

    const result = await pool.query(
      `UPDATE safety_incidents SET
        incident_number = $1, title = $2, incident_date = $3, aircraft_reg = $4, location = $5,
        severity = $6, category = $7, reported_by = $8, description = $9, root_cause = $10,
        corrective_action = $11, status = $12, investigation_lead = $13, closure_date = $14, updated_at = NOW()
       WHERE id = $15 RETURNING *`,
      [
        incident_number, title, incident_date, aircraft_reg, location,
        severity, category, reported_by, description, root_cause,
        corrective_action, status, investigation_lead, closure_date, id
      ]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Record not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /:id
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM safety_incidents WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Record not found' });
    res.json({ message: 'Record deleted', record: result.rows[0] });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
