import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getQuote } from '../api';
import { Shield, Download, FileText, Check, Info } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, AreaChart, Area, CartesianGrid } from 'recharts';

export default function InsurancePanel() {
  const { shipmentId } = useParams();
  const [coverageType, setCoverageType] = useState('comprehensive');
  
  const { data: quote, isLoading } = useQuery({
    queryKey: ['quote', shipmentId, coverageType],
    queryFn: () => getQuote({
      route_id: "ROUTE_A", // Mock default
      cargo_type: "electronics", 
      cargo_value_inr: 500000,
      coverage_type: coverageType
    })
  });

  if (isLoading) return <div className="p-12 text-center">Loading insurance data...</div>;

  const waterfallData = quote ? [
    { name: 'Base', val: quote.breakdown.base_premium, fill: '#64748B' },
    { name: 'Risk', val: quote.breakdown.risk_loading_amount, fill: '#EF4444' },
    { name: 'Cargo', val: quote.breakdown.cargo_adjustment, fill: '#F59E0B' },
    { name: 'Coverage', val: quote.breakdown.coverage_adjustment, fill: '#10B981' }
  ] : [];

  const riskHistory = [
    { time: '10:00', risk: 0.2 }, { time: '10:15', risk: 0.22 }, 
    { time: '10:30', risk: 0.45 }, { time: '10:45', risk: 0.4 }, 
    { time: '11:00', risk: quote?.route_risk_score || 0.3 }
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[calc(100vh-100px)]">
      
      {/* LEFT: Breakdown */}
      <div className="bg-bgCard p-6 rounded-xl shadow-card border border-border overflow-y-auto">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h2 className="text-2xl font-bold font-display text-textPrimary">Dynamic Premium</h2>
            <p className="text-textSecondary text-sm">Updated based on live route conditions</p>
          </div>
          <div className={`px-3 py-1 rounded-full text-xs font-bold ${
            quote?.risk_class === 'LOW' ? 'bg-accentSuccess/10 text-accentSuccess' :
            quote?.risk_class === 'MEDIUM' ? 'bg-accentWarning/10 text-accentWarning' :
            'bg-accentDanger/10 text-accentDanger'
          }`}>
            RISK: {quote?.risk_class}
          </div>
        </div>

        <div className="text-5xl font-mono font-bold text-textPrimary mb-8">
          ₹{quote?.premium_inr.toLocaleString()}
        </div>

        <div className="mb-8">
          <h3 className="text-sm font-bold text-textSecondary uppercase mb-4">Premium Breakdown</h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={waterfallData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} />
                <YAxis axisLine={false} tickLine={false} tickFormatter={(val) => `₹${val}`} />
                <Tooltip cursor={{fill: 'transparent'}} formatter={(val) => `₹${val}`} />
                <Bar dataKey="val" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div>
          <h3 className="text-sm font-bold text-textSecondary uppercase mb-3">Coverage Level</h3>
          <div className="flex flex-col gap-2">
            {[
              { id: 'basic', label: 'Basic', desc: 'Named perils only' },
              { id: 'comprehensive', label: 'Comprehensive', desc: 'All perils except war/nuclear' },
              { id: 'all_risk', label: 'All-Risk', desc: 'Highest protection, recommended for high risk' }
            ].map(cov => (
              <div 
                key={cov.id}
                onClick={() => setCoverageType(cov.id)}
                className={`p-3 border rounded-lg cursor-pointer flex justify-between items-center transition-all ${
                  coverageType === cov.id ? 'border-accentPrimary bg-bgCardAlt' : 'border-border hover:border-textMuted'
                }`}
              >
                <div>
                  <div className="font-bold text-sm text-textPrimary flex items-center gap-2">
                    {cov.label}
                    {coverageType === cov.id && <Check className="w-4 h-4 text-accentPrimary" />}
                  </div>
                  <div className="text-xs text-textSecondary">{cov.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* RIGHT: History & Comparison */}
      <div className="bg-bgCard p-6 rounded-xl shadow-card border border-border flex flex-col">
        <div className="flex justify-between items-center mb-6">
          <h3 className="font-bold text-lg">Risk Trajectory</h3>
          <button className="flex items-center gap-2 text-sm text-accentPrimary font-medium border border-accentPrimary px-3 py-1.5 rounded-lg hover:bg-bgCardAlt">
            <Download className="w-4 h-4" /> Policy PDF
          </button>
        </div>

        <div className="h-64 w-full mb-8">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={riskHistory}>
              <defs>
                <linearGradient id="colorRisk" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#EF4444" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#EF4444" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="time" />
              <YAxis domain={[0, 1]} />
              <Tooltip />
              <Area type="monotone" dataKey="risk" stroke="#EF4444" fillOpacity={1} fill="url(#colorRisk)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="mt-auto bg-blue-50 border border-blue-100 p-4 rounded-xl flex gap-3 items-start">
          <Info className="w-5 h-5 text-accentPrimary shrink-0 mt-0.5" />
          <div className="text-sm text-textPrimary">
            <span className="font-bold block mb-1">Gemini Underwriting Note:</span>
            The premium has increased by 14% over the last hour due to the active fog warning at CP04. Switching to the multi-modal Rail route would reduce the premium back to ₹3,200.
          </div>
        </div>
      </div>
    </div>
  );
}