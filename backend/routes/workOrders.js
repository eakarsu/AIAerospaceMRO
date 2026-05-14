const express = require('express');
const router = express.Router();
const pool = require('../db');
const auth = require('../middleware/auth');

router.use(auth);

// GET /work-orders/stats/summary - Counts by status and total costs
router.get('/stats/summary', async (req, res) => {
  try {
    const statusCounts = await pool.query(
      `SELECT status, COUNT(*)::int AS count
       FROM work_orders
       GROUP BY status
       ORDER BY status`
    );

    const costResult = await pool.query(
      `SELECT
         COALESCE(SUM(labor_cost), 0)::numeric AS total_labor_cost,
         COALESCE(SUM(parts_cost), 0)::numeric AS total_parts_cost,
         COALESCE(SUM(labor_cost), 0)::numeric + COALESCE(SUM(parts_cost), 0)::numeric AS total_cost
       FROM work_orders`
    );

    const totalResult = await pool.query(
      `SELECT COUNT(*)::int AS total FROM work_orders`
    );

    res.json({
      total: totalResult.rows[0].total,
      by_status: statusCounts.rows,
      total_labor_cost: costResult.rows[0].total_labor_cost,
      total_parts_cost: costResult.rows[0].total_parts_cost,
      total_cost: costResult.rows[0].total_cost
    });
  } catch (error) {
    console.error('Error fetching work order summary:', error);
    res.status(500).json({ error: 'Failed to fetch work order summary' });
  }
});

// GET /work-orders - List all work orders ordered by created_at DESC (supports ?page=1&limit=20)
router.get('/', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const offset = (page - 1) * limit;

    const countResult = await pool.query('SELECT COUNT(*)::int AS total FROM work_orders');
    const total = countResult.rows[0].total;

    const result = await pool.query(
      'SELECT * FROM work_orders ORDER BY created_at DESC LIMIT $1 OFFSET $2',
      [limit, offset]
    );
    res.json({
      records: result.rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching work orders:', error);
    res.status(500).json({ error: 'Failed to fetch work orders' });
  }
});

// GET /work-orders/:id - Get a single work order
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'SELECT * FROM work_orders WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Work order not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching work order:', error);
    res.status(500).json({ error: 'Failed to fetch work order' });
  }
});

// POST /work-orders - Create a new work order
router.post('/', async (req, res) => {
  try {
    const {
      wo_number, title, aircraft_reg, maintenance_type, priority,
      status, assigned_to, estimated_hours, actual_hours,
      labor_cost, parts_cost, description, notes,
      start_date, target_completion, completed_date
    } = req.body;

    const result = await pool.query(
      `INSERT INTO work_orders
       (wo_number, title, aircraft_reg, maintenance_type, priority,
        status, assigned_to, estimated_hours, actual_hours,
        labor_cost, parts_cost, description, notes,
        start_date, target_completion, completed_date)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
       RETURNING *`,
      [
        wo_number, title, aircraft_reg, maintenance_type, priority || 'Medium',
        status || 'Open', assigned_to, estimated_hours, actual_hours,
        labor_cost, parts_cost, description, notes,
        start_date, target_completion, completed_date
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating work order:', error);
    res.status(500).json({ error: 'Failed to create work order' });
  }
});

// PUT /work-orders/:id - Update a work order
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      wo_number, title, aircraft_reg, maintenance_type, priority,
      status, assigned_to, estimated_hours, actual_hours,
      labor_cost, parts_cost, description, notes,
      start_date, target_completion, completed_date
    } = req.body;

    const result = await pool.query(
      `UPDATE work_orders SET
       wo_number = $1, title = $2, aircraft_reg = $3, maintenance_type = $4,
       priority = $5, status = $6, assigned_to = $7, estimated_hours = $8,
       actual_hours = $9, labor_cost = $10, parts_cost = $11,
       description = $12, notes = $13, start_date = $14,
       target_completion = $15, completed_date = $16, updated_at = NOW()
       WHERE id = $17
       RETURNING *`,
      [
        wo_number, title, aircraft_reg, maintenance_type, priority,
        status, assigned_to, estimated_hours, actual_hours,
        labor_cost, parts_cost, description, notes,
        start_date, target_completion, completed_date, id
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Work order not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating work order:', error);
    res.status(500).json({ error: 'Failed to update work order' });
  }
});

// DELETE /work-orders/:id - Delete a work order
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'DELETE FROM work_orders WHERE id = $1 RETURNING *',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Work order not found' });
    }

    res.json({ message: 'Work order deleted', record: result.rows[0] });
  } catch (error) {
    console.error('Error deleting work order:', error);
    res.status(500).json({ error: 'Failed to delete work order' });
  }
});

module.exports = router;
