import React, { useEffect, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer,
  CartesianGrid, Cell
} from 'recharts';

const API = (typeof window !== 'undefined' && window.__AERO_API__) || 'http://localhost:4047/api';

const PRIORITY_COLOR = {
  Critical: '#ef4444',
  High: '#f97316',
  Medium: '#facc15',
  Low: '#22c55e',
};

function MaintScheduleGantt({ token }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const r = await fetch(`${API}/custom-views/maint-schedule-gantt`, {
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

  if (loading) return <div style={{ color: '#94a3b8' }}>Loading maintenance schedule...</div>;
  if (err) return <div style={{ color: '#f87171' }}>Error: {err}</div>;
  if (!data || !data.aircraft) return null;

  // Build chart rows: one row per aircraft, with offset_days then total_duration_days
  const chartData = data.aircraft.slice(0, 25).map(a => ({
    name: a.aircraft_reg,
    type: a.aircraft_type,
    offset: a.offset_days,
    duration: a.total_duration_days,
    windowCount: a.windows.length,
    priority: a.windows[0]?.priority || 'Medium',
    maintenance_type: a.windows.map(w => w.maintenance_type).filter(Boolean).join(', '),
    status: a.windows[0]?.status,
  }));

  const baseLabel = data.base_date
    ? new Date(data.base_date).toISOString().slice(0, 10)
    : '-';

  return (
    <div style={{ color: '#e5e7eb' }}>
      <div style={{ marginBottom: 12, display: 'flex', gap: 14, flexWrap: 'wrap' }}>
        <Chip label="Aircraft" value={data.total_aircraft} color="#60a5fa" />
        <Chip label="Windows"  value={data.total_windows}  color="#a78bfa" />
        <Chip label="Base"     value={baseLabel}           color="#34d399" />
      </div>

      <div style={{
        background: '#111827',
        border: '1px solid #1f2937',
        borderRadius: 10,
        padding: 14,
        height: Math.max(420, chartData.length * 28 + 80),
      }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ top: 10, right: 30, left: 60, bottom: 20 }}
            barCategoryGap={6}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
            <XAxis
              type="number"
              stroke="#94a3b8"
              label={{ value: 'Days from base date', position: 'insideBottom', offset: -5, fill: '#94a3b8' }}
            />
            <YAxis
              type="category"
              dataKey="name"
              stroke="#94a3b8"
              width={80}
              tick={{ fontSize: 11 }}
            />
            <Tooltip
              contentStyle={{ background: '#0f172a', border: '1px solid #334155', color: '#f1f5f9' }}
              formatter={(value, key, props) => {
                if (key === 'offset') return [`${value} days`, 'Start offset'];
                if (key === 'duration') return [`${value} days`, 'Window length'];
                return [value, key];
              }}
              labelFormatter={(label, payload) => {
                const p = payload && payload[0] && payload[0].payload;
                return p ? `${label} - ${p.type || ''} (${p.maintenance_type})` : label;
              }}
            />
            <Legend wrapperStyle={{ color: '#cbd5e1' }} />
            <Bar dataKey="offset" stackId="t" fill="transparent" name="(offset)" legendType="none" />
            <Bar dataKey="duration" stackId="t" name="Maintenance Window">
              {chartData.map((row, i) => (
                <Cell key={i} fill={PRIORITY_COLOR[row.priority] || '#60a5fa'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div style={{ marginTop: 10, display: 'flex', gap: 12, flexWrap: 'wrap', fontSize: 12 }}>
        {Object.entries(PRIORITY_COLOR).map(([k, c]) => (
          <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 12, height: 12, background: c, borderRadius: 2 }} />
            <span style={{ color: '#cbd5e1' }}>{k}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Chip({ label, value, color }) {
  return (
    <div style={{
      background: '#0f172a',
      border: `1px solid ${color}`,
      borderRadius: 8,
      padding: '6px 12px',
    }}>
      <div style={{ fontSize: 11, color: '#94a3b8' }}>{label}</div>
      <div style={{ fontSize: 16, fontWeight: 700, color }}>{value ?? 0}</div>
    </div>
  );
}

export default MaintScheduleGantt;
