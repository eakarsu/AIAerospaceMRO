const express = require('express');
const router = express.Router();
const pool = require('../db');
const auth = require('../middleware/auth');

router.use(auth);

// GET /stats/summary - counts by condition_status and parts nearing max cycles
// (must be defined before /:id to avoid route conflict)
router.get('/stats/summary', async (req, res) => {
  try {
    const statusCounts = await pool.query(
      `SELECT condition_status, COUNT(*)::int AS count
       FROM part_lifecycle
       GROUP BY condition_status
       ORDER BY condition_status`
    );

    const nearingMaxCycles = await pool.query(
      `SELECT *
       FROM part_lifecycle
       WHERE max_cycles IS NOT NULL
         AND cycle_count > max_cycles * 0.8
       ORDER BY (cycle_count::float / max_cycles) DESC`
    );

    res.json({
      status_counts: statusCounts.rows,
      parts_nearing_max_cycles: nearingMaxCycles.rows
    });
  } catch (error) {
    console.error('Error fetching part lifecycle summary:', error);
    res.status(500).json({ error: 'Failed to fetch summary statistics' });
  }
});

// GET / - list parts with pagination
router.get('/', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const offset = (page - 1) * limit;

    const countResult = await pool.query('SELECT COUNT(*)::int AS total FROM part_lifecycle');
    const total = countResult.rows[0].total;

    const result = await pool.query(
      'SELECT * FROM part_lifecycle ORDER BY next_inspection ASC LIMIT $1 OFFSET $2',
      [limit, offset]
    );
    res.json({
      records: result.rows,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
    });
  } catch (error) {
    console.error('Error fetching parts:', error);
    res.status(500).json({ error: 'Failed to fetch parts' });
  }
});

// GET /:id - get single part
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'SELECT * FROM part_lifecycle WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Part not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching part:', error);
    res.status(500).json({ error: 'Failed to fetch part' });
  }
});

// POST / - create new part
router.post('/', async (req, res) => {
  try {
    const {
      part_number,
      part_name,
      serial_number,
      aircraft_reg,
      installed_date,
      last_inspection,
      next_inspection,
      cycle_count,
      max_cycles,
      flight_hours,
      max_flight_hours,
      condition_status,
      manufacturer,
      certificate_number
    } = req.body;

    const result = await pool.query(
      `INSERT INTO part_lifecycle
        (part_number, part_name, serial_number, aircraft_reg, installed_date,
         last_inspection, next_inspection, cycle_count, max_cycles, flight_hours,
         max_flight_hours, condition_status, manufacturer, certificate_number)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
       RETURNING *`,
      [
        part_number,
        part_name,
        serial_number,
        aircraft_reg,
        installed_date,
        last_inspection,
        next_inspection,
        cycle_count || 0,
        max_cycles,
        flight_hours || 0,
        max_flight_hours,
        condition_status || 'Serviceable',
        manufacturer,
        certificate_number
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating part:', error);
    res.status(500).json({ error: 'Failed to create part' });
  }
});

// PUT /:id - update part
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      part_number,
      part_name,
      serial_number,
      aircraft_reg,
      installed_date,
      last_inspection,
      next_inspection,
      cycle_count,
      max_cycles,
      flight_hours,
      max_flight_hours,
      condition_status,
      manufacturer,
      certificate_number
    } = req.body;

    const result = await pool.query(
      `UPDATE part_lifecycle SET
        part_number = $1,
        part_name = $2,
        serial_number = $3,
        aircraft_reg = $4,
        installed_date = $5,
        last_inspection = $6,
        next_inspection = $7,
        cycle_count = $8,
        max_cycles = $9,
        flight_hours = $10,
        max_flight_hours = $11,
        condition_status = $12,
        manufacturer = $13,
        certificate_number = $14,
        updated_at = NOW()
       WHERE id = $15
       RETURNING *`,
      [
        part_number,
        part_name,
        serial_number,
        aircraft_reg,
        installed_date,
        last_inspection,
        next_inspection,
        cycle_count,
        max_cycles,
        flight_hours,
        max_flight_hours,
        condition_status,
        manufacturer,
        certificate_number,
        id
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Part not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating part:', error);
    res.status(500).json({ error: 'Failed to update part' });
  }
});

// DELETE /:id - delete part
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'DELETE FROM part_lifecycle WHERE id = $1 RETURNING *',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Part not found' });
    }

    res.json({ message: 'Part deleted successfully', part: result.rows[0] });
  } catch (error) {
    console.error('Error deleting part:', error);
    res.status(500).json({ error: 'Failed to delete part' });
  }
});

// POST /:id/movement – record a chain-of-custody movement for a part
router.post('/:id/movement', async (req, res) => {
  try {
    const { id } = req.params;
    const { action, technician_id, technician_name, work_order_id, notes, location } = req.body;

    if (!action) return res.status(400).json({ error: 'action is required (installed/removed/overhauled/scrapped/received)' });

    // Ensure part_movements table exists
    await pool.query(`
      CREATE TABLE IF NOT EXISTS part_movements (
        id SERIAL PRIMARY KEY,
        part_id INTEGER NOT NULL,
        action VARCHAR(50) NOT NULL,
        technician_id INTEGER,
        technician_name VARCHAR(100),
        work_order_id INTEGER,
        location VARCHAR(200),
        notes TEXT,
        performed_by_user_id INTEGER,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    const partCheck = await pool.query('SELECT id, part_number, part_name FROM part_lifecycle WHERE id = $1', [id]);
    if (partCheck.rows.length === 0) return res.status(404).json({ error: 'Part not found' });

    const result = await pool.query(
      `INSERT INTO part_movements (part_id, action, technician_id, technician_name, work_order_id, location, notes, performed_by_user_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [id, action, technician_id || null, technician_name || null, work_order_id || null, location || null, notes || null, req.user?.id || null]
    );

    res.status(201).json({ movement: result.rows[0], part: partCheck.rows[0] });
  } catch (error) {
    console.error('Error recording part movement:', error);
    res.status(500).json({ error: 'Failed to record part movement' });
  }
});

// GET /:id/movements – get movement history for a part
router.get('/:id/movements', async (req, res) => {
  try {
    const { id } = req.params;

    // Return empty if table doesn't exist yet
    let movements = [];
    try {
      const result = await pool.query(
        'SELECT * FROM part_movements WHERE part_id = $1 ORDER BY created_at DESC',
        [id]
      );
      movements = result.rows;
    } catch (e) {
      // Table may not exist
    }

    res.json({ part_id: parseInt(id), movements });
  } catch (error) {
    console.error('Error fetching part movements:', error);
    res.status(500).json({ error: 'Failed to fetch part movements' });
  }
});

module.exports = router;
