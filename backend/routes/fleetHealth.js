const express = require('express');
const router = express.Router();
const pool = require('../db');
const auth = require('../middleware/auth');

router.use(auth);

// GET /stats/summary - average health score, counts by status levels, aircraft needing attention
// (must be defined before /:id to avoid route conflict)
router.get('/stats/summary', async (req, res) => {
  try {
    const avgHealth = await pool.query(
      `SELECT ROUND(AVG(health_score), 2)::float AS average_health_score
       FROM fleet_health`
    );

    const engineStatusCounts = await pool.query(
      `SELECT engine_status, COUNT(*)::int AS count
       FROM fleet_health
       GROUP BY engine_status
       ORDER BY engine_status`
    );

    const avionicsStatusCounts = await pool.query(
      `SELECT avionics_status, COUNT(*)::int AS count
       FROM fleet_health
       GROUP BY avionics_status
       ORDER BY avionics_status`
    );

    const airframeStatusCounts = await pool.query(
      `SELECT airframe_status, COUNT(*)::int AS count
       FROM fleet_health
       GROUP BY airframe_status
       ORDER BY airframe_status`
    );

    const landingGearStatusCounts = await pool.query(
      `SELECT landing_gear_status, COUNT(*)::int AS count
       FROM fleet_health
       GROUP BY landing_gear_status
       ORDER BY landing_gear_status`
    );

    const apuStatusCounts = await pool.query(
      `SELECT apu_status, COUNT(*)::int AS count
       FROM fleet_health
       GROUP BY apu_status
       ORDER BY apu_status`
    );

    const needingAttention = await pool.query(
      `SELECT *
       FROM fleet_health
       WHERE health_score < 70
       ORDER BY health_score ASC`
    );

    res.json({
      average_health_score: avgHealth.rows[0].average_health_score,
      engine_status_counts: engineStatusCounts.rows,
      avionics_status_counts: avionicsStatusCounts.rows,
      airframe_status_counts: airframeStatusCounts.rows,
      landing_gear_status_counts: landingGearStatusCounts.rows,
      apu_status_counts: apuStatusCounts.rows,
      aircraft_needing_attention: needingAttention.rows
    });
  } catch (error) {
    console.error('Error fetching fleet health summary:', error);
    res.status(500).json({ error: 'Failed to fetch summary statistics' });
  }
});

// GET / - list fleet health records with pagination
router.get('/', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const offset = (page - 1) * limit;

    const countResult = await pool.query('SELECT COUNT(*)::int AS total FROM fleet_health');
    const total = countResult.rows[0].total;

    const result = await pool.query(
      'SELECT * FROM fleet_health ORDER BY health_score ASC LIMIT $1 OFFSET $2',
      [limit, offset]
    );
    res.json({
      records: result.rows,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
    });
  } catch (error) {
    console.error('Error fetching fleet health records:', error);
    res.status(500).json({ error: 'Failed to fetch fleet health records' });
  }
});

// GET /:id - get single fleet health record
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'SELECT * FROM fleet_health WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Fleet health record not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching fleet health record:', error);
    res.status(500).json({ error: 'Failed to fetch fleet health record' });
  }
});

// POST / - create new fleet health record
router.post('/', async (req, res) => {
  try {
    const {
      aircraft_reg,
      aircraft_type,
      operator,
      total_flight_hours,
      total_cycles,
      last_major_check,
      last_check_date,
      next_check_due,
      health_score,
      engine_status,
      avionics_status,
      airframe_status,
      landing_gear_status,
      apu_status,
      notes
    } = req.body;

    const result = await pool.query(
      `INSERT INTO fleet_health
        (aircraft_reg, aircraft_type, operator, total_flight_hours, total_cycles,
         last_major_check, last_check_date, next_check_due, health_score,
         engine_status, avionics_status, airframe_status, landing_gear_status,
         apu_status, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
       RETURNING *`,
      [
        aircraft_reg,
        aircraft_type,
        operator,
        total_flight_hours || 0,
        total_cycles || 0,
        last_major_check,
        last_check_date,
        next_check_due,
        health_score || 100,
        engine_status || 'Normal',
        avionics_status || 'Normal',
        airframe_status || 'Normal',
        landing_gear_status || 'Normal',
        apu_status || 'Normal',
        notes
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating fleet health record:', error);
    res.status(500).json({ error: 'Failed to create fleet health record' });
  }
});

// PUT /:id - update fleet health record
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      aircraft_reg,
      aircraft_type,
      operator,
      total_flight_hours,
      total_cycles,
      last_major_check,
      last_check_date,
      next_check_due,
      health_score,
      engine_status,
      avionics_status,
      airframe_status,
      landing_gear_status,
      apu_status,
      notes
    } = req.body;

    const result = await pool.query(
      `UPDATE fleet_health SET
        aircraft_reg = $1,
        aircraft_type = $2,
        operator = $3,
        total_flight_hours = $4,
        total_cycles = $5,
        last_major_check = $6,
        last_check_date = $7,
        next_check_due = $8,
        health_score = $9,
        engine_status = $10,
        avionics_status = $11,
        airframe_status = $12,
        landing_gear_status = $13,
        apu_status = $14,
        notes = $15,
        updated_at = NOW()
       WHERE id = $16
       RETURNING *`,
      [
        aircraft_reg,
        aircraft_type,
        operator,
        total_flight_hours,
        total_cycles,
        last_major_check,
        last_check_date,
        next_check_due,
        health_score,
        engine_status,
        avionics_status,
        airframe_status,
        landing_gear_status,
        apu_status,
        notes,
        id
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Fleet health record not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating fleet health record:', error);
    res.status(500).json({ error: 'Failed to update fleet health record' });
  }
});

// DELETE /:id - delete fleet health record
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'DELETE FROM fleet_health WHERE id = $1 RETURNING *',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Fleet health record not found' });
    }

    res.json({ message: 'Fleet health record deleted successfully', record: result.rows[0] });
  } catch (error) {
    console.error('Error deleting fleet health record:', error);
    res.status(500).json({ error: 'Failed to delete fleet health record' });
  }
});

module.exports = router;
