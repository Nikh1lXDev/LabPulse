import { useState, useMemo } from 'react'
import {
  Cpu, Plus, Search, Filter, RotateCcw, AlertTriangle,
  CheckCircle2, Clock, Wrench, ArrowUpDown, ChevronDown,
  Layers, ExternalLink, ShieldAlert
} from 'lucide-react'
import { useEquipment } from '../context/EquipmentContext'

export default function Equipment() {
  const {
    equipment,
    labs,
    stats,
    openDrawer,
    openAddModal,
    openEditModal,
  } = useEquipment()

  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedLab, setSelectedLab] = useState('ALL')
  const [selectedType, setSelectedType] = useState('ALL')
  const [selectedStatus, setSelectedStatus] = useState('ALL')
  const [selectedRisk, setSelectedRisk] = useState('ALL')
  const [sortBy, setSortBy] = useState('id-asc')

  // Equipment types available in data
  const equipmentTypes = useMemo(() => {
    const set = new Set(equipment.map(e => e.type))
    return Array.from(set).sort()
  }, [equipment])

  // Filter & Sort logic
  const filteredEquipment = useMemo(() => {
    return equipment.filter(item => {
      // Search match
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim()
        const matchId = item.id.toLowerCase().includes(q)
        const matchType = item.type?.toLowerCase().includes(q)
        const matchLab = item.labName?.toLowerCase().includes(q)
        const matchFault = item.fault?.toLowerCase().includes(q)
        const matchNotes = item.notes?.toLowerCase().includes(q)
        if (!matchId && !matchType && !matchLab && !matchFault && !matchNotes) return false
      }

      // Lab filter
      if (selectedLab !== 'ALL' && item.labId !== selectedLab) return false

      // Type filter
      if (selectedType !== 'ALL' && item.type !== selectedType) return false

      // Status filter
      if (selectedStatus !== 'ALL') {
        if (selectedStatus === 'maintenance_due') {
          const now = new Date()
          const twoWeeks = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000)
          const pmDate = item.nextMaintenance ? new Date(item.nextMaintenance) : null
          const isDue = (pmDate && pmDate <= twoWeeks) || item.status === 'critical'
          if (!isDue) return false
        } else if (item.status !== selectedStatus) {
          return false
        }
      }

      // Risk filter
      if (selectedRisk !== 'ALL' && item.riskLevel !== selectedRisk) return false

      return true
    }).sort((a, b) => {
      if (sortBy === 'id-asc') {
        return a.id.localeCompare(b.id, undefined, { numeric: true })
      }
      if (sortBy === 'id-desc') {
        return b.id.localeCompare(a.id, undefined, { numeric: true })
      }
      if (sortBy === 'risk-high') {
        const order = { high: 0, medium: 1, low: 2 }
        return (order[a.riskLevel] ?? 9) - (order[b.riskLevel] ?? 9)
      }
      if (sortBy === 'risk-low') {
        const order = { low: 0, medium: 1, high: 2 }
        return (order[a.riskLevel] ?? 9) - (order[b.riskLevel] ?? 9)
      }
      if (sortBy === 'status-critical') {
        const order = { critical: 0, warning: 1, healthy: 2 }
        return (order[a.status] ?? 9) - (order[b.status] ?? 9)
      }
      if (sortBy === 'status-healthy') {
        const order = { healthy: 0, warning: 1, critical: 2 }
        return (order[a.status] ?? 9) - (order[b.status] ?? 9)
      }
      if (sortBy === 'next-pm') {
        if (!a.nextMaintenance) return 1
        if (!b.nextMaintenance) return -1
        return new Date(a.nextMaintenance) - new Date(b.nextMaintenance)
      }
      if (sortBy === 'last-pm') {
        if (!a.lastMaintenance) return 1
        if (!b.lastMaintenance) return -1
        return new Date(b.lastMaintenance) - new Date(a.lastMaintenance)
      }
      return 0
    })
  }, [equipment, searchQuery, selectedLab, selectedType, selectedStatus, selectedRisk, sortBy])

  const hasActiveFilters = searchQuery !== '' || selectedLab !== 'ALL' || selectedType !== 'ALL' || selectedStatus !== 'ALL' || selectedRisk !== 'ALL'

  const resetFilters = () => {
    setSearchQuery('')
    setSelectedLab('ALL')
    setSelectedType('ALL')
    setSelectedStatus('ALL')
    setSelectedRisk('ALL')
    setSortBy('id-asc')
  }

  const getStatusBadge = (status, nextMaint) => {
    const now = new Date()
    const twoWeeks = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000)
    const isDue = nextMaint && new Date(nextMaint) <= twoWeeks

    if (status === 'critical') {
      return (
        <span className="badge badge-red">
          <span className="dot dot-red" />
          Critical / Fault
        </span>
      )
    }
    if (status === 'warning') {
      return (
        <span className="badge badge-amber">
          <span className="dot dot-amber" />
          Warning
        </span>
      )
    }
    if (isDue) {
      return (
        <span className="badge badge-amber" style={{ background: 'rgba(245,166,35,0.12)' }}>
          <span className="dot dot-amber" />
          Maint. Due
        </span>
      )
    }
    return (
      <span className="badge badge-green">
        <span className="dot dot-green" />
        Healthy
      </span>
    )
  }

  const getRiskBadge = (risk) => {
    const cls = { high: 'badge-red', medium: 'badge-amber', low: 'badge-green' }[risk] ?? 'badge-muted'
    return <span className={`badge ${cls}`}>{risk?.toUpperCase() || 'LOW'}</span>
  }

  return (
    <div style={{ padding: '14px 16px 24px', minHeight: '100%' }}>
      {/* Page Title & Add Button */}
      <div className="flex items-center justify-between" style={{ marginBottom: 14 }}>
        <div>
          <h1 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.3px', lineHeight: 1 }}>
            Equipment Registry
          </h1>
          <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
            Hardware Inventory & Diagnostics · CSE494 Intelligent NoSQL Practical Baseline
          </p>
        </div>

        <button
          onClick={openAddModal}
          className="flex items-center gap-6"
          style={{
            background: 'rgba(74,158,255,0.12)', border: '1px solid rgba(74,158,255,0.3)',
            borderRadius: 4, padding: '7px 14px', cursor: 'pointer', color: 'var(--blue-base)',
            fontSize: 11.5, fontWeight: 600, transition: 'all 0.15s',
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(74,158,255,0.2)'}
          onMouseLeave={e => e.currentTarget.style.background = 'rgba(74,158,255,0.12)'}
        >
          <Plus size={14} /> Add Equipment
        </button>
      </div>

      {/* Dynamic Summary Figure Strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 14 }}>
        <div className="stat-card">
          <div className="flex items-center justify-between" style={{ marginBottom: 6 }}>
            <span style={{ color: 'var(--blue-base)', opacity: 0.85 }}><Cpu size={14} /></span>
            <span style={{ fontSize: 9, color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              Total Equipment
            </span>
          </div>
          <div className="stat-value" style={{ color: 'var(--blue-base)' }}>{stats.total}</div>
          <div className="stat-sub">across {labs.length} laboratories</div>
        </div>

        <div className="stat-card">
          <div className="flex items-center justify-between" style={{ marginBottom: 6 }}>
            <span style={{ color: 'var(--green-base)', opacity: 0.85 }}><CheckCircle2 size={14} /></span>
            <span style={{ fontSize: 9, color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              Healthy Devices
            </span>
          </div>
          <div className="stat-value" style={{ color: 'var(--green-base)' }}>{stats.healthy}</div>
          <div className="stat-sub">
            {stats.total > 0 ? Math.round((stats.healthy / stats.total) * 100) : 0}% nominal state
          </div>
        </div>

        <div className="stat-card">
          <div className="flex items-center justify-between" style={{ marginBottom: 6 }}>
            <span style={{ color: 'var(--red-base)', opacity: 0.85 }}><AlertTriangle size={14} /></span>
            <span style={{ fontSize: 9, color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              Active Faults
            </span>
          </div>
          <div className="stat-value" style={{ color: 'var(--red-base)' }}>{stats.activeFaults}</div>
          <div className="stat-sub">{stats.critical} critical · {stats.warning} warnings</div>
        </div>

        <div className="stat-card">
          <div className="flex items-center justify-between" style={{ marginBottom: 6 }}>
            <span style={{ color: 'var(--amber-base)', opacity: 0.85 }}><Wrench size={14} /></span>
            <span style={{ fontSize: 9, color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              Maintenance Due
            </span>
          </div>
          <div className="stat-value" style={{ color: 'var(--amber-base)' }}>{stats.maintenanceDue}</div>
          <div className="stat-sub">critical or PM due &lt; 14 days</div>
        </div>
      </div>

      {/* Main Filter & Registry Panel */}
      <div className="panel" style={{ padding: '12px 14px' }}>
        {/* Search & Filter Toolbar */}
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          {/* Search Box */}
          <div
            className="flex items-center gap-6"
            style={{
              background: 'var(--bg-elevated)', border: '1px solid var(--border-muted)',
              borderRadius: 4, padding: '5px 10px', flex: '1 1 200px',
            }}
          >
            <Search size={13} color="var(--text-muted)" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search by ID, type, lab, or fault…"
              style={{
                background: 'none', border: 'none', outline: 'none',
                color: 'var(--text-primary)', fontSize: 11.5, width: '100%',
              }}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 0 }}
              >
                ✕
              </button>
            )}
          </div>

          {/* Filter: Lab */}
          <select
            value={selectedLab}
            onChange={e => setSelectedLab(e.target.value)}
            style={{
              background: 'var(--bg-elevated)', border: '1px solid var(--border-muted)',
              borderRadius: 4, padding: '5px 8px', color: 'var(--text-secondary)',
              fontSize: 11, outline: 'none', cursor: 'pointer',
            }}
          >
            <option value="ALL">All Laboratories</option>
            {labs.map(l => (
              <option key={l.id} value={l.id}>{l.name}</option>
            ))}
          </select>

          {/* Filter: Equipment Type */}
          <select
            value={selectedType}
            onChange={e => setSelectedType(e.target.value)}
            style={{
              background: 'var(--bg-elevated)', border: '1px solid var(--border-muted)',
              borderRadius: 4, padding: '5px 8px', color: 'var(--text-secondary)',
              fontSize: 11, outline: 'none', cursor: 'pointer',
            }}
          >
            <option value="ALL">All Equipment Types</option>
            {equipmentTypes.map(t => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>

          {/* Filter: Status */}
          <select
            value={selectedStatus}
            onChange={e => setSelectedStatus(e.target.value)}
            style={{
              background: 'var(--bg-elevated)', border: '1px solid var(--border-muted)',
              borderRadius: 4, padding: '5px 8px', color: 'var(--text-secondary)',
              fontSize: 11, outline: 'none', cursor: 'pointer',
            }}
          >
            <option value="ALL">All Operational Statuses</option>
            <option value="healthy">Healthy Only</option>
            <option value="warning">Warning Only</option>
            <option value="critical">Critical / Fault Only</option>
            <option value="maintenance_due">Maintenance Due / Overdue</option>
          </select>

          {/* Filter: Risk Level */}
          <select
            value={selectedRisk}
            onChange={e => setSelectedRisk(e.target.value)}
            style={{
              background: 'var(--bg-elevated)', border: '1px solid var(--border-muted)',
              borderRadius: 4, padding: '5px 8px', color: 'var(--text-secondary)',
              fontSize: 11, outline: 'none', cursor: 'pointer',
            }}
          >
            <option value="ALL">All Risk Levels</option>
            <option value="high">High Risk</option>
            <option value="medium">Medium Risk</option>
            <option value="low">Low Risk</option>
          </select>

          {/* Sort By Dropdown */}
          <div className="flex items-center gap-4" style={{ marginLeft: 'auto' }}>
            <span style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
              Sort:
            </span>
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value)}
              style={{
                background: 'var(--bg-elevated)', border: '1px solid var(--border-muted)',
                borderRadius: 4, padding: '5px 8px', color: 'var(--text-secondary)',
                fontSize: 11, outline: 'none', cursor: 'pointer',
              }}
            >
              <option value="id-asc">ID (A → Z)</option>
              <option value="id-desc">ID (Z → A)</option>
              <option value="risk-high">Risk (Highest First)</option>
              <option value="risk-low">Risk (Lowest First)</option>
              <option value="status-critical">Status (Critical First)</option>
              <option value="status-healthy">Status (Healthy First)</option>
              <option value="next-pm">Next PM (Earliest First)</option>
              <option value="last-pm">Last PM (Most Recent)</option>
            </select>

            {/* Reset Filters Action */}
            {hasActiveFilters && (
              <button
                onClick={resetFilters}
                className="flex items-center gap-4"
                style={{
                  background: 'rgba(232,69,60,0.1)', border: '1px solid rgba(232,69,60,0.25)',
                  borderRadius: 4, padding: '5px 9px', color: 'var(--red-base)',
                  fontSize: 10.5, fontWeight: 600, cursor: 'pointer',
                }}
                title="Reset all active filters"
              >
                <RotateCcw size={11} /> Reset
              </button>
            )}
          </div>
        </div>

        {/* Counter strip */}
        <div className="flex items-center justify-between" style={{ marginBottom: 10, padding: '0 2px' }}>
          <span style={{ fontSize: 10.5, color: 'var(--text-muted)' }}>
            Showing <strong>{filteredEquipment.length}</strong> of {equipment.length} equipment units
            {hasActiveFilters && ' (filtered)'}
          </span>
          <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
            Click any row to inspect specifications and diagnostic history
          </span>
        </div>

        {/* Table Container (Scrollable) */}
        <div style={{ overflowX: 'auto', borderRadius: 4, border: '1px solid var(--border-subtle)' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: 90 }}>Equipment ID</th>
                <th>Type</th>
                <th>Laboratory</th>
                <th>Status</th>
                <th>Risk Level</th>
                <th style={{ minWidth: 200 }}>Active Fault / Diagnostics</th>
                <th>CPU %</th>
                <th>RAM %</th>
                <th>Temp °C</th>
                <th>Uptime</th>
                <th>Last PM</th>
                <th>Next PM</th>
              </tr>
            </thead>
            <tbody>
              {filteredEquipment.map(eq => {
                const isOverdue = eq.nextMaintenance && new Date(eq.nextMaintenance) < new Date()
                return (
                  <tr
                    key={eq.id}
                    onClick={() => openDrawer(eq)}
                    style={{ cursor: 'pointer' }}
                    title={`Click to open ${eq.id} diagnostics drawer`}
                  >
                    {/* ID */}
                    <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--text-primary)' }}>
                      <div className="flex items-center gap-4">
                        <span>{eq.id}</span>
                        <ExternalLink size={10} color="var(--text-muted)" style={{ opacity: 0.6 }} />
                      </div>
                    </td>

                    {/* Type */}
                    <td style={{ color: 'var(--text-secondary)' }}>{eq.type}</td>

                    {/* Lab */}
                    <td>
                      <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{eq.labName}</span>
                    </td>

                    {/* Status */}
                    <td>{getStatusBadge(eq.status, eq.nextMaintenance)}</td>

                    {/* Risk */}
                    <td>{getRiskBadge(eq.riskLevel)}</td>

                    {/* Fault / Issue info */}
                    <td style={{ maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {eq.fault ? (
                        <span style={{ color: eq.status === 'critical' ? 'var(--red-base)' : 'var(--amber-base)', fontSize: 11 }}>
                          <strong>{eq.faultType ? `${eq.faultType}: ` : ''}</strong>
                          {eq.fault}
                        </span>
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>Nominal · No faults</span>
                      )}
                    </td>

                    {/* Telemetry Metrics */}
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: 11 }}>
                      {eq.cpu != null ? `${eq.cpu}%` : '—'}
                    </td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: 11 }}>
                      {eq.ram != null ? `${eq.ram}%` : '—'}
                    </td>
                    <td
                      style={{
                        fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 600,
                        color: eq.temp > 80 ? 'var(--red-base)' : eq.temp > 65 ? 'var(--amber-base)' : 'var(--text-secondary)',
                      }}
                    >
                      {eq.temp != null ? `${eq.temp} °C` : '—'}
                    </td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: 11 }}>
                      {eq.uptime || '—'}
                    </td>

                    {/* Maintenance */}
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)' }}>
                      {eq.lastMaintenance || '—'}
                    </td>
                    <td
                      style={{
                        fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 600,
                        color: isOverdue ? 'var(--red-base)' : eq.status === 'warning' ? 'var(--amber-base)' : 'var(--text-secondary)',
                      }}
                    >
                      {eq.nextMaintenance || '—'}
                      {isOverdue && <span style={{ fontSize: 9, color: 'var(--red-base)', marginLeft: 4 }}>[OVERDUE]</span>}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>

          {/* Empty State when no results match */}
          {filteredEquipment.length === 0 && (
            <div
              style={{
                padding: '40px 20px', textAlign: 'center',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
              }}
            >
              <div
                style={{
                  width: 42, height: 42, borderRadius: '50%',
                  background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                <Search size={18} color="var(--text-muted)" />
              </div>
              <h3 style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                No equipment matching search & filters
              </h3>
              <p style={{ fontSize: 11, color: 'var(--text-muted)', maxWidth: 360, lineHeight: 1.5 }}>
                No devices match the criteria "{searchQuery || `${selectedLab} / ${selectedStatus} / ${selectedRisk}`}". Try adjusting your filters or search terms.
              </p>
              <button
                onClick={resetFilters}
                className="flex items-center gap-6"
                style={{
                  background: 'var(--bg-elevated)', border: '1px solid var(--border-accent)',
                  borderRadius: 4, padding: '6px 14px', fontSize: 11, color: 'var(--blue-base)',
                  fontWeight: 600, cursor: 'pointer', marginTop: 4,
                }}
              >
                <RotateCcw size={12} /> Reset all filters
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
