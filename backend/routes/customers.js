const express = require('express');
const router = express.Router();
const pool = require('../db');

// GET /stats/summary - counts by status, total revenue
// (must be defined before /:id to avoid route conflict)
router.get('/stats/summary', async (req, res) => {
  try {
    const statusCounts = await pool.query(
      `SELECT status, COUNT(*)::int AS count
       FROM customers
       GROUP BY status
       ORDER BY status`
    );

    const totalRevenue = await pool.query(
      `SELECT COALESCE(SUM(total_revenue), 0)::float AS total_revenue
       FROM customers`
    );

    const topCustomers = await pool.query(
      `SELECT *
       FROM customers
       ORDER BY total_revenue DESC
       LIMIT 10`
    );

    res.json({
      status_counts: statusCounts.rows,
      total_revenue: totalRevenue.rows[0].total_revenue,
      top_customers_by_revenue: topCustomers.rows
    });
  } catch (error) {
    console.error('Error fetching customer summary:', error);
    res.status(500).json({ error: 'Failed to fetch summary statistics' });
  }
});

// GET / - list all customers ordered by company_name ascending
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM customers ORDER BY company_name ASC'
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching customers:', error);
    res.status(500).json({ error: 'Failed to fetch customers' });
  }
});

// GET /:id - get single customer
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'SELECT * FROM customers WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching customer:', error);
    res.status(500).json({ error: 'Failed to fetch customer' });
  }
});

// POST / - create new customer
router.post('/', async (req, res) => {
  try {
    const {
      customer_code,
      company_name,
      contact_name,
      email,
      phone,
      address,
      city,
      country,
      customer_type,
      fleet_size,
      contract_start,
      contract_end,
      account_manager,
      credit_limit,
      total_revenue,
      total_work_orders,
      status,
      notes
    } = req.body;

    const result = await pool.query(
      `INSERT INTO customers
        (customer_code, company_name, contact_name, email, phone, address,
         city, country, customer_type, fleet_size, contract_start, contract_end,
         account_manager, credit_limit, total_revenue, total_work_orders, status, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
       RETURNING *`,
      [
        customer_code,
        company_name,
        contact_name,
        email,
        phone,
        address,
        city,
        country,
        customer_type || 'Airline',
        fleet_size || 0,
        contract_start,
        contract_end,
        account_manager,
        credit_limit || 0,
        total_revenue || 0,
        total_work_orders || 0,
        status || 'Active',
        notes
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating customer:', error);
    res.status(500).json({ error: 'Failed to create customer' });
  }
});

// PUT /:id - update customer
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      customer_code,
      company_name,
      contact_name,
      email,
      phone,
      address,
      city,
      country,
      customer_type,
      fleet_size,
      contract_start,
      contract_end,
      account_manager,
      credit_limit,
      total_revenue,
      total_work_orders,
      status,
      notes
    } = req.body;

    const result = await pool.query(
      `UPDATE customers SET
        customer_code = $1,
        company_name = $2,
        contact_name = $3,
        email = $4,
        phone = $5,
        address = $6,
        city = $7,
        country = $8,
        customer_type = $9,
        fleet_size = $10,
        contract_start = $11,
        contract_end = $12,
        account_manager = $13,
        credit_limit = $14,
        total_revenue = $15,
        total_work_orders = $16,
        status = $17,
        notes = $18,
        updated_at = NOW()
       WHERE id = $19
       RETURNING *`,
      [
        customer_code,
        company_name,
        contact_name,
        email,
        phone,
        address,
        city,
        country,
        customer_type,
        fleet_size,
        contract_start,
        contract_end,
        account_manager,
        credit_limit,
        total_revenue,
        total_work_orders,
        status,
        notes,
        id
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating customer:', error);
    res.status(500).json({ error: 'Failed to update customer' });
  }
});

// DELETE /:id - delete customer
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'DELETE FROM customers WHERE id = $1 RETURNING *',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    res.json({ message: 'Customer deleted successfully', customer: result.rows[0] });
  } catch (error) {
    console.error('Error deleting customer:', error);
    res.status(500).json({ error: 'Failed to delete customer' });
  }
});

module.exports = router;
