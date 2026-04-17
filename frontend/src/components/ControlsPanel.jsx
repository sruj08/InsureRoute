import { motion } from 'framer-motion'
import { useState } from 'react'
import { Zap, Settings, RefreshCw } from 'lucide-react'

export default function ControlsPanel({ params, onParamsChange, onInject, onRefresh, loading }) {
  const [expanded, setExpanded] = useState(false)

  function toggle(key) {
    onParamsChange({ ...params, [key]: !params[key] })
  }
  function slider(key, val) {
    onParamsChange({ ...params, [key]: val })
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="glass p-5 flex flex-col gap-4"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Settings size={14} className="text-primary" />
          <span className="text-sm font-semibold text-text">Simulation Controls</span>
        </div>
        <button
          onClick={() => setExpanded(e => !e)}
          className="text-xs text-muted hover:text-text transition-colors"
        >
          {expanded ? 'Less ↑' : 'More ↓'}
        </button>
      </div>

      {/* Primary action row */}
      <div className="grid grid-cols-2 gap-3">
        {/* Inject disruption */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          onClick={onInject}
          disabled={loading}
          className="relative overflow-hidden flex items-center justify-center gap-2
                     bg-gradient-to-r from-red-700 to-danger text-white
                     rounded-xl py-3 px-4 font-bold text-sm
                     shadow-lg hover:shadow-xl
                     disabled:opacity-50 disabled:cursor-not-allowed
                     transition-shadow duration-300"
        >
          <motion.span
            animate={loading ? { rotate: 360 } : {}}
            transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
          >
            <Zap size={15} />
          </motion.span>
          Inject Disruption
          {/* Shimmer */}
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"
            animate={{ x: ['-100%', '200%'] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: 'linear' }}
          />
        </motion.button>

        {/* Refresh */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          onClick={onRefresh}
          disabled={loading}
          className="flex items-center justify-center gap-2
                     border border-primary/40 text-primary rounded-xl py-3 px-4
                     font-semibold text-sm hover:bg-primary/10
                     disabled:opacity-50 transition-all duration-200"
        >
          <motion.span
            animate={loading ? { rotate: 360 } : {}}
            transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
          >
            <RefreshCw size={14} />
          </motion.span>
          Refresh Data
        </motion.button>
      </div>

      {/* Configuration Dropdowns */}
      <div className="grid grid-cols-2 gap-3 z-20">
        <DropdownSelect
          label="Weather"
          selected={params.weatherType || 'Monsoon Status'}
          gradient="from-blue-500/10 to-transparent border-blue-200"
          activeColor="text-blue-600"
          options={[
            { label: 'Clear / Sunny',  monsoon: false, mult: 1.0 },
            { label: 'Monsoon Status', monsoon: true,  mult: 1.4 },
            { label: 'Heavy Storm',    monsoon: true,  mult: 1.8 },
            { label: 'Cyclone Warning',monsoon: true,  mult: 2.2 },
            { label: 'Flash Floods',   monsoon: true,  mult: 2.5 },
            { label: 'Extreme Heat',   monsoon: false, mult: 1.2 },
          ]}
          onChange={(opt) => onParamsChange({ ...params, monsoon: opt.monsoon, weatherMult: opt.mult, weatherType: opt.label })}
        />

        <DropdownSelect
          label="Cargo Type"
          selected={params.cargoType || 'Perishable Goods'}
          gradient="from-green-500/10 to-transparent border-green-200"
          activeColor="text-green-700"
          options={[
            { label: 'Standard Cargo',   perishable: false, mult: 1.0 },
            { label: 'Perishable Goods', perishable: true,  mult: 1.6 },
            { label: 'Fragile Items',    perishable: false, mult: 1.5 },
            { label: 'Hazardous (Gases)',perishable: false, mult: 2.1 },
            { label: 'Medical Supplies', perishable: true,  mult: 2.0 },
            { label: 'Live Animals',     perishable: true,  mult: 2.3 },
          ]}
          onChange={(opt) => onParamsChange({ ...params, perishable: opt.perishable, perishMult: opt.mult, cargoType: opt.label })}
        />
      </div>

      {/* Expanded sliders */}
      {expanded && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.35 }}
          className="space-y-4 pt-2 border-t border-border/50"
        >
          <SliderRow
            label="Anomaly Threshold"
            value={params.threshold}
            min={-0.5} max={0} step={0.01}
            format={v => v.toFixed(2)}
            onChange={v => slider('threshold', v)}
          />
          <SliderRow
            label="Weather Multiplier"
            value={params.weatherMult}
            min={1.0} max={2.0} step={0.1}
            format={v => `×${v.toFixed(1)}`}
            onChange={v => slider('weatherMult', v)}
          />
          <SliderRow
            label="Perishable Multiplier"
            value={params.perishMult}
            min={1.0} max={2.5} step={0.1}
            format={v => `×${v.toFixed(1)}`}
            onChange={v => slider('perishMult', v)}
          />
          <SliderRow
            label="Cargo Value (₹)"
            value={params.cargoValue}
            min={10000} max={500000} step={5000}
            format={v => `₹${Math.round(v).toLocaleString('en-IN')}`}
            onChange={v => slider('cargoValue', +v)}
          />
        </motion.div>
      )}
    </motion.div>
  )
}

function DropdownSelect({ label, selected, options, onChange, activeColor, gradient }) {
  const [open, setOpen] = useState(false)
  
  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl border
                    transition-all duration-200 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20
                    ${selected !== 'Standard Cargo' && selected !== 'Clear / Sunny'
                      ? 'border-primary/40 bg-primary/10 ' + activeColor 
                      : 'border-border/50 bg-surface/50 text-muted hover:border-primary/20'}`}
      >
        <span className="font-semibold tracking-wide">{selected || label}</span>
        <svg style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }} className="transition-transform duration-200 ml-2" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="6 9 12 15 18 9"></polyline>
        </svg>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <motion.div
            initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }}
            className="absolute top-[calc(100%+6px)] left-0 right-0 bg-white border border-border shadow-2xl rounded-xl z-50 overflow-hidden py-1.5"
          >
            {options.map(opt => (
              <button
                key={opt.label}
                onClick={() => { onChange(opt); setOpen(false) }}
                className={`w-full text-left px-3 py-2 text-sm transition-colors hover:bg-slate-50 flex flex-col items-start justify-center
                  ${selected === opt.label ? 'bg-primary/5 border-l-2 border-primary' : 'border-l-2 border-transparent'}
                `}
              >
                <span className={`font-semibold ${selected === opt.label ? 'text-slate-900' : 'text-slate-600'}`}>{opt.label}</span>
              </button>
            ))}
          </motion.div>
        </>
      )}
    </div>
  )
}

function SliderRow({ label, value, min, max, step, format, onChange }) {
  const pct = ((value - min) / (max - min)) * 100
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-xs">
        <span className="text-muted">{label}</span>
        <span className="text-primary font-semibold font-mono">{format(value)}</span>
      </div>
      <div className="relative">
        <input
          type="range"
          min={min} max={max} step={step}
          value={value}
          onChange={e => onChange(+e.target.value)}
          style={{ background: `linear-gradient(to right, #3b82f6 ${pct}%, #334155 ${pct}%)` }}
        />
      </div>
    </div>
  )
}
