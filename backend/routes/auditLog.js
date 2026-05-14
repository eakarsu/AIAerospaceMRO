const express = require('express');
const router = express.Router();
const pool = require('../db');
const auth = require('../middleware/auth');

router.use(auth);

// GET /stats/summary - counts by action_type, module, severity, recent activity (must be before /:id)
router.get('/stats/summary', async (req, res) => {
  try {
    const actionTypeCounts = await pool.query(
      'SELECT action_type, COUNT(*)::int AS count FROM audit_log GROUP BY action_type'
    );
    const moduleCounts = await pool.query(
      'SELECT module, COUNT(*)::int AS count FROM audit_log GROUP BY module'
    );
    const severityCounts = await pool.query(
      'SELECT severity, COUNT(*)::int AS count FROM audit_log GROUP BY severity'
    );
    const recentActivity = await pool.query(
      "SELECT COUNT(*)::int AS count FROM audit_log WHERE created_at >= NOW() - INTERVAL '24 hours'"
    );
    res.json({
      actionTypeCounts: actionTypeCounts.rows,
      moduleCounts: moduleCounts.rows,
      severityCounts: severityCounts.rows,
      recentActivityCount: recentActivity.rows[0].count
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET / - list audit logs with pagination
router.get('/', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const offset = (page - 1) * limit;

    const countResult = await pool.query('SELECT COUNT(*)::int AS total FROM audit_log');
    const total = countResult.rows[0].total;

    const result = await pool.query(
      'SELECT * FROM audit_log ORDER BY created_at DESC LIMIT $1 OFFSET $2',
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

// GET /:id - get single log entry
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'SELECT * FROM audit_log WHERE id = $1',
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

// POST / - create new log entry
router.post('/', async (req, res) => {
  try {
    const {
      log_number,
      action_type,
      module,
      record_id,
      record_reference,
      description,
      performed_by,
      user_role,
      ip_address,
      old_value,
      new_value,
      severity,
      status
    } = req.body;

    const result = await pool.query(
      `INSERT INTO audit_log
        (log_number, action_type, module, record_id, record_reference,
         description, performed_by, user_role, ip_address, old_value,
         new_value, severity, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
       RETURNING *`,
      [
        log_number,
        action_type,
        module,
        record_id,
        record_reference,
        description,
        performed_by,
        user_role,
        ip_address,
        old_value,
        new_value,
        severity || 'Info',
        status || 'Logged'
      ]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /:id - audit logs are immutable
router.put('/:id', (req, res) => {
  res.status(403).json({ error: 'Audit logs cannot be modified' });
});

// DELETE /:id - delete log entry
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'DELETE FROM audit_log WHERE id = $1 RETURNING *',
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
