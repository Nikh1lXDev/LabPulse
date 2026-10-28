import { useState, useMemo, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Monitor, AlertTriangle, Clock, TrendingUp,
  Activity, Wrench, ChevronRight, Info, Sparkles
} from 'lucide-react'
import LabScene from '../components/LabScene'
import { FaultTrendChart, FaultTypePie, PredRepairChart } from '../components/Charts'
import {
  RECENT_ACTIVITY,
  MEDIAN_REPAIR_HOURS, REPEAT_FAILURE_RISK_PCT,
} from '../data/mockEquipment'
import { useEquipment } from '../context/EquipmentContext'

// ─── Stat card strip ─────────────────────────────────────────────────────────
function StatStrip({ stats, labs, mlSummary }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
      <StatCard
        icon={<Monitor size={14} />}
        value={stats.total}
        label="Total Equipment"
        sub={`across ${labs.length} labs`}
        color="var(--blue-base)"
      />
      <StatCard
        icon={<AlertTriangle size={14} />}
        value={stats.activeFaults}
        label="Open Faults"
        sub={`${stats.critical} critical · ${stats.warning} warnings`}
        color="var(--red-base)"
      />
      <StatCard
        icon={<Clock size={14} />}
        value={mlSummary ? `${mlSummary.withActiveFaults} Active` : `${MEDIAN_REPAIR_HOURS}h`}
        label={mlSummary ? "Faults Requiring Repair" : "Median Repair Time"}
        sub={mlSummary ? "ML repair times computed" : "historical estimate"}
        color="var(--amber-base)"
      />
      <StatCard
        icon={<TrendingUp size={14} />}
        value={mlSummary ? `${mlSummary.elevated}` : `${REPEAT_FAILURE_RISK_PCT}%`}
        label={mlSummary ? "Elevated Risk Units" : "Repeat-Failure Risk"}
        sub={mlSummary ? ">65% failure likelihood" : "demo figure — not ML"}
        color={mlSummary && mlSummary.elevated > 0 ? "var(--red-base)" : "var(--green-base)"}
      />
    </div>
  )
}

