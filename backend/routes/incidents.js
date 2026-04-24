const express = require('express');
const router = express.Router();
const pool = require('../db');

// GET /stats/summary - counts by severity, counts by status, recent incidents (must be before /:id)
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

// GET / - list all incidents
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM safety_incidents ORDER BY incident_date DESC'
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /:id - get single incident
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'SELECT * FROM safety_incidents WHERE id = $1',
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Record not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST / - create new incident
router.post('/', async (req, res) => {
  try {
    const {
      incident_number,
      title,
      incident_date,
      aircraft_reg,
      location,
      severity,
      category,
      reported_by,
      description,
      root_cause,
      corrective_action,
      status,
      investigation_lead,
      closure_date
    } = req.body;

    const result = await pool.query(
      `INSERT INTO safety_incidents
        (incident_number, title, incident_date, aircraft_reg, location,
         severity, category, reported_by, description, root_cause,
         corrective_action, status, investigation_lead, closure_date)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
       RETURNING *`,
      [
        incident_number,
        title,
        incident_date,
        aircraft_reg,
        location,
        severity || 'Minor',
        category,
        reported_by,
        description,
        root_cause,
        corrective_action,
        status || 'Open',
        investigation_lead,
        closure_date
      ]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /:id - update incident
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      incident_number,
      title,
      incident_date,
      aircraft_reg,
      location,
      severity,
      category,
      reported_by,
      description,
      root_cause,
      corrective_action,
      status,
      investigation_lead,
      closure_date
    } = req.body;

    const result = await pool.query(
      `UPDATE safety_incidents SET
        incident_number = $1,
        title = $2,
        incident_date = $3,
        aircraft_reg = $4,
        location = $5,
        severity = $6,
        category = $7,
        reported_by = $8,
        description = $9,
        root_cause = $10,
        corrective_action = $11,
        status = $12,
        investigation_lead = $13,
        closure_date = $14,
        updated_at = NOW()
       WHERE id = $15
       RETURNING *`,
      [
        incident_number,
        title,
        incident_date,
        aircraft_reg,
        location,
        severity,
        category,
        reported_by,
        description,
        root_cause,
        corrective_action,
        status,
        investigation_lead,
        closure_date,
        id
      ]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Record not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /:id - delete incident
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'DELETE FROM safety_incidents WHERE id = $1 RETURNING *',
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Record not found' });
    }
    res.json({ message: 'Record deleted', record: result.rows[0] });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
