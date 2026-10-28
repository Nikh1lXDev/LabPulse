import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  FlaskConical, Plus, Search, MapPin, Users,
  Activity, CheckCircle2, AlertTriangle, AlertOctagon,
  Cpu, ExternalLink, HardDrive, ArrowRight, ShieldCheck,
  Server, Wrench
} from 'lucide-react'
import { useEquipment } from '../context/EquipmentContext'

export default function Labs() {
  const { equipment, labs, openDrawer, openAddModal } = useEquipment()
  const navigate = useNavigate()

  const [selectedLabId, setSelectedLabId] = useState('ALL')
  const [labSearch, setLabSearch] = useState('')

  // Compute aggregate metrics
  const totalCapacity = useMemo(() => labs.reduce((acc, l) => acc + l.capacity, 0), [labs])
  const totalDevices = equipment.length
  const healthyCount = equipment.filter(e => e.status === 'healthy').length
  const overallHealthPct = totalDevices > 0 ? Math.round((healthyCount / totalDevices) * 100) : 0

  // Filtered labs list
  const filteredLabs = useMemo(() => {
    return labs.filter(lab => {
      if (selectedLabId !== 'ALL' && lab.id !== selectedLabId) return false
      if (labSearch.trim()) {
        const q = labSearch.toLowerCase().trim()
        const matchName = lab.name.toLowerCase().includes(q)
        const matchLoc = lab.location.toLowerCase().includes(q)
        const matchCode = lab.id.toLowerCase().includes(q)
        if (!matchName && !matchLoc && !matchCode) return false
      }
      return true
    })
  }, [labs, selectedLabId, labSearch])

  return (
    <div style={{ padding: '14px 16px 24px', minHeight: '100%' }}>
      {/* Page Header */}
      <div className="flex items-center justify-between" style={{ marginBottom: 14 }}>
        <div>
          <h1 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.3px', lineHeight: 1 }}>
            Laboratory Management
          </h1>
          <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
            Facility Capacities, Workstation Rosters & Real-Time Operational Health
          </p>
        </div>

        <button
          onClick={openAddModal}
          className="flex items-center gap-6"
          style={{
            background: 'rgba(74,158,255,0.12)', border: '1px solid rgba(74,158,255,0.3)',
            borderRadius: 4, padding: '7px 14px', cursor: 'pointer', color: 'var(--blue-base)',
            fontSize: 11.5, fontWeight: 600,
          }}
        >
          <Plus size={14} /> Register Equipment
        </button>
      </div>

      {/* Aggregate Labs Overview Strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 14 }}>
        <div className="stat-card">
          <div className="flex items-center justify-between" style={{ marginBottom: 6 }}>
            <span style={{ color: 'var(--blue-base)', opacity: 0.85 }}><FlaskConical size={14} /></span>
            <span style={{ fontSize: 9, color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              Active Labs
            </span>
          </div>
          <div className="stat-value" style={{ color: 'var(--blue-base)' }}>{labs.length}</div>
          <div className="stat-sub">CSE Department facilities</div>
        </div>

        <div className="stat-card">
          <div className="flex items-center justify-between" style={{ marginBottom: 6 }}>
            <span style={{ color: 'var(--green-base)', opacity: 0.85 }}><Cpu size={14} /></span>
            <span style={{ fontSize: 9, color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              Deployed Units
            </span>
          </div>
          <div className="stat-value" style={{ color: 'var(--green-base)' }}>{totalDevices}</div>
          <div className="stat-sub">{totalCapacity} total seat capacity</div>
        </div>

        <div className="stat-card">
          <div className="flex items-center justify-between" style={{ marginBottom: 6 }}>
            <span style={{ color: 'var(--blue-base)', opacity: 0.85 }}><ShieldCheck size={14} /></span>
            <span style={{ fontSize: 9, color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              Overall Health Index
            </span>
          </div>
          <div className="stat-value" style={{ color: 'var(--blue-base)' }}>{overallHealthPct}%</div>
          <div className="stat-sub">{healthyCount} nominal devices</div>
        </div>

        <div className="stat-card">
          <div className="flex items-center justify-between" style={{ marginBottom: 6 }}>
            <span style={{ color: 'var(--amber-base)', opacity: 0.85 }}><Server size={14} /></span>
            <span style={{ fontSize: 9, color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              Seat Utilization
            </span>
          </div>
          <div className="stat-value" style={{ color: 'var(--amber-base)' }}>
            {totalCapacity > 0 ? Math.round((totalDevices / totalCapacity) * 100) : 0}%
          </div>
          <div className="stat-sub">{totalDevices} / {totalCapacity} seats populated</div>
        </div>
      </div>

      {/* Lab Filter Toolbar */}
      <div
        className="panel"
        style={{
          padding: '10px 14px', marginBottom: 14,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10,
        }}
      >
        <div className="flex items-center gap-8">
          <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            Filter Facility:
          </span>
          <div className="flex" style={{ gap: 4 }}>
            <button
              onClick={() => setSelectedLabId('ALL')}
              className={`view-btn${selectedLabId === 'ALL' ? ' active' : ''}`}
            >
              All Labs ({labs.length})
            </button>
            {labs.map(l => (
              <button
                key={l.id}
                onClick={() => setSelectedLabId(l.id)}
                className={`view-btn${selectedLabId === l.id ? ' active' : ''}`}
              >
                {l.name}
              </button>
            ))}
          </div>
        </div>

        <div
          className="flex items-center gap-6"
          style={{
            background: 'var(--bg-elevated)', border: '1px solid var(--border-muted)',
            borderRadius: 4, padding: '4px 10px', width: 220,
          }}
        >
          <Search size={12} color="var(--text-muted)" />
          <input
            type="text"
            value={labSearch}
            onChange={e => setLabSearch(e.target.value)}
            placeholder="Search lab name or room…"
            style={{
              background: 'none', border: 'none', outline: 'none',
              color: 'var(--text-primary)', fontSize: 11, width: '100%',
            }}
          />
        </div>
      </div>

      {/* Grid of Lab Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 14 }}>
        {filteredLabs.map(lab => {
          const equipInLab = equipment.filter(e => e.labId === lab.id)
          const critical = equipInLab.filter(e => e.status === 'critical').length
          const warning  = equipInLab.filter(e => e.status === 'warning').length
          const healthy  = equipInLab.filter(e => e.status === 'healthy').length

          const overallStatus = critical > 0 ? 'critical' : warning > 0 ? 'warning' : 'healthy'
          const statusColor = {
            critical: 'var(--red-base)',
            warning:  'var(--amber-base)',
            healthy:  'var(--green-base)',
          }[overallStatus]

          const occupancyPct = Math.min(Math.round((equipInLab.length / lab.capacity) * 100), 100)

          return (
            <div
              key={lab.id}
              className="panel"
              style={{
                display: 'flex', flexDirection: 'column',
                border: `1px solid ${statusColor}35`,
                overflow: 'hidden',
              }}
            >
              {/* Lab Card Header */}
              <div
                style={{
                  padding: '14px 16px',
                  background: 'var(--bg-elevated)',
                  borderBottom: '1px solid var(--border-subtle)',
                }}
              >
                <div className="flex items-center justify-between" style={{ marginBottom: 6 }}>
                  <div className="flex items-center gap-8">
                    <div
                      style={{
                        width: 28, height: 28, borderRadius: 4,
                        background: `${statusColor}18`, border: `1px solid ${statusColor}35`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}
                    >
                      <FlaskConical size={15} color={statusColor} />
                    </div>
                    <div>
                      <h2 style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text-primary)' }}>
                        {lab.name}
                      </h2>
                      <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                        {lab.id}
                      </span>
                    </div>
                  </div>

                  <span
                    className="badge"
                    style={{
                      background: `${statusColor}18`, color: statusColor,
                      border: `1px solid ${statusColor}40`,
                    }}
                  >
                    <span className="dot" style={{ background: statusColor, boxShadow: `0 0 5px ${statusColor}` }} />
                    {overallStatus.toUpperCase()}
                  </span>
                </div>

                <div className="flex items-center gap-6" style={{ fontSize: 10.5, color: 'var(--text-secondary)' }}>
                  <MapPin size={11} color="var(--text-muted)" />
                  <span>{lab.location}</span>
                  <span style={{ color: 'var(--border-accent)' }}>·</span>
                  <Users size={11} color="var(--text-muted)" />
                  <span>Max Capacity: {lab.capacity} seats</span>
                </div>
              </div>

              {/* Capacity Progress Bar */}
              <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-subtle)' }}>
                <div className="flex items-center justify-between" style={{ fontSize: 10.5, marginBottom: 5 }}>
                  <span style={{ color: 'var(--text-muted)' }}>Workstation Occupancy</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--text-primary)' }}>
                    {equipInLab.length} / {lab.capacity} ({occupancyPct}%)
                  </span>
                </div>
                <div
                  style={{
                    height: 5, width: '100%', borderRadius: 3,
                    background: 'var(--bg-void)', overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      height: '100%', width: `${occupancyPct}%`,
                      background: occupancyPct > 90 ? 'var(--amber-base)' : 'var(--blue-base)',
                      borderRadius: 3, transition: 'width 0.3s ease',
                    }}
                  />
                </div>
              </div>

              {/* Status Breakdown Pills */}
              <div
                style={{
                  padding: '10px 16px',
                  display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8,
                  borderBottom: '1px solid var(--border-subtle)',
                }}
              >
                <div style={{ background: 'var(--bg-elevated)', borderRadius: 4, padding: '6px 8px', textAlign: 'center', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 15, fontWeight: 700, color: 'var(--green-base)' }}>
                    {healthy}
                  </div>
                  <div style={{ fontSize: 8.5, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                    Healthy
                  </div>
                </div>

                <div style={{ background: 'var(--bg-elevated)', borderRadius: 4, padding: '6px 8px', textAlign: 'center', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 15, fontWeight: 700, color: 'var(--amber-base)' }}>
                    {warning}
                  </div>
                  <div style={{ fontSize: 8.5, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                    Warnings
                  </div>
                </div>

                <div style={{ background: 'var(--bg-elevated)', borderRadius: 4, padding: '6px 8px', textAlign: 'center', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 15, fontWeight: 700, color: 'var(--red-base)' }}>
                    {critical}
                  </div>
                  <div style={{ fontSize: 8.5, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                    Critical
                  </div>
                </div>
              </div>

              {/* Roster of Equipment in Lab */}
              <div style={{ flex: 1, padding: '12px 16px', display: 'flex', flexDirection: 'column' }}>
                <div className="section-label" style={{ marginBottom: 8, display: 'flex', justifyContent: 'space-between' }}>
                  <span>Installed Devices ({equipInLab.length})</span>
                  <span style={{ fontSize: 9, color: 'var(--text-muted)' }}>Click to inspect</span>
                </div>

                <div
                  style={{
                    maxHeight: 220, overflowY: 'auto',
                    border: '1px solid var(--border-subtle)', borderRadius: 4,
                  }}
                >
                  {equipInLab.map(eq => {
                    const dotColor = {
                      healthy:  'var(--green-base)',
                      warning:  'var(--amber-base)',
                      critical: 'var(--red-base)',
                    }[eq.status]

                    return (
                      <div
                        key={eq.id}
                        onClick={() => openDrawer(eq)}
                        className="flex items-center justify-between"
                        style={{
                          padding: '6px 10px',
                          borderBottom: '1px solid var(--border-subtle)',
                          cursor: 'pointer',
                          transition: 'background 0.15s',
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      >
                        <div className="flex items-center gap-6">
                          <span className="dot" style={{ background: dotColor, boxShadow: `0 0 4px ${dotColor}` }} />
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 600, color: 'var(--text-primary)' }}>
                            {eq.id}
                          </span>
                          <span style={{ fontSize: 10.5, color: 'var(--text-muted)' }}>{eq.type}</span>
                        </div>

                        <div className="flex items-center gap-6">
                          {eq.fault && (
                            <span
                              style={{
                                fontSize: 9, padding: '1px 5px', borderRadius: 2,
                                background: eq.status === 'critical' ? 'rgba(232,69,60,0.15)' : 'rgba(245,166,35,0.15)',
                                color: dotColor, fontWeight: 600,
                              }}
                            >
                              {eq.faultType || 'Fault'}
                            </span>
                          )}
                          <span style={{ fontSize: 9.5, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                            PM: {eq.nextMaintenance || '—'}
                          </span>
                          <ExternalLink size={10} color="var(--text-muted)" />
                        </div>
                      </div>
                    )
                  })}

                  {equipInLab.length === 0 && (
                    <div style={{ padding: '20px', textAlign: 'center', fontSize: 11, color: 'var(--text-muted)' }}>
                      No equipment assigned to this lab yet.
                    </div>
                  )}
                </div>
              </div>

              {/* Lab Card Footer */}
              <div
                className="flex items-center justify-between"
                style={{
                  padding: '10px 16px',
                  background: 'var(--bg-elevated)',
                  borderTop: '1px solid var(--border-subtle)',
                }}
              >
                <button
                  onClick={() => navigate('/equipment')}
                  className="flex items-center gap-4"
                  style={{
                    background: 'none', border: 'none', color: 'var(--blue-base)',
                    fontSize: 10.5, fontWeight: 600, cursor: 'pointer', padding: 0,
                  }}
                >
                  View in Registry <ArrowRight size={11} />
                </button>

                <button
                  onClick={openAddModal}
                  style={{
                    background: 'none', border: '1px solid var(--border-muted)',
                    borderRadius: 3, padding: '3px 8px', fontSize: 10,
                    color: 'var(--text-secondary)', cursor: 'pointer',
                  }}
                >
                  + Add to Lab
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
