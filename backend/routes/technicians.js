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

const techValidators = [
  body('name').notEmpty().withMessage('name is required').isLength({ max: 100 }),
  body('email').optional().isEmail().withMessage('email must be valid').normalizeEmail(),
  body('license_expiry').optional().isISO8601().withMessage('license_expiry must be a valid date'),
  body('status').optional().isIn(['Active', 'Inactive', 'On Leave']).withMessage('Invalid status')
];

// GET /stats/summary
router.get('/stats/summary', async (req, res) => {
  try {
    const statusCounts = await pool.query(
      `SELECT status, COUNT(*)::int AS count FROM technicians GROUP BY status ORDER BY status`
    );
    const expiringLicenses = await pool.query(
      `SELECT * FROM technicians WHERE license_expiry IS NOT NULL AND license_expiry < NOW() + INTERVAL '90 days' ORDER BY license_expiry ASC`
    );
    res.json({ status_counts: statusCounts.rows, expiring_licenses: expiringLicenses.rows });
  } catch (error) {
    console.error('Error fetching technician summary:', error);
    res.status(500).json({ error: 'Failed to fetch summary statistics' });
  }
});

// GET /workload – technician workload summary (new feature)
router.get('/workload', async (req, res) => {
  try {
    const start = req.query.start || new Date().toISOString().slice(0, 10);
    const end = req.query.end || new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);

    const workloadResult = await pool.query(`
      SELECT
        t.id,
        t.name,
        t.specialization,
        t.status,
        COUNT(wo.id)::int AS open_work_orders,
        COALESCE(SUM(wo.estimated_hours), 0)::numeric AS total_estimated_hours
      FROM technicians t
      LEFT JOIN work_orders wo ON wo.assigned_to = t.name
        AND wo.status NOT IN ('Completed', 'Cancelled')
        AND (wo.start_date IS NULL OR wo.start_date <= $2)
        AND (wo.target_completion IS NULL OR wo.target_completion >= $1)
      GROUP BY t.id, t.name, t.specialization, t.status
      ORDER BY total_estimated_hours DESC
    `, [start, end]);

    res.json({ workload: workloadResult.rows, period: { start, end } });
  } catch (error) {
    console.error('Error fetching technician workload:', error);
    res.status(500).json({ error: 'Failed to fetch workload' });
  }
});

// GET / - list technicians with pagination
router.get('/', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const offset = (page - 1) * limit;

    const countResult = await pool.query('SELECT COUNT(*)::int AS total FROM technicians');
    const total = countResult.rows[0].total;

    const result = await pool.query(
      'SELECT * FROM technicians ORDER BY name ASC LIMIT $1 OFFSET $2',
      [limit, offset]
    );
    res.json({
      records: result.rows,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
    });
  } catch (error) {
    console.error('Error fetching technicians:', error);
    res.status(500).json({ error: 'Failed to fetch technicians' });
  }
});

// GET /:id
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM technicians WHERE id = $1', [id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Technician not found' });
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching technician:', error);
    res.status(500).json({ error: 'Failed to fetch technician' });
  }
});

// POST /
router.post('/', techValidators, async (req, res) => {
  const validationError = handleValidation(req, res);
  if (validationError) return;

  try {
    const {
      employee_id, name, email, phone, specialization, license_type,
      license_number, license_expiry, certifications, rating, status,
      hire_date, total_experience_years
    } = req.body;

    const result = await pool.query(
      `INSERT INTO technicians
        (employee_id, name, email, phone, specialization, license_type,
         license_number, license_expiry, certifications, rating, status,
         hire_date, total_experience_years)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::text[], $10, $11, $12, $13)
       RETURNING *`,
      [
        employee_id, name, email, phone, specialization, license_type,
        license_number, license_expiry, certifications,
        rating || 'A', status || 'Active', hire_date, total_experience_years
      ]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating technician:', error);
    res.status(500).json({ error: 'Failed to create technician' });
  }
});

// PUT /:id
router.put('/:id', techValidators, async (req, res) => {
  const validationError = handleValidation(req, res);
  if (validationError) return;

  try {
    const { id } = req.params;
    const {
      employee_id, name, email, phone, specialization, license_type,
      license_number, license_expiry, certifications, rating, status,
      hire_date, total_experience_years
    } = req.body;

    const result = await pool.query(
      `UPDATE technicians SET
        employee_id = $1, name = $2, email = $3, phone = $4, specialization = $5,
        license_type = $6, license_number = $7, license_expiry = $8, certifications = $9::text[],
        rating = $10, status = $11, hire_date = $12, total_experience_years = $13, updated_at = NOW()
       WHERE id = $14 RETURNING *`,
      [
        employee_id, name, email, phone, specialization, license_type,
        license_number, license_expiry, certifications, rating, status,
        hire_date, total_experience_years, id
      ]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Technician not found' });
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating technician:', error);
    res.status(500).json({ error: 'Failed to update technician' });
  }
});

// DELETE /:id
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM technicians WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Technician not found' });
    res.json({ message: 'Technician deleted successfully', technician: result.rows[0] });
  } catch (error) {
    console.error('Error deleting technician:', error);
    res.status(500).json({ error: 'Failed to delete technician' });
  }
});

module.exports = router;
