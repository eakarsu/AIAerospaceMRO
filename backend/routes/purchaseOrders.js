const express = require('express');
const router = express.Router();
const pool = require('../db');
const auth = require('../middleware/auth');

router.use(auth);

// GET /stats/summary - counts by status, total spend, counts by payment_status, pending deliveries
// (must be defined before /:id to avoid route conflict)
router.get('/stats/summary', async (req, res) => {
  try {
    const statusCounts = await pool.query(
      `SELECT status, COUNT(*)::int AS count
       FROM purchase_orders
       GROUP BY status
       ORDER BY status`
    );

    const totalSpend = await pool.query(
      `SELECT COALESCE(SUM(total_amount), 0)::float AS total_spend
       FROM purchase_orders`
    );

    const paymentStatusCounts = await pool.query(
      `SELECT payment_status, COUNT(*)::int AS count
       FROM purchase_orders
       GROUP BY payment_status
       ORDER BY payment_status`
    );

    const pendingDeliveries = await pool.query(
      `SELECT COUNT(*)::int AS count
       FROM purchase_orders
       WHERE status = 'Ordered' AND expected_delivery < NOW()`
    );

    res.json({
      status_counts: statusCounts.rows,
      total_spend: totalSpend.rows[0].total_spend,
      payment_status_counts: paymentStatusCounts.rows,
      pending_deliveries: pendingDeliveries.rows[0].count
    });
  } catch (error) {
    console.error('Error fetching purchase order summary:', error);
    res.status(500).json({ error: 'Failed to fetch summary statistics' });
  }
});

// GET / - list all purchase orders ordered by order_date descending
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM purchase_orders ORDER BY order_date DESC'
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching purchase orders:', error);
    res.status(500).json({ error: 'Failed to fetch purchase orders' });
  }
});

// GET /:id - get single purchase order
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'SELECT * FROM purchase_orders WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Purchase order not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching purchase order:', error);
    res.status(500).json({ error: 'Failed to fetch purchase order' });
  }
});

// POST / - create new purchase order
router.post('/', async (req, res) => {
  try {
    const {
      po_number,
      vendor_name,
      vendor_code,
      order_date,
      expected_delivery,
      actual_delivery,
      status,
      priority,
      total_amount,
      currency,
      items_description,
      quantity,
      unit_price,
      requested_by,
      approved_by,
      aircraft_reg,
      department,
      payment_status,
      notes
    } = req.body;

    const result = await pool.query(
      `INSERT INTO purchase_orders
        (po_number, vendor_name, vendor_code, order_date, expected_delivery,
         actual_delivery, status, priority, total_amount, currency,
         items_description, quantity, unit_price, requested_by, approved_by,
         aircraft_reg, department, payment_status, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
       RETURNING *`,
      [
        po_number,
        vendor_name,
        vendor_code,
        order_date,
        expected_delivery,
        actual_delivery,
        status || 'Draft',
        priority || 'Medium',
        total_amount || 0,
        currency || 'USD',
        items_description,
        quantity || 1,
        unit_price,
        requested_by,
        approved_by,
        aircraft_reg,
        department,
        payment_status || 'Pending',
        notes
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating purchase order:', error);
    res.status(500).json({ error: 'Failed to create purchase order' });
  }
});

// PUT /:id - update purchase order
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      po_number,
      vendor_name,
      vendor_code,
      order_date,
      expected_delivery,
      actual_delivery,
      status,
      priority,
      total_amount,
      currency,
      items_description,
      quantity,
      unit_price,
      requested_by,
      approved_by,
      aircraft_reg,
      department,
      payment_status,
      notes
    } = req.body;

    const result = await pool.query(
      `UPDATE purchase_orders SET
        po_number = $1,
        vendor_name = $2,
        vendor_code = $3,
        order_date = $4,
        expected_delivery = $5,
        actual_delivery = $6,
        status = $7,
        priority = $8,
        total_amount = $9,
        currency = $10,
        items_description = $11,
        quantity = $12,
        unit_price = $13,
        requested_by = $14,
        approved_by = $15,
        aircraft_reg = $16,
        department = $17,
        payment_status = $18,
        notes = $19,
        updated_at = NOW()
       WHERE id = $20
       RETURNING *`,
      [
        po_number,
        vendor_name,
        vendor_code,
        order_date,
        expected_delivery,
        actual_delivery,
        status,
        priority,
        total_amount,
        currency,
        items_description,
        quantity,
        unit_price,
        requested_by,
        approved_by,
        aircraft_reg,
        department,
        payment_status,
        notes,
        id
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Purchase order not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating purchase order:', error);
    res.status(500).json({ error: 'Failed to update purchase order' });
  }
});

// DELETE /:id - delete purchase order
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'DELETE FROM purchase_orders WHERE id = $1 RETURNING *',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Purchase order not found' });
    }

    res.json({ message: 'Purchase order deleted successfully', purchase_order: result.rows[0] });
  } catch (error) {
    console.error('Error deleting purchase order:', error);
    res.status(500).json({ error: 'Failed to delete purchase order' });
  }
});

module.exports = router;
