import React, { useState, useEffect, useCallback } from 'react';
import { API } from '../App';

const AIRCRAFT_TYPES = [
  'Boeing 737-800', 'Boeing 737 MAX 8', 'Boeing 787-9', 'Boeing 777-300ER',
  'Airbus A320neo', 'Airbus A321neo', 'Airbus A350-900', 'Embraer E175', 'Bombardier CRJ-900'
];
const CHECK_TYPES = ['A-Check', 'B-Check', 'C-Check', 'D-Check'];
const STATUS_OPTIONS = ['Normal', 'Caution', 'Warning', 'Critical'];

const emptyForm = {
  aircraft_reg: '', aircraft_type: '', operator: '', total_flight_hours: '',
  total_cycles: '', last_major_check: '', last_check_date: '', next_check_due: '',
  health_score: '', engine_status: '', avionics_status: '', airframe_status: '',
  landing_gear_status: '', apu_status: '', notes: ''
};

const statusColor = (s) => {
  switch (s) {
    case 'Normal': return '#10b981';
    case 'Caution': return '#f59e0b';
    case 'Warning': return '#f97316';
    case 'Critical': return '#ef4444';
    default: return '#64748b';
  }
};

const healthColor = (score) => {
  const n = Number(score);
  if (n >= 80) return '#10b981';
  if (n >= 60) return '#f59e0b';
  return '#ef4444';
};

const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '-';

