import React, { useEffect, useState } from 'react';

const API = (typeof window !== 'undefined' && window.__AERO_API__) || 'http://localhost:4047/api';

const STEPS = [
  { id: 1, label: 'Aircraft' },
  { id: 2, label: 'Required Parts' },
  { id: 3, label: 'Check Inventory' },
  { id: 4, label: 'Submit Requisition' },
];

function PartsRequisitionWizard({ token }) {
  const [step, setStep] = useState(1);
  const [aircraftList, setAircraftList] = useState([]);
  const [aircraft, setAircraft] = useState('');
  const [parts, setParts] = useState([]);
  const [selectedParts, setSelectedParts] = useState({}); // { part_id: qty }
  const [check, setCheck] = useState(null);
  const [priority, setPriority] = useState('Medium');
  const [notes, setNotes] = useState('');
  const [submitted, setSubmitted] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const [a, p] = await Promise.all([
          fetch(`${API}/custom-views/requisition/aircraft`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
          fetch(`${API}/custom-views/requisition/parts-catalog`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
        ]);
        setAircraftList(a.aircraft || []);
        setParts(p.parts || []);
      } catch (e) {
        setErr(e.message);
      }
    })();
  }, [token]);

  const toggleSelect = (id, defaultQty = 1) => {
    setSelectedParts(prev => {
      const next = { ...prev };
      if (next[id] !== undefined) delete next[id];
      else next[id] = defaultQty;
      return next;
    });
  };
  const setQty = (id, qty) => {
    setSelectedParts(prev => ({ ...prev, [id]: Math.max(1, parseInt(qty) || 1) }));
  };

  const runCheck = async () => {
    setBusy(true);
    setErr(null);
    try {
      const items = Object.entries(selectedParts).map(([part_id, quantity]) => ({
        part_id: Number(part_id),
        quantity: Number(quantity),
      }));
      const r = await fetch(`${API}/custom-views/requisition/check`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ items }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || `HTTP ${r.status}`);
      setCheck(j);
      setStep(3);
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  const submit = async () => {
    setBusy(true);
    setErr(null);
    try {
      const items = (check?.lines || []).map(l => ({
        part_id: l.part_id,
        part_number: l.part_number,
        quantity: l.requested,
        unit_cost: l.unit_cost,
      }));
      const r = await fetch(`${API}/custom-views/requisition/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ aircraft_reg: aircraft, priority, items, notes }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || `HTTP ${r.status}`);
      setSubmitted(j);
      setStep(4);
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  const reset = () => {
    setStep(1); setAircraft(''); setSelectedParts({}); setCheck(null);
    setSubmitted(null); setNotes(''); setPriority('Medium'); setErr(null);
  };

  return (
    <div style={{ color: '#e5e7eb' }}>
      {/* Step bar */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 18 }}>
        {STEPS.map(s => (
          <div key={s.id} style={{
            flex: 1,
            padding: '8px 12px',
            background: step >= s.id ? '#1e40af' : '#1f2937',
            color: step >= s.id ? '#fff' : '#94a3b8',
            border: `1px solid ${step === s.id ? '#60a5fa' : '#334155'}`,
            borderRadius: 6,
            textAlign: 'center',
            fontSize: 12,
            fontWeight: 600,
          }}>
            {s.id}. {s.label}
          </div>
        ))}
      </div>

      <div style={{
        background: '#111827',
        border: '1px solid #1f2937',
        borderRadius: 10,
        padding: 16,
        minHeight: 320,
      }}>
        {/* STEP 1: Aircraft */}
        {step === 1 && (
          <div>
            <h4 style={{ margin: '0 0 12px', color: '#f1f5f9' }}>Select Aircraft</h4>
            <select
              value={aircraft}
              onChange={e => setAircraft(e.target.value)}
              style={selectStyle}
            >
              <option value="">-- Select aircraft --</option>
              {aircraftList.map(a => (
                <option key={a.aircraft_reg} value={a.aircraft_reg}>
                  {a.aircraft_reg} - {a.aircraft_type}
                </option>
              ))}
            </select>
            <div style={{ marginTop: 16 }}>
              <button
                disabled={!aircraft}
                onClick={() => setStep(2)}
                style={btnPrimary}
              >Next: Choose Parts</button>
            </div>
          </div>
        )}

        {/* STEP 2: Required Parts */}
        {step === 2 && (
          <div>
            <h4 style={{ margin: '0 0 12px', color: '#f1f5f9' }}>
              Required Parts for {aircraft}
            </h4>
            <div style={{ maxHeight: 360, overflowY: 'auto', border: '1px solid #334155', borderRadius: 6 }}>
              <table style={tableStyle}>
                <thead>
                  <tr style={{ background: '#0f172a' }}>
                    <th style={th}></th>
                    <th style={th}>Part #</th>
                    <th style={th}>Name</th>
                    <th style={th}>Stock</th>
                    <th style={th}>Cost</th>
                    <th style={th}>Qty</th>
                  </tr>
                </thead>
                <tbody>
                  {parts.map(p => {
                    const sel = selectedParts[p.id] !== undefined;
                    return (
                      <tr key={p.id} style={{ borderBottom: '1px solid #1e293b' }}>
                        <td style={td}>
                          <input type="checkbox" checked={sel} onChange={() => toggleSelect(p.id)} />
                        </td>
                        <td style={td}>{p.part_number}</td>
                        <td style={td}>{p.part_name}</td>
                        <td style={{ ...td, color: p.low_stock ? '#facc15' : '#22c55e' }}>
                          {p.quantity}
                        </td>
                        <td style={td}>${Number(p.unit_cost || 0).toFixed(2)}</td>
                        <td style={td}>
                          {sel && (
                            <input
                              type="number"
                              min="1"
                              value={selectedParts[p.id]}
                              onChange={e => setQty(p.id, e.target.value)}
                              style={{ ...selectStyle, width: 70, padding: '4px 6px' }}
                            />
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div style={{ marginTop: 12, display: 'flex', gap: 10 }}>
              <button onClick={() => setStep(1)} style={btnSecondary}>Back</button>
              <button
                disabled={Object.keys(selectedParts).length === 0 || busy}
                onClick={runCheck}
                style={btnPrimary}
              >{busy ? 'Checking...' : 'Next: Check Inventory'}</button>
            </div>
          </div>
        )}

        {/* STEP 3: Check Inventory */}
        {step === 3 && check && (
          <div>
            <h4 style={{ margin: '0 0 12px', color: '#f1f5f9' }}>Inventory Check Results</h4>
            <table style={tableStyle}>
              <thead>
                <tr style={{ background: '#0f172a' }}>
                  <th style={th}>Part #</th>
                  <th style={th}>Name</th>
                  <th style={th}>Req</th>
                  <th style={th}>Avail</th>
                  <th style={th}>Line $</th>
                  <th style={th}>Status</th>
                </tr>
              </thead>
              <tbody>
                {check.lines.map(l => (
                  <tr key={l.part_id} style={{ borderBottom: '1px solid #1e293b' }}>
                    <td style={td}>{l.part_number || l.part_id}</td>
                    <td style={td}>{l.part_name || '-'}</td>
                    <td style={td}>{l.requested}</td>
                    <td style={td}>{l.available ?? '-'}</td>
                    <td style={td}>${Number(l.line_total || 0).toFixed(2)}</td>
                    <td style={{ ...td, color: statusColor(l.status), fontWeight: 600 }}>{l.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={{ marginTop: 12, padding: 10, background: '#0f172a', borderRadius: 6, fontSize: 13 }}>
              <div>Total: <b>${Number(check.total_cost || 0).toFixed(2)}</b></div>
              <div>Can fulfill from stock: <b style={{ color: check.can_fulfill ? '#22c55e' : '#facc15' }}>{check.can_fulfill ? 'YES' : 'NO - some lines need backorder'}</b></div>
            </div>
            <div style={{ marginTop: 12 }}>
              <label style={{ fontSize: 12, color: '#cbd5e1', marginRight: 8 }}>Priority:</label>
              <select value={priority} onChange={e => setPriority(e.target.value)} style={{ ...selectStyle, width: 140 }}>
                <option>Low</option><option>Medium</option><option>High</option><option>Critical</option>
              </select>
            </div>
            <div style={{ marginTop: 10 }}>
              <textarea
                placeholder="Notes (optional)"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                style={{ ...selectStyle, width: '100%', height: 60 }}
              />
            </div>
            <div style={{ marginTop: 12, display: 'flex', gap: 10 }}>
              <button onClick={() => setStep(2)} style={btnSecondary}>Back</button>
              <button onClick={submit} disabled={busy} style={btnPrimary}>
                {busy ? 'Submitting...' : 'Submit Requisition'}
              </button>
            </div>
          </div>
        )}

        {/* STEP 4: Done */}
        {step === 4 && submitted && (
          <div>
            <h4 style={{ margin: '0 0 12px', color: '#22c55e' }}>Requisition Submitted</h4>
            <div style={{ background: '#0f172a', padding: 14, borderRadius: 8, fontSize: 13 }}>
              <div>Requisition ID: <b style={{ color: '#60a5fa' }}>{submitted.requisition_id}</b></div>
              <div>Aircraft: <b>{submitted.aircraft_reg}</b></div>
              <div>Priority: <b>{submitted.priority}</b></div>
              <div>Lines: <b>{submitted.line_count}</b></div>
              <div>Total: <b>${Number(submitted.total_cost || 0).toFixed(2)}</b></div>
              <div>Status: <b style={{ color: '#22c55e' }}>{submitted.status}</b></div>
              <div>Submitted: {submitted.submitted_at}</div>
            </div>
            <div style={{ marginTop: 12 }}>
              <button onClick={reset} style={btnPrimary}>New Requisition</button>
            </div>
          </div>
        )}

        {err && (
          <div style={{ marginTop: 12, padding: 10, background: '#58151c', border: '1px solid #dc3545', borderRadius: 6 }}>
            Error: {err}
          </div>
        )}
      </div>
    </div>
  );
}

const selectStyle = {
  background: '#0f172a',
  color: '#f1f5f9',
  border: '1px solid #334155',
  borderRadius: 6,
  padding: '8px 10px',
  minWidth: 280,
};
const btnPrimary = {
  background: '#2563eb', color: '#fff', border: 'none',
  borderRadius: 6, padding: '8px 16px', cursor: 'pointer', fontWeight: 600,
};
const btnSecondary = {
  background: '#334155', color: '#f1f5f9', border: 'none',
  borderRadius: 6, padding: '8px 16px', cursor: 'pointer',
};
const tableStyle = { width: '100%', borderCollapse: 'collapse', fontSize: 13 };
const th = { textAlign: 'left', padding: '8px 10px', color: '#94a3b8', fontWeight: 600, fontSize: 12 };
const td = { padding: '8px 10px', color: '#e2e8f0' };

function statusColor(s) {
  switch (s) {
    case 'OK': return '#22c55e';
    case 'OK_LOW_AFTER': return '#facc15';
    case 'PARTIAL': return '#f97316';
    case 'BACKORDER': return '#ef4444';
    case 'NOT_FOUND': return '#94a3b8';
    default: return '#cbd5e1';
  }
}

export default PartsRequisitionWizard;
