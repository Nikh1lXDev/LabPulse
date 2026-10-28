import { useState, useEffect } from 'react'
import { X, Calendar, Wrench, CheckCircle2, AlertTriangle, Clock } from 'lucide-react'
import { useEquipment } from '../context/EquipmentContext'
import { MAINTENANCE_TYPES } from '../data/mockFaults'

export default function MaintenanceModal() {
  const {
    maintenanceModalState,
    closeMaintenanceModal,
    equipment,
    scheduleMaintenance,
    completeMaintenance,
    rescheduleMaintenance,
    isSubmitting,
  } = useEquipment()

  const { isOpen, mode, task, defaultEquipId } = maintenanceModalState

  // Form fields
  const [equipId, setEquipId] = useState('')
  const [scheduledDate, setScheduledDate] = useState('')
  const [taskType, setTaskType] = useState('Preventive Maintenance')
  const [assignedTo, setAssignedTo] = useState('K. Sharma')
  const [notes, setNotes] = useState('')

  // Completion fields
  const [completedDate, setCompletedDate] = useState('')
  const [completedBy, setCompletedBy] = useState('K. Sharma')
  const [completionNotes, setCompletionNotes] = useState('')
  const [nextScheduledDate, setNextScheduledDate] = useState('')

  const [errors, setErrors] = useState({})

  useEffect(() => {
    if (isOpen) {
      const todayStr = new Date().toISOString().split('T')[0]
      const twoWeeksLater = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      const threeMonthsLater = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

      if (mode === 'schedule') {
        setEquipId(defaultEquipId || (equipment[0]?.id ?? ''))
        setScheduledDate(twoWeeksLater)
        setTaskType('Preventive Maintenance')
        setAssignedTo('K. Sharma')
        setNotes('Routine quarterly laboratory preventive maintenance & diagnostic check.')
      } else if (mode === 'reschedule' && task) {
        setEquipId(task.equipId)
        setScheduledDate(task.scheduledDate)
        setTaskType(task.taskType)
        setAssignedTo(task.assignedTo || 'Assigned Technician')
        setNotes(task.notes || '')
      } else if (mode === 'complete' && task) {
        setEquipId(task.equipId)
        setCompletedDate(todayStr)
        setCompletedBy(task.assignedTo || 'K. Sharma')
        setCompletionNotes('All diagnostic checks passed. System cleaned and confirmed operating within normal parameters.')
        setNextScheduledDate(threeMonthsLater)
      }
      setErrors({})
    }
  }, [isOpen, mode, task, defaultEquipId, equipment])

  if (!isOpen) return null

  const selectedDevice = equipment.find(e => e.id.toUpperCase() === equipId.toUpperCase())

  const handleSubmit = async (e) => {
    e.preventDefault()
    const errs = {}

    if (mode === 'schedule') {
      if (!equipId) errs.equipId = 'Equipment selection is required.'
      if (!scheduledDate) errs.scheduledDate = 'Scheduled date is required.'
      if (Object.keys(errs).length > 0) {
        setErrors(errs)
        return
      }
      try {
        await scheduleMaintenance({
          equipId,
          scheduledDate,
          taskType,
          assignedTo,
          notes,
        })
        closeMaintenanceModal()
      } catch (err) {
        setErrors({ form: err.message })
      }
    } else if (mode === 'reschedule') {
      if (!scheduledDate) errs.scheduledDate = 'New scheduled date is required.'
      if (Object.keys(errs).length > 0) {
        setErrors(errs)
        return
      }
      try {
        await rescheduleMaintenance(task.id, {
          newDate: scheduledDate,
          notes,
        })
        closeMaintenanceModal()
      } catch (err) {
        setErrors({ form: err.message })
      }
    } else if (mode === 'complete') {
      if (!completedDate) errs.completedDate = 'Completion date is required.'
      if (!completionNotes.trim()) errs.completionNotes = 'Completion servicing notes are required.'
      if (Object.keys(errs).length > 0) {
        setErrors(errs)
        return
      }
      try {
        await completeMaintenance(task.id, {
          completedDate,
          completedBy,
          completionNotes,
          nextScheduledDate,
        })
        closeMaintenanceModal()
      } catch (err) {
        setErrors({ form: err.message })
      }
    }
  }

  const titles = {
    schedule: 'Schedule Preventive Maintenance',
    reschedule: `Reschedule Maintenance (${task?.id})`,
    complete: `Mark Maintenance Completed (${task?.id})`,
  }

  const subtitles = {
    schedule: 'Set upcoming servicing window · Updates equipment PM schedule',
    reschedule: 'Adjust scheduled service date and operator notes',
    complete: 'Log completed maintenance and reset next PM cycle',
  }

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={closeMaintenanceModal}
        style={{
          position: 'fixed', inset: 0,
          background: 'rgba(5, 7, 10, 0.75)',
          backdropFilter: 'blur(4px)',
          zIndex: 60,
        }}
      />

      {/* Modal Dialog */}
      <div
        style={{
          position: 'fixed',
          top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 'min(500px, 94vw)',
          maxHeight: '92vh',
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-muted)',
          borderRadius: 8,
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.8), 0 0 0 1px rgba(255,255,255,0.06)',
          zIndex: 70,
          display: 'flex', flexDirection: 'column',
          overflow: 'hidden',
          animation: 'fadeIn 0.15s ease-out',
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between"
          style={{
            padding: '14px 18px',
            borderBottom: '1px solid var(--border-subtle)',
            background: 'var(--bg-elevated)',
          }}
        >
          <div className="flex items-center gap-8">
            <div
              style={{
                width: 28, height: 28, borderRadius: 5,
                background: mode === 'complete' ? 'rgba(61,220,132,0.12)' : 'rgba(74,158,255,0.12)',
                border: `1px solid ${mode === 'complete' ? 'rgba(61,220,132,0.3)' : 'rgba(74,158,255,0.3)'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: mode === 'complete' ? 'var(--green-base)' : 'var(--blue-base)',
              }}
            >
              {mode === 'complete' ? <CheckCircle2 size={15} /> : <Wrench size={15} />}
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.2px' }}>
                {titles[mode]}
              </div>
              <div style={{ fontSize: 10.5, color: 'var(--text-muted)' }}>
                {subtitles[mode]}
              </div>
            </div>
          </div>

          <button
            onClick={closeMaintenanceModal}
            style={{
              background: 'none', border: 'none', color: 'var(--text-muted)',
              cursor: 'pointer', padding: 4, display: 'flex', alignItems: 'center',
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} style={{ overflowY: 'auto', padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 13 }}>
          {errors.form && (
            <div
              style={{
                padding: '8px 12px', borderRadius: 4,
                background: 'var(--red-bg)', border: '1px solid rgba(232,69,60,0.3)',
                color: 'var(--red-base)', fontSize: 11,
              }}
            >
              {errors.form}
            </div>
          )}

          {/* Target Equipment */}
          <div>
            <label style={{ display: 'block', fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 5 }}>
              Hardware Unit <span style={{ color: 'var(--red-base)' }}>*</span>
            </label>
            {mode === 'schedule' ? (
              <select
                value={equipId}
                onChange={(e) => setEquipId(e.target.value)}
                style={{
                  width: '100%', padding: '7px 10px',
                  background: 'var(--bg-elevated)',
                  border: `1px solid ${errors.equipId ? 'var(--red-base)' : 'var(--border-muted)'}`,
                  borderRadius: 4, color: 'var(--text-primary)', fontSize: 12, outline: 'none',
                }}
              >
                {equipment.map(item => (
                  <option key={item.id} value={item.id} style={{ background: '#151820' }}>
                    {item.id} — {item.type} ({item.labName}) [Next PM: {item.nextMaintenance || 'None'}]
                  </option>
                ))}
              </select>
            ) : (
              <div
                style={{
                  padding: '7px 10px', background: 'rgba(255,255,255,0.03)',
                  border: '1px solid var(--border-subtle)', borderRadius: 4,
                  fontSize: 12, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)',
                }}
              >
                {equipId} — {selectedDevice?.type || 'Device'} ({selectedDevice?.labName || task?.labName})
              </div>
            )}
          </div>

          {/* MODE: SCHEDULE & RESCHEDULE */}
          {(mode === 'schedule' || mode === 'reschedule') && (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 5 }}>
                    Maintenance Type
                  </label>
                  <select
                    value={taskType}
                    onChange={(e) => setTaskType(e.target.value)}
                    style={{
                      width: '100%', padding: '7px 10px',
                      background: 'var(--bg-elevated)', border: '1px solid var(--border-muted)',
                      borderRadius: 4, color: 'var(--text-primary)', fontSize: 11.5, outline: 'none',
                    }}
                  >
                    {MAINTENANCE_TYPES.map(t => (
                      <option key={t} value={t} style={{ background: '#151820' }}>{t}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 5 }}>
                    Planned Date <span style={{ color: 'var(--red-base)' }}>*</span>
                  </label>
                  <input
                    type="date"
                    value={scheduledDate}
                    onChange={(e) => setScheduledDate(e.target.value)}
                    style={{
                      width: '100%', padding: '6px 10px',
                      background: 'var(--bg-elevated)',
                      border: `1px solid ${errors.scheduledDate ? 'var(--red-base)' : 'var(--border-muted)'}`,
                      borderRadius: 4, color: 'var(--text-primary)', fontSize: 11.5,
                      fontFamily: 'var(--font-mono)', outline: 'none',
                    }}
                  />
                  {errors.scheduledDate && (
                    <span style={{ fontSize: 10, color: 'var(--red-base)', marginTop: 2, display: 'block' }}>
                      {errors.scheduledDate}
                    </span>
                  )}
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 5 }}>
                  Assigned Technician
                </label>
                <input
                  type="text"
                  value={assignedTo}
                  onChange={(e) => setAssignedTo(e.target.value)}
                  placeholder="e.g. K. Sharma / Lab Technician"
                  style={{
                    width: '100%', padding: '6px 10px',
                    background: 'var(--bg-elevated)', border: '1px solid var(--border-muted)',
                    borderRadius: 4, color: 'var(--text-primary)', fontSize: 11.5, outline: 'none',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 5 }}>
                  Work Checklist & Operator Notes
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  style={{
                    width: '100%', padding: '6px 10px',
                    background: 'var(--bg-elevated)', border: '1px solid var(--border-muted)',
                    borderRadius: 4, color: 'var(--text-primary)', fontSize: 11.5, outline: 'none',
                    fontFamily: 'var(--font-sans)', resize: 'vertical',
                  }}
                />
              </div>
            </>
          )}

          {/* MODE: COMPLETE */}
          {mode === 'complete' && (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 5 }}>
                    Completed Date <span style={{ color: 'var(--red-base)' }}>*</span>
                  </label>
                  <input
                    type="date"
                    value={completedDate}
                    onChange={(e) => setCompletedDate(e.target.value)}
                    style={{
                      width: '100%', padding: '6px 10px',
                      background: 'var(--bg-elevated)',
                      border: `1px solid ${errors.completedDate ? 'var(--red-base)' : 'var(--border-muted)'}`,
                      borderRadius: 4, color: 'var(--text-primary)', fontSize: 11.5,
                      fontFamily: 'var(--font-mono)', outline: 'none',
                    }}
                  />
                  {errors.completedDate && (
                    <span style={{ fontSize: 10, color: 'var(--red-base)', marginTop: 2, display: 'block' }}>
                      {errors.completedDate}
                    </span>
                  )}
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 5 }}>
                    Completed By
                  </label>
                  <input
                    type="text"
                    value={completedBy}
                    onChange={(e) => setCompletedBy(e.target.value)}
                    style={{
                      width: '100%', padding: '6px 10px',
                      background: 'var(--bg-elevated)', border: '1px solid var(--border-muted)',
                      borderRadius: 4, color: 'var(--text-primary)', fontSize: 11.5, outline: 'none',
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 5 }}>
                  Servicing Report & Completed Checklist <span style={{ color: 'var(--red-base)' }}>*</span>
                </label>
                <textarea
                  rows={3}
                  value={completionNotes}
                  onChange={(e) => setCompletionNotes(e.target.value)}
                  placeholder="Describe maintenance performed: dust cleaned, diagnostic tests run, firmware flashed..."
                  style={{
                    width: '100%', padding: '6px 10px',
                    background: 'var(--bg-elevated)',
                    border: `1px solid ${errors.completionNotes ? 'var(--red-base)' : 'var(--border-muted)'}`,
                    borderRadius: 4, color: 'var(--text-primary)', fontSize: 11.5, outline: 'none',
                    fontFamily: 'var(--font-sans)', resize: 'vertical',
                  }}
                />
                {errors.completionNotes && (
                  <span style={{ fontSize: 10, color: 'var(--red-base)', marginTop: 2, display: 'block' }}>
                    {errors.completionNotes}
                  </span>
                )}
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 5 }}>
                  Next Planned Cycle (Automatic 90-day window)
                </label>
                <input
                  type="date"
                  value={nextScheduledDate}
                  onChange={(e) => setNextScheduledDate(e.target.value)}
                  style={{
                    width: '100%', padding: '6px 10px',
                    background: 'var(--bg-elevated)', border: '1px solid var(--border-muted)',
                    borderRadius: 4, color: 'var(--text-primary)', fontSize: 11.5,
                    fontFamily: 'var(--font-mono)', outline: 'none',
                  }}
                />
                <span style={{ fontSize: 9.5, color: 'var(--text-muted)', marginTop: 3, display: 'block' }}>
                  Equipment's Next Maintenance will update to this date.
                </span>
              </div>
            </>
          )}

          {/* Actions */}
          <div
            className="flex items-center justify-end gap-8"
            style={{
              marginTop: 6, paddingTop: 12,
              borderTop: '1px solid var(--border-subtle)',
            }}
          >
            <button
              type="button"
              onClick={closeMaintenanceModal}
              style={{
                background: 'transparent', border: '1px solid var(--border-muted)',
                borderRadius: 4, padding: '7px 14px', fontSize: 11, color: 'var(--text-secondary)',
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-6"
              style={{
                background: mode === 'complete' ? 'var(--green-base)' : 'var(--blue-base)',
                border: 'none',
                borderRadius: 4, padding: '7px 16px',
                fontSize: 11.5, fontWeight: 600,
                color: mode === 'complete' ? '#0b0d0f' : '#fff',
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                opacity: isSubmitting ? 0.6 : 1,
              }}
            >
              {mode === 'complete' ? <CheckCircle2 size={13} /> : <Wrench size={13} />}
              {isSubmitting ? 'Saving to MongoDB…' : (mode === 'complete' ? 'Confirm Maintenance Completed' : (mode === 'reschedule' ? 'Update Schedule' : 'Schedule Maintenance'))}
            </button>
          </div>
        </form>
      </div>
    </>
  )
}
