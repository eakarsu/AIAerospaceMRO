import React, { useState, useEffect, useCallback } from 'react';
import { API } from '../App';

const SEVERITY_OPTIONS = ['Critical', 'Major', 'Minor', 'Negligible'];
const CATEGORY_OPTIONS = [
  'FOD', 'Bird Strike', 'Ground Damage', 'Tool Control', 'Chemical Exposure',
  'Electrical', 'Fire/Smoke', 'Runway Incursion', 'Maintenance Error',
  'Weather Related', 'Human Factors', 'Other'
];
const STATUS_OPTIONS = ['Open', 'Under Investigation', 'Corrective Action', 'Closed', 'Reopened'];

const SEVERITY_BADGE = { Critical: 'badge-danger', Major: 'badge-warning', Minor: 'badge-info', Negligible: 'badge-secondary' };
const STATUS_BADGE = { Open: 'badge-danger', 'Under Investigation': 'badge-warning', 'Corrective Action': 'badge-info', Closed: 'badge-success', Reopened: 'badge-warning' };

const emptyForm = {
  incident_number: '', title: '', incident_date: '', aircraft_reg: '', location: '',
  severity: 'Minor', category: 'Other', reported_by: '', description: '',
  root_cause: '', corrective_action: '', status: 'Open', investigation_lead: '', closure_date: ''
};

