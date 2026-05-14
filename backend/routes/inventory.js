const express = require('express');
const router = express.Router();
const pool = require('../db');
const auth = require('../middleware/auth');
const { body, validationResult } = require('express-validator');

router.use(auth);

function handleValidation(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ error: 'Validation failed', details: errors.array() });
  return null;
}

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

// GET / - list inventory items with pagination
router.get('/', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const offset = (page - 1) * limit;

    const countResult = await pool.query('SELECT COUNT(*)::int AS total FROM inventory');
    const total = countResult.rows[0].total;

    const result = await pool.query(
      'SELECT * FROM inventory ORDER BY part_name ASC LIMIT $1 OFFSET $2',
      [limit, offset]
    );
    res.json({
      records: result.rows,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
    });
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

const inventoryValidators = [
  body('part_name').notEmpty().withMessage('part_name is required').isLength({ max: 200 }),
  body('part_number').optional().isLength({ max: 50 }),
  body('quantity').optional().isNumeric().withMessage('quantity must be numeric'),
  body('min_quantity').optional().isNumeric().withMessage('min_quantity must be numeric'),
  body('unit_cost').optional().isNumeric().withMessage('unit_cost must be numeric')
];

// POST / - create new inventory item
router.post('/', inventoryValidators, async (req, res) => {
  const validationError = handleValidation(req, res);
  if (validationError) return;
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
router.put('/:id', inventoryValidators, async (req, res) => {
  const validationError = handleValidation(req, res);
  if (validationError) return;
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

// POST /check-reorder – find low-stock items and draft purchase orders
router.post('/check-reorder', async (req, res) => {
  try {
    // Find all items below minimum quantity
    const lowStock = await pool.query(
      `SELECT * FROM inventory WHERE quantity <= min_quantity AND min_quantity > 0 ORDER BY (min_quantity - quantity) DESC`
    );

    if (lowStock.rows.length === 0) {
      return res.json({ message: 'All inventory levels are adequate', drafted_pos: [], low_stock_count: 0 });
    }

    const draftedPOs = [];
    for (const item of lowStock.rows) {
      const reorderQty = Math.max(item.min_quantity * 2, 10);
      const estimatedCost = reorderQty * (parseFloat(item.unit_cost) || 0);

      // Check if a recent draft PO exists for this part to avoid duplicates
      let poExists = false;
      try {
        const existing = await pool.query(
          `SELECT id FROM purchase_orders WHERE description ILIKE $1 AND status = 'Draft' AND created_at > NOW() - INTERVAL '7 days' LIMIT 1`,
          [`%${item.part_number || item.part_name}%`]
        );
        poExists = existing.rows.length > 0;
      } catch (e) {}

      if (!poExists) {
        try {
          const poResult = await pool.query(
            `INSERT INTO purchase_orders (po_number, vendor_name, status, priority, total_amount, description, requested_by)
             VALUES ($1, $2, 'Draft', 'High', $3, $4, $5) RETURNING id, po_number`,
            [
              `AUTO-${item.part_number || item.id}-${Date.now()}`,
              item.supplier || 'TBD',
              estimatedCost,
              `Auto-reorder: ${item.part_name} (${item.part_number || 'N/A'}) - Qty: ${reorderQty} (current: ${item.quantity}, min: ${item.min_quantity})`,
              `System Auto-Reorder (user: ${req.user?.email || 'system'})`
            ]
          );
          draftedPOs.push({ part: item.part_name, part_number: item.part_number, reorder_qty: reorderQty, po_id: poResult.rows[0].id, po_number: poResult.rows[0].po_number, estimated_cost: estimatedCost });
        } catch (e) {
          // purchase_orders table may have different schema; record as pending
          draftedPOs.push({ part: item.part_name, part_number: item.part_number, reorder_qty: reorderQty, status: 'schema_mismatch', estimated_cost: estimatedCost });
        }
      }
    }

    res.json({
      message: `Found ${lowStock.rows.length} low-stock items, drafted ${draftedPOs.length} purchase orders`,
      low_stock_count: lowStock.rows.length,
      drafted_pos: draftedPOs,
      low_stock_items: lowStock.rows
    });
  } catch (err) {
    console.error('Reorder check error:', err.message);
    res.status(500).json({ error: 'Failed to run reorder check' });
  }
});

module.exports = router;
