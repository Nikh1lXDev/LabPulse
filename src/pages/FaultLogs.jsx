import { useState, useMemo } from 'react'
import {
  AlertTriangle, Wrench, CheckCircle2, Clock, Plus,
  Search, Filter, RotateCcw, Calendar, ArrowUpDown,
  ExternalLink, ShieldAlert, AlertOctagon, Check,
  ChevronRight, Layers, FileText
} from 'lucide-react'
import { useEquipment } from '../context/EquipmentContext'
import { FAULT_CATEGORIES, SEVERITIES, FAULT_STATUSES } from '../data/mockFaults'

export default function FaultLogs() {
  const {
    faults,
    faultStats,
    openFaultDrawer,
    openReportFaultModal,
    maintenanceTasks,
    maintenanceStats,
    openScheduleMaintenanceModal,
    openCompleteMaintenanceModal,
    openRescheduleMaintenanceModal,
    labs,
  } = useEquipment()

  // Active top tab: 'faults' | 'maintenance'
  const [activeTab, setActiveTab] = useState('faults')

  // ─── Faults Tab Filters & State ──────────────────────────────────────────
  const [faultSearch, setFaultSearch] = useState('')
  const [faultLab, setFaultLab] = useState('ALL')
  const [faultSeverity, setFaultSeverity] = useState('ALL')
  const [faultStatus, setFaultStatus] = useState('ALL')
  const [faultCategory, setFaultCategory] = useState('ALL')
  const [faultSort, setFaultSort] = useState('date-desc')

  // ─── Maintenance Tab Filters & State ─────────────────────────────────────
  const [maintSearch, setMaintSearch] = useState('')
  const [maintLab, setMaintLab] = useState('ALL')
  const [maintStatus, setMaintStatus] = useState('ALL')

  // ─── Filtered Faults ─────────────────────────────────────────────────────
  const filteredFaults = useMemo(() => {
    return faults.filter(f => {
      if (faultSearch.trim()) {
        const q = faultSearch.toLowerCase().trim()
        const matchId = f.id.toLowerCase().includes(q)
        const matchEquip = f.equipId.toLowerCase().includes(q)
        const matchDesc = f.description.toLowerCase().includes(q)
        const matchTech = f.technician?.toLowerCase().includes(q)
        const matchRes = f.resolution?.toLowerCase().includes(q)
        if (!matchId && !matchEquip && !matchDesc && !matchTech && !matchRes) return false
      }

      if (faultLab !== 'ALL' && f.labId !== faultLab) return false
      if (faultSeverity !== 'ALL' && f.severity !== faultSeverity) return false
      if (faultStatus !== 'ALL' && f.status !== faultStatus) return false
      if (faultCategory !== 'ALL' && f.category !== faultCategory) return false

      return true
    }).sort((a, b) => {
      if (faultSort === 'date-desc') {
        return new Date(b.reportedDate || 0) - new Date(a.reportedDate || 0)
      }
      if (faultSort === 'date-asc') {
        return new Date(a.reportedDate || 0) - new Date(b.reportedDate || 0)
      }
      if (faultSort === 'sev-desc') {
        const order = { Critical: 0, High: 1, Medium: 2, Low: 3 }
        return (order[a.severity] ?? 9) - (order[b.severity] ?? 9)
      }
      if (faultSort === 'sev-asc') {
        const order = { Low: 0, Medium: 1, High: 2, Critical: 3 }
        return (order[a.severity] ?? 9) - (order[b.severity] ?? 9)
      }
      return 0
    })
  }, [faults, faultSearch, faultLab, faultSeverity, faultStatus, faultCategory, faultSort])

  // ─── Filtered Maintenance ────────────────────────────────────────────────
  const filteredMaintenance = useMemo(() => {
    return maintenanceTasks.filter(t => {
      if (maintSearch.trim()) {
        const q = maintSearch.toLowerCase().trim()
        const matchId = t.id.toLowerCase().includes(q)
        const matchEquip = t.equipId.toLowerCase().includes(q)
        const matchType = t.taskType?.toLowerCase().includes(q)
        const matchNotes = t.notes?.toLowerCase().includes(q)
        const matchAssigned = t.assignedTo?.toLowerCase().includes(q)
        if (!matchId && !matchEquip && !matchType && !matchNotes && !matchAssigned) return false
      }

      if (maintLab !== 'ALL' && t.labId !== maintLab) return false
      if (maintStatus !== 'ALL' && t.status !== maintStatus) return false

      return true
    }).sort((a, b) => {
      // Prioritize Overdue, then Due, then Scheduled, then Completed
      const order = { Overdue: 0, Due: 1, Scheduled: 2, Completed: 3 }
      if (order[a.status] !== order[b.status]) {
        return (order[a.status] ?? 9) - (order[b.status] ?? 9)
      }
      return new Date(a.scheduledDate || 0) - new Date(b.scheduledDate || 0)
    })
  }, [maintenanceTasks, maintSearch, maintLab, maintStatus])

  // Reset filters
  const resetFaultFilters = () => {
    setFaultSearch('')
    setFaultLab('ALL')
    setFaultSeverity('ALL')
    setFaultStatus('ALL')
    setFaultCategory('ALL')
    setFaultSort('date-desc')
  }

  const resetMaintFilters = () => {
    setMaintSearch('')
    setMaintLab('ALL')
    setMaintStatus('ALL')
  }

  const isFaultFilterActive = faultSearch || faultLab !== 'ALL' || faultSeverity !== 'ALL' || faultStatus !== 'ALL' || faultCategory !== 'ALL' || faultSort !== 'date-desc'
  const isMaintFilterActive = maintSearch || maintLab !== 'ALL' || maintStatus !== 'ALL'

  // Severity badges
  const renderSeverityBadge = (severity) => {
    const cls = {
      Critical: 'badge-red',
      High: 'badge-red',
      Medium: 'badge-amber',
      Low: 'badge-green',
    }[severity] || 'badge-muted'

    return (
      <span className={`badge ${cls}`}>
        {severity.toUpperCase()}
      </span>
    )
  }

  // Status badges
  const renderStatusBadge = (status) => {
    const config = {
      'Open': {
        bg: 'var(--red-bg)', color: 'var(--red-base)',
        border: 'rgba(232,69,60,0.3)', dot: 'dot-red',
      },
      'In Progress': {
        bg: 'var(--amber-bg)', color: 'var(--amber-base)',
        border: 'rgba(245,166,35,0.3)', dot: 'dot-amber',
      },
      'Resolved': {
        bg: 'var(--green-bg)', color: 'var(--green-base)',
        border: 'rgba(61,220,132,0.3)', dot: 'dot-green',
      },
    }[status] || {
      bg: 'rgba(255,255,255,0.05)', color: 'var(--text-secondary)',
      border: 'var(--border-muted)', dot: 'dot-muted',
    }

    return (
      <span
        className="badge"
        style={{
          background: config.bg,
          color: config.color,
          border: `1px solid ${config.border}`,
        }}
      >
        <span className={`dot ${config.dot}`} />
        {status.toUpperCase()}
      </span>
    )
  }

  // Maintenance status badges
  const renderMaintStatusBadge = (status) => {
    const config = {
      'Overdue': {
        bg: 'var(--red-bg)', color: 'var(--red-base)', border: 'rgba(232,69,60,0.3)',
      },
      'Due': {
        bg: 'var(--amber-bg)', color: 'var(--amber-base)', border: 'rgba(245,166,35,0.3)',
      },
      'Scheduled': {
        bg: 'var(--blue-bg)', color: 'var(--blue-base)', border: 'rgba(74,158,255,0.3)',
      },
      'Completed': {
        bg: 'var(--green-bg)', color: 'var(--green-base)', border: 'rgba(61,220,132,0.3)',
      },
    }[status] || {
      bg: 'rgba(255,255,255,0.04)', color: 'var(--text-secondary)', border: 'var(--border-subtle)',
    }

    return (
      <span
        className="badge"
        style={{
          background: config.bg,
          color: config.color,
          border: `1px solid ${config.border}`,
        }}
      >
        {status.toUpperCase()}
      </span>
    )
  }

  return (
    <div style={{ padding: '14px 16px 24px', minHeight: '100%' }}>
      {/* ─── Page Header ─────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between" style={{ marginBottom: 14 }}>
        <div>
          <h1 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.3px', lineHeight: 1 }}>
            Incident Management & Maintenance
          </h1>
          <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
            Active laboratory faults, diagnostic tracking, resolution history & preventive maintenance schedules
          </p>
        </div>

        {/* Global Action Buttons */}
        <div className="flex items-center gap-8">
          <button
            onClick={() => openScheduleMaintenanceModal()}
            className="flex items-center gap-6"
            style={{
              background: 'rgba(74,158,255,0.1)', border: '1px solid rgba(74,158,255,0.3)',
              borderRadius: 4, padding: '7px 12px', cursor: 'pointer',
              color: 'var(--blue-base)', fontSize: 11.5, fontWeight: 600,
            }}
          >
            <Calendar size={13} />
            Schedule Maintenance
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
            Report New Fault
          </button>
        </div>
      </div>

      {/* ─── Mode Tabs ───────────────────────────────────────────────────── */}
      <div
        className="flex items-center gap-4"
        style={{
          borderBottom: '1px solid var(--border-subtle)',
          marginBottom: 14,
        }}
      >
        <button
          onClick={() => setActiveTab('faults')}
          className="flex items-center gap-8"
          style={{
            padding: '8px 14px',
            background: 'transparent',
            border: 'none',
            borderBottom: activeTab === 'faults' ? '2px solid var(--blue-base)' : '2px solid transparent',
            color: activeTab === 'faults' ? 'var(--text-primary)' : 'var(--text-muted)',
            fontSize: 12.5, fontWeight: activeTab === 'faults' ? 700 : 500,
            cursor: 'pointer',
            transition: 'all 0.15s',
          }}
        >
          <AlertTriangle size={14} color={activeTab === 'faults' ? 'var(--blue-base)' : 'var(--text-muted)'} />
          <span>Incident Logs</span>
          <span
            className="badge"
            style={{
              fontSize: 9,
              background: faultStats.active > 0 ? 'var(--red-bg)' : 'rgba(255,255,255,0.06)',
              color: faultStats.active > 0 ? 'var(--red-base)' : 'var(--text-muted)',
              border: `1px solid ${faultStats.active > 0 ? 'rgba(232,69,60,0.3)' : 'var(--border-subtle)'}`,
            }}
          >
            {faultStats.active} ACTIVE
          </span>
        </button>

        <button
          onClick={() => setActiveTab('maintenance')}
          className="flex items-center gap-8"
          style={{
            padding: '8px 14px',
            background: 'transparent',
            border: 'none',
            borderBottom: activeTab === 'maintenance' ? '2px solid var(--blue-base)' : '2px solid transparent',
            color: activeTab === 'maintenance' ? 'var(--text-primary)' : 'var(--text-muted)',
            fontSize: 12.5, fontWeight: activeTab === 'maintenance' ? 700 : 500,
            cursor: 'pointer',
            transition: 'all 0.15s',
          }}
        >
          <Wrench size={14} color={activeTab === 'maintenance' ? 'var(--blue-base)' : 'var(--text-muted)'} />
          <span>Maintenance Schedule</span>
          {maintenanceStats.overdue > 0 && (
            <span
              className="badge"
              style={{
                fontSize: 9,
                background: 'var(--red-bg)',
                color: 'var(--red-base)',
                border: '1px solid rgba(232,69,60,0.3)',
              }}
            >
              {maintenanceStats.overdue} OVERDUE
            </span>
          )}
        </button>
      </div>

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* TAB 1: INCIDENT LOGS (FAULTS)                                       */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {activeTab === 'faults' && (
        <div>
          {/* Summary Stat Strip */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 14 }}>
            <div className="stat-card">
              <div className="flex items-center justify-between" style={{ marginBottom: 6 }}>
                <span style={{ color: 'var(--red-base)' }}><AlertTriangle size={15} /></span>
                <span className="stat-label">Open Faults</span>
              </div>
              <div className="stat-value" style={{ color: 'var(--red-base)' }}>{faultStats.open}</div>
              <div className="stat-sub">Awaiting technician assignment</div>
            </div>

            <div className="stat-card">
              <div className="flex items-center justify-between" style={{ marginBottom: 6 }}>
                <span style={{ color: 'var(--amber-base)' }}><Clock size={15} /></span>
                <span className="stat-label">In Progress</span>
              </div>
              <div className="stat-value" style={{ color: 'var(--amber-base)' }}>{faultStats.inProgress}</div>
              <div className="stat-sub">Active diagnosis & repair work</div>
            </div>

            <div className="stat-card">
              <div className="flex items-center justify-between" style={{ marginBottom: 6 }}>
                <span style={{ color: 'var(--green-base)' }}><CheckCircle2 size={15} /></span>
                <span className="stat-label">Resolved</span>
              </div>
              <div className="stat-value" style={{ color: 'var(--green-base)' }}>{faultStats.resolved}</div>
              <div className="stat-sub">Historical incident log preserved</div>
            </div>

            <div className="stat-card">
              <div className="flex items-center justify-between" style={{ marginBottom: 6 }}>
                <span style={{ color: '#fb923c' }}><ShieldAlert size={15} /></span>
                <span className="stat-label">Critical Incidents</span>
              </div>
              <div className="stat-value" style={{ color: '#fb923c' }}>{faultStats.critical}</div>
              <div className="stat-sub">Requiring immediate escalation</div>
            </div>
          </div>

          {/* Incident Filters Toolbar */}
          <div
            className="panel"
            style={{
              padding: '10px 12px',
              marginBottom: 12,
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              gap: 8,
            }}
          >
            {/* Search */}
            <div
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                background: 'var(--bg-elevated)', border: '1px solid var(--border-muted)',
                borderRadius: 4, padding: '5px 10px', minWidth: 220, flex: 1,
              }}
            >
              <Search size={13} color="var(--text-muted)" />
              <input
                type="text"
                placeholder="Search incident ID, equipment, description, tech..."
                value={faultSearch}
                onChange={(e) => setFaultSearch(e.target.value)}
                style={{
                  background: 'none', border: 'none', outline: 'none',
                  color: 'var(--text-primary)', fontSize: 11.5, width: '100%',
                }}
              />
            </div>

            {/* Laboratory Filter */}
            <select
              value={faultLab}
              onChange={(e) => setFaultLab(e.target.value)}
              style={{
                background: 'var(--bg-elevated)', border: '1px solid var(--border-muted)',
                borderRadius: 4, padding: '6px 10px', color: 'var(--text-secondary)',
                fontSize: 11, outline: 'none', cursor: 'pointer',
              }}
            >
              <option value="ALL">All Laboratories</option>
              {labs.map(l => (
                <option key={l.id} value={l.id}>{l.name} ({l.id})</option>
              ))}
            </select>

            {/* Severity Filter */}
            <select
              value={faultSeverity}
              onChange={(e) => setFaultSeverity(e.target.value)}
              style={{
                background: 'var(--bg-elevated)', border: '1px solid var(--border-muted)',
                borderRadius: 4, padding: '6px 10px', color: 'var(--text-secondary)',
                fontSize: 11, outline: 'none', cursor: 'pointer',
              }}
            >
              <option value="ALL">All Severities</option>
              {SEVERITIES.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>

            {/* Status Filter */}
            <select
              value={faultStatus}
              onChange={(e) => setFaultStatus(e.target.value)}
              style={{
                background: 'var(--bg-elevated)', border: '1px solid var(--border-muted)',
                borderRadius: 4, padding: '6px 10px', color: 'var(--text-secondary)',
                fontSize: 11, outline: 'none', cursor: 'pointer',
              }}
            >
              <option value="ALL">All Statuses</option>
              {FAULT_STATUSES.map(st => (
                <option key={st} value={st}>{st}</option>
              ))}
            </select>

            {/* Category Filter */}
            <select
              value={faultCategory}
              onChange={(e) => setFaultCategory(e.target.value)}
              style={{
                background: 'var(--bg-elevated)', border: '1px solid var(--border-muted)',
                borderRadius: 4, padding: '6px 10px', color: 'var(--text-secondary)',
                fontSize: 11, outline: 'none', cursor: 'pointer',
              }}
            >
              <option value="ALL">All Categories</option>
              {FAULT_CATEGORIES.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>

            {/* Sort Dropdown */}
            <select
              value={faultSort}
              onChange={(e) => setFaultSort(e.target.value)}
              style={{
                background: 'var(--bg-elevated)', border: '1px solid var(--border-muted)',
                borderRadius: 4, padding: '6px 10px', color: 'var(--text-secondary)',
                fontSize: 11, outline: 'none', cursor: 'pointer',
              }}
            >
              <option value="date-desc">Reported (Newest)</option>
              <option value="date-asc">Reported (Oldest)</option>
              <option value="sev-desc">Severity (Critical First)</option>
              <option value="sev-asc">Severity (Low First)</option>
            </select>

            {/* Reset Filters */}
            {isFaultFilterActive && (
              <button
                onClick={resetFaultFilters}
                className="flex items-center gap-4"
                style={{
                  background: 'none', border: '1px solid var(--border-muted)',
                  borderRadius: 4, padding: '5px 10px', color: 'var(--text-muted)',
                  fontSize: 11, cursor: 'pointer',
                }}
              >
                <RotateCcw size={11} /> Reset
              </button>
            )}
          </div>

          {/* Faults Table */}
          <div className="panel" style={{ overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Fault ID</th>
                    <th>Equipment</th>
                    <th>Laboratory</th>
                    <th>Category</th>
                    <th>Severity</th>
                    <th>Reported Date</th>
                    <th>Status</th>
                    <th>Resolution / Diagnosis</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredFaults.length === 0 ? (
                    <tr>
                      <td colSpan={9} style={{ textAlign: 'center', padding: '36px 16px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                          <AlertTriangle size={24} color="var(--text-muted)" />
                          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                            No fault incident records found
                          </div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                            Try adjusting your search criteria, severity filter, or reset all active filters.
                          </div>
                          {isFaultFilterActive && (
                            <button
                              onClick={resetFaultFilters}
                              style={{
                                marginTop: 6,
                                background: 'var(--bg-elevated)', border: '1px solid var(--border-muted)',
                                borderRadius: 4, padding: '5px 12px', fontSize: 11,
                                color: 'var(--text-secondary)', cursor: 'pointer',
                              }}
                            >
                              Reset all filters
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredFaults.map(fault => (
                      <tr
                        key={fault.id}
                        onClick={() => openFaultDrawer(fault)}
                        style={{ cursor: 'pointer' }}
                        title="Click to inspect incident and manage repair"
                      >
                        {/* Fault ID */}
                        <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--text-primary)' }}>
                          {fault.id}
                        </td>

                        {/* Equipment ID */}
                        <td>
                          <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--blue-base)' }}>
                            {fault.equipId}
                          </span>
                        </td>

                        {/* Lab */}
                        <td style={{ whiteSpace: 'nowrap', fontSize: 11.5 }}>
                          {fault.labName}
                        </td>

                        {/* Category */}
                        <td>
                          <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                            {fault.category}
                          </span>
                        </td>

                        {/* Severity */}
                        <td>
                          {renderSeverityBadge(fault.severity)}
                        </td>

                        {/* Reported Date */}
                        <td style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                          {fault.reportedDate}
                        </td>

                        {/* Status */}
                        <td>
                          {renderStatusBadge(fault.status)}
                        </td>

                        {/* Resolution / Diagnosis */}
                        <td style={{ maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {fault.status === 'Resolved' ? (
                            <span style={{ color: 'var(--green-base)', fontSize: 11 }}>
                              <CheckCircle2 size={11} style={{ display: 'inline', marginRight: 4 }} />
                              {fault.resolution ? fault.resolution : `Resolved (${fault.repairHours || 0}h)`}
                            </span>
                          ) : fault.status === 'In Progress' ? (
                            <span style={{ color: 'var(--amber-base)', fontSize: 11 }}>
                              <Wrench size={11} style={{ display: 'inline', marginRight: 4 }} />
                              {fault.technician ? `Tech: ${fault.technician}` : 'Diagnosis ongoing'}
                            </span>
                          ) : (
                            <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>
                              {fault.description}
                            </span>
                          )}
                        </td>

                        {/* Inspect action */}
                        <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              openFaultDrawer(fault)
                            }}
                            className="flex items-center gap-4"
                            style={{
                              marginLeft: 'auto',
                              background: 'rgba(255,255,255,0.04)',
                              border: '1px solid var(--border-subtle)',
                              borderRadius: 3, padding: '4px 8px',
                              fontSize: 10.5, color: 'var(--text-secondary)',
                              cursor: 'pointer',
                            }}
                          >
                            Inspect <ChevronRight size={11} />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Table Footer */}
            <div
              className="flex items-center justify-between"
              style={{
                padding: '8px 12px',
                borderTop: '1px solid var(--border-subtle)',
                background: 'var(--bg-elevated)',
                fontSize: 11, color: 'var(--text-muted)',
              }}
            >
              <span>Showing {filteredFaults.length} of {faults.length} incidents</span>
              <span>Click any row to open incident resolution drawer</span>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* TAB 2: MAINTENANCE SCHEDULE                                         */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {activeTab === 'maintenance' && (
        <div>
          {/* Maintenance Stat Strip */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 14 }}>
            <div className="stat-card">
              <div className="flex items-center justify-between" style={{ marginBottom: 6 }}>
                <span style={{ color: 'var(--blue-base)' }}><Calendar size={15} /></span>
                <span className="stat-label">Total Scheduled</span>
              </div>
              <div className="stat-value" style={{ color: 'var(--blue-base)' }}>{maintenanceStats.total}</div>
              <div className="stat-sub">Across all 3 laboratory facilities</div>
            </div>

            <div className="stat-card">
              <div className="flex items-center justify-between" style={{ marginBottom: 6 }}>
                <span style={{ color: 'var(--red-base)' }}><AlertOctagon size={15} /></span>
                <span className="stat-label">Overdue</span>
              </div>
              <div className="stat-value" style={{ color: 'var(--red-base)' }}>{maintenanceStats.overdue}</div>
              <div className="stat-sub">Past target servicing window</div>
            </div>

            <div className="stat-card">
              <div className="flex items-center justify-between" style={{ marginBottom: 6 }}>
                <span style={{ color: 'var(--amber-base)' }}><Clock size={15} /></span>
                <span className="stat-label">Due Soon</span>
              </div>
              <div className="stat-value" style={{ color: 'var(--amber-base)' }}>{maintenanceStats.due}</div>
              <div className="stat-sub">Planned within next 7 days</div>
            </div>

            <div className="stat-card">
              <div className="flex items-center justify-between" style={{ marginBottom: 6 }}>
                <span style={{ color: 'var(--green-base)' }}><CheckCircle2 size={15} /></span>
                <span className="stat-label">Completed</span>
              </div>
              <div className="stat-value" style={{ color: 'var(--green-base)' }}>{maintenanceStats.completed}</div>
              <div className="stat-sub">Preventive maintenance logged</div>
            </div>
          </div>

          {/* Maintenance Filters Toolbar */}
          <div
            className="panel"
            style={{
              padding: '10px 12px',
              marginBottom: 12,
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              gap: 8,
            }}
          >
            {/* Search */}
            <div
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                background: 'var(--bg-elevated)', border: '1px solid var(--border-muted)',
                borderRadius: 4, padding: '5px 10px', minWidth: 220, flex: 1,
              }}
            >
              <Search size={13} color="var(--text-muted)" />
              <input
                type="text"
                placeholder="Search equipment, task type, notes, technician..."
                value={maintSearch}
                onChange={(e) => setMaintSearch(e.target.value)}
                style={{
                  background: 'none', border: 'none', outline: 'none',
                  color: 'var(--text-primary)', fontSize: 11.5, width: '100%',
                }}
              />
            </div>

            {/* Laboratory Filter */}
            <select
              value={maintLab}
              onChange={(e) => setMaintLab(e.target.value)}
              style={{
                background: 'var(--bg-elevated)', border: '1px solid var(--border-muted)',
                borderRadius: 4, padding: '6px 10px', color: 'var(--text-secondary)',
                fontSize: 11, outline: 'none', cursor: 'pointer',
              }}
            >
              <option value="ALL">All Laboratories</option>
              {labs.map(l => (
                <option key={l.id} value={l.id}>{l.name} ({l.id})</option>
              ))}
            </select>

            {/* Status Filter */}
            <select
              value={maintStatus}
              onChange={(e) => setMaintStatus(e.target.value)}
              style={{
                background: 'var(--bg-elevated)', border: '1px solid var(--border-muted)',
                borderRadius: 4, padding: '6px 10px', color: 'var(--text-secondary)',
                fontSize: 11, outline: 'none', cursor: 'pointer',
              }}
            >
              <option value="ALL">All Statuses</option>
              <option value="Overdue">Overdue</option>
              <option value="Due">Due Soon</option>
              <option value="Scheduled">Scheduled</option>
              <option value="Completed">Completed</option>
            </select>

            {/* Reset */}
            {isMaintFilterActive && (
              <button
                onClick={resetMaintFilters}
                className="flex items-center gap-4"
                style={{
                  background: 'none', border: '1px solid var(--border-muted)',
                  borderRadius: 4, padding: '5px 10px', color: 'var(--text-muted)',
                  fontSize: 11, cursor: 'pointer',
                }}
              >
                <RotateCcw size={11} /> Reset
              </button>
            )}
          </div>

          {/* Maintenance Table */}
          <div className="panel" style={{ overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Task ID</th>
                    <th>Equipment</th>
                    <th>Laboratory</th>
                    <th>Maintenance Type</th>
                    <th>Planned Date</th>
                    <th>Last Serviced</th>
                    <th>Status</th>
                    <th>Assigned / Notes</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMaintenance.length === 0 ? (
                    <tr>
                      <td colSpan={9} style={{ textAlign: 'center', padding: '36px 16px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                          <Wrench size={24} color="var(--text-muted)" />
                          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                            No maintenance tasks found
                          </div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                            Try adjusting your filters or schedule a new preventive maintenance task.
                          </div>
                          {isMaintFilterActive && (
                            <button
                              onClick={resetMaintFilters}
                              style={{
                                marginTop: 6,
                                background: 'var(--bg-elevated)', border: '1px solid var(--border-muted)',
                                borderRadius: 4, padding: '5px 12px', fontSize: 11,
                                color: 'var(--text-secondary)', cursor: 'pointer',
                              }}
                            >
                              Reset filters
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredMaintenance.map(task => (
                      <tr key={task.id}>
                        {/* Task ID */}
                        <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--text-primary)' }}>
                          {task.id}
                        </td>

                        {/* Equipment ID */}
                        <td>
                          <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--blue-base)' }}>
                            {task.equipId}
                          </span>
                        </td>

                        {/* Lab */}
                        <td style={{ whiteSpace: 'nowrap', fontSize: 11.5 }}>
                          {task.labName}
                        </td>

                        {/* Task Type */}
                        <td style={{ fontSize: 11.5, color: 'var(--text-primary)', fontWeight: 500 }}>
                          {task.taskType}
                        </td>

                        {/* Planned Date */}
                        <td style={{ fontFamily: 'var(--font-mono)', fontSize: 11.5, fontWeight: 600 }}>
                          <span style={{ color: task.status === 'Overdue' ? 'var(--red-base)' : (task.status === 'Due' ? 'var(--amber-base)' : 'var(--text-primary)') }}>
                            {task.scheduledDate}
                          </span>
                        </td>

                        {/* Last Serviced */}
                        <td style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)' }}>
                          {task.lastMaintenance || 'Not recorded'}
                        </td>

                        {/* Status */}
                        <td>
                          {renderMaintStatusBadge(task.status)}
                        </td>

                        {/* Assigned / Notes */}
                        <td style={{ maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          <span style={{ color: 'var(--text-secondary)', fontSize: 11 }}>
                            {task.assignedTo ? `${task.assignedTo} · ` : ''}
                            <span style={{ color: 'var(--text-muted)' }}>{task.notes}</span>
                          </span>
                        </td>

                        {/* Actions */}
                        <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                          <div className="flex items-center justify-end gap-6">
                            {task.status !== 'Completed' ? (
                              <>
                                <button
                                  onClick={() => openRescheduleMaintenanceModal(task)}
                                  style={{
                                    background: 'none', border: '1px solid var(--border-muted)',
                                    borderRadius: 3, padding: '4px 8px', fontSize: 10,
                                    color: 'var(--text-secondary)', cursor: 'pointer',
                                  }}
                                >
                                  Reschedule
                                </button>

                                <button
                                  onClick={() => openCompleteMaintenanceModal(task)}
                                  className="flex items-center gap-4"
                                  style={{
                                    background: 'rgba(61,220,132,0.12)', border: '1px solid rgba(61,220,132,0.3)',
                                    borderRadius: 3, padding: '4px 9px', fontSize: 10.5,
                                    color: 'var(--green-base)', fontWeight: 600, cursor: 'pointer',
                                  }}
                                >
                                  <Check size={11} strokeWidth={3} /> Mark Done
                                </button>
                              </>
                            ) : (
                              <span style={{ fontSize: 10.5, color: 'var(--green-base)', fontFamily: 'var(--font-mono)' }}>
                                Done: {task.completedDate}
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Table Footer */}
            <div
              className="flex items-center justify-between"
              style={{
                padding: '8px 12px',
                borderTop: '1px solid var(--border-subtle)',
                background: 'var(--bg-elevated)',
                fontSize: 11, color: 'var(--text-muted)',
              }}
            >
              <span>Showing {filteredMaintenance.length} of {maintenanceTasks.length} maintenance schedules</span>
              <span>Completed tasks reset next maintenance to a 90-day cycle</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
