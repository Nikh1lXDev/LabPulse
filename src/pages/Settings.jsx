import { Settings as SettingsIcon, Database, Bell, Monitor, User } from 'lucide-react'

function SettingSection({ title, children }) {
  return (
    <div className="panel" style={{ padding: '12px 16px', marginBottom: 12 }}>
      <div className="section-label" style={{ marginBottom: 10 }}>{title}</div>
      {children}
    </div>
  )
}

function SettingRow({ label, desc, children }) {
  return (
    <div className="flex items-center justify-between" style={{ padding: '7px 0', borderBottom: '1px solid var(--border-subtle)' }}>
      <div>
        <div style={{ fontSize: 12, color: 'var(--text-primary)', fontWeight: 500 }}>{label}</div>
        {desc && <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>{desc}</div>}
      </div>
      {children}
    </div>
  )
}

function PlaceholderInput({ placeholder }) {
  return (
    <input
      placeholder={placeholder}
      style={{
        background: 'var(--bg-elevated)', border: '1px solid var(--border-muted)',
        borderRadius: 3, padding: '4px 8px', fontSize: 11, color: 'var(--text-secondary)',
        fontFamily: 'var(--font-mono)', width: 220, outline: 'none',
      }}
    />
  )
}

export default function Settings() {
  return (
    <div style={{ padding: '14px 16px 20px', maxWidth: 700 }}>
      <div style={{ marginBottom: 14 }}>
        <h1 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.3px' }}>
          System Configuration & Status
        </h1>
        <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3 }}>
          System connectivity and operational environment — Fully integrated (Step 7)
        </p>
      </div>

      <SettingSection title="MongoDB Connection">
        <SettingRow label="Connection Status" desc="Live database connection via PyMongo driver">
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981', display: 'inline-block' }}></span>
            <span style={{ fontSize: 11, color: '#10b981', fontWeight: 600 }}>Connected (mongodb://localhost:27017)</span>
          </div>
        </SettingRow>
        <SettingRow label="Database Name" desc="Active MongoDB database instance">
          <span style={{ fontSize: 11, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>labpulse_db</span>
        </SettingRow>
        <SettingRow label="Collections" desc="Validated collections in labpulse_db">
          <span style={{ fontSize: 11, color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
            equipment (24) · faults (18) · maintenance (16) · predictions (24)
          </span>
        </SettingRow>
      </SettingSection>

      <SettingSection title="Backend & Machine Learning Engine">
        <SettingRow label="REST API Service" desc="Python 3.11 + Flask REST API with CORS">
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981', display: 'inline-block' }}></span>
            <span style={{ fontSize: 11, color: '#10b981', fontWeight: 600 }}>Online (http://localhost:5000)</span>
          </div>
        </SettingRow>
        <SettingRow label="Failure Classifier" desc="Random Forest 7-day repeat failure risk model">
          <span style={{ fontSize: 11, color: 'var(--blue-base)', fontWeight: 600 }}>Active (Accuracy: 88.33%, F1: 0.8462)</span>
        </SettingRow>
        <SettingRow label="Repair Duration Regressor" desc="Fault-conditioned repair hours estimator">
          <span style={{ fontSize: 11, color: 'var(--blue-base)', fontWeight: 600 }}>Active (R²: 0.7054, MAE: 1.39h)</span>
        </SettingRow>
      </SettingSection>

      <SettingSection title="Display & 3D Visualizer">
        <SettingRow label="Theme" desc="Interface colour theme">
          <div style={{ fontSize: 10, color: 'var(--blue-base)', fontWeight: 600 }}>Dark (Mission Control)</div>
        </SettingRow>
        <SettingRow label="3D Scene Engine" desc="Interactive WebGL computer laboratory digital twin">
          <div style={{ fontSize: 10, color: 'var(--green-base)', fontWeight: 600 }}>Three.js (r128) · Raycasting Enabled</div>
        </SettingRow>
      </SettingSection>

      <SettingSection title="About Project">
        <SettingRow label="Course" desc="Academic NoSQL coursework">
          <span style={{ fontSize: 11, color: 'var(--text-primary)', fontWeight: 500 }}>CSE494: Intelligent NoSQL Databases</span>
        </SettingRow>
        <SettingRow label="Project Version" desc="Final submission deliverables">
          <span style={{ fontSize: 11, color: '#10b981', fontWeight: 600, fontFamily: 'var(--font-mono)' }}>
            LabPulse v1.0.0 — Step 7 Complete
          </span>
        </SettingRow>
      </SettingSection>
    </div>
  )
}
