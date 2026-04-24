import React from 'react';
import { Routes, Route } from 'react-router-dom';
import ShipmentSetup from './screens/ShipmentSetup';
import RouteIntelligence from './screens/RouteIntelligence';
import LiveMonitor from './screens/LiveMonitor';
import InsurancePanel from './screens/InsurancePanel';

function App() {
  return (
    <div className="min-h-screen bg-bgPrimary text-textPrimary">
      <header className="bg-bgCard border-b border-border p-4 shadow-sm">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <h1 className="text-2xl font-bold font-display text-accentPrimary">InsureRoute</h1>
          <span className="text-sm text-textSecondary font-mono">Operations Command Center</span>
        </div>
      </header>
      <main className="p-4 md:p-6 max-w-7xl mx-auto">
        <Routes>
          <Route path="/" element={<ShipmentSetup />} />
          <Route path="/route/:shipmentId" element={<RouteIntelligence />} />
          <Route path="/monitor/:shipmentId" element={<LiveMonitor />} />
          <Route path="/insurance/:shipmentId" element={<InsurancePanel />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;