const parseAIResponse = (text) => {
  if (!text) return [];
  const sections = [];
  let current = null;
  const lines = text.split('\n');
  for (const line of lines) {
    const headerMatch = line.match(/^##\s+(.+)/) || line.match(/^\*\*(.+?)\*\*\s*$/) || line.match(/^([A-Z][^:]{2,60}):\s*$/);
    if (headerMatch) {
      if (current) sections.push(current);
      current = { title: headerMatch[1].replace(/\*\*/g, '').trim(), content: '' };
    } else {
      if (!current) current = { title: 'Analysis', content: '' };
      current.content += line + '\n';
    }
  }
  if (current) sections.push(current);
  return sections.filter(s => s.content.trim());
};

function FleetHealth({ token }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState(emptyForm);
  const [aiResult, setAiResult] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/fleet-health`);
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setItems(data.records || (Array.isArray(data) ? data : []));
    } catch {
      showToast('Failed to load fleet data', 'error');
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const method = editMode ? 'PUT' : 'POST';
    const url = editMode ? `${API}/fleet-health/${selectedItem.id}` : `${API}/fleet-health`;
    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      if (!res.ok) throw new Error('Save failed');
      showToast(editMode ? 'Aircraft updated successfully' : 'Aircraft added successfully');
      setShowForm(false);
      setEditMode(false);
      setFormData(emptyForm);
      fetchItems();
    } catch {
      showToast('Failed to save aircraft data', 'error');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this aircraft record?')) return;
    try {
      const res = await fetch(`${API}/fleet-health/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Delete failed');
      showToast('Aircraft record deleted');
      setShowDetail(false);
      setSelectedItem(null);
      fetchItems();
    } catch {
      showToast('Failed to delete record', 'error');
    }
  };

  const openCreate = () => {
    setEditMode(false);
    setFormData(emptyForm);
    setShowForm(true);
  };

  const openEdit = (item) => {
    setEditMode(true);
    setFormData({
      aircraft_reg: item.aircraft_reg || '',
      aircraft_type: item.aircraft_type || '',
      operator: item.operator || '',
      total_flight_hours: item.total_flight_hours || '',
      total_cycles: item.total_cycles || '',
      last_major_check: item.last_major_check || '',
      last_check_date: item.last_check_date ? item.last_check_date.split('T')[0] : '',
      next_check_due: item.next_check_due ? item.next_check_due.split('T')[0] : '',
      health_score: item.health_score || '',
      engine_status: item.engine_status || '',
      avionics_status: item.avionics_status || '',
      airframe_status: item.airframe_status || '',
      landing_gear_status: item.landing_gear_status || '',
      apu_status: item.apu_status || '',
      notes: item.notes || ''
    });
    setSelectedItem(item);
    setShowDetail(false);
    setShowForm(true);
  };

  const openDetail = (item) => {
    setSelectedItem(item);
    setAiResult(null);
    setShowDetail(true);
  };

  const runAI = async () => {
    if (!selectedItem) return;
    setAiLoading(true);
    setAiResult(null);
    const summary = `Registration: ${selectedItem.aircraft_reg}, Type: ${selectedItem.aircraft_type}, Health Score: ${selectedItem.health_score}, Engine: ${selectedItem.engine_status}, Avionics: ${selectedItem.avionics_status}, Airframe: ${selectedItem.airframe_status}, Landing Gear: ${selectedItem.landing_gear_status}, APU: ${selectedItem.apu_status}, Flight Hours: ${selectedItem.total_flight_hours}, Cycles: ${selectedItem.total_cycles}`;
    try {
      const res = await fetch(`${API}/ai/fleet-optimization`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fleet_data: summary })
      });
      if (!res.ok) throw new Error('AI request failed');
      const data = await res.json();
      setAiResult(data.analysis || data.result || data.message || JSON.stringify(data));
    } catch {
      showToast('AI analysis failed', 'error');
    } finally {
      setAiLoading(false);
    }
  };

  const subsystems = selectedItem ? [
    { label: 'Engine', status: selectedItem.engine_status },
    { label: 'Avionics', status: selectedItem.avionics_status },
    { label: 'Airframe', status: selectedItem.airframe_status },
    { label: 'Landing Gear', status: selectedItem.landing_gear_status },
    { label: 'APU', status: selectedItem.apu_status }
  ] : [];

  return (
    <div className="fade-in">
      {toast && (
        <div className={`toast toast-${toast.type}`}>{toast.message}</div>
      )}

      <div className="page-header">
        <div>
          <h1>Fleet Health Monitor</h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: '4px', fontSize: '0.9rem' }}>
            Real-time aircraft health monitoring and optimization
          </p>
        </div>
        <button className="btn btn-primary" onClick={openCreate}>+ Add Aircraft</button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>
          <div className="ai-loading">Loading fleet data...</div>
        </div>
      ) : items.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>
          <p style={{ fontSize: '1.1rem', marginBottom: '12px' }}>No aircraft in fleet</p>
          <p style={{ fontSize: '0.9rem' }}>Add your first aircraft to start monitoring</p>
        </div>
      ) : (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Aircraft Reg</th>
                <th>Type</th>
                <th>Operator</th>
                <th>Health Score</th>
                <th>Flight Hours</th>
                <th>Next Check</th>
                <th>Engine</th>
                <th>Avionics</th>
              </tr>
            </thead>
            <tbody>
              {items.map(item => {
                const score = Number(item.health_score) || 0;
                const hc = healthColor(score);
                return (
                  <tr key={item.id} onClick={() => openDetail(item)}>
                    <td style={{ fontWeight: 600 }}>{item.aircraft_reg}</td>
                    <td>{item.aircraft_type}</td>
                    <td>{item.operator}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ flex: 1, maxWidth: '100px', height: '8px', background: 'var(--bg-dark)', borderRadius: '4px', overflow: 'hidden' }}>
                          <div style={{ width: `${score}%`, height: '100%', background: hc, borderRadius: '4px', transition: 'width 0.3s ease' }} />
                        </div>
                        <span style={{ color: hc, fontWeight: 700, fontSize: '0.9rem', minWidth: '32px' }}>{score}</span>
                      </div>
                    </td>
                    <td>{Number(item.total_flight_hours || 0).toLocaleString()}</td>
                    <td>{formatDate(item.next_check_due)}</td>
                    <td><span style={{ color: statusColor(item.engine_status), fontWeight: 600 }}>{item.engine_status || '-'}</span></td>
                    <td><span style={{ color: statusColor(item.avionics_status), fontWeight: 600 }}>{item.avionics_status || '-'}</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Detail Modal */}
      {showDetail && selectedItem && (
        <div className="modal-overlay" onClick={() => setShowDetail(false)}>
          <div className="modal" style={{ maxWidth: '800px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{selectedItem.aircraft_reg} - {selectedItem.aircraft_type}</h2>
              <button className="btn btn-secondary btn-sm" onClick={() => setShowDetail(false)}>Close</button>
            </div>
            <div className="modal-body">
              {/* Health Gauge */}
              <div style={{ marginBottom: '24px', textAlign: 'center' }}>
                <label style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>Overall Health Score</label>
                <div style={{ fontSize: '2.5rem', fontWeight: 800, color: healthColor(selectedItem.health_score), lineHeight: 1.2, margin: '8px 0' }}>
                  {selectedItem.health_score || 0}
                </div>
                <div style={{ width: '100%', height: '12px', background: 'var(--bg-dark)', borderRadius: '6px', overflow: 'hidden' }}>
                  <div style={{
                    width: `${Number(selectedItem.health_score) || 0}%`,
                    height: '100%',
                    background: `linear-gradient(90deg, ${healthColor(selectedItem.health_score)}, ${healthColor(selectedItem.health_score)}dd)`,
                    borderRadius: '6px',
                    transition: 'width 0.5s ease'
                  }} />
                </div>
              </div>

              {/* Subsystem Statuses */}
              <div style={{ marginBottom: '24px' }}>
                <label style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: '12px', display: 'block' }}>Subsystem Status</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '12px' }}>
                  {subsystems.map(sub => (
                    <div key={sub.label} style={{
                      background: 'var(--bg-dark)', borderRadius: 'var(--radius-sm)', padding: '14px 10px',
                      textAlign: 'center', border: `1px solid ${statusColor(sub.status)}33`
                    }}>
                      <div style={{
                        width: '12px', height: '12px', borderRadius: '50%',
                        background: statusColor(sub.status), margin: '0 auto 8px',
                        boxShadow: `0 0 8px ${statusColor(sub.status)}66`
                      }} />
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>{sub.label}</div>
                      <div style={{ fontSize: '0.85rem', fontWeight: 600, color: statusColor(sub.status) }}>{sub.status || 'N/A'}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Detail Grid */}
              <div className="detail-grid">
                <div className="detail-item"><label>Operator</label><div className="value">{selectedItem.operator || '-'}</div></div>
                <div className="detail-item"><label>Total Flight Hours</label><div className="value">{Number(selectedItem.total_flight_hours || 0).toLocaleString()}</div></div>
                <div className="detail-item"><label>Total Cycles</label><div className="value">{Number(selectedItem.total_cycles || 0).toLocaleString()}</div></div>
                <div className="detail-item"><label>Last Major Check</label><div className="value">{selectedItem.last_major_check || '-'}</div></div>
                <div className="detail-item"><label>Last Check Date</label><div className="value">{formatDate(selectedItem.last_check_date)}</div></div>
                <div className="detail-item"><label>Next Check Due</label><div className="value">{formatDate(selectedItem.next_check_due)}</div></div>
              </div>

              {selectedItem.notes && (
                <div style={{ marginTop: '16px' }}>
                  <label style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>Notes</label>
                  <div style={{ marginTop: '6px', color: 'var(--text-secondary)', fontSize: '0.9rem', whiteSpace: 'pre-wrap' }}>{selectedItem.notes}</div>
                </div>
              )}

              {/* AI Section */}
              <div style={{ marginTop: '24px', borderTop: '1px solid var(--border)', paddingTop: '20px' }}>
                <button className="btn btn-primary" onClick={runAI} disabled={aiLoading} style={{ width: '100%' }}>
                  {aiLoading ? 'Analyzing...' : 'Run AI Fleet Optimization Analysis'}
                </button>
                {aiLoading && <div className="ai-loading" style={{ marginTop: '16px' }}>AI is analyzing fleet data...</div>}
                {aiResult && (
                  <div className="ai-result" style={{ marginTop: '16px' }}>
                    <h3>AI Fleet Optimization</h3>
                    {parseAIResponse(aiResult).map((section, i) => (
                      <div className="ai-section" key={i}>
                        <div className="ai-section-title">{section.title}</div>
                        <div className="ai-result-content" dangerouslySetInnerHTML={{
                          __html: section.content.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
                        }} />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-danger btn-sm" onClick={() => handleDelete(selectedItem.id)}>Delete</button>
              <button className="btn btn-primary btn-sm" onClick={() => openEdit(selectedItem)}>Edit</button>
            </div>
          </div>
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <div className="modal-overlay" onClick={() => { setShowForm(false); setEditMode(false); }}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editMode ? 'Edit Aircraft' : 'Add Aircraft'}</h2>
              <button className="btn btn-secondary btn-sm" onClick={() => { setShowForm(false); setEditMode(false); }}>Cancel</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
                  <div className="form-group">
                    <label>Aircraft Registration</label>
                    <input name="aircraft_reg" value={formData.aircraft_reg} onChange={handleChange} required placeholder="e.g. N12345" />
                  </div>
                  <div className="form-group">
                    <label>Aircraft Type</label>
                    <select name="aircraft_type" value={formData.aircraft_type} onChange={handleChange} required>
                      <option value="">Select type...</option>
                      {AIRCRAFT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Operator</label>
                    <input name="operator" value={formData.operator} onChange={handleChange} required placeholder="Airline / Operator" />
                  </div>
                  <div className="form-group">
                    <label>Total Flight Hours</label>
                    <input name="total_flight_hours" type="number" value={formData.total_flight_hours} onChange={handleChange} min="0" placeholder="0" />
                  </div>
                  <div className="form-group">
                    <label>Total Cycles</label>
                    <input name="total_cycles" type="number" value={formData.total_cycles} onChange={handleChange} min="0" placeholder="0" />
                  </div>
                  <div className="form-group">
                    <label>Last Major Check</label>
                    <select name="last_major_check" value={formData.last_major_check} onChange={handleChange}>
                      <option value="">Select check...</option>
                      {CHECK_TYPES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Last Check Date</label>
                    <input name="last_check_date" type="date" value={formData.last_check_date} onChange={handleChange} />
                  </div>
                  <div className="form-group">
                    <label>Next Check Due</label>
                    <input name="next_check_due" type="date" value={formData.next_check_due} onChange={handleChange} />
                  </div>
                  <div className="form-group">
                    <label>Health Score (0-100)</label>
                    <input name="health_score" type="number" value={formData.health_score} onChange={handleChange} min="0" max="100" placeholder="0-100" />
                  </div>
                  <div className="form-group">
                    <label>Engine Status</label>
                    <select name="engine_status" value={formData.engine_status} onChange={handleChange}>
                      <option value="">Select status...</option>
                      {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Avionics Status</label>
                    <select name="avionics_status" value={formData.avionics_status} onChange={handleChange}>
                      <option value="">Select status...</option>
                      {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Airframe Status</label>
                    <select name="airframe_status" value={formData.airframe_status} onChange={handleChange}>
                      <option value="">Select status...</option>
                      {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Landing Gear Status</label>
                    <select name="landing_gear_status" value={formData.landing_gear_status} onChange={handleChange}>
                      <option value="">Select status...</option>
                      {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>APU Status</label>
                    <select name="apu_status" value={formData.apu_status} onChange={handleChange}>
                      <option value="">Select status...</option>
                      {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                </div>
                <div className="form-group">
                  <label>Notes</label>
                  <textarea name="notes" value={formData.notes} onChange={handleChange} placeholder="Additional notes..." />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => { setShowForm(false); setEditMode(false); }}>Cancel</button>
                <button type="submit" className="btn btn-success">{editMode ? 'Update' : 'Create'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default FleetHealth;
