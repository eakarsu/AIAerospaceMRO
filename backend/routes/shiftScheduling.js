const express = require('express');
const router = express.Router();
const pool = require('../db');
const auth = require('../middleware/auth');

router.use(auth);

// GET /stats/summary - counts by shift_type, counts by status
// (must be defined before /:id to avoid route conflict)
router.get('/stats/summary', async (req, res) => {
  try {
    const shiftTypeCounts = await pool.query(
      `SELECT shift_type, COUNT(*)::int AS count
       FROM shift_scheduling
       GROUP BY shift_type
       ORDER BY shift_type`
    );

    const statusCounts = await pool.query(
      `SELECT status, COUNT(*)::int AS count
       FROM shift_scheduling
       GROUP BY status
       ORDER BY status`
    );

    res.json({
      shift_type_counts: shiftTypeCounts.rows,
      status_counts: statusCounts.rows
    });
  } catch (error) {
    console.error('Error fetching shift scheduling summary:', error);
    res.status(500).json({ error: 'Failed to fetch summary statistics' });
  }
});

// GET / - list all shifts ordered by shift_date DESC
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM shift_scheduling ORDER BY shift_date DESC'
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching shifts:', error);
    res.status(500).json({ error: 'Failed to fetch shifts' });
  }
});

// GET /:id - get single shift
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'SELECT * FROM shift_scheduling WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Shift not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching shift:', error);
    res.status(500).json({ error: 'Failed to fetch shift' });
  }
});

// POST / - create new shift
router.post('/', async (req, res) => {
  try {
    const {
      shift_code,
      technician_name,
      employee_id,
      shift_type,
      shift_date,
      start_time,
      end_time,
      hangar_location,
      aircraft_reg,
      task_description,
      status,
      notes
    } = req.body;

    const result = await pool.query(
      `INSERT INTO shift_scheduling
        (shift_code, technician_name, employee_id, shift_type, shift_date,
         start_time, end_time, hangar_location, aircraft_reg, task_description,
         status, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       RETURNING *`,
      [
        shift_code,
        technician_name,
        employee_id,
        shift_type || 'Day',
        shift_date,
        start_time,
        end_time,
        hangar_location,
        aircraft_reg,
        task_description,
        status || 'Scheduled',
        notes
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating shift:', error);
    res.status(500).json({ error: 'Failed to create shift' });
  }
});

// PUT /:id - update shift
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      shift_code,
      technician_name,
      employee_id,
      shift_type,
      shift_date,
      start_time,
      end_time,
      hangar_location,
      aircraft_reg,
      task_description,
      status,
      notes
    } = req.body;

    const result = await pool.query(
      `UPDATE shift_scheduling SET
        shift_code = $1,
        technician_name = $2,
        employee_id = $3,
        shift_type = $4,
        shift_date = $5,
        start_time = $6,
        end_time = $7,
        hangar_location = $8,
        aircraft_reg = $9,
        task_description = $10,
        status = $11,
        notes = $12,
        updated_at = NOW()
       WHERE id = $13
       RETURNING *`,
      [
        shift_code,
        technician_name,
        employee_id,
        shift_type,
        shift_date,
        start_time,
        end_time,
        hangar_location,
        aircraft_reg,
        task_description,
        status,
        notes,
        id
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Shift not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating shift:', error);
    res.status(500).json({ error: 'Failed to update shift' });
  }
});

// DELETE /:id - delete shift
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'DELETE FROM shift_scheduling WHERE id = $1 RETURNING *',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Shift not found' });
    }

    res.json({ message: 'Shift deleted successfully', shift: result.rows[0] });
  } catch (error) {
    console.error('Error deleting shift:', error);
    res.status(500).json({ error: 'Failed to delete shift' });
  }
});

module.exports = router;
