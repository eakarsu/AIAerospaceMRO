const express = require('express');
const router = express.Router();
const pool = require('../db');

// GET /stats/summary - total value, low stock items, counts by category (must be before /:id)
router.get('/stats/summary', async (req, res) => {
  try {
    const totalValue = await pool.query(
      'SELECT COALESCE(SUM(quantity * unit_cost), 0)::numeric AS total_value FROM inventory'
    );
    const lowStock = await pool.query(
      'SELECT * FROM inventory WHERE quantity <= min_quantity ORDER BY part_name ASC'
    );
    const categoryCounts = await pool.query(
      'SELECT category, COUNT(*)::int AS count FROM inventory GROUP BY category'
    );
    res.json({
      totalValue: totalValue.rows[0].total_value,
      lowStockItems: lowStock.rows,
      categoryCounts: categoryCounts.rows
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET / - list all inventory items
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM inventory ORDER BY part_name ASC'
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /:id - get single item
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'SELECT * FROM inventory WHERE id = $1',
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

// POST / - create new inventory item
router.post('/', async (req, res) => {
  try {
    const {
      part_number,
      part_name,
      category,
      quantity,
      min_quantity,
      unit_cost,
      location,
      warehouse,
      supplier,
      condition_code,
      certification,
      last_received,
      expiry_date
    } = req.body;

    const result = await pool.query(
      `INSERT INTO inventory
        (part_number, part_name, category, quantity, min_quantity, unit_cost,
         location, warehouse, supplier, condition_code, certification,
         last_received, expiry_date)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
       RETURNING *`,
      [
        part_number,
        part_name,
        category,
        quantity || 0,
        min_quantity || 5,
        unit_cost,
        location,
        warehouse,
        supplier,
        condition_code || 'NEW',
        certification,
        last_received,
        expiry_date
      ]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /:id - update inventory item
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      part_number,
      part_name,
      category,
      quantity,
      min_quantity,
      unit_cost,
      location,
      warehouse,
      supplier,
      condition_code,
      certification,
      last_received,
      expiry_date
    } = req.body;

    const result = await pool.query(
      `UPDATE inventory SET
        part_number = $1,
        part_name = $2,
        category = $3,
        quantity = $4,
        min_quantity = $5,
        unit_cost = $6,
        location = $7,
        warehouse = $8,
        supplier = $9,
        condition_code = $10,
        certification = $11,
        last_received = $12,
        expiry_date = $13,
        updated_at = NOW()
       WHERE id = $14
       RETURNING *`,
      [
        part_number,
        part_name,
        category,
        quantity,
        min_quantity,
        unit_cost,
        location,
        warehouse,
        supplier,
        condition_code,
        certification,
        last_received,
        expiry_date,
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

// DELETE /:id - delete inventory item
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'DELETE FROM inventory WHERE id = $1 RETURNING *',
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
