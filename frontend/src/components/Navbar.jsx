import { motion } from 'framer-motion'
import { Shield, Zap, RefreshCw, ChevronDown } from 'lucide-react'
import { useState } from 'react'

export default function Navbar({ isLive, isMock, disrupted, params, onParamsChange, onInject, onRefresh, loading }) {
  const [menuOpen, setMenuOpen] = useState(false)

  function toggle(key) {
    onParamsChange({ ...params, [key]: !params[key] })
  }
  function slider(key, val) {
    onParamsChange({ ...params, [key]: val })
  }

  return (
    <motion.nav
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="relative z-50 flex items-center justify-between px-6 py-3
                 border-b border-border bg-white shadow-sm"
    >
      {/* ── Left: Logo ── */}
      <div className="flex items-center gap-3">
        <div className={`p-1.5 rounded-lg ${disrupted ? 'bg-danger/10 text-danger' : 'bg-primary/10 text-primary'}`}>
          <Shield size={20} />
        </div>
        <div>
          <h1 className="font-bold text-lg text-text tracking-tight leading-none">InsureRoute</h1>
          <p className="text-[10px] text-muted font-medium uppercase tracking-widest mt-0.5">SaaS Dashboard</p>
        </div>
        
        {/* Connection status tag */}
        <div className="ml-4 flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[10px] uppercase font-bold
                      bg-slate-50 border-border text-muted">
          <div className={`w-1.5 h-1.5 rounded-full ${isMock ? 'bg-warning' : 'bg-success'}`} />
          {isMock ? 'Mocking' : 'Live Data'}
        </div>
      </div>

      {/* ── Right: Controls ── */}
      <div className="flex items-center gap-3 relative">
        <label className="flex items-center gap-2 text-xs font-semibold text-text cursor-pointer hover:bg-slate-50 px-2 py-1 rounded border border-transparent hover:border-border transition-all">
          <input type="checkbox" checked={params.monsoon} onChange={() => toggle('monsoon')} className="accent-primary" />
          Monsoon
        </label>

        <div className="w-px h-5 bg-border mx-2" />

        <button
          onClick={onRefresh}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded border border-border
                     text-text hover:bg-slate-50 disabled:opacity-50 transition-all"
        >
          <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>

        <button
          onClick={onInject}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold flex-shrink-0 cursor-pointer
                     bg-yellow-500 hover:bg-yellow-600 text-white rounded shadow-sm disabled:opacity-50 transition-all"
        >
          <Zap size={12} />
          Force Disruption
        </button>

        {/* Dropdown for sliders */}
        <div className="relative">
          <button 
             onClick={() => setMenuOpen(!menuOpen)}
             className="p-1.5 rounded border border-border text-muted hover:bg-slate-50 transition-colors"
          >
            <ChevronDown size={14} className={menuOpen ? "rotate-180 transition-transform" : "transition-transform"} />
          </button>
          
          {menuOpen && (
            <div className="absolute right-0 top-full mt-2 w-64 bg-white border border-border rounded-xl shadow-lg p-4 z-50 flex flex-col gap-4">
              <div className="text-xs font-bold text-muted uppercase tracking-wider mb-2">Advanced Config</div>
              
              <SliderRow label="Threshold" value={params.threshold} min={-0.5} max={0} step={0.01} format={v => v.toFixed(2)} onChange={v => slider('threshold', v)} />
            </div>
          )}
        </div>
      </div>
    </motion.nav>
  )
}

function SliderRow({ label, value, min, max, step, format, onChange }) {
  const pct = ((value - min) / (max - min)) * 100
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-text font-medium">{label}</span>
        <span className="text-primary font-semibold">{format(value)}</span>
      </div>
      <input
        type="range"
        min={min} max={max} step={step}
        value={value}
        onChange={e => onChange(+e.target.value)}
        className="w-full h-1 bg-slate-200 rounded appearance-none cursor-pointer"
        style={{ background: `linear-gradient(to right, #eab308 ${pct}%, #e2e8f0 ${pct}%)` }}
      />
    </div>
  )
}