function formatDate(d) {
  if (!d) return '-';
  return new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function Incidents({ token }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selected, setSelected] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState(false);
  const [toast, setToast] = useState(null);
  const [aiResult, setAiResult] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);

  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API}/incidents`);
      if (!res.ok) throw new Error('Failed to fetch incidents');
      const data = await res.json();
      setItems(data.records || (Array.isArray(data) ? data : []));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  const openCreate = () => {
    setForm(emptyForm);
    setEditing(false);
    setShowForm(true);
  };

  const openEdit = () => {
    const item = selected;
    setForm({
      _id: item._id || item.id,
      incident_number: item.incident_number || '',
      title: item.title || '',
      incident_date: item.incident_date ? item.incident_date.substring(0, 10) : '',
      aircraft_reg: item.aircraft_reg || '',
      location: item.location || '',
      severity: item.severity || 'Minor',
      category: item.category || 'Other',
      reported_by: item.reported_by || '',
      description: item.description || '',
      root_cause: item.root_cause || '',
      corrective_action: item.corrective_action || '',
      status: item.status || 'Open',
      investigation_lead: item.investigation_lead || '',
      closure_date: item.closure_date ? item.closure_date.substring(0, 10) : ''
    });
    setEditing(true);
    setSelected(null);
    setShowForm(true);
  };

  const handleSave = async () => {
    try {
      const isEdit = editing && form._id;
      const method = isEdit ? 'PUT' : 'POST';
      const url = isEdit ? `${API}/incidents/${form._id}` : `${API}/incidents`;
      const body = { ...form };
      delete body._id;

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      if (!res.ok) throw new Error(isEdit ? 'Failed to update incident' : 'Failed to create incident');
      showToast(isEdit ? 'Incident updated successfully' : 'Incident created successfully');
      setShowForm(false);
      setForm(emptyForm);
      fetchItems();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this incident?')) return;
    try {
      const res = await fetch(`${API}/incidents/${selected._id || selected.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete incident');
      showToast('Incident deleted successfully');
      setSelected(null);
      fetchItems();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const runAiAnalysis = async () => {
    if (!selected) return;
    setAiLoading(true);
    setAiResult(null);
    try {
      const res = await fetch(`${API}/ai/safety-analysis`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          incident_title: selected.title,
          description: selected.description,
          severity: selected.severity,
          aircraft_type: selected.aircraft_reg,
          location: selected.location
        })
      });
      if (!res.ok) throw new Error('AI analysis failed');
      const data = await res.json();
      setAiResult(data);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setAiLoading(false);
    }
  };

  const onSubmit = (e) => {
    e.preventDefault();
    handleSave();
  };

  const setField = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  return (
    <div className="fade-in">
      {toast && (
        <div className={`toast toast-${toast.type}`}>{toast.message}</div>
      )}

      <div className="page-header">
        <div>
          <h1>Safety Incident Reporting</h1>
          <p className="subtitle">Track, investigate, and resolve safety incidents</p>
        </div>
        <button className="btn btn-primary" onClick={openCreate}>+ New Incident</button>
      </div>

      {loading && <div className="ai-loading">Loading incidents...</div>}
      {error && <div style={{ color: 'var(--danger)', padding: '20px', textAlign: 'center' }}>{error}</div>}

      {!loading && !error && items.length === 0 && (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
          <p style={{ fontSize: '1.1rem', marginBottom: '8px' }}>No incidents found</p>
          <p>Create your first incident report to get started.</p>
        </div>
      )}

      {!loading && !error && items.length > 0 && (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Incident #</th>
                <th>Title</th>
                <th>Date</th>
                <th>Severity</th>
                <th>Category</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {items.map(item => (
                <tr
                  key={item._id || item.id}
                  onClick={() => { setSelected(item); setAiResult(null); }}
                  style={item.severity === 'Critical' ? { borderLeft: '4px solid var(--danger)' } : {}}
                >
                  <td style={{ fontWeight: 600 }}>{item.incident_number || '-'}</td>
                  <td>{item.title || '-'}</td>
                  <td>{formatDate(item.incident_date)}</td>
                  <td><span className={`badge ${SEVERITY_BADGE[item.severity] || 'badge-secondary'}`}>{item.severity}</span></td>
                  <td>{item.category || '-'}</td>
                  <td><span className={`badge ${STATUS_BADGE[item.status] || 'badge-secondary'}`}>{item.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Detail Modal */}
      {selected && (
        <div className="modal-overlay" onClick={() => setSelected(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '800px' }}>
            <div className="modal-header">
              <h2>{selected.title || 'Incident Details'}</h2>
              <button className="btn btn-secondary btn-sm" onClick={() => setSelected(null)}>Close</button>
            </div>
            <div className="modal-body">
              <div className="detail-grid">
                <div className="detail-item">
                  <label>Incident Number</label>
                  <div className="value">{selected.incident_number || '-'}</div>
                </div>
                <div className="detail-item">
                  <label>Date</label>
                  <div className="value">{formatDate(selected.incident_date)}</div>
                </div>
                <div className="detail-item">
                  <label>Aircraft Reg</label>
                  <div className="value">{selected.aircraft_reg || '-'}</div>
                </div>
                <div className="detail-item">
                  <label>Location</label>
                  <div className="value">{selected.location || '-'}</div>
                </div>
                <div className="detail-item">
                  <label>Severity</label>
                  <div className="value"><span className={`badge ${SEVERITY_BADGE[selected.severity] || 'badge-secondary'}`}>{selected.severity}</span></div>
                </div>
                <div className="detail-item">
                  <label>Category</label>
                  <div className="value">{selected.category || '-'}</div>
                </div>
                <div className="detail-item">
                  <label>Reported By</label>
                  <div className="value">{selected.reported_by || '-'}</div>
                </div>
                <div className="detail-item">
                  <label>Status</label>
                  <div className="value"><span className={`badge ${STATUS_BADGE[selected.status] || 'badge-secondary'}`}>{selected.status}</span></div>
                </div>
                <div className="detail-item">
                  <label>Investigation Lead</label>
                  <div className="value">{selected.investigation_lead || '-'}</div>
                </div>
                <div className="detail-item">
                  <label>Closure Date</label>
                  <div className="value">{formatDate(selected.closure_date)}</div>
                </div>
              </div>
              <div style={{ marginTop: '16px' }}>
                <div className="detail-item">
                  <label>Description</label>
                  <div className="value" style={{ whiteSpace: 'pre-wrap' }}>{selected.description || '-'}</div>
                </div>
              </div>
              <div style={{ marginTop: '12px' }}>
                <div className="detail-item">
                  <label>Root Cause</label>
                  <div className="value" style={{ whiteSpace: 'pre-wrap' }}>{selected.root_cause || '-'}</div>
                </div>
              </div>
              <div style={{ marginTop: '12px' }}>
                <div className="detail-item">
                  <label>Corrective Action</label>
                  <div className="value" style={{ whiteSpace: 'pre-wrap' }}>{selected.corrective_action || '-'}</div>
                </div>
              </div>

              {/* AI Analysis */}
              <div style={{ marginTop: '20px' }}>
                <button className="btn btn-primary" onClick={runAiAnalysis} disabled={aiLoading}>
                  {aiLoading ? 'Analyzing...' : 'Run AI Safety Analysis'}
                </button>
                {aiLoading && <div className="ai-loading">AI is analyzing this incident...</div>}
                {aiResult && (
                  <div className="ai-result">
                    <h3>AI Safety Analysis</h3>
                    <div className="ai-result-content">
                      {typeof aiResult === 'string' ? aiResult :
                        aiResult.analysis || aiResult.result || aiResult.message || JSON.stringify(aiResult, null, 2)}
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-danger btn-sm" onClick={handleDelete}>Delete</button>
              <button className="btn btn-primary btn-sm" onClick={openEdit}>Edit</button>
            </div>
          </div>
        </div>
      )}

      {/* Create / Edit Form Modal */}
      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '800px' }}>
            <div className="modal-header">
              <h2>{editing ? 'Edit Incident' : 'New Incident Report'}</h2>
              <button className="btn btn-secondary btn-sm" onClick={() => setShowForm(false)}>Cancel</button>
            </div>
            <form onSubmit={onSubmit}>
              <div className="modal-body">
                <div className="detail-grid">
                  <div className="form-group">
                    <label>Incident Number</label>
                    <input type="text" value={form.incident_number} onChange={e => setField('incident_number', e.target.value)} placeholder="INC-001" required />
                  </div>
                  <div className="form-group">
                    <label>Title</label>
                    <input type="text" value={form.title} onChange={e => setField('title', e.target.value)} placeholder="Incident title" required />
                  </div>
                  <div className="form-group">
                    <label>Incident Date</label>
                    <input type="date" value={form.incident_date} onChange={e => setField('incident_date', e.target.value)} required />
                  </div>
                  <div className="form-group">
                    <label>Aircraft Reg</label>
                    <input type="text" value={form.aircraft_reg} onChange={e => setField('aircraft_reg', e.target.value)} placeholder="N12345" />
                  </div>
                  <div className="form-group">
                    <label>Location</label>
                    <input type="text" value={form.location} onChange={e => setField('location', e.target.value)} placeholder="Hangar, ramp, etc." />
                  </div>
                  <div className="form-group">
                    <label>Severity</label>
                    <select value={form.severity} onChange={e => setField('severity', e.target.value)}>
                      {SEVERITY_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Category</label>
                    <select value={form.category} onChange={e => setField('category', e.target.value)}>
                      {CATEGORY_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Reported By</label>
                    <input type="text" value={form.reported_by} onChange={e => setField('reported_by', e.target.value)} placeholder="Reporter name" />
                  </div>
                  <div className="form-group">
                    <label>Status</label>
                    <select value={form.status} onChange={e => setField('status', e.target.value)}>
                      {STATUS_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Investigation Lead</label>
                    <input type="text" value={form.investigation_lead} onChange={e => setField('investigation_lead', e.target.value)} placeholder="Lead investigator" />
                  </div>
                  <div className="form-group">
                    <label>Closure Date</label>
                    <input type="date" value={form.closure_date} onChange={e => setField('closure_date', e.target.value)} />
                  </div>
                </div>
                <div className="form-group" style={{ marginTop: '8px' }}>
                  <label>Description</label>
                  <textarea value={form.description} onChange={e => setField('description', e.target.value)} placeholder="Detailed description of the incident" />
                </div>
                <div className="form-group">
                  <label>Root Cause</label>
                  <textarea value={form.root_cause} onChange={e => setField('root_cause', e.target.value)} placeholder="Identified root cause" />
                </div>
                <div className="form-group">
                  <label>Corrective Action</label>
                  <textarea value={form.corrective_action} onChange={e => setField('corrective_action', e.target.value)} placeholder="Corrective actions taken or planned" />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
                <button type="submit" className="btn btn-success">{editing ? 'Update Incident' : 'Create Incident'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Incidents;
