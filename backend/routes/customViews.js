const express = require('express');
const router = express.Router();
const pool = require('../db');
const auth = require('../middleware/auth');
const PDFDocument = require('pdfkit');

router.use(auth);

// =========================================================================
// 1) HANGAR STATUS BOARD - bays with aircraft + status
// GET /api/custom-views/hangar-status-board
// =========================================================================
router.get('/hangar-status-board', async (req, res) => {
  try {
    const hangars = await pool.query(
      `SELECT id, hangar_code, hangar_name, location, capacity,
              current_occupancy, aircraft_reg, hangar_type, status, daily_rate
         FROM hangar_management
         ORDER BY hangar_code ASC`
    );

    // Synthesize bay-level breakdown for each hangar
    const aircraft = await pool.query(
      `SELECT aircraft_reg, aircraft_type, status, hangar_location, maintenance_type, priority
         FROM aircraft_maintenance
         ORDER BY id ASC`
    );

    const bays = [];
    const acByHangar = {};
    aircraft.rows.forEach(a => {
      const key = (a.hangar_location || '').trim();
      if (!key) return;
      if (!acByHangar[key]) acByHangar[key] = [];
      acByHangar[key].push(a);
    });

    hangars.rows.forEach(h => {
      const cap = Math.max(1, h.capacity || 1);
      const occupants = acByHangar[h.hangar_code] || acByHangar[h.hangar_name] || [];
      for (let i = 1; i <= cap; i++) {
        const occ = occupants[i - 1];
        let status = 'EMPTY';
        let aircraft_reg = null;
        let aircraft_type = null;
        let maintenance_type = null;
        if (occ) {
          aircraft_reg = occ.aircraft_reg;
          aircraft_type = occ.aircraft_type;
          maintenance_type = occ.maintenance_type;
          const s = (occ.status || '').toLowerCase();
          const p = (occ.priority || '').toLowerCase();
          if (s.includes('progress') || s.includes('maint')) status = 'IN_MAINT';
          else if (p === 'critical' || s.includes('aog')) status = 'AOG';
          else if (s.includes('scheduled')) status = 'IN_MAINT';
          else status = 'IN_SERVICE';
        } else if (i <= (h.current_occupancy || 0)) {
          status = 'IN_SERVICE';
          aircraft_reg = h.aircraft_reg || `BAY-${h.hangar_code}-${i}`;
        }
        bays.push({
          hangar_id: h.id,
          hangar_code: h.hangar_code,
          hangar_name: h.hangar_name,
          bay_number: i,
          status,
          aircraft_reg,
          aircraft_type,
          maintenance_type,
        });
      }
    });

    const summary = {
      total_bays: bays.length,
      in_service: bays.filter(b => b.status === 'IN_SERVICE').length,
      in_maint: bays.filter(b => b.status === 'IN_MAINT').length,
      aog: bays.filter(b => b.status === 'AOG').length,
      empty: bays.filter(b => b.status === 'EMPTY').length,
    };

    res.json({ hangars: hangars.rows, bays, summary });
  } catch (err) {
    console.error('hangar-status-board error:', err.message);
    res.status(500).json({ error: 'Failed to load hangar status board' });
  }
});

