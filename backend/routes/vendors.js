const express = require('express');
const router = express.Router();
const pool = require('../db');
const auth = require('../middleware/auth');

router.use(auth);

// GET /stats/summary - counts by status, total spent, top vendors by rating
// (must be defined before /:id to avoid route conflict)
router.get('/stats/summary', async (req, res) => {
  try {
    const statusCounts = await pool.query(
      `SELECT status, COUNT(*)::int AS count
       FROM vendors
       GROUP BY status
       ORDER BY status`
    );

    const totalSpent = await pool.query(
      `SELECT COALESCE(SUM(total_spent), 0)::float AS total_spent
       FROM vendors`
    );

    const topVendors = await pool.query(
      `SELECT *
       FROM vendors
       ORDER BY rating DESC
       LIMIT 10`
    );

    res.json({
      status_counts: statusCounts.rows,
      total_spent: totalSpent.rows[0].total_spent,
      top_vendors_by_rating: topVendors.rows
    });
  } catch (error) {
    console.error('Error fetching vendor summary:', error);
    res.status(500).json({ error: 'Failed to fetch summary statistics' });
  }
});

// GET / - list vendors with pagination
router.get('/', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const offset = (page - 1) * limit;

    const countResult = await pool.query('SELECT COUNT(*)::int AS total FROM vendors');
    const total = countResult.rows[0].total;

    const result = await pool.query(
      'SELECT * FROM vendors ORDER BY company_name ASC LIMIT $1 OFFSET $2',
      [limit, offset]
    );
    res.json({
      records: result.rows,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
    });
  } catch (error) {
    console.error('Error fetching vendors:', error);
    res.status(500).json({ error: 'Failed to fetch vendors' });
  }
});

// GET /:id - get single vendor
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'SELECT * FROM vendors WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Vendor not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching vendor:', error);
    res.status(500).json({ error: 'Failed to fetch vendor' });
  }
});

// POST / - create new vendor
router.post('/', async (req, res) => {
  try {
    const {
      vendor_code,
      company_name,
      contact_name,
      email,
      phone,
      address,
      city,
      country,
      specialization,
      rating,
      contract_start,
      contract_end,
      payment_terms,
      status,
      total_orders,
      total_spent
    } = req.body;

    const result = await pool.query(
      `INSERT INTO vendors
        (vendor_code, company_name, contact_name, email, phone, address,
         city, country, specialization, rating, contract_start, contract_end,
         payment_terms, status, total_orders, total_spent)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
       RETURNING *`,
      [
        vendor_code,
        company_name,
        contact_name,
        email,
        phone,
        address,
        city,
        country,
        specialization,
        rating || 5.00,
        contract_start,
        contract_end,
        payment_terms,
        status || 'Active',
        total_orders || 0,
        total_spent || 0
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating vendor:', error);
    res.status(500).json({ error: 'Failed to create vendor' });
  }
});

// PUT /:id - update vendor
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      vendor_code,
      company_name,
      contact_name,
      email,
      phone,
      address,
      city,
      country,
      specialization,
      rating,
      contract_start,
      contract_end,
      payment_terms,
      status,
      total_orders,
      total_spent
    } = req.body;

    const result = await pool.query(
      `UPDATE vendors SET
        vendor_code = $1,
        company_name = $2,
        contact_name = $3,
        email = $4,
        phone = $5,
        address = $6,
        city = $7,
        country = $8,
        specialization = $9,
        rating = $10,
        contract_start = $11,
        contract_end = $12,
        payment_terms = $13,
        status = $14,
        total_orders = $15,
        total_spent = $16,
        updated_at = NOW()
       WHERE id = $17
       RETURNING *`,
      [
        vendor_code,
        company_name,
        contact_name,
        email,
        phone,
        address,
        city,
        country,
        specialization,
        rating,
        contract_start,
        contract_end,
        payment_terms,
        status,
        total_orders,
        total_spent,
        id
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Vendor not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating vendor:', error);
    res.status(500).json({ error: 'Failed to update vendor' });
  }
});

// DELETE /:id - delete vendor
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'DELETE FROM vendors WHERE id = $1 RETURNING *',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Vendor not found' });
    }

    res.json({ message: 'Vendor deleted successfully', vendor: result.rows[0] });
  } catch (error) {
    console.error('Error deleting vendor:', error);
    res.status(500).json({ error: 'Failed to delete vendor' });
  }
});

module.exports = router;
