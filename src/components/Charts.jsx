import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import { FAULT_TREND, FAULT_TYPES, PRED_REPAIR } from '../data/mockEquipment'

// ─── Custom tooltip style ────────────────────────────────────────────────────
const ChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: 'var(--bg-panel)', border: '1px solid var(--border-accent)',
      borderRadius: 4, padding: '6px 10px', fontSize: 11,
    }}>
      {label && <div style={{ color: 'var(--text-muted)', marginBottom: 4, fontSize: 10 }}>{label}</div>}
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color ?? 'var(--text-primary)', fontWeight: 600 }}>
          {p.name}: {p.value}
        </div>
      ))}
    </div>
  )
}

// ─── Fault Trend (area chart) ────────────────────────────────────────────────
export function FaultTrendChart() {
  return (
    <ResponsiveContainer width="100%" height={130}>
      <AreaChart data={FAULT_TREND} margin={{ top: 4, right: 6, bottom: 0, left: -20 }}>
        <defs>
          <linearGradient id="faultGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor="#e8453c" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#e8453c" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke="rgba(255,255,255,0.04)" strokeDasharray="3 3" />
        <XAxis dataKey="day" tick={{ fill: 'var(--text-muted)', fontSize: 9 }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 9 }} axisLine={false} tickLine={false} />
        <Tooltip content={<ChartTooltip />} />
        <Area
          type="monotone" dataKey="faults" name="Faults"
          stroke="#e8453c" strokeWidth={1.5}
          fill="url(#faultGrad)"
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}

// ─── Fault Type Distribution (pie chart) ─────────────────────────────────────
export function FaultTypePie() {
  return (
    <ResponsiveContainer width="100%" height={130}>
      <PieChart>
        <Pie
          data={FAULT_TYPES} dataKey="value"
          nameKey="name" cx="50%" cy="50%"
          outerRadius={50} innerRadius={28}
          strokeWidth={0}
        >
          {FAULT_TYPES.map((entry, i) => (
            <Cell key={i} fill={entry.fill} opacity={0.85} />
          ))}
        </Pie>
        <Tooltip content={<ChartTooltip />} />
        <Legend
          iconSize={7} iconType="circle"
          formatter={(v) => <span style={{ fontSize: 9, color: 'var(--text-muted)' }}>{v}</span>}
          wrapperStyle={{ fontSize: 9, paddingLeft: 4 }}
        />
      </PieChart>
    </ResponsiveContainer>
  )
}

// ─── Predicted Repair Time (bar chart) ───────────────────────────────────────
export function PredRepairChart() {
  return (
    <ResponsiveContainer width="100%" height={130}>
      <BarChart data={PRED_REPAIR} margin={{ top: 4, right: 6, bottom: 0, left: -20 }}>
        <CartesianGrid stroke="rgba(255,255,255,0.04)" strokeDasharray="3 3" />
        <XAxis dataKey="type" tick={{ fill: 'var(--text-muted)', fontSize: 8 }} axisLine={false} tickLine={false} />
        <YAxis
          tick={{ fill: 'var(--text-muted)', fontSize: 9 }} axisLine={false} tickLine={false}
          label={{ value: 'hrs', angle: -90, position: 'insideLeft', fill: 'var(--text-muted)', fontSize: 8 }}
        />
        <Tooltip content={<ChartTooltip />} />
        <Bar dataKey="hours" name="Repair Time (hrs)" fill="#4a9eff" opacity={0.7} radius={[2, 2, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}
