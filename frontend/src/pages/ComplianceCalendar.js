import React, { useState, useEffect } from 'react';
import { API } from '../App';

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

function ComplianceCalendar({ token }) {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth());
  const [selected, setSelected] = useState(null);

  const authHeaders = token ? { Authorization: `Bearer ${token}` } : {};

  const fetchAll = () => {
    setLoading(true);
    // Fetch all compliance records (high limit)
    fetch(`${API}/compliance?limit=200&page=1`, { headers: authHeaders })
      .then(r => r.json())
      .then(d => {
        setRecords(d.records || (Array.isArray(d) ? d : []));
        setLoading(false);
      })
      .catch(err => { setError(err.message); setLoading(false); });
  };

  useEffect(() => { fetchAll(); }, []); // eslint-disable-line

  const priorityColor = (priority) => {
    switch ((priority || '').toLowerCase()) {
      case 'critical': return '#ef4444';
      case 'high': return '#f97316';
      case 'medium': return '#eab308';
      default: return '#10b981';
    }
  };

  // Build calendar days for current month
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // Map due_date to calendar day
  const byDay = {};
  records.forEach(r => {
    if (!r.due_date) return;
    const d = new Date(r.due_date);
    if (d.getFullYear() === year && d.getMonth() === month) {
      const day = d.getDate();
      if (!byDay[day]) byDay[day] = [];
      byDay[day].push(r);
    }
  });

  const prevMonth = () => {
    if (month === 0) { setYear(y => y - 1); setMonth(11); }
    else setMonth(m => m - 1);
    setSelected(null);
  };
  const nextMonth = () => {
    if (month === 11) { setYear(y => y + 1); setMonth(0); }
    else setMonth(m => m + 1);
    setSelected(null);
  };

  const totalThisMonth = Object.values(byDay).reduce((sum, arr) => sum + arr.length, 0);
  const overdueThisMonth = records.filter(r => {
    if (!r.due_date || r.status === 'Completed') return false;
    const d = new Date(r.due_date);
    return d.getFullYear() === year && d.getMonth() === month && d < new Date();
  }).length;

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <h1>Compliance Calendar</h1>
          <p className="subtitle">AD and compliance directive due dates</p>
        </div>
      </div>

      {error && <div className="toast toast-error">{error}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 20 }}>
        <div className="card"><div className="card-title">Due This Month</div><div className="card-value" style={{ color: '#0ea5e9' }}>{totalThisMonth}</div></div>
        <div className="card"><div className="card-title">Overdue This Month</div><div className="card-value" style={{ color: '#ef4444' }}>{overdueThisMonth}</div></div>
        <div className="card"><div className="card-title">Total Records</div><div className="card-value">{records.length}</div></div>
      </div>

      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, padding: 20, marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <button className="btn btn-secondary" onClick={prevMonth}>&lsaquo; Prev</button>
          <h2 style={{ margin: 0 }}>{MONTHS[month]} {year}</h2>
          <button className="btn btn-secondary" onClick={nextMonth}>Next &rsaquo;</button>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>Loading...</div>
        ) : (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, marginBottom: 4 }}>
              {DAYS.map(d => (
                <div key={d} style={{ textAlign: 'center', fontWeight: 600, fontSize: '0.8rem', color: 'var(--text-muted)', padding: '4px 0' }}>{d}</div>
              ))}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
              {Array.from({ length: firstDay }).map((_, i) => (
                <div key={`empty-${i}`} style={{ minHeight: 60 }} />
              ))}
              {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
                const items = byDay[day] || [];
                const today = new Date();
                const isToday = today.getDate() === day && today.getMonth() === month && today.getFullYear() === year;
                const isSelected = selected && selected.day === day;

                return (
                  <div
                    key={day}
                    onClick={() => items.length > 0 && setSelected(isSelected ? null : { day, items })}
                    style={{
                      minHeight: 60,
                      border: isToday ? '2px solid #0ea5e9' : '1px solid var(--border)',
                      borderRadius: 4,
                      padding: 4,
                      cursor: items.length > 0 ? 'pointer' : 'default',
                      background: isSelected ? 'var(--bg-hover)' : 'transparent',
                      transition: 'background 0.15s'
                    }}
                  >
                    <div style={{ fontWeight: isToday ? 700 : 400, color: isToday ? '#0ea5e9' : 'inherit', fontSize: '0.9rem', marginBottom: 2 }}>{day}</div>
                    {items.slice(0, 3).map((item, i) => (
                      <div key={i} style={{
                        fontSize: '0.65rem',
                        background: `${priorityColor(item.priority)}20`,
                        color: priorityColor(item.priority),
                        borderLeft: `2px solid ${priorityColor(item.priority)}`,
                        padding: '1px 3px',
                        borderRadius: 2,
                        marginBottom: 1,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}>
                        {item.directive_number || item.title}
                      </div>
                    ))}
                    {items.length > 3 && (
                      <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>+{items.length - 3} more</div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {selected && (
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, padding: 20 }}>
          <h3>{MONTHS[month]} {selected.day}, {year} – {selected.items.length} Due Item{selected.items.length !== 1 ? 's' : ''}</h3>
          {selected.items.map((item, i) => (
            <div key={i} style={{ borderLeft: `3px solid ${priorityColor(item.priority)}`, padding: '10px 14px', marginBottom: 8, background: 'var(--bg-hover)', borderRadius: '0 4px 4px 0' }}>
              <div style={{ fontWeight: 600 }}>{item.directive_number} – {item.title}</div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: 2 }}>
                Authority: {item.authority} | Aircraft: {item.aircraft_type} | Status: {item.status} | Priority: <span style={{ color: priorityColor(item.priority) }}>{item.priority}</span>
              </div>
              {item.description && <div style={{ fontSize: '0.85rem', marginTop: 4 }}>{item.description.slice(0, 200)}{item.description.length > 200 ? '...' : ''}</div>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default ComplianceCalendar;
