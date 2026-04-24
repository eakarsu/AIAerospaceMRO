const express = require('express');
const router = express.Router();
const pool = require('../db');

// GET /stats/summary - counts by status, expiring licenses within 90 days
// (must be defined before /:id to avoid route conflict)
router.get('/stats/summary', async (req, res) => {
  try {
    const statusCounts = await pool.query(
      `SELECT status, COUNT(*)::int AS count
       FROM technicians
       GROUP BY status
       ORDER BY status`
    );

    const expiringLicenses = await pool.query(
      `SELECT *
       FROM technicians
       WHERE license_expiry IS NOT NULL
         AND license_expiry < NOW() + INTERVAL '90 days'
       ORDER BY license_expiry ASC`
    );

    res.json({
      status_counts: statusCounts.rows,
      expiring_licenses: expiringLicenses.rows
    });
  } catch (error) {
    console.error('Error fetching technician summary:', error);
    res.status(500).json({ error: 'Failed to fetch summary statistics' });
  }
});

// GET / - list all technicians ordered by name ascending
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM technicians ORDER BY name ASC'
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching technicians:', error);
    res.status(500).json({ error: 'Failed to fetch technicians' });
  }
});

// GET /:id - get single technician
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'SELECT * FROM technicians WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Technician not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching technician:', error);
    res.status(500).json({ error: 'Failed to fetch technician' });
  }
});

// POST / - create new technician
router.post('/', async (req, res) => {
  try {
    const {
      employee_id,
      name,
      email,
      phone,
      specialization,
      license_type,
      license_number,
      license_expiry,
      certifications,
      rating,
      status,
      hire_date,
      total_experience_years
    } = req.body;

    const result = await pool.query(
      `INSERT INTO technicians
        (employee_id, name, email, phone, specialization, license_type,
         license_number, license_expiry, certifications, rating, status,
         hire_date, total_experience_years)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::text[], $10, $11, $12, $13)
       RETURNING *`,
      [
        employee_id,
        name,
        email,
        phone,
        specialization,
        license_type,
        license_number,
        license_expiry,
        certifications,
        rating || 'A',
        status || 'Active',
        hire_date,
        total_experience_years
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating technician:', error);
    res.status(500).json({ error: 'Failed to create technician' });
  }
});

// PUT /:id - update technician
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      employee_id,
      name,
      email,
      phone,
      specialization,
      license_type,
      license_number,
      license_expiry,
      certifications,
      rating,
      status,
      hire_date,
      total_experience_years
    } = req.body;

    const result = await pool.query(
      `UPDATE technicians SET
        employee_id = $1,
        name = $2,
        email = $3,
        phone = $4,
        specialization = $5,
        license_type = $6,
        license_number = $7,
        license_expiry = $8,
        certifications = $9::text[],
        rating = $10,
        status = $11,
        hire_date = $12,
        total_experience_years = $13,
        updated_at = NOW()
       WHERE id = $14
       RETURNING *`,
      [
        employee_id,
        name,
        email,
        phone,
        specialization,
        license_type,
        license_number,
        license_expiry,
        certifications,
        rating,
        status,
        hire_date,
        total_experience_years,
        id
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Technician not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating technician:', error);
    res.status(500).json({ error: 'Failed to update technician' });
  }
});

// DELETE /:id - delete technician
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'DELETE FROM technicians WHERE id = $1 RETURNING *',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Technician not found' });
    }

    res.json({ message: 'Technician deleted successfully', technician: result.rows[0] });
  } catch (error) {
    console.error('Error deleting technician:', error);
    res.status(500).json({ error: 'Failed to delete technician' });
  }
});

module.exports = router;