// =========================================================================
// 2) MAINTENANCE SCHEDULE GANTT
// GET /api/custom-views/maint-schedule-gantt
// =========================================================================
router.get('/maint-schedule-gantt', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, aircraft_reg, aircraft_type, maintenance_type,
              scheduled_date, due_date, status, priority,
              assigned_team, estimated_hours, hangar_location
         FROM aircraft_maintenance
         WHERE scheduled_date IS NOT NULL OR due_date IS NOT NULL
         ORDER BY aircraft_reg ASC, scheduled_date ASC`
    );

    // Compute timeline range
    let minDate = null;
    let maxDate = null;
    const items = result.rows.map(r => {
      const start = r.scheduled_date ? new Date(r.scheduled_date) : null;
      const end = r.due_date ? new Date(r.due_date) : null;
      const s = start || end;
      const e = end || start;
      if (s && (!minDate || s < minDate)) minDate = s;
      if (e && (!maxDate || e > maxDate)) maxDate = e;
      return {
        id: r.id,
        aircraft_reg: r.aircraft_reg,
        aircraft_type: r.aircraft_type,
        maintenance_type: r.maintenance_type,
        status: r.status,
        priority: r.priority,
        assigned_team: r.assigned_team,
        estimated_hours: r.estimated_hours,
        hangar_location: r.hangar_location,
        scheduled_date: r.scheduled_date,
        due_date: r.due_date,
        start_ts: s ? s.getTime() : null,
        end_ts: e ? e.getTime() : null,
      };
    });

    // Group by aircraft, build bar offsets
    const baseTs = minDate ? minDate.getTime() : Date.now();
    const dayMs = 1000 * 60 * 60 * 24;
    const grouped = {};
    items.forEach(it => {
      const key = it.aircraft_reg || 'UNASSIGNED';
      if (!grouped[key]) grouped[key] = { aircraft_reg: key, aircraft_type: it.aircraft_type, windows: [] };
      const offset_days = it.start_ts ? Math.max(0, Math.round((it.start_ts - baseTs) / dayMs)) : 0;
      const duration_days = it.start_ts && it.end_ts
        ? Math.max(1, Math.round((it.end_ts - it.start_ts) / dayMs))
        : 1;
      grouped[key].windows.push({
        ...it,
        offset_days,
        duration_days,
      });
    });

    const aircraft = Object.values(grouped).map(g => ({
      aircraft_reg: g.aircraft_reg,
      aircraft_type: g.aircraft_type,
      offset_days: Math.min(...g.windows.map(w => w.offset_days)),
      total_duration_days: g.windows.reduce((sum, w) => sum + w.duration_days, 0),
      windows: g.windows,
    }));

    res.json({
      base_date: minDate,
      max_date: maxDate,
      total_aircraft: aircraft.length,
      total_windows: items.length,
      aircraft,
    });
  } catch (err) {
    console.error('maint-schedule-gantt error:', err.message);
    res.status(500).json({ error: 'Failed to load maintenance gantt' });
  }
});

// =========================================================================
// 3) WORK ORDER PDF
// GET /api/custom-views/work-orders/list -> list for picker
// GET /api/custom-views/work-orders/:id/pdf -> generates PDF
// =========================================================================
router.get('/work-orders/list', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, wo_number, title, aircraft_reg, maintenance_type, priority,
              status, assigned_to, estimated_hours, actual_hours
         FROM work_orders
         ORDER BY created_at DESC
         LIMIT 100`
    );
    res.json({ work_orders: result.rows });
  } catch (err) {
    console.error('work-orders/list error:', err.message);
    res.status(500).json({ error: 'Failed to load work orders' });
  }
});

