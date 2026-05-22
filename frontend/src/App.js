import React, { useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import AircraftMaintenance from './pages/AircraftMaintenance';
import PartLifecycle from './pages/PartLifecycle';
import Compliance from './pages/Compliance';
import WorkOrders from './pages/WorkOrders';
import Inventory from './pages/Inventory';
import Incidents from './pages/Incidents';
import Technicians from './pages/Technicians';
import FleetHealth from './pages/FleetHealth';
import Vendors from './pages/Vendors';
import ToolCalibration from './pages/ToolCalibration';
import MelTracking from './pages/MelTracking';
import Documents from './pages/Documents';
import PurchaseOrders from './pages/PurchaseOrders';
import AuditLog from './pages/AuditLog';
import ShiftScheduling from './pages/ShiftScheduling';
import HangarManagement from './pages/HangarManagement';
import TrainingRecords from './pages/TrainingRecords';
import Customers from './pages/Customers';
import WarrantyTracking from './pages/WarrantyTracking';
import CostEstimator from './pages/CostEstimator';
import PredictiveMaintenance from './pages/PredictiveMaintenance';
import TechnicianMatcher from './pages/TechnicianMatcher';
import ComponentReliability from './pages/ComponentReliability';
import AITools from './pages/AITools';
import TechnicianWorkload from './pages/TechnicianWorkload';
import ComplianceCalendar from './pages/ComplianceCalendar';
import EtopsReleaseReadiness from './pages/EtopsReleaseReadiness';
import AIHistory from './pages/AIHistory';
import CustomViewsPage from './pages/CustomViewsPage';
import Layout from './components/Layout';

import CodexCustomVizFeature from './pages/CodexCustomVizFeature';
import CodexOperationsFeature from './pages/CodexOperationsFeature';

const API = (typeof window !== 'undefined' && window.__AERO_API__) || 'http://localhost:4047/api';

function App() {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('mro_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState(() => localStorage.getItem('mro_token') || null);

  const login = (userData, tokenData) => {
    setUser(userData);
    setToken(tokenData);
    localStorage.setItem('mro_user', JSON.stringify(userData));
    localStorage.setItem('mro_token', tokenData);
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('mro_user');
    localStorage.removeItem('mro_token');
  };

  if (!user) {
    return <Login onLogin={login} />;
  }

  return (
    <Layout user={user} onLogout={logout}>
      <Routes>
        <Route path="/codex/custom-viz" element={<CodexCustomVizFeature />} />
        <Route path="/codex/operations" element={<CodexOperationsFeature />} />

        <Route path="/" element={<Dashboard token={token} />} />
        <Route path="/maintenance" element={<AircraftMaintenance token={token} />} />
        <Route path="/parts" element={<PartLifecycle token={token} />} />
        <Route path="/compliance" element={<Compliance token={token} />} />
        <Route path="/work-orders" element={<WorkOrders token={token} />} />
        <Route path="/inventory" element={<Inventory token={token} />} />
        <Route path="/incidents" element={<Incidents token={token} />} />
        <Route path="/technicians" element={<Technicians token={token} />} />
        <Route path="/fleet" element={<FleetHealth token={token} />} />
        <Route path="/vendors" element={<Vendors token={token} />} />
        <Route path="/tool-calibration" element={<ToolCalibration token={token} />} />
        <Route path="/mel-tracking" element={<MelTracking token={token} />} />
        <Route path="/documents" element={<Documents token={token} />} />
        <Route path="/purchase-orders" element={<PurchaseOrders token={token} />} />
        <Route path="/audit-log" element={<AuditLog token={token} />} />
        <Route path="/shift-scheduling" element={<ShiftScheduling token={token} />} />
        <Route path="/hangar-management" element={<HangarManagement token={token} />} />
        <Route path="/training-records" element={<TrainingRecords token={token} />} />
        <Route path="/customers" element={<Customers token={token} />} />
        <Route path="/warranty-tracking" element={<WarrantyTracking token={token} />} />
        <Route path="/cost-estimator" element={<CostEstimator token={token} />} />
        <Route path="/predict-maintenance" element={<PredictiveMaintenance token={token} />} />
        <Route path="/technician-matcher" element={<TechnicianMatcher token={token} />} />
        <Route path="/component-reliability" element={<ComponentReliability token={token} />} />
        <Route path="/ai-tools" element={<AITools token={token} />} />
        <Route path="/technician-workload" element={<TechnicianWorkload token={token} />} />
        <Route path="/compliance-calendar" element={<ComplianceCalendar token={token} />} />
        <Route path="/etops-release-readiness" element={<EtopsReleaseReadiness token={token} />} />
        <Route path="/ai-history" element={<AIHistory token={token} />} />
        <Route path="/custom-views" element={<CustomViewsPage token={token} />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Layout>
  );
}

export { API };
export default App;
