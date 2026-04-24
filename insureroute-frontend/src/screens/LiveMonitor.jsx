import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Map from '../components/Map';
import { Activity, Clock, ShieldAlert, MapPin, Navigation2 } from 'lucide-react';
import { ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

export default function LiveMonitor() {
  const { shipmentId } = useParams();
  const navigate = useNavigate();
  const [wsData, setWsData] = useState(null);
  
  useEffect(() => {
    const ws = new WebSocket(`ws://localhost:8000/ws/monitor/${shipmentId}`);
    ws.onmessage = (event) => {
      setWsData(JSON.parse(event.data));
    };
    return () => ws.close();
  }, [shipmentId]);

  const progressPct = wsData?.progress_pct || 0;
  const activeDisruptions = wsData?.active_disruptions || [];

  return (
    <div className="flex flex-col gap-6">
      {/* ROW 1: Status Bar */}
      <div className="bg-bgCard p-6 rounded-xl shadow-card flex items-center justify-between">
        <div className="w-2/3">
          <div className="flex justify-between text-sm font-medium mb-2">
            <span>Pune Logistics Hub</span>
            <span className="text-accentPrimary">{progressPct}% Complete</span>
            <span>Mumbai Distribution</span>
          </div>
          <div className="w-full bg-border rounded-full h-2.5">
            <div className="bg-accentPrimary h-2.5 rounded-full transition-all duration-1000" style={{ width: `${progressPct}%` }}></div>
          </div>
        </div>
        <div className="flex gap-4">
          <button 
            onClick={() => navigate(`/insurance/${shipmentId}`)}
            className="px-4 py-2 bg-bgPrimary border border-border text-textPrimary rounded-lg text-sm font-medium hover:bg-gray-100"
          >
            View Insurance
          </button>
        </div>
      </div>

      {/* ROW 2: Map & Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[400px]">
        <div className="lg:col-span-2 bg-bgCard rounded-xl shadow-card overflow-hidden relative border border-border">
          <Map />
          {/* Animated Truck Overlay dummy */}
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-[400]">
             <div className="bg-accentPrimary text-white p-2 rounded-full shadow-lg">
                <Navigation2 className="w-5 h-5" />
             </div>
          </div>
        </div>
        
        <div className="lg:col-span-1 grid grid-cols-2 gap-4">
          <div className="bg-bgCard p-5 rounded-xl shadow-card border border-border flex flex-col justify-center">
            <Activity className="w-6 h-6 text-accentSecondary mb-2" />
            <div className="text-3xl font-mono font-bold text-textPrimary">LOW</div>
            <div className="text-xs text-textSecondary uppercase tracking-wide mt-1">Current Risk Level</div>
          </div>
          <div className="bg-bgCard p-5 rounded-xl shadow-card border border-border flex flex-col justify-center">
            <Clock className="w-6 h-6 text-accentWarning mb-2" />
            <div className="text-3xl font-mono font-bold text-textPrimary">2h 15m</div>
            <div className="text-xs text-textSecondary uppercase tracking-wide mt-1">ETA</div>
          </div>
          <div className="bg-bgCard p-5 rounded-xl shadow-card border border-border flex flex-col justify-center">
            <ShieldAlert className="w-6 h-6 text-accentDanger mb-2" />
            <div className="text-3xl font-mono font-bold text-textPrimary">{activeDisruptions.length}</div>
            <div className="text-xs text-textSecondary uppercase tracking-wide mt-1">Active Alerts</div>
          </div>
          <div className="bg-bgCard p-5 rounded-xl shadow-card border border-border flex flex-col justify-center">
            <MapPin className="w-6 h-6 text-accentSuccess mb-2" />
            <div className="text-3xl font-mono font-bold text-textPrimary text-sm break-all">{wsData?.current_checkpoint || 'In Transit'}</div>
            <div className="text-xs text-textSecondary uppercase tracking-wide mt-1">Last Checkpoint</div>
          </div>
        </div>
      </div>

      {/* ROW 3: Feed */}
      <div className="bg-bgCard rounded-xl shadow-card border border-border p-6 h-[300px] overflow-y-auto">
        <h3 className="font-bold text-lg mb-4">Event Feed</h3>
        {activeDisruptions.length === 0 ? (
          <div className="text-textSecondary text-sm">No active disruptions. Route clear.</div>
        ) : (
          <div className="flex flex-col gap-3">
            {activeDisruptions.map(d => (
              <div key={d.id} className="p-3 border-l-4 border-accentDanger bg-red-50 rounded-r-lg text-sm flex gap-3 items-start">
                <ShieldAlert className="w-5 h-5 text-accentDanger shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold text-accentDanger">{d.type.toUpperCase()} ALERT — {d.checkpoint_id}</div>
                  <div className="text-textPrimary">{d.message}</div>
                  <div className="text-xs text-textMuted mt-1">{new Date(d.detected_at).toLocaleTimeString()}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}