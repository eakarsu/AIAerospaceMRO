const express = require('express');
const router = express.Router();
const pool = require('../db');
const auth = require('../middleware/auth');

router.use(auth);

// GET /stats/summary - counts by status, overdue calibrations, tools by category (must be before /:id)
router.get('/stats/summary', async (req, res) => {
  try {
    const statusCounts = await pool.query(
      'SELECT status, COUNT(*)::int AS count FROM tool_calibration GROUP BY status'
    );
    const overdue = await pool.query(
      `SELECT * FROM tool_calibration
       WHERE next_calibration < NOW() AND status != 'Out of Service'
       ORDER BY next_calibration ASC`
    );
    const categoryCounts = await pool.query(
      'SELECT category, COUNT(*)::int AS count FROM tool_calibration GROUP BY category'
    );
    res.json({
      statusCounts: statusCounts.rows,
      overdueCalibrations: overdue.rows,
      categoryCounts: categoryCounts.rows
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET / - list all tools
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM tool_calibration ORDER BY next_calibration ASC'
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /:id - get single tool
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'SELECT * FROM tool_calibration WHERE id = $1',
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

// POST / - create new tool
router.post('/', async (req, res) => {
  try {
    const {
      tool_id,
      tool_name,
      category,
      manufacturer,
      model_number,
      serial_number,
      calibration_date,
      next_calibration,
      calibration_interval_days,
      calibration_standard,
      location,
      assigned_to,
      status,
      accuracy_rating,
      certificate_number,
      notes
    } = req.body;

    const result = await pool.query(
      `INSERT INTO tool_calibration
        (tool_id, tool_name, category, manufacturer, model_number, serial_number,
         calibration_date, next_calibration, calibration_interval_days, calibration_standard,
         location, assigned_to, status, accuracy_rating, certificate_number, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
       RETURNING *`,
      [
        tool_id,
        tool_name,
        category,
        manufacturer,
        model_number,
        serial_number,
        calibration_date,
        next_calibration,
        calibration_interval_days || 365,
        calibration_standard,
        location,
        assigned_to,
        status || 'Calibrated',
        accuracy_rating || 'Pass',
        certificate_number,
        notes
      ]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /:id - update tool
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      tool_id,
      tool_name,
      category,
      manufacturer,
      model_number,
      serial_number,
      calibration_date,
      next_calibration,
      calibration_interval_days,
      calibration_standard,
      location,
      assigned_to,
      status,
      accuracy_rating,
      certificate_number,
      notes
    } = req.body;

    const result = await pool.query(
      `UPDATE tool_calibration SET
        tool_id = $1,
        tool_name = $2,
        category = $3,
        manufacturer = $4,
        model_number = $5,
        serial_number = $6,
        calibration_date = $7,
        next_calibration = $8,
        calibration_interval_days = $9,
        calibration_standard = $10,
        location = $11,
        assigned_to = $12,
        status = $13,
        accuracy_rating = $14,
        certificate_number = $15,
        notes = $16,
        updated_at = NOW()
       WHERE id = $17
       RETURNING *`,
      [
        tool_id,
        tool_name,
        category,
        manufacturer,
        model_number,
        serial_number,
        calibration_date,
        next_calibration,
        calibration_interval_days,
        calibration_standard,
        location,
        assigned_to,
        status,
        accuracy_rating,
        certificate_number,
        notes,
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

// DELETE /:id - delete tool
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'DELETE FROM tool_calibration WHERE id = $1 RETURNING *',
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
