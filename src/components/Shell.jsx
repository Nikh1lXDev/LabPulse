import { NavLink, Outlet } from 'react-router-dom'
import {
  LayoutDashboard, Cpu, AlertTriangle, TrendingUp,
  FlaskConical, BarChart3, Settings, Search,
  Bell, User, Wifi, WifiOff, Zap,
} from 'lucide-react'
import { useEquipment } from '../context/EquipmentContext'

// ─── Top-bar status bar ───────────────────────────────────────────────────────
function TopBar() {
  const { mongoStatus, fetchHealth } = useEquipment()

  return (
    <header
      className="flex items-center gap-3 px-4 shrink-0 z-30 relative"
      style={{
        height: 'var(--topbar-height)',
        background: 'var(--bg-surface)',
        borderBottom: '1px solid var(--border-subtle)',
      }}
    >
      {/* Logo */}
      <div className="flex items-center gap-2 shrink-0" style={{ width: 'var(--nav-width)', paddingLeft: 8 }}>
        <div
          className="flex items-center justify-center rounded"
          style={{
            width: 26, height: 26,
            background: 'linear-gradient(135deg, #1a3a5c 0%, #0d2040 100%)',
            border: '1px solid rgba(74,158,255,0.3)',
          }}
        >
          <Zap size={13} color="#4a9eff" strokeWidth={2.5} />
        </div>
        <span style={{ fontWeight: 700, fontSize: 13, letterSpacing: '-0.3px', color: 'var(--text-primary)' }}>
          Lab<span style={{ color: '#4a9eff' }}>Pulse</span>
        </span>
        <span
          className="font-mono"
          style={{ fontSize: 8, color: 'var(--text-muted)', marginLeft: 2, letterSpacing: '0.08em' }}
        >
          v0.1
        </span>
      </div>

      {/* Search */}
      <div className="search-box" style={{ marginLeft: 8 }}>
        <Search size={12} color="var(--text-muted)" />
        <input type="text" placeholder="Search equipment, labs, faults…" />
      </div>

      <div className="flex-1" />

      {/* Dynamic MongoDB Live Status Indicator */}
      <div
        className="flex items-center gap-2 font-mono"
        style={{
          fontSize: 10,
          background: 'var(--bg-elevated)',
          border: `1px solid ${mongoStatus.isConnected ? 'rgba(61,220,132,0.3)' : (mongoStatus.isConnected === false ? 'rgba(232,69,60,0.3)' : 'var(--border-subtle)')}`,
          borderRadius: 3, padding: '3px 8px',
          color: mongoStatus.isConnected ? 'var(--green-base)' : (mongoStatus.isConnected === false ? 'var(--red-base)' : 'var(--text-muted)'),
          cursor: 'pointer',
        }}
        onClick={fetchHealth}
        title={mongoStatus.isConnected ? `Connected to ${mongoStatus.database} via PyMongo` : (mongoStatus.error || 'MongoDB disconnected. Click to recheck.')}
      >
        {mongoStatus.isConnected ? (
          <>
            <Wifi size={11} color="var(--green-base)" />
            <span>MongoDB: connected ({mongoStatus.database})</span>
          </>
        ) : mongoStatus.isConnected === false ? (
          <>
            <WifiOff size={11} color="var(--red-base)" />
            <span>MongoDB: disconnected</span>
          </>
        ) : (
          <>
            <span className="dot dot-amber" />
            <span>MongoDB: checking…</span>
          </>
        )}
      </div>

      {/* Notification bell */}
      <button
        style={{
          position: 'relative', background: 'var(--bg-elevated)',
          border: '1px solid var(--border-subtle)', borderRadius: 4,
          padding: '5px 7px', cursor: 'pointer', color: 'var(--text-secondary)',
          display: 'flex', alignItems: 'center',
        }}
        aria-label="Notifications"
      >
        <Bell size={14} />
        {/* Alert badge */}
        <span
          style={{
            position: 'absolute', top: 3, right: 3,
            width: 6, height: 6, borderRadius: '50%',
            background: 'var(--red-base)',
            border: '1px solid var(--bg-surface)',
          }}
        />
      </button>

      {/* User profile */}
      <div
        className="flex items-center gap-2"
        style={{
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 4, padding: '4px 8px', cursor: 'pointer',
        }}
      >
        <User size={13} color="var(--text-secondary)" />
        <span style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 500 }}>Student</span>
      </div>
    </header>
  )
}

// ─── Navigation items ─────────────────────────────────────────────────────────
const NAV_ITEMS = [
  { to: '/overview',    icon: LayoutDashboard, label: 'Overview' },
  { to: '/equipment',   icon: Cpu,             label: 'Equipment' },
  { to: '/fault-logs',  icon: AlertTriangle,   label: 'Fault Logs' },
  { to: '/predictions', icon: TrendingUp,       label: 'Predictions' },
  { to: '/labs',        icon: FlaskConical,    label: 'Labs' },
  { to: '/analytics',   icon: BarChart3,       label: 'Analytics' },
  { to: '/settings',    icon: Settings,        label: 'Settings' },
]

function NavRail() {
  return (
    <nav
      className="shrink-0 flex flex-col relative z-20"
      style={{
        width: 'var(--nav-width)',
        background: 'var(--bg-surface)',
        borderRight: '1px solid var(--border-subtle)',
        padding: '8px 8px',
        gap: 2,
        overflowY: 'auto',
      }}
    >
      <div className="section-label" style={{ padding: '8px 6px 6px' }}>Navigation</div>
      {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
        >
          <Icon size={15} className="nav-icon" />
          <span className="nav-label">{label}</span>
        </NavLink>
      ))}

      {/* Spacer + course badge at bottom */}
      <div style={{ flex: 1 }} />
      <div
        style={{
          margin: '8px 4px 4px',
          padding: '8px 10px',
          background: 'rgba(74,158,255,0.06)',
          border: '1px solid rgba(74,158,255,0.12)',
          borderRadius: 5,
        }}
      >
        <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
          Course
        </div>
        <div style={{ fontSize: 10, color: 'var(--blue-base)', fontWeight: 600, marginTop: 3 }}>
          CSE494
        </div>
        <div style={{ fontSize: 9, color: 'var(--text-muted)', marginTop: 2 }}>
          Intelligent NoSQL Databases
        </div>
      </div>
    </nav>
  )
}

// ─── Shell layout ─────────────────────────────────────────────────────────────
export default function Shell() {
  return (
    <div
      className="flex flex-col"
      style={{ width: '100vw', height: '100vh', overflow: 'hidden', position: 'relative', zIndex: 1 }}
    >
      <TopBar />
      <div className="flex flex-1" style={{ overflow: 'hidden' }}>
        <NavRail />
        {/* Page content */}
        <main className="flex-1 content-scroll" style={{ background: 'var(--bg-base)' }}>
          <Outlet />
        </main>
      </div>
    </div>
  )
}