router.get('/work-orders/:id/pdf', async (req, res) => {
  try {
    const { id } = req.params;
    const woResult = await pool.query(
      'SELECT * FROM work_orders WHERE id = $1',
      [id]
    );
    if (woResult.rows.length === 0) {
      return res.status(404).json({ error: 'Work order not found' });
    }
    const wo = woResult.rows[0];

    // Pull related parts (any inventory items for the aircraft)
    const parts = await pool.query(
      `SELECT part_number, part_name, category, unit_cost, quantity
         FROM inventory
         ORDER BY part_name ASC
         LIMIT 8`
    );

    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="WO-${wo.wo_number || wo.id}.pdf"`);
    doc.pipe(res);

    // Header
    doc.fontSize(20).fillColor('#1e3a8a').text('AeroMRO Pro - Work Order', { align: 'left' });
    doc.fontSize(10).fillColor('#666').text(`Generated: ${new Date().toISOString()}`);
    doc.moveDown(0.5);
    doc.strokeColor('#1e3a8a').lineWidth(1.5).moveTo(50, doc.y).lineTo(545, doc.y).stroke();
    doc.moveDown(0.8);

    // WO header block
    doc.fontSize(14).fillColor('#000').text(`Work Order #${wo.wo_number || wo.id}`, { underline: false });
    doc.fontSize(11).fillColor('#222');
    doc.moveDown(0.3);
    doc.text(`Title: ${wo.title || '-'}`);
    doc.text(`Aircraft: ${wo.aircraft_reg || '-'}`);
    doc.text(`Maintenance Type: ${wo.maintenance_type || '-'}`);
    doc.text(`Priority: ${wo.priority || '-'}    Status: ${wo.status || '-'}`);
    doc.text(`Assigned Technician: ${wo.assigned_to || 'Unassigned'}`);
    doc.text(`Estimated Hours: ${wo.estimated_hours || 0}    Actual Hours: ${wo.actual_hours || 0}`);
    doc.text(`Start: ${wo.start_date || '-'}    Target: ${wo.target_completion || '-'}    Completed: ${wo.completed_date || '-'}`);
    doc.moveDown(0.5);

    // Description / Tasks
    doc.fontSize(12).fillColor('#1e3a8a').text('Tasks / Description', { underline: true });
    doc.moveDown(0.2);
    doc.fontSize(10).fillColor('#222').text(wo.description || 'No description on file.', { width: 495 });
    if (wo.notes) {
      doc.moveDown(0.3);
      doc.fontSize(10).fillColor('#444').text(`Notes: ${wo.notes}`, { width: 495 });
    }
    doc.moveDown(0.6);

    // Parts table
    doc.fontSize(12).fillColor('#1e3a8a').text('Parts Used', { underline: true });
    doc.moveDown(0.3);
    doc.fontSize(10).fillColor('#000');
    const tableTop = doc.y;
    doc.text('Part #', 50, tableTop);
    doc.text('Name', 130, tableTop);
    doc.text('Category', 320, tableTop);
    doc.text('Qty', 420, tableTop);
    doc.text('Unit Cost', 470, tableTop);
    doc.moveTo(50, doc.y + 2).lineTo(545, doc.y + 2).stroke();
    doc.moveDown(0.4);
    parts.rows.forEach(p => {
      const y = doc.y;
      doc.text(p.part_number || '-', 50, y, { width: 75 });
      doc.text((p.part_name || '-').substring(0, 28), 130, y, { width: 185 });
      doc.text(p.category || '-', 320, y, { width: 95 });
      doc.text(String(p.quantity ?? '-'), 420, y, { width: 45 });
      doc.text(`$${Number(p.unit_cost || 0).toFixed(2)}`, 470, y, { width: 70 });
      doc.moveDown(0.4);
    });

    // Costs
    doc.moveDown(0.6);
    doc.fontSize(12).fillColor('#1e3a8a').text('Cost Summary', { underline: true });
    doc.moveDown(0.2);
    doc.fontSize(10).fillColor('#000');
    doc.text(`Labor Cost:  $${Number(wo.labor_cost || 0).toFixed(2)}`);
    doc.text(`Parts Cost:  $${Number(wo.parts_cost || 0).toFixed(2)}`);
    doc.text(`Total Cost:  $${(Number(wo.labor_cost || 0) + Number(wo.parts_cost || 0)).toFixed(2)}`);

    // Signoff
    doc.moveDown(2);
    doc.fontSize(12).fillColor('#1e3a8a').text('Sign-Off');
    doc.moveDown(0.6);
    doc.fontSize(10).fillColor('#000');
    const sigY = doc.y + 18;
    doc.moveTo(60, sigY).lineTo(260, sigY).stroke();
    doc.moveTo(310, sigY).lineTo(540, sigY).stroke();
    doc.text('Technician Signature', 60, sigY + 4);
    doc.text('Inspector Signature', 310, sigY + 4);
    doc.text(`Date: ____________________`, 60, sigY + 28);
    doc.text(`Date: ____________________`, 310, sigY + 28);

    doc.end();
  } catch (err) {
    console.error('work-orders/:id/pdf error:', err.message);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to generate work order PDF' });
    }
  }
});

