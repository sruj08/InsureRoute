import { motion } from 'framer-motion'
import { useEffect, useRef } from 'react'
import { Shield, ArrowRight, DollarSign, Package } from 'lucide-react'

// ── Cargo type color & icon mapping ──────────────────────────────────────────
const CARGO_THEME = {
  'Standard':         { color: '#64748b', bg: 'bg-slate-100', border: 'border-slate-200', text: 'text-slate-700' },
  'Electronics':      { color: '#6366f1', bg: 'bg-indigo-50', border: 'border-indigo-200', text: 'text-indigo-700' },
  'Pharmaceuticals':  { color: '#06b6d4', bg: 'bg-cyan-50', border: 'border-cyan-200', text: 'text-cyan-700' },
  'Perishable Goods': { color: '#22c55e', bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700' },
  'Heavy Machinery':  { color: '#f59e0b', bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700' },
  'Textiles':         { color: '#ec4899', bg: 'bg-pink-50', border: 'border-pink-200', text: 'text-pink-700' },
  'Chemicals':        { color: '#ef4444', bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700' },
  'Automotive Parts': { color: '#8b5cf6', bg: 'bg-violet-50', border: 'border-violet-200', text: 'text-violet-700' },
}

export default function InsurancePanel({ insurance, disrupted }) {
  const safeIns = insurance || {
    cargo_value: 0, disruption_probability: 0, base_premium: 0,
    before_cost: 0, after_cost: 0, savings: 0, savings_pct: 0,
    weather_multiplier: 1, perishable_multiplier: 1,
    cargo_multiplier: 1, temp_multiplier: 1,
    fragility_multiplier: 1, value_density_multiplier: 1,
    cargo_type: 'Standard', cargo_profile: {},
  }

  const {
    cargo_value, disruption_probability, base_premium,
    before_cost, after_cost, savings, savings_pct,
    weather_multiplier, perishable_multiplier,
    cargo_multiplier, temp_multiplier,
    fragility_multiplier, value_density_multiplier,
    cargo_type, cargo_profile,
  } = safeIns

  const riskPct = Math.round((disruption_probability ?? 0) * 100)
  const isHighRisk = riskPct > 35

  const theme = CARGO_THEME[cargo_type] || CARGO_THEME['Standard']

  // Build the weighted factors list with their actual values
  const factors = [
    { label: 'Weather Sensitivity',   value: weather_multiplier,        key: 'weather_weight',    desc: 'Rain / monsoon impact' },
    { label: 'Temperature Risk',      value: temp_multiplier,           key: 'temp_weight',       desc: 'Heat / cold chain' },
    { label: 'Fragility / Shock',     value: fragility_multiplier,      key: 'fragility_weight',  desc: 'Handling & vibration' },
    { label: 'Perishability',         value: perishable_multiplier,     key: 'perishable_weight', desc: 'Spoilage / time-decay' },
    { label: 'Value Density',         value: value_density_multiplier,  key: 'value_density',     desc: '₹ per kg concentration' },
  ]

  // Max for bar visualization
  const maxFactor = Math.max(...factors.map(f => f.value), 2.0)

  return (
    <motion.div
      initial={{ opacity: 0, x: 10 }}
      animate={{ opacity: 1, x: 0 }}
      className={`glass p-5 flex flex-col h-full relative overflow-hidden transition-all duration-500 ${!insurance ? 'opacity-60 grayscale-[50%]' : ''}`}
    >
      {/* Top Header Block */}
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-border">
        <div className="flex items-center gap-2">
          <Shield size={18} className="text-slate-800" />
          <span className="font-bold text-slate-800 text-base">Insurance Premium</span>
        </div>
        {isHighRisk && (
          <span className="text-[10px] font-bold bg-red-100 text-danger border border-red-200 px-2 py-1 rounded">
            ELEVATED RISK ({riskPct}%)
          </span>
        )}
      </div>

      {/* Cargo Type Badge */}
      <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border mb-4 ${theme.bg} ${theme.border}`}>
        <Package size={14} className={theme.text} />
        <div className="flex-1 min-w-0">
          <div className={`text-xs font-bold ${theme.text}`}>{cargo_type || 'Standard'}</div>
          {cargo_profile?.description && (
            <div className="text-[9px] text-slate-500 font-medium truncate">{cargo_profile.description}</div>
          )}
        </div>
        <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Profile</div>
      </div>

      {/* Breakdown List */}
      <div className="space-y-3 mb-4 flex-1">
        
        <DataRow label="Base Cargo Value" value={`₹${cargo_value.toLocaleString('en-IN')}`} strong />
        
        <div className="py-1 space-y-1.5">
          <DataRow label="Probability Impact" value={`${riskPct}%`} subtext="Isolation Forest Result" />
          <DataRow
            label="Base Rate"
            value={`${((cargo_profile?.base_rate ?? 0.08) * 100).toFixed(0)}%`}
            subtext={`Rate for ${cargo_type}`}
          />
          <DataRow label="Calculated Base Premium" value={`₹${(base_premium ?? 0).toLocaleString('en-IN')}`} />
        </div>

        {/* Weighted Factor Bars */}
        <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 space-y-2.5">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
            Actuarial Risk Weightage — {cargo_type}
          </div>
          {factors.map(f => {
            const isActive = f.value > 1.0
            const barPct = Math.min((f.value / maxFactor) * 100, 100)
            return (
              <div key={f.label}>
                <div className="flex items-center justify-between mb-0.5">
                  <div className="flex flex-col">
                    <span className={`text-[11px] font-semibold ${isActive ? 'text-slate-800' : 'text-slate-400'}`}>
                      {f.label}
                    </span>
                    <span className="text-[9px] text-slate-400">{f.desc}</span>
                  </div>
                  <span className={`text-xs font-black tabular-nums ${
                    f.value >= 1.6 ? 'text-danger' : f.value > 1.2 ? 'text-warning' : isActive ? 'text-slate-700' : 'text-slate-400'
                  }`}>
                    x{f.value.toFixed(2)}
                  </span>
                </div>
                <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${barPct}%` }}
                    transition={{ duration: 0.8, ease: [0.4, 0, 0.2, 1] }}
                    className="h-full rounded-full"
                    style={{
                      background: f.value >= 1.6
                        ? 'linear-gradient(90deg, #ef4444, #dc2626)'
                        : f.value > 1.2
                          ? 'linear-gradient(90deg, #f59e0b, #d97706)'
                          : isActive
                            ? 'linear-gradient(90deg, #3b82f6, #2563eb)'
                            : '#cbd5e1',
                    }}
                  />
                </div>
              </div>
            )
          })}

          {/* Composite cargo multiplier summary */}
          <div className="flex items-center justify-between pt-2 mt-1 border-t border-slate-200">
            <span className="text-[10px] font-bold text-slate-500">Composite Cargo Risk</span>
            <span className={`text-xs font-black ${
              cargo_multiplier >= 1.4 ? 'text-danger' : cargo_multiplier > 1.1 ? 'text-warning' : 'text-slate-700'
            }`}>
              x{(cargo_multiplier ?? 1).toFixed(3)}
            </span>
          </div>
        </div>
      </div>

      {/* Quote Comparison (Before / After Reroute) */}
      <div className="flex items-center justify-between bg-slate-100 p-4 rounded-xl border border-slate-200 mb-4">
        <div className="flex flex-col">
          <span className="text-xs text-slate-500 font-semibold mb-1">Standard Route</span>
          <span className={`text-xl font-black ${disrupted ? 'text-danger line-through opacity-70' : 'text-slate-800'}`}>
            ₹{(before_cost ?? 0).toLocaleString('en-IN')}
          </span>
        </div>
        <ArrowRight className="text-slate-400" />
        <div className="flex flex-col text-right">
          <span className="text-xs text-slate-500 font-semibold mb-1">Hedged Route</span>
          <span className="text-2xl font-black text-slate-900">
            ₹{(after_cost ?? 0).toLocaleString('en-IN')}
          </span>
        </div>
      </div>

      {/* Savings Summary Line */}
      {savings > 0 && (
        <div className="flex items-center justify-between pt-4 border-t border-dashed border-slate-300">
          <div className="flex items-center gap-1.5 text-success">
            <DollarSign size={16} />
            <span className="text-sm font-bold">Dynamic Savings Evaluated</span>
          </div>
          <div className="text-right flex flex-col">
            <span className="text-lg font-black text-success">₹{(savings ?? 0).toLocaleString('en-IN')}</span>
            <span className="text-[10px] text-slate-500 font-semibold uppercase">{savings_pct}% Reduction</span>
          </div>
        </div>
      )}
    </motion.div>
  )
}

function DataRow({ label, value, strong, subtext, highlight }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <div className="flex flex-col">
        <span className={`${strong ? 'font-semibold text-slate-800' : 'text-slate-500 font-medium'}`}>
          {label}
        </span>
        {subtext && <span className="text-[10px] text-slate-400 mt-0.5">{subtext}</span>}
      </div>
      <span className={`${strong ? 'font-bold text-lg' : 'font-semibold'} ${highlight ? 'text-warning' : 'text-slate-800'}`}>
        {value}
      </span>
    </div>
  )
}
