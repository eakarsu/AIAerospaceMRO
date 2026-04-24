const express = require('express');
const router = express.Router();
const pool = require('../db');

// GET /stats/summary - counts by status, counts by training_type, expiring soon (within 90 days)
// (must be defined before /:id to avoid route conflict)
router.get('/stats/summary', async (req, res) => {
  try {
    const statusCounts = await pool.query(
      `SELECT status, COUNT(*)::int AS count
       FROM training_records
       GROUP BY status
       ORDER BY status`
    );

    const typeCounts = await pool.query(
      `SELECT training_type, COUNT(*)::int AS count
       FROM training_records
       GROUP BY training_type
       ORDER BY training_type`
    );

    const expiringSoon = await pool.query(
      `SELECT *
       FROM training_records
       WHERE expiry_date IS NOT NULL
         AND expiry_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '90 days'
       ORDER BY expiry_date ASC`
    );

    res.json({
      status_counts: statusCounts.rows,
      type_counts: typeCounts.rows,
      expiring_soon: expiringSoon.rows
    });
  } catch (error) {
    console.error('Error fetching training records summary:', error);
    res.status(500).json({ error: 'Failed to fetch summary statistics' });
  }
});

// GET / - list all training records ordered by expiry_date ascending
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM training_records ORDER BY expiry_date ASC'
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching training records:', error);
    res.status(500).json({ error: 'Failed to fetch training records' });
  }
});

// GET /:id - get single training record
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'SELECT * FROM training_records WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Training record not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching training record:', error);
    res.status(500).json({ error: 'Failed to fetch training record' });
  }
});

// POST / - create new training record
router.post('/', async (req, res) => {
  try {
    const {
      record_number,
      employee_id,
      technician_name,
      training_type,
      course_name,
      provider,
      start_date,
      completion_date,
      expiry_date,
      score,
      pass_fail,
      certificate_number,
      status,
      notes
    } = req.body;

    const result = await pool.query(
      `INSERT INTO training_records
        (record_number, employee_id, technician_name, training_type, course_name,
         provider, start_date, completion_date, expiry_date, score, pass_fail,
         certificate_number, status, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
       RETURNING *`,
      [
        record_number,
        employee_id,
        technician_name,
        training_type || 'Initial',
        course_name,
        provider,
        start_date,
        completion_date,
        expiry_date,
        score || null,
        pass_fail || 'Pending',
        certificate_number,
        status || 'Scheduled',
        notes
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating training record:', error);
    res.status(500).json({ error: 'Failed to create training record' });
  }
});

// PUT /:id - update training record
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      record_number,
      employee_id,
      technician_name,
      training_type,
      course_name,
      provider,
      start_date,
      completion_date,
      expiry_date,
      score,
      pass_fail,
      certificate_number,
      status,
      notes
    } = req.body;

    const result = await pool.query(
      `UPDATE training_records SET
        record_number = $1,
        employee_id = $2,
        technician_name = $3,
        training_type = $4,
        course_name = $5,
        provider = $6,
        start_date = $7,
        completion_date = $8,
        expiry_date = $9,
        score = $10,
        pass_fail = $11,
        certificate_number = $12,
        status = $13,
        notes = $14,
        updated_at = NOW()
       WHERE id = $15
       RETURNING *`,
      [
        record_number,
        employee_id,
        technician_name,
        training_type,
        course_name,
        provider,
        start_date,
        completion_date,
        expiry_date,
        score,
        pass_fail,
        certificate_number,
        status,
        notes,
        id
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Training record not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating training record:', error);
    res.status(500).json({ error: 'Failed to update training record' });
  }
});

// DELETE /:id - delete training record
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'DELETE FROM training_records WHERE id = $1 RETURNING *',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Training record not found' });
    }

    res.json({ message: 'Training record deleted successfully', training_record: result.rows[0] });
  } catch (error) {
    console.error('Error deleting training record:', error);
    res.status(500).json({ error: 'Failed to delete training record' });
  }
});

module.exports = router;
