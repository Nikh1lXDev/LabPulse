import { useState, useMemo } from 'react'
import {
  X, Edit3, Trash2, AlertTriangle, CheckCircle2,
  Clock, Cpu, HardDrive, Thermometer, ShieldAlert,
  Calendar, MapPin, Wrench, AlertOctagon, Plus,
  ChevronRight, ExternalLink
} from 'lucide-react'
import { useEquipment } from '../context/EquipmentContext'

export default function EquipmentDrawer() {
  const {
    selectedEquip,
    isDrawerOpen,
    closeDrawer,
    openEditModal,
    deleteEquipment,
    labs,
    getFaultsForEquipment,
    openFaultDrawer,
    openReportFaultModal,
    openScheduleMaintenanceModal,
  } = useEquipment()

  const [confirmDelete, setConfirmDelete] = useState(false)

  const relatedFaults = useMemo(() => {
    if (!selectedEquip) return []
    return getFaultsForEquipment(selectedEquip.id)
  }, [selectedEquip, getFaultsForEquipment])

  if (!isDrawerOpen || !selectedEquip) return null

  const labInfo = labs.find(l => l.id === selectedEquip.labId)

  const statusColor = {
    healthy:  'var(--green-base)',
    warning:  'var(--amber-base)',
    critical: 'var(--red-base)',
  }[selectedEquip.status] ?? 'var(--text-secondary)'

  const riskBadgeClass = {
    low:    'badge-green',
    medium: 'badge-amber',
    high:   'badge-red',
  }[selectedEquip.riskLevel] ?? 'badge-muted'

  const handleDelete = async () => {
    try {
      await deleteEquipment(selectedEquip.id)
      setConfirmDelete(false)
    } catch (err) {
      console.warn('Delete equipment failed:', err.message)
      setConfirmDelete(false)
    }
  }

  // Check if next maintenance is overdue
  const isOverdue = selectedEquip.nextMaintenance && new Date(selectedEquip.nextMaintenance) < new Date()

  return (
    <>
      {/* Backdrop overlay */}
      <div
        onClick={closeDrawer}
        style={{
          position: 'fixed', inset: 0,
          background: 'rgba(5, 7, 10, 0.65)',
          backdropFilter: 'blur(3px)',
          zIndex: 40,
        }}
      />

      {/* Drawer panel */}
      <div
        style={{
          position: 'fixed', top: 0, right: 0, bottom: 0,
          width: 'min(460px, 92vw)',
          background: 'var(--bg-surface)',
          borderLeft: '1px solid var(--border-muted)',
          boxShadow: '-10px 0 35px rgba(0, 0, 0, 0.7)',
          zIndex: 50,
          display: 'flex', flexDirection: 'column',
          animation: 'slideInRight 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between"
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid var(--border-subtle)',
            background: 'var(--bg-elevated)',
          }}
        >
          <div>
            <div className="flex items-center gap-8">
              <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 16, color: 'var(--text-primary)' }}>
                {selectedEquip.id}
              </span>
              <span
                className="badge"
                style={{
                  background: `${statusColor}18`,
                  color: statusColor,
                  border: `1px solid ${statusColor}40`,
                }}
              >
                <span className="dot" style={{ background: statusColor, boxShadow: `0 0 5px ${statusColor}` }} />
                {selectedEquip.status.toUpperCase()}
              </span>
              <span className={`badge ${riskBadgeClass}`}>
                {selectedEquip.riskLevel?.toUpperCase() || 'LOW'} RISK
              </span>
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3 }}>
              {selectedEquip.type} · {selectedEquip.labName}
            </div>
          </div>

          <button
            onClick={closeDrawer}
            style={{
              background: 'none', border: '1px solid var(--border-subtle)',
              borderRadius: 4, padding: 6, color: 'var(--text-muted)',
              cursor: 'pointer', display: 'flex', alignItems: 'center',
            }}
            title="Close Drawer (Esc)"
          >
            <X size={15} />
          </button>
        </div>

        {/* Content body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Active status / Alert banner */}
          {selectedEquip.fault ? (
            <div
              style={{
                padding: '12px 14px',
                background: selectedEquip.status === 'critical' ? 'var(--red-bg)' : 'var(--amber-bg)',
                border: `1px solid ${selectedEquip.status === 'critical' ? 'rgba(232,69,60,0.3)' : 'rgba(245,166,35,0.3)'}`,
                borderRadius: 5,
              }}
            >
              <div className="flex items-center justify-between" style={{ marginBottom: 4 }}>
                <div className="flex items-center gap-6">
                  <AlertTriangle size={14} color={statusColor} />
                  <span style={{ fontSize: 11, fontWeight: 700, color: statusColor, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                    {selectedEquip.faultType || 'Active Issue'}
                  </span>
                </div>

                <button
                  onClick={() => openReportFaultModal(selectedEquip.id)}
                  style={{
                    background: 'none', border: 'none',
                    color: statusColor, fontSize: 10.5, fontWeight: 600,
                    cursor: 'pointer', textDecoration: 'underline',
                  }}
                >
                  + Add Fault
                </button>
              </div>
              <p style={{ fontSize: 11.5, color: 'var(--text-primary)', lineHeight: 1.5 }}>
                {selectedEquip.fault}
              </p>
            </div>
          ) : (
            <div
              className="flex items-center justify-between"
              style={{
                padding: '10px 12px',
                background: 'rgba(61,220,132,0.06)',
                border: '1px solid rgba(61,220,132,0.2)',
                borderRadius: 5,
                fontSize: 11, color: 'var(--green-base)',
              }}
            >
              <div className="flex items-center gap-8">
                <CheckCircle2 size={15} />
                <span>Nominal operation. No active faults recorded.</span>
              </div>

              <button
                onClick={() => openReportFaultModal(selectedEquip.id)}
                className="flex items-center gap-4"
                style={{
                  background: 'rgba(232,69,60,0.1)', border: '1px solid rgba(232,69,60,0.25)',
                  borderRadius: 3, padding: '3px 8px', fontSize: 10,
                  color: 'var(--red-base)', cursor: 'pointer', fontWeight: 600,
                }}
              >
                <AlertTriangle size={10} /> Report Fault
              </button>
            </div>
          )}

          {/* Related Incident Logs Section */}
          <div className="panel" style={{ padding: '12px 14px' }}>
            <div className="flex items-center justify-between" style={{ marginBottom: 8 }}>
              <div className="section-label" style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <AlertTriangle size={11} /> Incident History ({relatedFaults.length})
              </div>
              <button
                onClick={() => openReportFaultModal(selectedEquip.id)}
                className="flex items-center gap-4"
                style={{
                  background: 'none', border: 'none',
                  color: 'var(--blue-base)', fontSize: 10.5, fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                <Plus size={11} /> Log Fault
              </button>
            </div>

            {relatedFaults.length === 0 ? (
              <div style={{ fontSize: 11, color: 'var(--text-muted)', fontStyle: 'italic', padding: '6px 0' }}>
                No active or historical incidents recorded for this device.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {relatedFaults.map(f => {
                  const isResolved = f.status === 'Resolved'
                  const color = isResolved ? 'var(--green-base)' : (f.severity === 'Critical' ? 'var(--red-base)' : 'var(--amber-base)')
                  return (
                    <div
                      key={f.id}
                      onClick={() => openFaultDrawer(f)}
                      style={{
                        padding: '7px 9px',
                        background: 'var(--bg-elevated)',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: 4, cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      }}
                      title="Click to inspect this incident"
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div className="flex items-center gap-6">
                          <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 11, color: 'var(--text-primary)' }}>
                            {f.id}
                          </span>
                          <span
                            className="badge"
                            style={{
                              fontSize: 8.5, padding: '1px 5px',
                              background: isResolved ? 'var(--green-bg)' : 'var(--red-bg)',
                              color,
                              border: `1px solid ${color}40`,
                            }}
                          >
                            {f.status.toUpperCase()}
                          </span>
                          <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                            {f.category}
                          </span>
                        </div>
                        <div style={{ fontSize: 10.5, color: 'var(--text-secondary)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {f.description}
                        </div>
                      </div>

                      <ChevronRight size={13} color="var(--text-muted)" />
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Laboratory info card */}
          <div className="panel" style={{ padding: '12px 14px' }}>
            <div className="section-label" style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 5 }}>
              <MapPin size={11} /> Facility Location
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <div>
                <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>Assigned Lab</span>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>{selectedEquip.labName}</div>
              </div>
              <div>
                <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>Lab Code</span>
                <div style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>{selectedEquip.labId}</div>
              </div>
              {labInfo && (
                <>
                  <div>
                    <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>Location</span>
                    <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{labInfo.location}</div>
                  </div>
                  <div>
                    <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>Capacity</span>
                    <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{labInfo.capacity} Workstations</div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Diagnostic telemetry grid */}
          <div className="panel" style={{ padding: '12px 14px' }}>
            <div className="section-label" style={{ marginBottom: 10, display: 'flex', alignItems: 'center', gap: 5 }}>
              <Cpu size={11} /> Hardware Telemetry & Health
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
              <div style={{ background: 'var(--bg-elevated)', padding: '8px 10px', borderRadius: 4, border: '1px solid var(--border-subtle)' }}>
                <div className="flex items-center justify-between">
                  <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>CPU Utilization</span>
                  <Cpu size={11} color="var(--text-muted)" />
                </div>
                <div style={{ fontSize: 16, fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--text-primary)', marginTop: 2 }}>
                  {selectedEquip.cpu != null ? `${selectedEquip.cpu}%` : 'Not recorded'}
                </div>
              </div>

              <div style={{ background: 'var(--bg-elevated)', padding: '8px 10px', borderRadius: 4, border: '1px solid var(--border-subtle)' }}>
                <div className="flex items-center justify-between">
                  <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>RAM Allocation</span>
                  <HardDrive size={11} color="var(--text-muted)" />
                </div>
                <div style={{ fontSize: 16, fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--text-primary)', marginTop: 2 }}>
                  {selectedEquip.ram != null ? `${selectedEquip.ram}%` : 'Not recorded'}
                </div>
              </div>

              <div style={{ background: 'var(--bg-elevated)', padding: '8px 10px', borderRadius: 4, border: '1px solid var(--border-subtle)' }}>
                <div className="flex items-center justify-between">
                  <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>Thermal Core</span>
                  <Thermometer size={11} color="var(--text-muted)" />
                </div>
                <div
                  style={{
                    fontSize: 16, fontFamily: 'var(--font-mono)', fontWeight: 700, marginTop: 2,
                    color: selectedEquip.temp > 80 ? 'var(--red-base)' : selectedEquip.temp > 65 ? 'var(--amber-base)' : 'var(--text-primary)',
                  }}
                >
                  {selectedEquip.temp != null ? `${selectedEquip.temp} °C` : 'Not recorded'}
                </div>
              </div>

              <div style={{ background: 'var(--bg-elevated)', padding: '8px 10px', borderRadius: 4, border: '1px solid var(--border-subtle)' }}>
                <div className="flex items-center justify-between">
                  <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>System Uptime</span>
                  <Clock size={11} color="var(--text-muted)" />
                </div>
                <div style={{ fontSize: 16, fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--text-primary)', marginTop: 2 }}>
                  {selectedEquip.uptime || 'Not recorded'}
                </div>
              </div>
            </div>
          </div>

          {/* Maintenance lifecycle */}
          <div className="panel" style={{ padding: '12px 14px' }}>
            <div className="flex items-center justify-between" style={{ marginBottom: 8 }}>
              <div className="section-label" style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <Calendar size={11} /> Maintenance Schedule
              </div>
              <button
                onClick={() => openScheduleMaintenanceModal(selectedEquip.id)}
                className="flex items-center gap-4"
                style={{
                  background: 'none', border: 'none',
                  color: 'var(--blue-base)', fontSize: 10.5, fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                <Calendar size={11} /> Plan PM
              </button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <div>
                <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>Last Preventive Maint.</span>
                <div style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>
                  {selectedEquip.lastMaintenance || 'Not recorded'}
                </div>
              </div>
              <div>
                <div className="flex items-center gap-4">
                  <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>Next Scheduled PM</span>
                  {isOverdue && (
                    <span style={{ fontSize: 8, color: 'var(--red-base)', fontWeight: 700, letterSpacing: '0.05em' }}>OVERDUE</span>
                  )}
                </div>
                <div
                  style={{
                    fontSize: 12, fontFamily: 'var(--font-mono)', fontWeight: 600,
                    color: isOverdue ? 'var(--red-base)' : 'var(--text-primary)',
                  }}
                >
                  {selectedEquip.nextMaintenance || 'Not recorded'}
                </div>
              </div>
            </div>
          </div>

          {/* Technical operator notes */}
          <div className="panel" style={{ padding: '12px 14px' }}>
            <div className="section-label" style={{ marginBottom: 6 }}>Operator Notes & Diagnostics</div>
            <p style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.5, fontStyle: selectedEquip.notes ? 'normal' : 'italic' }}>
              {selectedEquip.notes || 'Not recorded'}
            </p>
          </div>

          {/* Deletion confirmation dialog if triggered */}
          {confirmDelete && (
            <div
              style={{
                padding: '12px 14px',
                background: 'rgba(232,69,60,0.12)',
                border: '1px solid rgba(232,69,60,0.4)',
                borderRadius: 5,
              }}
            >
              <div className="flex items-center gap-6" style={{ marginBottom: 6 }}>
                <AlertOctagon size={15} color="var(--red-base)" />
                <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--red-base)' }}>
                  Confirm Equipment Removal
                </span>
              </div>
              <p style={{ fontSize: 11, color: 'var(--text-primary)', lineHeight: 1.4, marginBottom: 10 }}>
                Are you sure you want to remove <strong>{selectedEquip.id}</strong> from the laboratory registry? This action will remove active telemetry records.
              </p>
              <div className="flex items-center gap-8 justify-end">
                <button
                  onClick={() => setConfirmDelete(false)}
                  style={{
                    background: 'var(--bg-elevated)', border: '1px solid var(--border-muted)',
                    borderRadius: 3, padding: '5px 10px', fontSize: 10.5, color: 'var(--text-secondary)',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  style={{
                    background: 'var(--red-base)', border: 'none',
                    borderRadius: 3, padding: '5px 12px', fontSize: 10.5, color: '#fff',
                    fontWeight: 600, cursor: 'pointer',
                  }}
                >
                  Confirm Delete
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div
          className="flex items-center justify-between"
          style={{
            padding: '12px 20px',
            borderTop: '1px solid var(--border-subtle)',
            background: 'var(--bg-elevated)',
          }}
        >
          <button
            onClick={() => setConfirmDelete(true)}
            disabled={confirmDelete}
            className="flex items-center gap-6"
            style={{
              background: 'none', border: '1px solid rgba(232,69,60,0.3)',
              borderRadius: 4, padding: '6px 12px', cursor: 'pointer',
              color: 'var(--red-base)', fontSize: 11, fontWeight: 600,
              opacity: confirmDelete ? 0.5 : 1,
            }}
          >
            <Trash2 size={13} /> Remove
          </button>

          <div className="flex items-center gap-8">
            <button
              onClick={() => openReportFaultModal(selectedEquip.id)}
              className="flex items-center gap-6"
              style={{
                background: 'rgba(232,69,60,0.12)', border: '1px solid rgba(232,69,60,0.3)',
                borderRadius: 4, padding: '6px 12px', cursor: 'pointer',
                color: 'var(--red-base)', fontSize: 11, fontWeight: 600,
              }}
            >
              <AlertTriangle size={13} /> Report Fault
            </button>

            <button
              onClick={() => openEditModal(selectedEquip)}
              className="flex items-center gap-6"
              style={{
                background: 'rgba(74,158,255,0.12)', border: '1px solid rgba(74,158,255,0.3)',
                borderRadius: 4, padding: '6px 14px', cursor: 'pointer',
                color: 'var(--blue-base)', fontSize: 11, fontWeight: 600,
              }}
            >
              <Edit3 size={13} /> Edit
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
