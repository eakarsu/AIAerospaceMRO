import React, { useEffect, useState } from 'react';
import { API } from '../App';

export default function EtopsReleaseReadiness({ token }) {
  const [data, setData] = useState(null);

  useEffect(() => {
    fetch(`${API}/etops-release-readiness`, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
      .then((res) => res.json())
      .then(setData)
      .catch(() => setData(null));
  }, [token]);

  if (!data) return <div className="card"><h2>ETOPS Release Readiness</h2><p>Loading release readiness...</p></div>;

  return (
    <div className="page">
      <h1>ETOPS Release Readiness</h1>
      <p>Review ETOPS significant systems, MEL constraints, and release packet completeness before long-range dispatch.</p>
      <div className="stats-grid">
        {Object.entries(data.summary).map(([key, value]) => (
          <div className="stat-card" key={key}><h3>{value}</h3><span>{key.replace(/([A-Z])/g, ' $1')}</span></div>
        ))}
      </div>
      <div className="card">
        <h2>Aircraft Queue</h2>
        {data.aircraft.map((item) => (
          <div className="list-row" key={item.tail}>
            <strong>{item.tail} - {item.route}</strong>
            <span>{item.status}: {item.blocker}</span>
            <small>{item.action}</small>
          </div>
        ))}
      </div>
      <div className="card"><h2>Release Checks</h2><p>{data.checks.join(' -> ')}</p></div>
    </div>
  );
}
