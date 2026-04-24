const express = require('express');
const router = express.Router();
const pool = require('../db');

// GET /stats/summary - counts by document_type, counts by status, expiring soon (must be before /:id)
router.get('/stats/summary', async (req, res) => {
  try {
    const typeCounts = await pool.query(
      'SELECT document_type, COUNT(*)::int AS count FROM documents GROUP BY document_type'
    );
    const statusCounts = await pool.query(
      'SELECT status, COUNT(*)::int AS count FROM documents GROUP BY status'
    );
    const expiring = await pool.query(
      `SELECT * FROM documents
       WHERE expiry_date < NOW() + INTERVAL '30 days'
         AND status = 'Active'
       ORDER BY expiry_date ASC`
    );
    res.json({
      typeCounts: typeCounts.rows,
      statusCounts: statusCounts.rows,
      expiringSoon: expiring.rows
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET / - list all documents
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM documents ORDER BY updated_at DESC'
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /:id - get single document
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'SELECT * FROM documents WHERE id = $1',
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

// POST / - create new document
router.post('/', async (req, res) => {
  try {
    const {
      document_number,
      title,
      document_type,
      category,
      revision,
      effective_date,
      expiry_date,
      aircraft_type,
      ata_chapter,
      author,
      approved_by,
      status,
      description,
      file_reference,
      distribution_list
    } = req.body;

    const result = await pool.query(
      `INSERT INTO documents
        (document_number, title, document_type, category, revision,
         effective_date, expiry_date, aircraft_type, ata_chapter,
         author, approved_by, status, description, file_reference,
         distribution_list)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
       RETURNING *`,
      [
        document_number,
        title,
        document_type,
        category,
        revision || 'Rev A',
        effective_date,
        expiry_date,
        aircraft_type,
        ata_chapter,
        author,
        approved_by,
        status || 'Active',
        description,
        file_reference,
        distribution_list
      ]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /:id - update document
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      document_number,
      title,
      document_type,
      category,
      revision,
      effective_date,
      expiry_date,
      aircraft_type,
      ata_chapter,
      author,
      approved_by,
      status,
      description,
      file_reference,
      distribution_list
    } = req.body;

    const result = await pool.query(
      `UPDATE documents SET
        document_number = $1,
        title = $2,
        document_type = $3,
        category = $4,
        revision = $5,
        effective_date = $6,
        expiry_date = $7,
        aircraft_type = $8,
        ata_chapter = $9,
        author = $10,
        approved_by = $11,
        status = $12,
        description = $13,
        file_reference = $14,
        distribution_list = $15,
        updated_at = NOW()
       WHERE id = $16
       RETURNING *`,
      [
        document_number,
        title,
        document_type,
        category,
        revision,
        effective_date,
        expiry_date,
        aircraft_type,
        ata_chapter,
        author,
        approved_by,
        status,
        description,
        file_reference,
        distribution_list,
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

// DELETE /:id - delete document
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'DELETE FROM documents WHERE id = $1 RETURNING *',
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
