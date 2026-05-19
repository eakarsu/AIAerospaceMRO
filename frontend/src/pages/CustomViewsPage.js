import React, { useState } from 'react';
import HangarStatusBoard from '../components/HangarStatusBoard';
import MaintScheduleGantt from '../components/MaintScheduleGantt';
import WorkOrderPDF from '../components/WorkOrderPDF';
import PartsRequisitionWizard from '../components/PartsRequisitionWizard';

const TABS = [
  { id: 'hangar',  label: 'Hangar Status Board',  icon: 'H' },
  { id: 'gantt',   label: 'Maintenance Gantt',    icon: 'G' },
  { id: 'wo-pdf',  label: 'Work Order PDF',       icon: 'P' },
  { id: 'req',     label: 'Parts Requisition',    icon: 'R' },
];

function CustomViewsPage({ token }) {
  const [tab, setTab] = useState('hangar');

  return (
    <div style={{ padding: 24, color: '#e5e7eb', background: '#0b1220', minHeight: '100vh' }}>
      <div style={{ marginBottom: 18 }}>
        <h2 style={{ margin: 0, color: '#f1f5f9' }}>Hangar Views</h2>
        <div style={{ color: '#94a3b8', fontSize: 13, marginTop: 4 }}>
          Custom MRO views: hangar bay status, maintenance schedule, work-order PDFs and parts requisition.
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            data-testid={`tab-${t.id}`}
            style={{
              background: tab === t.id ? '#1e40af' : '#1f2937',
              color: tab === t.id ? '#fff' : '#cbd5e1',
              border: `1px solid ${tab === t.id ? '#60a5fa' : '#334155'}`,
              borderRadius: 6,
              padding: '8px 14px',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: 13,
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div data-testid={`view-${tab}`}>
        {tab === 'hangar' && <HangarStatusBoard token={token} />}
        {tab === 'gantt'  && <MaintScheduleGantt token={token} />}
        {tab === 'wo-pdf' && <WorkOrderPDF token={token} />}
        {tab === 'req'    && <PartsRequisitionWizard token={token} />}
      </div>
    </div>
  );
}

export default CustomViewsPage;
