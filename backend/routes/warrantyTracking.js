const express = require('express');
const router = express.Router();
const pool = require('../db');

// GET /stats/summary - counts by status, counts by claim_status, expiring soon (within 90 days)
// (must be defined before /:id to avoid route conflict)
router.get('/stats/summary', async (req, res) => {
  try {
    const statusCounts = await pool.query(
      `SELECT status, COUNT(*)::int AS count
       FROM warranty_tracking
       GROUP BY status
       ORDER BY status`
    );

    const claimStatusCounts = await pool.query(
      `SELECT claim_status, COUNT(*)::int AS count
       FROM warranty_tracking
       GROUP BY claim_status
       ORDER BY claim_status`
    );

    const expiringSoon = await pool.query(
      `SELECT *
       FROM warranty_tracking
       WHERE expiry_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '90 days'
       ORDER BY expiry_date ASC`
    );

    res.json({
      status_counts: statusCounts.rows,
      claim_status_counts: claimStatusCounts.rows,
      expiring_soon: expiringSoon.rows
    });
  } catch (error) {
    console.error('Error fetching warranty summary:', error);
    res.status(500).json({ error: 'Failed to fetch summary statistics' });
  }
});

// GET / - list all warranties ordered by expiry_date ascending
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM warranty_tracking ORDER BY expiry_date ASC'
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching warranties:', error);
    res.status(500).json({ error: 'Failed to fetch warranties' });
  }
});

// GET /:id - get single warranty
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'SELECT * FROM warranty_tracking WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Warranty not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching warranty:', error);
    res.status(500).json({ error: 'Failed to fetch warranty' });
  }
});

// POST / - create new warranty
router.post('/', async (req, res) => {
  try {
    const {
      warranty_number,
      part_number,
      part_name,
      serial_number,
      vendor_name,
      purchase_date,
      warranty_start,
      expiry_date,
      warranty_type,
      coverage_details,
      claim_status,
      claim_amount,
      claim_date,
      claim_description,
      status,
      aircraft_reg,
      notes
    } = req.body;

    const result = await pool.query(
      `INSERT INTO warranty_tracking
        (warranty_number, part_number, part_name, serial_number, vendor_name,
         purchase_date, warranty_start, expiry_date, warranty_type, coverage_details,
         claim_status, claim_amount, claim_date, claim_description, status,
         aircraft_reg, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
       RETURNING *`,
      [
        warranty_number,
        part_number,
        part_name,
        serial_number,
        vendor_name,
        purchase_date,
        warranty_start,
        expiry_date,
        warranty_type || 'Full',
        coverage_details,
        claim_status || 'No Claim',
        claim_amount || 0,
        claim_date,
        claim_description,
        status || 'Active',
        aircraft_reg,
        notes
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating warranty:', error);
    res.status(500).json({ error: 'Failed to create warranty' });
  }
});

// PUT /:id - update warranty
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      warranty_number,
      part_number,
      part_name,
      serial_number,
      vendor_name,
      purchase_date,
      warranty_start,
      expiry_date,
      warranty_type,
      coverage_details,
      claim_status,
      claim_amount,
      claim_date,
      claim_description,
      status,
      aircraft_reg,
      notes
    } = req.body;

    const result = await pool.query(
      `UPDATE warranty_tracking SET
        warranty_number = $1,
        part_number = $2,
        part_name = $3,
        serial_number = $4,
        vendor_name = $5,
        purchase_date = $6,
        warranty_start = $7,
        expiry_date = $8,
        warranty_type = $9,
        coverage_details = $10,
        claim_status = $11,
        claim_amount = $12,
        claim_date = $13,
        claim_description = $14,
        status = $15,
        aircraft_reg = $16,
        notes = $17,
        updated_at = NOW()
       WHERE id = $18
       RETURNING *`,
      [
        warranty_number,
        part_number,
        part_name,
        serial_number,
        vendor_name,
        purchase_date,
        warranty_start,
        expiry_date,
        warranty_type,
        coverage_details,
        claim_status,
        claim_amount,
        claim_date,
        claim_description,
        status,
        aircraft_reg,
        notes,
        id
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Warranty not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating warranty:', error);
    res.status(500).json({ error: 'Failed to update warranty' });
  }
});

// DELETE /:id - delete warranty
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'DELETE FROM warranty_tracking WHERE id = $1 RETURNING *',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Warranty not found' });
    }

    res.json({ message: 'Warranty deleted successfully', warranty: result.rows[0] });
  } catch (error) {
    console.error('Error deleting warranty:', error);
    res.status(500).json({ error: 'Failed to delete warranty' });
  }
});

module.exports = router;
