import { useState, useEffect } from 'react'
import { X, AlertTriangle, ShieldAlert, Cpu, Check, AlertOctagon } from 'lucide-react'
import { useEquipment } from '../context/EquipmentContext'
import { FAULT_CATEGORIES, SEVERITIES } from '../data/mockFaults'

export default function ReportFaultModal() {
  const {
    faultModalState,
    closeReportFaultModal,
    equipment,
    createFault,
    isSubmitting,
  } = useEquipment()

  const { isOpen, defaultEquipId } = faultModalState

  const [equipId, setEquipId] = useState('')
  const [category, setCategory] = useState('Hardware')
  const [severity, setSeverity] = useState('High')
  const [description, setDescription] = useState('')
  const [reportedBy, setReportedBy] = useState('Lab Assistant')
  const [reportedDate, setReportedDate] = useState('')
  const [errors, setErrors] = useState({})

  // Format current local datetime
  const getCurrentDateTimeString = () => {
    const d = new Date()
    const pad = (n) => String(n).padStart(2, '0')
    const year = d.getFullYear()
    const month = pad(d.getMonth() + 1)
    const day = pad(d.getDate())
    const hours = pad(d.getHours())
    const mins = pad(d.getMinutes())
    return `${year}-${month}-${day} ${hours}:${mins}`
  }

  useEffect(() => {
    if (isOpen) {
      const initialEquip = defaultEquipId || (equipment[0]?.id ?? '')
      setEquipId(initialEquip)
      setCategory('Hardware')
      setSeverity('High')
      setDescription('')
      setReportedBy('Lab Assistant')
      setReportedDate(getCurrentDateTimeString())
      setErrors({})
    }
  }, [isOpen, defaultEquipId, equipment])

  if (!isOpen) return null

  // Resolve currently selected equipment
  const selectedDevice = equipment.find(e => e.id.toUpperCase() === equipId.toUpperCase())

  const validate = () => {
    const errs = {}
    if (!equipId.trim()) {
      errs.equipId = 'Please select an equipment unit.'
    } else if (!selectedDevice) {
      errs.equipId = `Equipment "${equipId}" not found in laboratory registry.`
    }

    if (!description.trim()) {
      errs.description = 'Fault description is required.'
    } else if (description.trim().length < 8) {
      errs.description = 'Description should be at least 8 characters explaining the fault symptoms.'
    }

    if (!category) {
      errs.category = 'Fault category is required.'
    }
    if (!severity) {
      errs.severity = 'Severity level is required.'
    }

    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validate()) return

    try {
      await createFault({
        equipId: selectedDevice.id,
        category,
        severity,
        description,
        reportedBy,
        reportedDate,
      })
      closeReportFaultModal()
    } catch (err) {
      setErrors({ form: err.message })
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={closeReportFaultModal}
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
          width: 'min(520px, 94vw)',
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
                background: 'rgba(232,69,60,0.12)',
                border: '1px solid rgba(232,69,60,0.3)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'var(--red-base)',
              }}
            >
              <AlertTriangle size={15} />
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.2px' }}>
                Report Equipment Fault
              </div>
              <div style={{ fontSize: 10.5, color: 'var(--text-muted)' }}>
                Raise operational incident · Updates equipment status immediately
              </div>
            </div>
          </div>

          <button
            onClick={closeReportFaultModal}
            style={{
              background: 'none', border: 'none', color: 'var(--text-muted)',
              cursor: 'pointer', padding: 4, display: 'flex', alignItems: 'center',
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} style={{ overflowY: 'auto', padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 14 }}>
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

          {/* 1. Equipment Selector */}
          <div>
            <label style={{ display: 'block', fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 5 }}>
              Target Equipment <span style={{ color: 'var(--red-base)' }}>*</span>
            </label>
            <select
              value={equipId}
              onChange={(e) => setEquipId(e.target.value)}
              style={{
                width: '100%', padding: '7px 10px',
                background: 'var(--bg-elevated)',
                border: `1px solid ${errors.equipId ? 'var(--red-base)' : 'var(--border-muted)'}`,
                borderRadius: 4, color: 'var(--text-primary)',
                fontSize: 12, outline: 'none',
              }}
            >
              {equipment.map(item => (
                <option key={item.id} value={item.id} style={{ background: '#151820' }}>
                  {item.id} — {item.type} ({item.labName}) [{item.status.toUpperCase()}]
                </option>
              ))}
            </select>
            {errors.equipId && (
              <span style={{ fontSize: 10, color: 'var(--red-base)', marginTop: 3, display: 'block' }}>
                {errors.equipId}
              </span>
            )}
          </div>

          {/* Laboratory Auto-Populated Card */}
          {selectedDevice && (
            <div
              style={{
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 4, padding: '8px 12px',
                display: 'flex', alignItems: 'center', justifyContent: 'between',
                gap: 12,
              }}
            >
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 9.5, color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                  Laboratory Facility
                </div>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', marginTop: 2 }}>
                  {selectedDevice.labName} <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, color: 'var(--blue-base)' }}>({selectedDevice.labId})</span>
                </div>
              </div>

              <div>
                <div style={{ fontSize: 9.5, color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                  Current Status
                </div>
                <div style={{ marginTop: 2 }}>
                  <span
                    className="badge"
                    style={{
                      background: selectedDevice.status === 'critical' ? 'var(--red-bg)' : (selectedDevice.status === 'warning' ? 'var(--amber-bg)' : 'var(--green-bg)'),
                      color: selectedDevice.status === 'critical' ? 'var(--red-base)' : (selectedDevice.status === 'warning' ? 'var(--amber-base)' : 'var(--green-base)'),
                      border: `1px solid ${selectedDevice.status === 'critical' ? 'rgba(232,69,60,0.3)' : (selectedDevice.status === 'warning' ? 'rgba(245,166,35,0.3)' : 'rgba(61,220,132,0.3)')}`,
                    }}
                  >
                    {selectedDevice.status.toUpperCase()}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* 2. Category & Severity Row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ display: 'block', fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 5 }}>
                Fault Category <span style={{ color: 'var(--red-base)' }}>*</span>
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                style={{
                  width: '100%', padding: '7px 10px',
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border-muted)',
                  borderRadius: 4, color: 'var(--text-primary)',
                  fontSize: 12, outline: 'none',
                }}
              >
                {FAULT_CATEGORIES.map(cat => (
                  <option key={cat} value={cat} style={{ background: '#151820' }}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 5 }}>
                Severity Level <span style={{ color: 'var(--red-base)' }}>*</span>
              </label>
              <select
                value={severity}
                onChange={(e) => setSeverity(e.target.value)}
                style={{
                  width: '100%', padding: '7px 10px',
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border-muted)',
                  borderRadius: 4,
                  color: severity === 'Critical' ? 'var(--red-base)' : (severity === 'High' ? '#fb923c' : (severity === 'Medium' ? 'var(--amber-base)' : 'var(--green-base)')),
                  fontSize: 12, fontWeight: 600, outline: 'none',
                }}
              >
                {SEVERITIES.map(sev => (
                  <option key={sev} value={sev} style={{ background: '#151820', color: '#e8eaf0' }}>
                    {sev}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* 3. Description Textarea */}
          <div>
            <label style={{ display: 'block', fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 5 }}>
              Fault Symptoms & Description <span style={{ color: 'var(--red-base)' }}>*</span>
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Device rebooting randomly under load, fan grinding noise, WAN port blinking red..."
              style={{
                width: '100%', padding: '8px 10px',
                background: 'var(--bg-elevated)',
                border: `1px solid ${errors.description ? 'var(--red-base)' : 'var(--border-muted)'}`,
                borderRadius: 4, color: 'var(--text-primary)',
                fontSize: 12, outline: 'none', resize: 'vertical',
                fontFamily: 'var(--font-sans)',
              }}
            />
            {errors.description && (
              <span style={{ fontSize: 10, color: 'var(--red-base)', marginTop: 3, display: 'block' }}>
                {errors.description}
              </span>
            )}
          </div>

          {/* 4. Reporter & Date Row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ display: 'block', fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 5 }}>
                Reported By
              </label>
              <input
                type="text"
                value={reportedBy}
                onChange={(e) => setReportedBy(e.target.value)}
                placeholder="e.g. Lab Assistant / Student"
                style={{
                  width: '100%', padding: '6px 10px',
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border-muted)',
                  borderRadius: 4, color: 'var(--text-primary)',
                  fontSize: 12, outline: 'none',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 5 }}>
                Reported Timestamp
              </label>
              <input
                type="text"
                value={reportedDate}
                onChange={(e) => setReportedDate(e.target.value)}
                style={{
                  width: '100%', padding: '6px 10px',
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border-muted)',
                  borderRadius: 4, color: 'var(--text-primary)',
                  fontSize: 11, fontFamily: 'var(--font-mono)', outline: 'none',
                }}
              />
            </div>
          </div>

          {/* Initial Status Callout */}
          <div
            className="flex items-center justify-between"
            style={{
              padding: '8px 12px',
              background: 'rgba(232,69,60,0.06)',
              border: '1px solid rgba(232,69,60,0.18)',
              borderRadius: 4,
            }}
          >
            <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
              Initial Incident Status:
            </div>
            <span
              className="badge"
              style={{
                background: 'var(--red-bg)', color: 'var(--red-base)',
                border: '1px solid rgba(232,69,60,0.3)',
              }}
            >
              <span className="dot dot-red" />
              OPEN
            </span>
          </div>

          {/* Form Actions */}
          <div
            className="flex items-center justify-end gap-8"
            style={{
              marginTop: 6, paddingTop: 12,
              borderTop: '1px solid var(--border-subtle)',
            }}
          >
            <button
              type="button"
              onClick={closeReportFaultModal}
              style={{
                background: 'transparent',
                border: '1px solid var(--border-muted)',
                borderRadius: 4, padding: '7px 14px',
                fontSize: 11, color: 'var(--text-secondary)',
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
                background: 'var(--red-base)',
                border: 'none',
                borderRadius: 4, padding: '7px 16px',
                fontSize: 11.5, fontWeight: 600, color: '#fff',
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                opacity: isSubmitting ? 0.6 : 1,
                boxShadow: '0 0 10px rgba(232,69,60,0.3)',
              }}
            >
              <AlertTriangle size={13} />
              {isSubmitting ? 'Recording in MongoDB…' : 'Submit Fault Report'}
            </button>
          </div>
        </form>
      </div>
    </>
  )
}