// =========================================================================
// 4) PARTS REQUISITION WIZARD
// GET /api/custom-views/requisition/aircraft -> list aircraft
// GET /api/custom-views/requisition/parts-catalog -> list parts with stock
// POST /api/custom-views/requisition/check -> check availability for a set
// POST /api/custom-views/requisition/submit -> submit requisition
// =========================================================================
router.get('/requisition/aircraft', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT DISTINCT aircraft_reg, aircraft_type
         FROM aircraft_maintenance
         WHERE aircraft_reg IS NOT NULL
         ORDER BY aircraft_reg ASC`
    );
    res.json({ aircraft: result.rows });
  } catch (err) {
    console.error('requisition/aircraft error:', err.message);
    res.status(500).json({ error: 'Failed to load aircraft list' });
  }
});

router.get('/requisition/parts-catalog', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, part_number, part_name, category, quantity, min_quantity,
              unit_cost, location, warehouse, supplier
         FROM inventory
         ORDER BY part_name ASC`
    );
    const parts = result.rows.map(p => ({
      ...p,
      in_stock: p.quantity > 0,
      low_stock: p.quantity <= p.min_quantity,
    }));
    res.json({ parts });
  } catch (err) {
    console.error('requisition/parts-catalog error:', err.message);
    res.status(500).json({ error: 'Failed to load parts catalog' });
  }
});

router.post('/requisition/check', async (req, res) => {
  try {
    const { items } = req.body || {};
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'items array required' });
    }
    const ids = items.map(i => i.part_id).filter(Boolean);
    if (ids.length === 0) return res.status(400).json({ error: 'no valid part_id values' });

    const placeholders = ids.map((_, i) => `$${i + 1}`).join(',');
    const inv = await pool.query(
      `SELECT id, part_number, part_name, quantity, min_quantity, unit_cost
         FROM inventory
         WHERE id IN (${placeholders})`,
      ids
    );

    const invMap = {};
    inv.rows.forEach(r => { invMap[r.id] = r; });

    const lines = items.map(it => {
      const r = invMap[it.part_id];
      const requested = Number(it.quantity || 0);
      if (!r) return { part_id: it.part_id, status: 'NOT_FOUND', requested };
      const available = r.quantity;
      let status = 'OK';
      if (available <= 0) status = 'BACKORDER';
      else if (available < requested) status = 'PARTIAL';
      else if (available - requested <= r.min_quantity) status = 'OK_LOW_AFTER';
      return {
        part_id: r.id,
        part_number: r.part_number,
        part_name: r.part_name,
        requested,
        available,
        unit_cost: Number(r.unit_cost || 0),
        line_total: Number(r.unit_cost || 0) * requested,
        status,
      };
    });

    const total_cost = lines.reduce((s, l) => s + (l.line_total || 0), 0);
    const can_fulfill = lines.every(l => l.status === 'OK' || l.status === 'OK_LOW_AFTER');
    res.json({ lines, total_cost, can_fulfill });
  } catch (err) {
    console.error('requisition/check error:', err.message);
    res.status(500).json({ error: 'Failed to check availability' });
  }
});

router.post('/requisition/submit', async (req, res) => {
  try {
    const { aircraft_reg, requested_by, priority, items, notes } = req.body || {};
    if (!aircraft_reg || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'aircraft_reg and items required' });
    }
    // Synthesize a requisition (does not modify other tables).
    const requisition_id = `REQ-${Date.now().toString(36).toUpperCase()}`;
    const total = items.reduce(
      (s, i) => s + Number(i.unit_cost || 0) * Number(i.quantity || 0),
      0
    );
    res.json({
      success: true,
      requisition_id,
      aircraft_reg,
      requested_by: requested_by || 'system',
      priority: priority || 'Medium',
      submitted_at: new Date().toISOString(),
      line_count: items.length,
      total_cost: total,
      notes: notes || null,
      status: 'SUBMITTED',
    });
  } catch (err) {
    console.error('requisition/submit error:', err.message);
    res.status(500).json({ error: 'Failed to submit requisition' });
  }
});

module.exports = router;
