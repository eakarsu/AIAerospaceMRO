const express = require('express');
const router = express.Router();
const pool = require('../db');
const auth = require('../middleware/auth');

router.use(auth);

// GET /stats/summary - counts by status, counts by category, expiring soon (must be before /:id)
router.get('/stats/summary', async (req, res) => {
  try {
    const statusCounts = await pool.query(
      'SELECT status, COUNT(*)::int AS count FROM mel_items GROUP BY status'
    );
    const categoryCounts = await pool.query(
      'SELECT category, COUNT(*)::int AS count FROM mel_items GROUP BY category'
    );
    const expiringSoon = await pool.query(
      `SELECT * FROM mel_items
       WHERE expiry_date < NOW() + INTERVAL '3 days'
         AND status = 'Active'
       ORDER BY expiry_date ASC`
    );
    res.json({
      statusCounts: statusCounts.rows,
      categoryCounts: categoryCounts.rows,
      expiringSoon: expiringSoon.rows
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET / - list all MEL items
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM mel_items ORDER BY expiry_date ASC'
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /:id - get single MEL item
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'SELECT * FROM mel_items WHERE id = $1',
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

// POST / - create new MEL item
router.post('/', async (req, res) => {
  try {
    const {
      mel_number,
      aircraft_reg,
      ata_chapter,
      title,
      description,
      category,
      deferral_date,
      expiry_date,
      rectification_interval,
      status,
      operational_restriction,
      maintenance_action,
      deferred_by,
      approved_by,
      rectified_date,
      rectified_by
    } = req.body;

    const result = await pool.query(
      `INSERT INTO mel_items
        (mel_number, aircraft_reg, ata_chapter, title, description,
         category, deferral_date, expiry_date, rectification_interval,
         status, operational_restriction, maintenance_action,
         deferred_by, approved_by, rectified_date, rectified_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
       RETURNING *`,
      [
        mel_number,
        aircraft_reg,
        ata_chapter,
        title,
        description,
        category || 'C',
        deferral_date,
        expiry_date,
        rectification_interval,
        status || 'Active',
        operational_restriction,
        maintenance_action,
        deferred_by,
        approved_by,
        rectified_date,
        rectified_by
      ]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /:id - update MEL item
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      mel_number,
      aircraft_reg,
      ata_chapter,
      title,
      description,
      category,
      deferral_date,
      expiry_date,
      rectification_interval,
      status,
      operational_restriction,
      maintenance_action,
      deferred_by,
      approved_by,
      rectified_date,
      rectified_by
    } = req.body;

    const result = await pool.query(
      `UPDATE mel_items SET
        mel_number = $1,
        aircraft_reg = $2,
        ata_chapter = $3,
        title = $4,
        description = $5,
        category = $6,
        deferral_date = $7,
        expiry_date = $8,
        rectification_interval = $9,
        status = $10,
        operational_restriction = $11,
        maintenance_action = $12,
        deferred_by = $13,
        approved_by = $14,
        rectified_date = $15,
        rectified_by = $16,
        updated_at = NOW()
       WHERE id = $17
       RETURNING *`,
      [
        mel_number,
        aircraft_reg,
        ata_chapter,
        title,
        description,
        category,
        deferral_date,
        expiry_date,
        rectification_interval,
        status,
        operational_restriction,
        maintenance_action,
        deferred_by,
        approved_by,
        rectified_date,
        rectified_by,
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

// DELETE /:id - delete MEL item
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'DELETE FROM mel_items WHERE id = $1 RETURNING *',
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