function StatCard({ icon, value, label, sub, color }) {
  return (
    <div className="stat-card">
      <div className="flex items-center justify-between" style={{ marginBottom: 8 }}>
        <span style={{ color, opacity: 0.85 }}>{icon}</span>
        <span style={{ fontSize: 9, color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
          {label}
        </span>
      </div>
      <div className="stat-value" style={{ color }}>{value}</div>
      <div className="stat-sub">{sub}</div>
    </div>
  )
}

// ─── Equipment risk table ─────────────────────────────────────────────────────
function RiskTable({ equipment = [], onSelectEquip }) {
  const risky = equipment
    .filter(e => e.status !== 'healthy')
    .sort((a, b) => {
      const order = { critical: 0, warning: 1 }
      return (order[a.status] ?? 9) - (order[b.status] ?? 9)
    })

  const statusBadge = (status) => {
    const cls = { critical: 'badge-red', warning: 'badge-amber', healthy: 'badge-green' }[status]
    return <span className={`badge ${cls}`}>{status}</span>
  }
  const riskBadge = (risk) => {
    const cls = { high: 'badge-red', medium: 'badge-amber', low: 'badge-green' }[risk]
    return <span className={`badge ${cls}`}>{risk}</span>
  }

  return (
    <div style={{ overflowX: 'auto' }}>
      <table className="data-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Type</th>
            <th>Lab</th>
            <th>Status</th>
            <th>Risk</th>
            <th>Fault</th>
            <th>Next PM</th>
          </tr>
        </thead>
        <tbody>
          {risky.map(eq => (
            <tr
              key={eq.id}
              onClick={() => onSelectEquip && onSelectEquip(eq)}
              style={{ cursor: 'pointer' }}
              title="Click to view details"
            >
              <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--text-primary)' }}>{eq.id}</td>
              <td>{eq.type}</td>
              <td>{eq.labName}</td>
              <td>{statusBadge(eq.status)}</td>
              <td>{riskBadge(eq.riskLevel)}</td>
              <td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {eq.fault ?? <span style={{ color: 'var(--text-muted)' }}>—</span>}
              </td>
              <td style={{ fontFamily: 'var(--font-mono)', fontSize: 11 }}>{eq.nextMaintenance}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ─── Upcoming maintenance list ────────────────────────────────────────────────
function MaintenanceList({ equipment = [], onSelectEquip }) {
  const upcoming = useMemo(() => {
    return equipment
      .filter(e => e.nextMaintenance)
      .map(e => ({ ...e, nextDate: new Date(e.nextMaintenance) }))
      .sort((a, b) => a.nextDate - b.nextDate)
      .slice(0, 6)
  }, [equipment])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {upcoming.map(eq => {
        const dateColor = eq.status === 'critical' ? 'var(--red-base)' : eq.status === 'warning' ? 'var(--amber-base)' : 'var(--text-muted)'
        return (
          <div
            key={eq.id}
            onClick={() => onSelectEquip && onSelectEquip(eq)}
            style={{
              padding: '7px 10px',
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 4,
              display: 'flex',
              flexDirection: 'column',
              gap: 3,
              cursor: 'pointer',
              transition: 'border-color 0.15s',
            }}
            onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--border-accent)'}
            onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border-subtle)'}
            title="Click to inspect equipment"
          >
            <div className="flex items-center justify-between">
              <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, fontSize: 11, color: 'var(--text-primary)' }}>
                {eq.id}
              </span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: dateColor, fontWeight: 600 }}>
                {eq.nextMaintenance}
              </span>
            </div>
            <div className="flex items-center justify-between" style={{ fontSize: 10, color: 'var(--text-muted)' }}>
              <span>{eq.type}</span>
              <span style={{ color: 'var(--text-secondary)' }}>{eq.labName}</span>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── Activity timeline ────────────────────────────────────────────────────────
function ActivityTimeline() {
  const dotColor = (type) => ({
    critical: 'var(--red-base)',
    warning:  'var(--amber-base)',
    info:     'var(--blue-base)',
  }[type] ?? 'var(--text-muted)')

  return (
    <div>
      {RECENT_ACTIVITY.map(item => (
        <div key={item.id} className="timeline-item">
          <div className="timeline-line">
            <div
              className="timeline-dot"
              style={{ background: dotColor(item.type), boxShadow: `0 0 5px ${dotColor(item.type)}60` }}
            />
          </div>
          <div style={{ flex: 1 }}>
            <div className="flex items-center gap-6" style={{ marginBottom: 2 }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)' }}>
                {item.time}
              </span>
              <span
                style={{
                  fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase',
                  color: dotColor(item.type),
                }}
              >
                {item.type}
              </span>
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.4 }}>
              {item.msg}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Selected equipment panel ─────────────────────────────────────────────────
function SelectedPanel({ equipment, onClose }) {
  if (!equipment) return null
  const statusColor = {
    healthy:  'var(--green-base)',
    warning:  'var(--amber-base)',
    critical: 'var(--red-base)',
  }[equipment.status]

  return (
    <div
      style={{
        position: 'absolute', top: 8, right: 8, zIndex: 20,
        width: 240,
        background: 'var(--bg-panel)',
        border: `1px solid ${statusColor}40`,
        borderRadius: 6,
        padding: '12px 14px',
        boxShadow: `0 8px 32px rgba(0,0,0,0.5), 0 0 0 1px ${statusColor}20`,
      }}
    >
      <div className="flex items-center justify-between" style={{ marginBottom: 10 }}>
        <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 14, color: 'var(--text-primary)' }}>
          {equipment.id}
        </span>
        <button
          onClick={onClose}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 14, padding: 2 }}
        >
          ✕
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <Row label="Type"   val={equipment.type} />
        <Row label="Lab"    val={equipment.labName} />
        <Row label="Status" val={equipment.status} valColor={statusColor} />
        {equipment.fault && (
          <div style={{ padding: '5px 7px', background: 'rgba(232,69,60,0.1)', border: '1px solid rgba(232,69,60,0.2)', borderRadius: 3, marginTop: 2 }}>
            <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--red-base)', textTransform: 'uppercase', marginBottom: 3 }}>
              ⚠ {equipment.faultType}
            </div>
            <div style={{ fontSize: 10, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{equipment.fault}</div>
          </div>
        )}
        {equipment.temp != null && <Row label="Temp" val={`${equipment.temp} °C`} />}
        {equipment.cpu  != null && <Row label="CPU"  val={`${equipment.cpu}%`} />}
        {equipment.ram  != null && <Row label="RAM"  val={`${equipment.ram}%`} />}
        <Row label="Uptime"  val={equipment.uptime} />
        <Row label="Last PM" val={equipment.lastMaintenance} />
        <Row label="Next PM" val={equipment.nextMaintenance} />
        {equipment.notes && (
          <div style={{ fontSize: 9, color: 'var(--text-muted)', marginTop: 4, lineHeight: 1.5 }}>
            {equipment.notes}
          </div>
        )}
      </div>
    </div>
  )
}
function Row({ label, val, valColor }) {
  return (
    <div className="flex justify-between">
      <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{label}</span>
      <span style={{ fontSize: 10, color: valColor ?? 'var(--text-secondary)', fontWeight: 500 }}>{val}</span>
    </div>
  )
}

// ─── Section header ───────────────────────────────────────────────────────────
function SectionHeader({ title, subtitle }) {
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
        {title}
      </div>
      {subtitle && <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>{subtitle}</div>}
    </div>
  )
}

// ─── View toggle buttons ──────────────────────────────────────────────────────
const VIEWS = ['structure', 'health', 'risk']

function ViewToggle({ current, onChange }) {
  return (
    <div className="flex" style={{ gap: 4 }}>
      {VIEWS.map(v => (
        <button key={v} className={`view-btn${current === v ? ' active' : ''}`} onClick={() => onChange(v)}>
          {v.charAt(0).toUpperCase() + v.slice(1)}
        </button>
      ))}
    </div>
  )
}

// ─── Overview page ────────────────────────────────────────────────────────────
export default function Overview() {
  const [viewMode, setViewMode] = useState('structure')
  const [mlSummary, setMlSummary] = useState(null)
  const { equipment, stats, labs, selectedEquip, setSelectedEquip, openDrawer, openReportFaultModal } = useEquipment()
  const navigate = useNavigate()

  useEffect(() => {
    fetch('/api/ml/predictions')
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data && data.summary) setMlSummary(data.summary)
      })
      .catch(() => {})
  }, [])

  const handleEquipmentClick = (equip) => {
    setSelectedEquip(equip)
    openDrawer(equip)
  }

  return (
    <div style={{ padding: '14px 16px 20px', minHeight: '100%' }}>
      {/* Page heading */}
      <div className="flex items-center justify-between" style={{ marginBottom: 14 }}>
        <div>
          <h1 style={{ fontSize: 18, fontWeight: 700, letterSpacing: '-0.4px', color: 'var(--text-primary)', lineHeight: 1 }}>
            Equipment Reliability
          </h1>
          <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4, letterSpacing: '0.04em' }}>
            Monitor · Predict · Prevent · Keep Labs Running
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            onClick={() => navigate('/predictions')}
            className="flex items-center gap-6"
            style={{
              background: 'rgba(59,130,246,0.12)', border: '1px solid rgba(59,130,246,0.25)',
              borderRadius: 4, padding: '7px 12px', cursor: 'pointer',
              color: 'var(--blue-base)', fontSize: 11.5, fontWeight: 600,
            }}
          >
            <Sparkles size={13} />
            ML Predictions
          </button>

          <button
            onClick={() => openReportFaultModal()}
            className="flex items-center gap-6"
            style={{
              background: 'rgba(232,69,60,0.15)', border: '1px solid rgba(232,69,60,0.35)',
              borderRadius: 4, padding: '7px 14px', cursor: 'pointer',
              color: 'var(--red-base)', fontSize: 11.5, fontWeight: 600,
              boxShadow: '0 0 10px rgba(232,69,60,0.15)',
            }}
          >
            <AlertTriangle size={13} />
            Report Fault
          </button>
        </div>
      </div>

      {/* ML Predictive Alert Banner */}
      {mlSummary && mlSummary.elevated > 0 && (
        <div
          onClick={() => navigate('/predictions')}
          style={{
            marginBottom: 12, padding: '7px 12px',
            background: 'rgba(239,68,68,0.08)',
            border: '1px solid rgba(239,68,68,0.25)',
            borderRadius: 4, fontSize: 11, color: 'var(--red-base)',
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            transition: 'background 0.15s ease'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <TrendingUp size={14} />
            <span>
              <strong>ML Predictive Alert:</strong> {mlSummary.elevated} equipment unit(s) flagged with <strong>Elevated Repeat-Failure Risk (&gt;65%)</strong> within 7 days.
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, fontWeight: 600 }}>
            <span>View ML Predictions</span>
            <ChevronRight size={12} />
          </div>
        </div>
      )}

      {/* Stat strip */}
      <div style={{ marginBottom: 14 }}>
        <StatStrip stats={stats} labs={labs} mlSummary={mlSummary} />
      </div>

      {/* Main 3-column grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 240px', gap: 12, marginBottom: 12 }}>
        {/* 3D Lab + controls */}
        <div
          className="panel"
          style={{ position: 'relative', overflow: 'hidden', height: 420 }}
        >
          {/* Controls bar */}
          <div
            className="flex items-center justify-between"
            style={{
              position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10,
              padding: '7px 10px',
              background: 'rgba(15,17,20,0.85)',
              backdropFilter: 'blur(8px)',
              borderBottom: '1px solid var(--border-subtle)',
            }}
          >
            <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
              Computer Lab A / B — 3D View
            </span>
            <ViewToggle current={viewMode} onChange={setViewMode} />
          </div>

          {/* Scene */}
          <div style={{ position: 'absolute', inset: 0, top: 36 }}>
            <LabScene viewMode={viewMode} onEquipmentClick={handleEquipmentClick} />
          </div>

          {/* Selected equipment detail panel (inside 3D area) */}
          {selectedEquip && (
            <div style={{ position: 'absolute', top: 44, right: 0, bottom: 0, zIndex: 15, pointerEvents: 'auto' }}>
              <SelectedPanel equipment={selectedEquip} onClose={() => setSelectedEquip(null)} />
            </div>
          )}
        </div>

        {/* Right sidebar panels */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {/* Upcoming maintenance */}
          <div className="panel" style={{ padding: '10px 12px', flex: 1 }}>
            <SectionHeader title="Upcoming Maintenance" subtitle="Next 6 due" />
            <MaintenanceList equipment={equipment} onSelectEquip={handleEquipmentClick} />
          </div>
        </div>
      </div>

      {/* Bottom 3-column: charts */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 12 }}>
        <div className="panel" style={{ padding: '10px 12px' }}>
          <SectionHeader title="Fault Trend" subtitle="Last 7 days — demo" />
          <FaultTrendChart />
        </div>
        <div className="panel" style={{ padding: '10px 12px' }}>
          <SectionHeader title="Fault Type Distribution" subtitle="Demo data" />
          <FaultTypePie />
        </div>
        <div className="panel" style={{ padding: '10px 12px' }}>
          <SectionHeader title="Predicted Repair Time" subtitle="By type — demo, not ML" />
          <PredRepairChart />
        </div>
      </div>

      {/* Bottom 2-column: risk table + timeline */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 10 }}>
        <div className="panel" style={{ padding: '10px 12px' }}>
          <SectionHeader title="Equipment Risk Overview" subtitle="Non-healthy equipment only" />
          <RiskTable equipment={equipment} onSelectEquip={handleEquipmentClick} />
        </div>
        <div className="panel" style={{ padding: '10px 12px' }}>
          <SectionHeader title="Recent Activity" subtitle="Today" />
          <ActivityTimeline />
        </div>
      </div>
    </div>
  )
}
