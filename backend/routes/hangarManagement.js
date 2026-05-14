const express = require('express');
const router = express.Router();
const pool = require('../db');
const auth = require('../middleware/auth');

router.use(auth);

// GET /stats/summary - counts by status, total capacity
// (must be defined before /:id to avoid route conflict)
router.get('/stats/summary', async (req, res) => {
  try {
    const statusCounts = await pool.query(
      `SELECT status, COUNT(*)::int AS count
       FROM hangar_management
       GROUP BY status
       ORDER BY status`
    );

    const totalCapacity = await pool.query(
      `SELECT COALESCE(SUM(capacity), 0)::int AS total_capacity,
              COALESCE(SUM(current_occupancy), 0)::int AS total_occupancy
       FROM hangar_management`
    );

    const topHangars = await pool.query(
      `SELECT *
       FROM hangar_management
       ORDER BY capacity DESC
       LIMIT 10`
    );

    res.json({
      status_counts: statusCounts.rows,
      total_capacity: totalCapacity.rows[0].total_capacity,
      total_occupancy: totalCapacity.rows[0].total_occupancy,
      top_hangars_by_capacity: topHangars.rows
    });
  } catch (error) {
    console.error('Error fetching hangar summary:', error);
    res.status(500).json({ error: 'Failed to fetch summary statistics' });
  }
});

// GET / - list all hangars ordered by hangar_code ascending
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM hangar_management ORDER BY hangar_code ASC'
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching hangars:', error);
    res.status(500).json({ error: 'Failed to fetch hangars' });
  }
});

// GET /:id - get single hangar
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'SELECT * FROM hangar_management WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Hangar not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching hangar:', error);
    res.status(500).json({ error: 'Failed to fetch hangar' });
  }
});

// POST / - create new hangar
router.post('/', async (req, res) => {
  try {
    const {
      hangar_code,
      hangar_name,
      location,
      capacity,
      current_occupancy,
      aircraft_reg,
      hangar_type,
      status,
      equipment_available,
      contact_person,
      phone,
      daily_rate,
      notes
    } = req.body;

    const result = await pool.query(
      `INSERT INTO hangar_management
        (hangar_code, hangar_name, location, capacity, current_occupancy,
         aircraft_reg, hangar_type, status, equipment_available,
         contact_person, phone, daily_rate, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
       RETURNING *`,
      [
        hangar_code,
        hangar_name,
        location,
        capacity || 0,
        current_occupancy || 0,
        aircraft_reg,
        hangar_type || 'General',
        status || 'Available',
        equipment_available,
        contact_person,
        phone,
        daily_rate || 0,
        notes
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating hangar:', error);
    res.status(500).json({ error: 'Failed to create hangar' });
  }
});

// PUT /:id - update hangar
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      hangar_code,
      hangar_name,
      location,
      capacity,
      current_occupancy,
      aircraft_reg,
      hangar_type,
      status,
      equipment_available,
      contact_person,
      phone,
      daily_rate,
      notes
    } = req.body;

    const result = await pool.query(
      `UPDATE hangar_management SET
        hangar_code = $1,
        hangar_name = $2,
        location = $3,
        capacity = $4,
        current_occupancy = $5,
        aircraft_reg = $6,
        hangar_type = $7,
        status = $8,
        equipment_available = $9,
        contact_person = $10,
        phone = $11,
        daily_rate = $12,
        notes = $13,
        updated_at = NOW()
       WHERE id = $14
       RETURNING *`,
      [
        hangar_code,
        hangar_name,
        location,
        capacity,
        current_occupancy,
        aircraft_reg,
        hangar_type,
        status,
        equipment_available,
        contact_person,
        phone,
        daily_rate,
        notes,
        id
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Hangar not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating hangar:', error);
    res.status(500).json({ error: 'Failed to update hangar' });
  }
});

// DELETE /:id - delete hangar
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'DELETE FROM hangar_management WHERE id = $1 RETURNING *',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Hangar not found' });
    }

    res.json({ message: 'Hangar deleted successfully', hangar: result.rows[0] });
  } catch (error) {
    console.error('Error deleting hangar:', error);
    res.status(500).json({ error: 'Failed to delete hangar' });
  }
});

module.exports = router;
