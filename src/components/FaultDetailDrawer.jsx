import { useState, useEffect } from 'react'
import {
  X, AlertTriangle, CheckCircle2, Clock, Wrench,
  User, Calendar, MapPin, ExternalLink, ShieldAlert,
  ArrowRight, FileText, Check, AlertOctagon
} from 'lucide-react'
import { useEquipment } from '../context/EquipmentContext'

export default function FaultDetailDrawer() {
  const {
    selectedFault,
    isFaultDrawerOpen,
    closeFaultDrawer,
    openDrawer,
    startRepair,
    updateFault,
    resolveFault,
    equipment,
    isSubmitting,
  } = useEquipment()

  // In-progress repair form state
  const [techName, setTechName] = useState('')
  const [repairNotes, setRepairNotes] = useState('')

  // Resolve form state
  const [resolutionDesc, setResolutionDesc] = useState('')
  const [repairHours, setRepairHours] = useState('1.5')
  const [resolvedBy, setResolvedBy] = useState('')
  const [showResolveForm, setShowResolveForm] = useState(false)
  const [resolveErrors, setResolveErrors] = useState({})

  useEffect(() => {
    if (selectedFault) {
      setTechName(selectedFault.technician || '')
      setRepairNotes(selectedFault.repairNotes || '')
      setResolutionDesc(selectedFault.resolution || '')
      setRepairHours(selectedFault.repairHours != null ? String(selectedFault.repairHours) : '1.5')
      setResolvedBy(selectedFault.resolvedBy || selectedFault.technician || 'Lab Technician')
      setShowResolveForm(false)
      setResolveErrors({})
    }
  }, [selectedFault])

  if (!isFaultDrawerOpen || !selectedFault) return null

  // Lookup target equipment
  const targetEquip = equipment.find(e => e.id.toUpperCase() === selectedFault.equipId?.toUpperCase())

  // Status styling
  const statusConfig = {
    'Open': {
      color: 'var(--red-base)',
      bg: 'var(--red-bg)',
      border: 'rgba(232,69,60,0.3)',
      dotClass: 'dot-red',
    },
    'In Progress': {
      color: 'var(--amber-base)',
      bg: 'var(--amber-bg)',
      border: 'rgba(245,166,35,0.3)',
      dotClass: 'dot-amber',
    },
    'Resolved': {
      color: 'var(--green-base)',
      bg: 'var(--green-bg)',
      border: 'rgba(61,220,132,0.3)',
      dotClass: 'dot-green',
    },
  }[selectedFault.status] || {
    color: 'var(--text-secondary)',
    bg: 'rgba(255,255,255,0.05)',
    border: 'var(--border-muted)',
    dotClass: 'dot-muted',
  }

  const severityBadgeClass = {
    'Critical': 'badge-red',
    'High':     'badge-red',
    'Medium':   'badge-amber',
    'Low':      'badge-green',
  }[selectedFault.severity] || 'badge-muted'

  // Actions
  const handleStartRepair = async (e) => {
    e.preventDefault()
    await startRepair(selectedFault.id, {
      technician: techName.trim() || 'Assigned Technician',
      repairNotes: repairNotes.trim(),
    })
  }

  const handleUpdateNotes = async (e) => {
    e.preventDefault()
    await updateFault(selectedFault.id, {
      repairNotes: repairNotes.trim(),
      technician: techName.trim(),
    })
  }

  const handleResolveSubmit = async (e) => {
    e.preventDefault()
    const errs = {}
    if (!resolutionDesc.trim()) {
      errs.resolution = 'Resolution description is required.'
    } else if (resolutionDesc.trim().length < 8) {
      errs.resolution = 'Please provide a clear resolution explanation (min 8 characters).'
    }

    const hours = Number(repairHours)
    if (isNaN(hours) || hours < 0) {
      errs.hours = 'Repair duration must be a non-negative number of hours.'
    }

    if (Object.keys(errs).length > 0) {
      setResolveErrors(errs)
      return
    }

    try {
      await resolveFault(selectedFault.id, {
        resolution: resolutionDesc.trim(),
        repairHours: hours,
        resolvedBy: resolvedBy.trim() || 'Lab Technician',
      })
      setShowResolveForm(false)
    } catch (err) {
      setResolveErrors({ form: err.message })
    }
  }

  const handleInspectEquipment = () => {
    if (targetEquip) {
      closeFaultDrawer()
      openDrawer(targetEquip)
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={closeFaultDrawer}
        style={{
          position: 'fixed', inset: 0,
          background: 'rgba(5, 7, 10, 0.65)',
          backdropFilter: 'blur(3px)',
          zIndex: 50,
        }}
      />

      {/* Slide-over panel */}
      <div
        style={{
          position: 'fixed', top: 0, right: 0, bottom: 0,
          width: 'min(460px, 94vw)',
          background: 'var(--bg-surface)',
          borderLeft: '1px solid var(--border-muted)',
          boxShadow: '-10px 0 35px rgba(0, 0, 0, 0.7)',
          zIndex: 60,
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
                {selectedFault.id}
              </span>
              <span
                className="badge"
                style={{
                  background: statusConfig.bg,
                  color: statusConfig.color,
                  border: `1px solid ${statusConfig.border}`,
                }}
              >
                <span className={`dot ${statusConfig.dotClass}`} />
                {selectedFault.status.toUpperCase()}
              </span>
              <span className={`badge ${severityBadgeClass}`}>
                {selectedFault.severity?.toUpperCase()} SEV
              </span>
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3 }}>
              Category: {selectedFault.category} · {selectedFault.labName}
            </div>
          </div>

          <button
            onClick={closeFaultDrawer}
            style={{
              background: 'none', border: '1px solid var(--border-subtle)',
              borderRadius: 4, padding: 6, color: 'var(--text-muted)',
              cursor: 'pointer', display: 'flex', alignItems: 'center',
            }}
          >
            <X size={15} />
          </button>
        </div>

        {/* Scrollable Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* 1. Associated Device Card */}
          <div
            style={{
              padding: '10px 12px',
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 5,
            }}
          >
            <div className="flex items-center justify-between" style={{ marginBottom: 6 }}>
              <div className="section-label">Target Hardware Unit</div>
              {targetEquip && (
                <button
                  onClick={handleInspectEquipment}
                  className="flex items-center gap-4"
                  style={{
                    background: 'none', border: 'none',
                    color: 'var(--blue-base)', fontSize: 10.5, fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Inspect in Registry <ExternalLink size={10} />
                </button>
              )}
            </div>

            <div className="flex items-center justify-between">
              <div>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>
                  {selectedFault.equipId}
                </span>
                <span style={{ fontSize: 11.5, color: 'var(--text-secondary)', marginLeft: 6 }}>
                  · {targetEquip?.type || 'Laboratory Equipment'}
                </span>
                <div style={{ fontSize: 10.5, color: 'var(--text-muted)', marginTop: 2 }}>
                  {selectedFault.labName} ({selectedFault.labId})
                </div>
              </div>

              {targetEquip && (
                <div style={{ textAlign: 'right' }}>
                  <span
                    className="badge"
                    style={{
                      background: targetEquip.status === 'critical' ? 'var(--red-bg)' : (targetEquip.status === 'warning' ? 'var(--amber-bg)' : 'var(--green-bg)'),
                      color: targetEquip.status === 'critical' ? 'var(--red-base)' : (targetEquip.status === 'warning' ? 'var(--amber-base)' : 'var(--green-base)'),
                      border: `1px solid ${targetEquip.status === 'critical' ? 'rgba(232,69,60,0.3)' : (targetEquip.status === 'warning' ? 'rgba(245,166,35,0.3)' : 'rgba(61,220,132,0.3)')}`,
                    }}
                  >
                    STATUS: {targetEquip.status.toUpperCase()}
                  </span>
                  <div style={{ fontSize: 9.5, color: 'var(--text-muted)', marginTop: 3 }}>
                    PM: {targetEquip.nextMaintenance || 'Not scheduled'}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 2. Incident Description & Origin */}
          <div
            style={{
              padding: '12px 14px',
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 5,
            }}
          >
            <div className="section-label" style={{ marginBottom: 6 }}>Fault Description</div>
            <div style={{ fontSize: 12.5, color: 'var(--text-primary)', lineHeight: 1.5 }}>
              {selectedFault.description}
            </div>

            <div
              style={{
                marginTop: 10, paddingTop: 8,
                borderTop: '1px solid var(--border-subtle)',
                display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8,
                fontSize: 10.5, color: 'var(--text-muted)',
              }}
            >
              <div>
                <span style={{ color: 'var(--text-secondary)' }}>Reported By:</span>{' '}
                {selectedFault.reportedBy || 'Lab Assistant'}
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Reported Date:</span>{' '}
                <span style={{ fontFamily: 'var(--font-mono)' }}>{selectedFault.reportedDate}</span>
              </div>
            </div>
          </div>

          {/* 3. Resolution / Lifecycle Workflow */}
          <div
            style={{
              padding: '12px 14px',
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 5,
            }}
          >
            <div className="flex items-center justify-between" style={{ marginBottom: 8 }}>
              <div className="section-label">Repair & Resolution Lifecycle</div>
              <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                Open → In Progress → Resolved
              </span>
            </div>

            {/* CASE A: OPEN STATUS */}
            {selectedFault.status === 'Open' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div
                  style={{
                    padding: '8px 10px', borderRadius: 4,
                    background: 'rgba(232,69,60,0.06)', border: '1px solid rgba(232,69,60,0.18)',
                    fontSize: 11, color: 'var(--text-secondary)',
                  }}
                >
                  This incident is currently <strong>Open</strong> and awaiting diagnostic dispatch.
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 4 }}>
                    Assign Technician
                  </label>
                  <input
                    type="text"
                    value={techName}
                    onChange={(e) => setTechName(e.target.value)}
                    placeholder="e.g. K. Sharma (Hardware Technician)"
                    style={{
                      width: '100%', padding: '6px 10px',
                      background: 'var(--bg-surface)', border: '1px solid var(--border-muted)',
                      borderRadius: 4, color: 'var(--text-primary)', fontSize: 11.5, outline: 'none',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 4 }}>
                    Initial Diagnostic / Repair Notes
                  </label>
                  <textarea
                    rows={2}
                    value={repairNotes}
                    onChange={(e) => setRepairNotes(e.target.value)}
                    placeholder="Diagnostic notes, parts requisitioned..."
                    style={{
                      width: '100%', padding: '6px 10px',
                      background: 'var(--bg-surface)', border: '1px solid var(--border-muted)',
                      borderRadius: 4, color: 'var(--text-primary)', fontSize: 11.5, outline: 'none',
                      fontFamily: 'var(--font-sans)', resize: 'vertical',
                    }}
                  />
                </div>

                <button
                  type="button"
                  onClick={handleStartRepair}
                  className="flex items-center justify-center gap-6"
                  style={{
                    background: 'rgba(245,166,35,0.14)',
                    border: '1px solid rgba(245,166,35,0.35)',
                    borderRadius: 4, padding: '8px 14px',
                    color: 'var(--amber-base)', fontSize: 11.5, fontWeight: 600,
                    cursor: 'pointer', marginTop: 4,
                  }}
                >
                  <Wrench size={13} />
                  Start Repair Work (Set In Progress)
                </button>
              </div>
            )}

            {/* CASE B: IN PROGRESS STATUS */}
            {selectedFault.status === 'In Progress' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div
                  style={{
                    padding: '8px 10px', borderRadius: 4,
                    background: 'rgba(245,166,35,0.08)', border: '1px solid rgba(245,166,35,0.25)',
                    fontSize: 11, color: 'var(--text-secondary)',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  }}
                >
                  <div>
                    <span style={{ color: 'var(--amber-base)', fontWeight: 600 }}>Repair Active</span>
                    {selectedFault.startedAt && (
                      <span style={{ color: 'var(--text-muted)', marginLeft: 6 }}>
                        · Started: {selectedFault.startedAt}
                      </span>
                    )}
                  </div>
                  <span style={{ color: 'var(--text-primary)', fontWeight: 600, fontSize: 10.5 }}>
                    Tech: {selectedFault.technician || 'Assigned'}
                  </span>
                </div>

                {/* Edit Technician and Notes */}
                <div>
                  <label style={{ display: 'block', fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 4 }}>
                    Technician
                  </label>
                  <input
                    type="text"
                    value={techName}
                    onChange={(e) => setTechName(e.target.value)}
                    style={{
                      width: '100%', padding: '6px 10px',
                      background: 'var(--bg-surface)', border: '1px solid var(--border-muted)',
                      borderRadius: 4, color: 'var(--text-primary)', fontSize: 11.5, outline: 'none',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 4 }}>
                    Ongoing Repair Notes
                  </label>
                  <textarea
                    rows={2}
                    value={repairNotes}
                    onChange={(e) => setRepairNotes(e.target.value)}
                    style={{
                      width: '100%', padding: '6px 10px',
                      background: 'var(--bg-surface)', border: '1px solid var(--border-muted)',
                      borderRadius: 4, color: 'var(--text-primary)', fontSize: 11.5, outline: 'none',
                      fontFamily: 'var(--font-sans)', resize: 'vertical',
                    }}
                  />
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 4 }}>
                    <button
                      type="button"
                      onClick={handleUpdateNotes}
                      style={{
                        background: 'transparent', border: '1px solid var(--border-muted)',
                        borderRadius: 3, padding: '4px 10px', fontSize: 10.5, color: 'var(--text-secondary)',
                        cursor: 'pointer',
                      }}
                    >
                      Update Notes
                    </button>
                  </div>
                </div>

                {/* Resolve Toggle / Form */}
                {!showResolveForm ? (
                  <button
                    type="button"
                    onClick={() => setShowResolveForm(true)}
                    className="flex items-center justify-center gap-6"
                    style={{
                      background: 'rgba(61,220,132,0.12)',
                      border: '1px solid rgba(61,220,132,0.35)',
                      borderRadius: 4, padding: '8px 14px',
                      color: 'var(--green-base)', fontSize: 11.5, fontWeight: 600,
                      cursor: 'pointer', marginTop: 4,
                    }}
                  >
                    <CheckCircle2 size={13} />
                    Resolve Fault Incident
                  </button>
                ) : (
                  <form
                    onSubmit={handleResolveSubmit}
                    style={{
                      marginTop: 6, padding: '12px 12px',
                      background: 'var(--bg-surface)', border: '1px solid rgba(61,220,132,0.25)',
                      borderRadius: 6, display: 'flex', flexDirection: 'column', gap: 10,
                    }}
                  >
                    <div style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--green-base)' }}>
                      Complete Incident Resolution
                    </div>

                    {resolveErrors.form && (
                      <div style={{ color: 'var(--red-base)', fontSize: 10.5 }}>
                        {resolveErrors.form}
                      </div>
                    )}

                    <div>
                      <label style={{ display: 'block', fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 4 }}>
                        Resolution Description <span style={{ color: 'var(--red-base)' }}>*</span>
                      </label>
                      <textarea
                        rows={3}
                        value={resolutionDesc}
                        onChange={(e) => setResolutionDesc(e.target.value)}
                        placeholder="Explain exact repair steps (e.g. replaced thermal paste, reseated RAM, re-crimped RJ45)..."
                        style={{
                          width: '100%', padding: '6px 10px',
                          background: 'var(--bg-elevated)',
                          border: `1px solid ${resolveErrors.resolution ? 'var(--red-base)' : 'var(--border-muted)'}`,
                          borderRadius: 4, color: 'var(--text-primary)', fontSize: 11.5, outline: 'none',
                          fontFamily: 'var(--font-sans)', resize: 'vertical',
                        }}
                      />
                      {resolveErrors.resolution && (
                        <span style={{ fontSize: 10, color: 'var(--red-base)', marginTop: 2, display: 'block' }}>
                          {resolveErrors.resolution}
                        </span>
                      )}
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                      <div>
                        <label style={{ display: 'block', fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 4 }}>
                          Repair Duration (Hours) <span style={{ color: 'var(--red-base)' }}>*</span>
                        </label>
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          value={repairHours}
                          onChange={(e) => setRepairHours(e.target.value)}
                          style={{
                            width: '100%', padding: '6px 10px',
                            background: 'var(--bg-elevated)',
                            border: `1px solid ${resolveErrors.hours ? 'var(--red-base)' : 'var(--border-muted)'}`,
                            borderRadius: 4, color: 'var(--text-primary)', fontSize: 11.5, outline: 'none',
                            fontFamily: 'var(--font-mono)',
                          }}
                        />
                        {resolveErrors.hours && (
                          <span style={{ fontSize: 10, color: 'var(--red-base)', marginTop: 2, display: 'block' }}>
                            {resolveErrors.hours}
                          </span>
                        )}
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 4 }}>
                          Resolved By
                        </label>
                        <input
                          type="text"
                          value={resolvedBy}
                          onChange={(e) => setResolvedBy(e.target.value)}
                          placeholder="Technician name"
                          style={{
                            width: '100%', padding: '6px 10px',
                            background: 'var(--bg-elevated)', border: '1px solid var(--border-muted)',
                            borderRadius: 4, color: 'var(--text-primary)', fontSize: 11.5, outline: 'none',
                          }}
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-6" style={{ marginTop: 4 }}>
                      <button
                        type="button"
                        onClick={() => setShowResolveForm(false)}
                        style={{
                          background: 'none', border: '1px solid var(--border-muted)',
                          borderRadius: 3, padding: '5px 10px', fontSize: 10.5, color: 'var(--text-secondary)',
                          cursor: 'pointer',
                        }}
                      >
                        Cancel
                      </button>

                      <button
                        type="submit"
                        className="flex items-center gap-4"
                        style={{
                          background: 'var(--green-base)', border: 'none',
                          borderRadius: 3, padding: '6px 14px', fontSize: 11, fontWeight: 700,
                          color: '#0b0d0f', cursor: 'pointer',
                        }}
                      >
                        <Check size={12} strokeWidth={3} />
                        Confirm & Mark Resolved
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}

            {/* CASE C: RESOLVED STATUS */}
            {selectedFault.status === 'Resolved' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div
                  style={{
                    padding: '10px 12px', borderRadius: 4,
                    background: 'rgba(61,220,132,0.08)', border: '1px solid rgba(61,220,132,0.25)',
                    display: 'flex', alignItems: 'center', gap: 8,
                  }}
                >
                  <CheckCircle2 size={16} color="var(--green-base)" />
                  <div>
                    <div style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--green-base)' }}>
                      Incident Resolved Successfully
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 1 }}>
                      Logged at {selectedFault.resolvedDate || 'Today'} by {selectedFault.resolvedBy || selectedFault.technician || 'Technician'}
                    </div>
                  </div>
                </div>

                <div>
                  <div className="section-label" style={{ marginBottom: 4 }}>Resolution Summary</div>
                  <div style={{ fontSize: 12, color: 'var(--text-primary)', lineHeight: 1.5 }}>
                    {selectedFault.resolution || 'No resolution notes recorded.'}
                  </div>
                </div>

                <div
                  style={{
                    padding: '8px 10px', background: 'var(--bg-surface)',
                    border: '1px solid var(--border-subtle)', borderRadius: 4,
                    display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8,
                    fontSize: 11,
                  }}
                >
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>Actual Repair Duration:</span>{' '}
                    <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--text-primary)' }}>
                      {selectedFault.repairHours != null ? `${selectedFault.repairHours} hrs` : 'Not recorded'}
                    </span>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Technician:</span>{' '}
                    <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>
                      {selectedFault.resolvedBy || selectedFault.technician || 'Staff'}
                    </span>
                  </div>
                </div>

                <div style={{ fontSize: 10, color: 'var(--text-muted)', fontStyle: 'italic', marginTop: 2 }}>
                  * Historical incident record retained for CSE494 reliability analytics.
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div
          className="flex items-center justify-between"
          style={{
            padding: '12px 20px',
            borderTop: '1px solid var(--border-subtle)',
            background: 'var(--bg-elevated)',
          }}
        >
          <div style={{ fontSize: 10.5, color: 'var(--text-muted)' }}>
            Equipment: <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>{selectedFault.equipId}</span>
          </div>

          <button
            onClick={closeFaultDrawer}
            style={{
              background: 'var(--bg-surface)', border: '1px solid var(--border-muted)',
              borderRadius: 4, padding: '6px 14px', fontSize: 11, color: 'var(--text-secondary)',
              cursor: 'pointer',
            }}
          >
            Close Incident Panel
          </button>
        </div>
      </div>
    </>
  )
}
