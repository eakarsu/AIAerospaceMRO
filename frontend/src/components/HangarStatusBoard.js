import React, { useEffect, useState } from 'react';

const API = (typeof window !== 'undefined' && window.__AERO_API__) || 'http://localhost:4047/api';

const STATUS_STYLE = {
  IN_SERVICE: { bg: '#0f5132', border: '#198754', label: 'In Service', color: '#d1e7dd' },
  IN_MAINT:   { bg: '#664d03', border: '#ffc107', label: 'In Maint',   color: '#fff3cd' },
  AOG:        { bg: '#58151c', border: '#dc3545', label: 'AOG',        color: '#f8d7da' },
  EMPTY:      { bg: '#1f2937', border: '#374151', label: 'Empty',      color: '#9ca3af' },
};

function HangarStatusBoard({ token }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const r = await fetch(`${API}/custom-views/hangar-status-board`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const j = await r.json();
        if (!cancelled) setData(j);
      } catch (e) {
        if (!cancelled) setErr(e.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [token]);

  if (loading) return <div style={{ color: '#94a3b8' }}>Loading hangar board...</div>;
  if (err) return <div style={{ color: '#f87171' }}>Error: {err}</div>;
  if (!data) return null;

  const { hangars = [], bays = [], summary = {} } = data;
  const baysByHangar = {};
  bays.forEach(b => {
    if (!baysByHangar[b.hangar_code]) baysByHangar[b.hangar_code] = [];
    baysByHangar[b.hangar_code].push(b);
  });

  return (
    <div style={{ color: '#e5e7eb' }}>
      <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <SummaryChip label="Total Bays" value={summary.total_bays} color="#60a5fa" />
        <SummaryChip label="In Service" value={summary.in_service} color="#22c55e" />
        <SummaryChip label="In Maint"   value={summary.in_maint}   color="#facc15" />
        <SummaryChip label="AOG"        value={summary.aog}        color="#ef4444" />
        <SummaryChip label="Empty"      value={summary.empty}      color="#64748b" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
        {hangars.map(h => (
          <div key={h.id} style={{
            background: '#111827',
            border: '1px solid #1f2937',
            borderRadius: 10,
            padding: 14,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 15, color: '#f1f5f9' }}>
                  {h.hangar_code} - {h.hangar_name}
                </div>
                <div style={{ fontSize: 11, color: '#94a3b8' }}>{h.location} - {h.hangar_type}</div>
              </div>
              <div style={{
                fontSize: 11,
                padding: '2px 8px',
                background: '#1e293b',
                borderRadius: 6,
                color: '#cbd5e1',
              }}>
                {h.current_occupancy}/{h.capacity}
              </div>
            </div>
            <div style={{
              display: 'grid',
              gridTemplateColumns: `repeat(${Math.min(4, h.capacity || 1)}, 1fr)`,
              gap: 6,
            }}>
              {(baysByHangar[h.hangar_code] || []).map(bay => {
                const st = STATUS_STYLE[bay.status] || STATUS_STYLE.EMPTY;
                return (
                  <div key={`${h.id}-${bay.bay_number}`} style={{
                    background: st.bg,
                    border: `1px solid ${st.border}`,
                    borderRadius: 6,
                    padding: 8,
                    minHeight: 72,
                  }}>
                    <div style={{ fontSize: 10, color: st.color, fontWeight: 600 }}>BAY {bay.bay_number}</div>
                    <div style={{ fontSize: 12, color: '#fff', fontWeight: 700, marginTop: 2 }}>
                      {bay.aircraft_reg || '-'}
                    </div>
                    <div style={{ fontSize: 9, color: st.color, marginTop: 2 }}>
                      {st.label}
                    </div>
                    {bay.maintenance_type && (
                      <div style={{ fontSize: 9, color: '#cbd5e1', marginTop: 2 }}>
                        {bay.maintenance_type.substring(0, 20)}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SummaryChip({ label, value, color }) {
  return (
    <div style={{
      background: '#0f172a',
      border: `1px solid ${color}`,
      borderRadius: 8,
      padding: '8px 14px',
      minWidth: 100,
    }}>
      <div style={{ fontSize: 11, color: '#94a3b8' }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 700, color }}>{value ?? 0}</div>
    </div>
  );
}

export default HangarStatusBoard;
