import { CheckCircle2, AlertTriangle, Info, X } from 'lucide-react'
import { useEquipment } from '../context/EquipmentContext'

export default function Toast() {
  const { toast, hideToast } = useEquipment()

  if (!toast) return null

  const isSuccess = toast.type === 'success'
  const isError = toast.type === 'error'

  const borderColor = isSuccess ? 'rgba(61,220,132,0.3)' : (isError ? 'rgba(232,69,60,0.3)' : 'rgba(74,158,255,0.3)')
  const bg = 'var(--bg-elevated)'
  const iconColor = isSuccess ? 'var(--green-base)' : (isError ? 'var(--red-base)' : 'var(--blue-base)')

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 24,
        right: 24,
        zIndex: 99999,
        background: bg,
        border: `1px solid ${borderColor}`,
        borderRadius: 6,
        padding: '10px 14px',
        boxShadow: '0 10px 30px rgba(0, 0, 0, 0.65), 0 0 15px rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        maxWidth: 420,
        animation: 'slideInRight 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
      }}
    >
      <div style={{ flexShrink: 0, color: iconColor }}>
        {isSuccess && <CheckCircle2 size={16} />}
        {isError && <AlertTriangle size={16} />}
        {!isSuccess && !isError && <Info size={16} />}
      </div>

      <div style={{ flex: 1, fontSize: 12, color: 'var(--text-primary)', lineHeight: 1.4 }}>
        {toast.message}
      </div>

      <button
        onClick={hideToast}
        style={{
          background: 'none',
          border: 'none',
          color: 'var(--text-muted)',
          cursor: 'pointer',
          padding: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
        title="Dismiss"
      >
        <X size={14} />
      </button>
    </div>
  )
}
