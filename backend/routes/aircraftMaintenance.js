const express = require('express');
const router = express.Router();
const pool = require('../db');

// GET /stats/summary - return counts by status and priority (must be before /:id)
router.get('/stats/summary', async (req, res) => {
  try {
    const statusCounts = await pool.query(
      'SELECT status, COUNT(*)::int AS count FROM aircraft_maintenance GROUP BY status'
    );
    const priorityCounts = await pool.query(
      'SELECT priority, COUNT(*)::int AS count FROM aircraft_maintenance GROUP BY priority'
    );
    res.json({
      statusCounts: statusCounts.rows,
      priorityCounts: priorityCounts.rows
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET / - list all maintenance records
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM aircraft_maintenance ORDER BY scheduled_date DESC'
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /:id - get single record
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'SELECT * FROM aircraft_maintenance WHERE id = $1',
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

// POST / - create new record
router.post('/', async (req, res) => {
  try {
    const {
      aircraft_reg,
      aircraft_type,
      maintenance_type,
      scheduled_date,
      due_date,
      status,
      priority,
      assigned_team,
      estimated_hours,
      description,
      hangar_location
    } = req.body;

    const result = await pool.query(
      `INSERT INTO aircraft_maintenance
        (aircraft_reg, aircraft_type, maintenance_type, scheduled_date, due_date,
         status, priority, assigned_team, estimated_hours, description, hangar_location)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`,
      [
        aircraft_reg,
        aircraft_type,
        maintenance_type,
        scheduled_date,
        due_date,
        status || 'Scheduled',
        priority || 'Medium',
        assigned_team,
        estimated_hours,
        description,
        hangar_location
      ]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /:id - update record
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      aircraft_reg,
      aircraft_type,
      maintenance_type,
      scheduled_date,
      due_date,
      status,
      priority,
      assigned_team,
      estimated_hours,
      description,
      hangar_location
    } = req.body;

    const result = await pool.query(
      `UPDATE aircraft_maintenance SET
        aircraft_reg = $1,
        aircraft_type = $2,
        maintenance_type = $3,
        scheduled_date = $4,
        due_date = $5,
        status = $6,
        priority = $7,
        assigned_team = $8,
        estimated_hours = $9,
        description = $10,
        hangar_location = $11,
        updated_at = NOW()
       WHERE id = $12
       RETURNING *`,
      [
        aircraft_reg,
        aircraft_type,
        maintenance_type,
        scheduled_date,
        due_date,
        status,
        priority,
        assigned_team,
        estimated_hours,
        description,
        hangar_location,
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

// DELETE /:id - delete record
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'DELETE FROM aircraft_maintenance WHERE id = $1 RETURNING *',
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
