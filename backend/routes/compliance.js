const express = require('express');
const router = express.Router();
const pool = require('../db');
const auth = require('../middleware/auth');

router.use(auth);

// GET /compliance/stats/summary - Counts by status and overdue items
router.get('/stats/summary', async (req, res) => {
  try {
    const statusCounts = await pool.query(
      `SELECT status, COUNT(*)::int AS count
       FROM compliance_records
       GROUP BY status
       ORDER BY status`
    );

    const overdueResult = await pool.query(
      `SELECT COUNT(*)::int AS overdue_count
       FROM compliance_records
       WHERE due_date < NOW() AND status != 'Completed'`
    );

    const totalResult = await pool.query(
      `SELECT COUNT(*)::int AS total FROM compliance_records`
    );

    res.json({
      total: totalResult.rows[0].total,
      by_status: statusCounts.rows,
      overdue_count: overdueResult.rows[0].overdue_count
    });
  } catch (error) {
    console.error('Error fetching compliance summary:', error);
    res.status(500).json({ error: 'Failed to fetch compliance summary' });
  }
});

// GET /compliance - List all compliance records ordered by due date (supports ?page=1&limit=20)
router.get('/', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const offset = (page - 1) * limit;

    const countResult = await pool.query('SELECT COUNT(*)::int AS total FROM compliance_records');
    const total = countResult.rows[0].total;

    const result = await pool.query(
      'SELECT * FROM compliance_records ORDER BY due_date ASC LIMIT $1 OFFSET $2',
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
    console.error('Error fetching compliance records:', error);
    res.status(500).json({ error: 'Failed to fetch compliance records' });
  }
});

// GET /compliance/:id - Get a single compliance record
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'SELECT * FROM compliance_records WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Compliance record not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching compliance record:', error);
    res.status(500).json({ error: 'Failed to fetch compliance record' });
  }
});

// POST /compliance - Create a new compliance record
router.post('/', async (req, res) => {
  try {
    const {
      directive_number, title, authority, aircraft_type, applicability,
      compliance_date, due_date, status, priority, description,
      corrective_action, inspector_name, documentation_ref
    } = req.body;

    const result = await pool.query(
      `INSERT INTO compliance_records
       (directive_number, title, authority, aircraft_type, applicability,
        compliance_date, due_date, status, priority, description,
        corrective_action, inspector_name, documentation_ref)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
       RETURNING *`,
      [
        directive_number, title, authority || 'FAA', aircraft_type, applicability,
        compliance_date, due_date, status || 'Open', priority || 'High',
        description, corrective_action, inspector_name, documentation_ref
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating compliance record:', error);
    res.status(500).json({ error: 'Failed to create compliance record' });
  }
});

// PUT /compliance/:id - Update a compliance record
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      directive_number, title, authority, aircraft_type, applicability,
      compliance_date, due_date, status, priority, description,
      corrective_action, inspector_name, documentation_ref
    } = req.body;

    const result = await pool.query(
      `UPDATE compliance_records SET
       directive_number = $1, title = $2, authority = $3, aircraft_type = $4,
       applicability = $5, compliance_date = $6, due_date = $7, status = $8,
       priority = $9, description = $10, corrective_action = $11,
       inspector_name = $12, documentation_ref = $13, updated_at = NOW()
       WHERE id = $14
       RETURNING *`,
      [
        directive_number, title, authority, aircraft_type, applicability,
        compliance_date, due_date, status, priority, description,
        corrective_action, inspector_name, documentation_ref, id
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Compliance record not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating compliance record:', error);
    res.status(500).json({ error: 'Failed to update compliance record' });
  }
});

// DELETE /compliance/:id - Delete a compliance record
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'DELETE FROM compliance_records WHERE id = $1 RETURNING *',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Compliance record not found' });
    }

    res.json({ message: 'Compliance record deleted', record: result.rows[0] });
  } catch (error) {
    console.error('Error deleting compliance record:', error);
    res.status(500).json({ error: 'Failed to delete compliance record' });
  }
});

module.exports = router;
