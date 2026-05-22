import React, { useEffect, useState } from 'react';

const API = (typeof window !== 'undefined' && window.__AERO_API__) || 'http://localhost:4047/api';

function WorkOrderPDF({ token }) {
  const [list, setList] = useState([]);
  const [selected, setSelected] = useState('');
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [msg, setMsg] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const r = await fetch(`${API}/custom-views/work-orders/list`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const j = await r.json();
        if (!cancelled) {
          setList(j.work_orders || []);
          if (j.work_orders && j.work_orders.length > 0) {
            setSelected(String(j.work_orders[0].id));
          }
        }
      } catch (e) {
        if (!cancelled) setMsg(`Error: ${e.message}`);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [token]);

  const downloadPDF = async () => {
    if (!selected) return;
    setDownloading(true);
    setMsg(null);
    try {
      const r = await fetch(`${API}/custom-views/work-orders/${selected}/pdf`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const blob = await r.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const wo = list.find(w => String(w.id) === String(selected));
      a.download = `WO-${wo?.wo_number || selected}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setMsg(`Downloaded WO-${wo?.wo_number || selected}.pdf`);
    } catch (e) {
      setMsg(`Failed: ${e.message}`);
    } finally {
      setDownloading(false);
    }
  };

  const selectedWO = list.find(w => String(w.id) === String(selected));

  return (
    <div style={{ color: '#e5e7eb' }}>
      <div style={{
        background: '#111827',
        border: '1px solid #1f2937',
        borderRadius: 10,
        padding: 16,
      }}>
        <div style={{ marginBottom: 12, fontSize: 13, color: '#94a3b8' }}>
          Select a work order to generate a printable PDF with tasks, parts, technician, hours and sign-off.
        </div>
        {loading ? (
          <div style={{ color: '#94a3b8' }}>Loading work orders...</div>
        ) : (
          <>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
              <label style={{ fontSize: 12, color: '#cbd5e1' }}>Work Order:</label>
              <select
                value={selected}
                onChange={e => setSelected(e.target.value)}
                style={{
                  background: '#0f172a',
                  color: '#f1f5f9',
                  border: '1px solid #334155',
                  borderRadius: 6,
                  padding: '8px 10px',
                  minWidth: 360,
                }}
              >
                {list.map(w => (
                  <option key={w.id} value={w.id}>
                    {w.wo_number} - {w.aircraft_reg} - {w.title?.substring(0, 50)}
                  </option>
                ))}
              </select>
              <button
                onClick={downloadPDF}
                disabled={!selected || downloading}
                style={{
                  background: '#2563eb',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 6,
                  padding: '8px 16px',
                  cursor: downloading ? 'wait' : 'pointer',
                  fontWeight: 600,
                }}
              >
                {downloading ? 'Generating...' : 'Download PDF'}
              </button>
            </div>

            {selectedWO && (
              <div style={{
                marginTop: 16,
                padding: 12,
                background: '#0f172a',
                border: '1px solid #1e293b',
                borderRadius: 8,
                fontSize: 13,
              }}>
                <div style={{ fontWeight: 700, color: '#f1f5f9', marginBottom: 4 }}>
                  {selectedWO.wo_number} - {selectedWO.title}
                </div>
                <div style={{ color: '#cbd5e1' }}>
                  Aircraft: <b>{selectedWO.aircraft_reg}</b> | Type: {selectedWO.maintenance_type} |
                  Priority: <b>{selectedWO.priority}</b> | Status: <b>{selectedWO.status}</b>
                </div>
                <div style={{ color: '#94a3b8', marginTop: 4 }}>
                  Tech: {selectedWO.assigned_to || 'Unassigned'} |
                  Est: {selectedWO.estimated_hours || 0}h |
                  Actual: {selectedWO.actual_hours || 0}h
                </div>
              </div>
            )}

            {msg && (
              <div style={{
                marginTop: 12,
                padding: '8px 12px',
                background: msg.startsWith('Failed') ? '#58151c' : '#0f5132',
                border: `1px solid ${msg.startsWith('Failed') ? '#dc3545' : '#198754'}`,
                borderRadius: 6,
                fontSize: 13,
              }}>
                {msg}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default WorkOrderPDF;
