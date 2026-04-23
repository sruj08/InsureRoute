import { motion, animate } from 'framer-motion'
import { useEffect, useRef } from 'react'
import { AlertTriangle, Clock, TrendingUp, PiggyBank } from 'lucide-react'

function AnimatedNumber({ value, prefix = '', suffix = '', decimals = 1, className = '' }) {
  const ref = useRef(null)
  const prev = useRef(0)

  useEffect(() => {
    const node = ref.current
    if (!node) return
    const from = prev.current
    prev.current = value
    const ctrl = animate(from, value, {
      duration: 0.9,
      ease: [0.4, 0, 0.2, 1],
      onUpdate(v) {
        node.textContent = prefix + v.toFixed(decimals) + suffix
      },
    })
    return () => ctrl.stop()
  }, [value, prefix, suffix, decimals])

  return <span ref={ref} className={className}>{prefix}{value.toFixed(decimals)}{suffix}</span>
}

const CARDS = [
  {
    key: 'sla',
    label: 'SLA Breach Rate',
    suffix: '%',
    icon: AlertTriangle,
    accent: 'border-t-danger',
    iconColor: 'text-danger',
    desc: 'of total shipments',
    threshold: (v) => v > 10 ? 'danger' : v > 5 ? 'warning' : 'success',
  },
  {
    key: 'delay',
    label: 'Avg Delay',
    suffix: '%',
    prefix: '+',
    icon: Clock,
    accent: 'border-t-warning',
    iconColor: 'text-warning',
    desc: 'vs scheduled transit',
    threshold: (v) => v > 15 ? 'danger' : v > 7 ? 'warning' : 'success',
  },
  {
    key: 'risk',
    label: 'Current Risk',
    suffix: '%',
    icon: TrendingUp,
    accent: 'border-t-primary',
    iconColor: 'text-primary',
    desc: 'system probability',
    threshold: (v) => v > 60 ? 'danger' : v > 30 ? 'warning' : 'success',
  },
  {
    key: 'savings',
    label: 'Cost Savings',
    suffix: '%',
    icon: PiggyBank,
    accent: 'border-t-success',
    iconColor: 'text-success',
    desc: 'via active rerouting',
    threshold: () => 'success',
  },
]

const LEVEL_STYLES = {
  danger:  'text-danger',
  warning: 'text-warning',
  success: 'text-text', // Keep normal text for success looking metrics instead of neon green
}

export default function KPICards({ kpis }) {
  const safeKpis = kpis || { sla: 0, delay: 0, risk: 0, savings: 0 }

  return (
    <div className="flex flex-col gap-3 md:gap-4 h-full">
      {CARDS.map((card, i) => {
        const value = safeKpis[card.key] ?? 0
        const level = card.threshold(value)
        const Icon  = card.icon
        
        return (
          <motion.div
            key={card.key}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05, duration: 0.4 }}
            className={`glass p-4 md:p-5 flex flex-col justify-center border-t-2 ${card.accent} flex-1 min-h-[100px]`}
          >
            <div className="flex items-center gap-2 mb-1">
              <Icon size={16} className={card.iconColor} />
              <span className="text-sm font-semibold text-slate-600">
                {card.label}
              </span>
            </div>
            
            <div className={`text-3xl md:text-4xl font-black tracking-tight ${LEVEL_STYLES[level]}`}>
              <AnimatedNumber
                value={value}
                prefix={card.prefix || ''}
                suffix={card.suffix}
                decimals={1}
              />
            </div>
            
            <span className="text-xs font-medium text-muted mt-1">{card.desc}</span>
          </motion.div>
        )
      })}
    </div>
  )
}
