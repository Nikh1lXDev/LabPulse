import { useState, useEffect } from 'react'
import { X, AlertCircle, Check, Cpu, Save } from 'lucide-react'
import { useEquipment } from '../context/EquipmentContext'

const EQUIPMENT_TYPES = [
  'Desktop PC',
  'Laptop',
  'Projector',
  'Network Router',
  'Network Switch',
]

const FAULT_TYPES = [
  'Overheating',
  'Cooling',
  'Storage',
  'Performance',
  'Battery',
  'Lamp Life',
  'Network',
  'General',
]

export default function EquipmentModal() {
  const { modalState, closeModal, addEquipment, updateEquipment, labs, equipment, isSubmitting } = useEquipment()
  const { isOpen, mode, initialData } = modalState

  const [formData, setFormData] = useState({
    id: '',
    type: 'Desktop PC',
    labId: 'LAB-A',
    status: 'healthy',
    riskLevel: 'low',
    fault: '',
    faultType: 'General',
    lastMaintenance: '',
    nextMaintenance: '',
    cpu: '',
    ram: '',
    temp: '',
    notes: '',
  })

  const [errors, setErrors] = useState({})

  useEffect(() => {
    if (isOpen) {
      if (mode === 'edit' && initialData) {
        setFormData({
          id: initialData.id,
          type: initialData.type || 'Desktop PC',
          labId: initialData.labId || 'LAB-A',
          status: initialData.status || 'healthy',
          riskLevel: initialData.riskLevel || 'low',
          fault: initialData.fault || '',
          faultType: initialData.faultType || 'General',
          lastMaintenance: initialData.lastMaintenance || '',
          nextMaintenance: initialData.nextMaintenance || '',
          cpu: initialData.cpu != null ? String(initialData.cpu) : '',
          ram: initialData.ram != null ? String(initialData.ram) : '',
          temp: initialData.temp != null ? String(initialData.temp) : '',
          notes: initialData.notes || '',
        })
      } else {
        // Default new entry
        setFormData({
          id: '',
          type: 'Desktop PC',
          labId: 'LAB-A',
          status: 'healthy',
          riskLevel: 'low',
          fault: '',
          faultType: 'General',
          lastMaintenance: new Date().toISOString().split('T')[0],
          nextMaintenance: '',
          cpu: '35',
          ram: '45',
          temp: '50',
          notes: '',
        })
      }
      setErrors({})
    }
  }, [isOpen, mode, initialData])

  if (!isOpen) return null

  const validate = () => {
    const errs = {}
    const cleanId = formData.id.trim().toUpperCase()

    if (!cleanId) {
      errs.id = 'Equipment ID is required.'
    } else if (cleanId.length < 2) {
      errs.id = 'Equipment ID must be at least 2 characters.'
    } else if (mode === 'add') {
      const isDuplicate = equipment.some(e => e.id.toUpperCase() === cleanId)
      if (isDuplicate) {
        errs.id = `Equipment ID "${cleanId}" already exists. Please choose a unique ID.`
      }
    }

    if (!formData.type) {
      errs.type = 'Equipment type is required.'
    }

    const labExists = labs.some(l => l.id === formData.labId)
    if (!formData.labId || !labExists) {
      errs.labId = 'Please select a valid laboratory.'
    }

    if (!formData.status) {
      errs.status = 'Operational status is required.'
    }

    if (formData.status !== 'healthy' && !formData.fault.trim()) {
      errs.fault = 'Please provide a fault description when status is Warning or Critical.'
    }

    if (formData.cpu && (Number(formData.cpu) < 0 || Number(formData.cpu) > 100)) {
      errs.cpu = 'CPU % must be between 0 and 100.'
    }
    if (formData.ram && (Number(formData.ram) < 0 || Number(formData.ram) > 100)) {
      errs.ram = 'RAM % must be between 0 and 100.'
    }

    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validate()) return

    try {
      if (mode === 'add') {
        await addEquipment(formData)
      } else {
        await updateEquipment(initialData.id, formData)
      }
      closeModal()
    } catch (err) {
      setErrors({ form: err.message })
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={closeModal}
        style={{
          position: 'fixed', inset: 0,
          background: 'rgba(5, 7, 10, 0.7)',
          backdropFilter: 'blur(3px)',
          zIndex: 60,
        }}
      />

      {/* Modal Dialog */}
      <div
        style={{
          position: 'fixed',
          top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 'min(540px, 94vw)',
          maxHeight: '90vh',
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-accent)',
          borderRadius: 8,
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.8), 0 0 0 1px rgba(255,255,255,0.05)',
          zIndex: 70,
          display: 'flex', flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between"
          style={{
            padding: '14px 18px',
            background: 'var(--bg-elevated)',
            borderBottom: '1px solid var(--border-subtle)',
          }}
        >
          <div className="flex items-center gap-8">
            <Cpu size={16} color="var(--blue-base)" />
            <div>
              <h2 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.2px' }}>
                {mode === 'add' ? 'Register New Lab Equipment' : `Edit Equipment — ${initialData?.id}`}
              </h2>
              <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                {mode === 'add' ? 'Add equipment to laboratory inventory' : 'Update operational status and telemetry'}
              </span>
            </div>
          </div>

          <button
            onClick={closeModal}
            style={{
              background: 'none', border: '1px solid var(--border-subtle)',
              borderRadius: 4, width: 26, height: 26,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', color: 'var(--text-muted)',
            }}
          >
            <X size={14} />
          </button>
        </div>

        {/* Global Error Banner */}
        {errors.form && (
          <div
            className="flex items-center gap-6"
            style={{
              margin: '12px 18px 0', padding: '8px 12px',
              background: 'rgba(232,69,60,0.12)', border: '1px solid rgba(232,69,60,0.3)',
              borderRadius: 4, color: 'var(--red-base)', fontSize: 11,
            }}
          >
            <AlertCircle size={14} />
            <span>{errors.form}</span>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} style={{ overflowY: 'auto', padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Row 1: ID & Type */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label className="section-label" style={{ display: 'block', marginBottom: 4 }}>
                Equipment ID *
              </label>
              <input
                type="text"
                value={formData.id}
                onChange={e => setFormData(prev => ({ ...prev, id: e.target.value.toUpperCase() }))}
                disabled={mode === 'edit'}
                placeholder="e.g. PC-16, ROUTER-04"
                style={{
                  width: '100%', padding: '6px 10px',
                  background: mode === 'edit' ? 'var(--bg-void)' : 'var(--bg-elevated)',
                  border: `1px solid ${errors.id ? 'var(--red-base)' : 'var(--border-muted)'}`,
                  borderRadius: 4, color: 'var(--text-primary)',
                  fontFamily: 'var(--font-mono)', fontSize: 12, outline: 'none',
                  cursor: mode === 'edit' ? 'not-allowed' : 'text',
                }}
              />
              {errors.id && <span style={{ fontSize: 9.5, color: 'var(--red-base)', marginTop: 2, display: 'block' }}>{errors.id}</span>}
            </div>

            <div>
              <label className="section-label" style={{ display: 'block', marginBottom: 4 }}>
                Equipment Type *
              </label>
              <select
                value={formData.type}
                onChange={e => setFormData(prev => ({ ...prev, type: e.target.value }))}
                style={{
                  width: '100%', padding: '6px 10px',
                  background: 'var(--bg-elevated)',
                  border: `1px solid ${errors.type ? 'var(--red-base)' : 'var(--border-muted)'}`,
                  borderRadius: 4, color: 'var(--text-primary)',
                  fontSize: 12, outline: 'none',
                }}
              >
                {EQUIPMENT_TYPES.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
              {errors.type && <span style={{ fontSize: 9.5, color: 'var(--red-base)', marginTop: 2, display: 'block' }}>{errors.type}</span>}
            </div>
          </div>

          {/* Row 2: Assigned Lab & Status */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label className="section-label" style={{ display: 'block', marginBottom: 4 }}>
                Assigned Laboratory *
              </label>
              <select
                value={formData.labId}
                onChange={e => setFormData(prev => ({ ...prev, labId: e.target.value }))}
                style={{
                  width: '100%', padding: '6px 10px',
                  background: 'var(--bg-elevated)',
                  border: `1px solid ${errors.labId ? 'var(--red-base)' : 'var(--border-muted)'}`,
                  borderRadius: 4, color: 'var(--text-primary)',
                  fontSize: 12, outline: 'none',
                }}
              >
                {labs.map(l => (
                  <option key={l.id} value={l.id}>{l.name} ({l.id})</option>
                ))}
              </select>
              {errors.labId && <span style={{ fontSize: 9.5, color: 'var(--red-base)', marginTop: 2, display: 'block' }}>{errors.labId}</span>}
            </div>

            <div>
              <label className="section-label" style={{ display: 'block', marginBottom: 4 }}>
                Operational Status *
              </label>
              <select
                value={formData.status}
                onChange={e => setFormData(prev => ({
                  ...prev,
                  status: e.target.value,
                  riskLevel: e.target.value === 'critical' ? 'high' : e.target.value === 'warning' ? 'medium' : 'low',
                }))}
                style={{
                  width: '100%', padding: '6px 10px',
                  background: 'var(--bg-elevated)',
                  border: `1px solid ${errors.status ? 'var(--red-base)' : 'var(--border-muted)'}`,
                  borderRadius: 4, color: 'var(--text-primary)',
                  fontSize: 12, outline: 'none',
                }}
              >
                <option value="healthy">Healthy (Nominal)</option>
                <option value="warning">Warning (Maintenance Needed)</option>
                <option value="critical">Critical (Fault / Offline)</option>
              </select>
              {errors.status && <span style={{ fontSize: 9.5, color: 'var(--red-base)', marginTop: 2, display: 'block' }}>{errors.status}</span>}
            </div>
          </div>

          {/* Row 3: Risk Level & Fault Type */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label className="section-label" style={{ display: 'block', marginBottom: 4 }}>
                Risk Level
              </label>
              <select
                value={formData.riskLevel}
                onChange={e => setFormData(prev => ({ ...prev, riskLevel: e.target.value }))}
                style={{
                  width: '100%', padding: '6px 10px',
                  background: 'var(--bg-elevated)', border: '1px solid var(--border-muted)',
                  borderRadius: 4, color: 'var(--text-primary)',
                  fontSize: 12, outline: 'none',
                }}
              >
                <option value="low">Low Risk</option>
                <option value="medium">Medium Risk</option>
                <option value="high">High Risk</option>
              </select>
            </div>

            <div>
              <label className="section-label" style={{ display: 'block', marginBottom: 4 }}>
                Fault Category
              </label>
              <select
                value={formData.faultType}
                onChange={e => setFormData(prev => ({ ...prev, faultType: e.target.value }))}
                disabled={formData.status === 'healthy'}
                style={{
                  width: '100%', padding: '6px 10px',
                  background: formData.status === 'healthy' ? 'var(--bg-void)' : 'var(--bg-elevated)',
                  border: '1px solid var(--border-muted)',
                  borderRadius: 4, color: 'var(--text-primary)',
                  fontSize: 12, outline: 'none',
                  opacity: formData.status === 'healthy' ? 0.5 : 1,
                }}
              >
                {FAULT_TYPES.map(ft => (
                  <option key={ft} value={ft}>{ft}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Fault Description (if warning or critical) */}
          {formData.status !== 'healthy' && (
            <div>
              <label className="section-label" style={{ display: 'block', marginBottom: 4 }}>
                Fault / Anomaly Description *
              </label>
              <textarea
                value={formData.fault}
                onChange={e => setFormData(prev => ({ ...prev, fault: e.target.value }))}
                rows={2}
                placeholder="Describe symptom, error code, or thermal threshold exceeded…"
                style={{
                  width: '100%', padding: '6px 10px',
                  background: 'var(--bg-elevated)',
                  border: `1px solid ${errors.fault ? 'var(--red-base)' : 'var(--border-muted)'}`,
                  borderRadius: 4, color: 'var(--text-primary)',
                  fontSize: 12, outline: 'none', resize: 'vertical',
                }}
              />
              {errors.fault && <span style={{ fontSize: 9.5, color: 'var(--red-base)', marginTop: 2, display: 'block' }}>{errors.fault}</span>}
            </div>
          )}

          {/* Maintenance dates */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label className="section-label" style={{ display: 'block', marginBottom: 4 }}>
                Last Maintenance
              </label>
              <input
                type="date"
                value={formData.lastMaintenance}
                onChange={e => setFormData(prev => ({ ...prev, lastMaintenance: e.target.value }))}
                style={{
                  width: '100%', padding: '6px 10px',
                  background: 'var(--bg-elevated)', border: '1px solid var(--border-muted)',
                  borderRadius: 4, color: 'var(--text-primary)',
                  fontSize: 11, fontFamily: 'var(--font-mono)', outline: 'none',
                }}
              />
            </div>

            <div>
              <label className="section-label" style={{ display: 'block', marginBottom: 4 }}>
                Next Scheduled PM
              </label>
              <input
                type="date"
                value={formData.nextMaintenance}
                onChange={e => setFormData(prev => ({ ...prev, nextMaintenance: e.target.value }))}
                style={{
                  width: '100%', padding: '6px 10px',
                  background: 'var(--bg-elevated)', border: '1px solid var(--border-muted)',
                  borderRadius: 4, color: 'var(--text-primary)',
                  fontSize: 11, fontFamily: 'var(--font-mono)', outline: 'none',
                }}
              />
            </div>
          </div>

          {/* Telemetry Metrics (Optional) */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
            <div>
              <label className="section-label" style={{ display: 'block', marginBottom: 4 }}>
                CPU Load %
              </label>
              <input
                type="number"
                min="0"
                max="100"
                value={formData.cpu}
                onChange={e => setFormData(prev => ({ ...prev, cpu: e.target.value }))}
                placeholder="0–100"
                style={{
                  width: '100%', padding: '6px 10px',
                  background: 'var(--bg-elevated)', border: '1px solid var(--border-muted)',
                  borderRadius: 4, color: 'var(--text-primary)',
                  fontFamily: 'var(--font-mono)', fontSize: 11, outline: 'none',
                }}
              />
            </div>

            <div>
              <label className="section-label" style={{ display: 'block', marginBottom: 4 }}>
                RAM Usage %
              </label>
              <input
                type="number"
                min="0"
                max="100"
                value={formData.ram}
                onChange={e => setFormData(prev => ({ ...prev, ram: e.target.value }))}
                placeholder="0–100"
                style={{
                  width: '100%', padding: '6px 10px',
                  background: 'var(--bg-elevated)', border: '1px solid var(--border-muted)',
                  borderRadius: 4, color: 'var(--text-primary)',
                  fontFamily: 'var(--font-mono)', fontSize: 11, outline: 'none',
                }}
              />
            </div>

            <div>
              <label className="section-label" style={{ display: 'block', marginBottom: 4 }}>
                Temp °C
              </label>
              <input
                type="number"
                min="0"
                max="120"
                value={formData.temp}
                onChange={e => setFormData(prev => ({ ...prev, temp: e.target.value }))}
                placeholder="°C"
                style={{
                  width: '100%', padding: '6px 10px',
                  background: 'var(--bg-elevated)', border: '1px solid var(--border-muted)',
                  borderRadius: 4, color: 'var(--text-primary)',
                  fontFamily: 'var(--font-mono)', fontSize: 11, outline: 'none',
                }}
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="section-label" style={{ display: 'block', marginBottom: 4 }}>
              Operator Notes / Configuration
            </label>
            <input
              type="text"
              value={formData.notes}
              onChange={e => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="e.g. Standard lab image, SSD upgraded, GPU verified"
              style={{
                width: '100%', padding: '6px 10px',
                background: 'var(--bg-elevated)', border: '1px solid var(--border-muted)',
                borderRadius: 4, color: 'var(--text-primary)',
                fontSize: 11.5, outline: 'none',
              }}
            />
          </div>

          {/* Footer inside form */}
          <div
            className="flex items-center justify-end gap-8"
            style={{
              marginTop: 10, paddingTop: 12,
              borderTop: '1px solid var(--border-subtle)',
            }}
          >
            <button
              type="button"
              onClick={closeModal}
              style={{
                background: 'var(--bg-elevated)', border: '1px solid var(--border-muted)',
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
                background: 'rgba(74,158,255,0.15)', border: '1px solid rgba(74,158,255,0.4)',
                borderRadius: 4, padding: '7px 16px', fontSize: 11, color: 'var(--blue-base)',
                fontWeight: 600, cursor: isSubmitting ? 'not-allowed' : 'pointer',
                opacity: isSubmitting ? 0.6 : 1,
              }}
            >
              <Save size={13} />
              {isSubmitting ? 'Saving to MongoDB…' : (mode === 'add' ? 'Register Equipment' : 'Save Changes')}
            </button>
          </div>
        </form>
      </div>
    </>
  )
}
