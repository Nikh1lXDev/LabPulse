// src/pages/Analytics.jsx
// ─────────────────────────────────────────────────────────────────────────────
// LabPulse — Analytics & Database Insights Page
// Course: CSE494 Intelligent NoSQL Databases
//
// Step 5: This page fetches live data from MongoDB using aggregation pipelines,
// indexes, schema validators, and query execution statistics.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useCallback } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts'
import {
  Database, Layers, Search, Zap, ShieldCheck,
  RefreshCw, ChevronDown, ChevronUp, AlertTriangle, CheckCircle2,
  Activity, HardDrive
} from 'lucide-react'

// ─── Color palette aligned with existing LabPulse design system ─────────────
const COLORS = {
  green:  '#22c55e',
  amber:  '#f59e0b',
  red:    '#ef4444',
  blue:   '#3b82f6',
  purple: '#a855f7',
  cyan:   '#06b6d4',
  gray:   '#6b7280',
}

const SEV_COLORS = {
  Critical: '#ef4444',
  High:     '#f59e0b',
  Medium:   '#3b82f6',
  Low:      '#22c55e',
}

// ─── Small reusable stat card ────────────────────────────────────────────────
function MiniStat({ label, value, color = 'var(--text-primary)', icon: Icon }) {
  return (
    <div className="stat-card" style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {Icon && <Icon size={14} color={color} style={{ marginBottom: 2 }} />}
      <div className="stat-value" style={{ color, fontSize: 20 }}>{value ?? '—'}</div>
      <div className="stat-label">{label}</div>
    </div>
  )
}

// ─── Section panel with collapse toggle ─────────────────────────────────────
function CollapsiblePanel({ sKey, label, icon: Icon, iconColor, expandedSection, onToggle, children }) {
  const isOpen = expandedSection === sKey
  return (
    <div className="panel" style={{ padding: 0, marginBottom: 12, overflow: 'hidden' }}>
      <button
        onClick={() => onToggle(sKey)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 8,
          background: 'transparent', border: 'none', cursor: 'pointer',
          padding: '10px 14px',
          borderBottom: isOpen ? '1px solid rgba(255,255,255,0.08)' : 'none',
        }}
      >
        <Icon size={13} color={iconColor} />
        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>{label}</span>
        <span style={{ marginLeft: 'auto' }}>
          {isOpen
            ? <ChevronUp size={12} color="var(--text-muted)" />
            : <ChevronDown size={12} color="var(--text-muted)" />
          }
        </span>
      </button>
      {isOpen && <div style={{ padding: '10px 14px' }}>{children}</div>}
    </div>
  )
}

// ─── Query performance row ───────────────────────────────────────────────────
function QueryPerfRow({ q }) {
  const stats = q.stats || {}
  const isGood = stats.indexUsed
  return (
    <div style={{
      padding: '8px 10px', marginBottom: 6, borderRadius: 6,
      background: 'rgba(0,0,0,0.2)',
      border: `1px solid ${isGood ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)'}`,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5 }}>
        {isGood
          ? <CheckCircle2 size={12} color={COLORS.green} />
          : <AlertTriangle size={12} color={COLORS.red} />
        }
        <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-primary)' }}>{q.name}</span>
        <span style={{
          marginLeft: 'auto', fontSize: 10, padding: '1px 6px',
          borderRadius: 8, fontWeight: 700, letterSpacing: '0.4px',
          background: isGood ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)',
          color: isGood ? COLORS.green : COLORS.red
        }}>
          {stats.scanType || '?'}
        </span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 4 }}>
        {[
          { label: 'Time (ms)',     val: stats.executionTimeMillis },
          { label: 'Returned',      val: stats.nReturned },
          { label: 'Docs Examined', val: stats.totalDocsExamined },
          { label: 'Keys Scanned',  val: stats.totalKeysExamined },
        ].map(m => (
          <div key={m.label} style={{
            textAlign: 'center', padding: '4px 0',
            background: 'rgba(255,255,255,0.03)', borderRadius: 4
          }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>
              {m.val ?? '—'}
            </div>
            <div style={{ fontSize: 9, color: 'var(--text-muted)', marginTop: 1 }}>{m.label}</div>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 5, fontSize: 10, color: 'var(--text-muted)' }}>
        <span style={{ fontWeight: 600, color: COLORS.cyan }}>Index: </span>
        {q.indexName} · Collection: {q.collection}
      </div>
    </div>
  )
}

// ─── Index type badges ────────────────────────────────────────────────────────
const INDEX_TYPE_LABELS = {
  '1': { label: 'ASC', color: COLORS.blue },
  '-1': { label: 'DESC', color: COLORS.purple },
  'text': { label: 'TEXT', color: COLORS.cyan },
}

function IndexCard({ idx }) {
  const keys = idx.key || {}
  const isUnique = idx.unique === true
  return (
    <div style={{
      padding: '7px 10px', marginBottom: 6, borderRadius: 6,
      background: 'rgba(255,255,255,0.03)',
      border: '1px solid rgba(255,255,255,0.07)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-primary)' }}>
          {idx.name}
        </span>
        {isUnique && (
          <span style={{
            fontSize: 9, padding: '1px 5px', borderRadius: 6,
            background: 'rgba(168,85,247,0.15)', color: COLORS.purple, fontWeight: 700
          }}>UNIQUE</span>
        )}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 4 }}>
          {Object.entries(keys).map(([field, type]) => {
            const typeStr = String(type)
            const badge = INDEX_TYPE_LABELS[typeStr] || { label: typeStr, color: COLORS.gray }
            return (
              <span key={field} style={{
                fontSize: 9, padding: '1px 5px', borderRadius: 5,
                background: `${badge.color}22`, color: badge.color, fontWeight: 600
              }}>
                {field} · {badge.label}
              </span>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ─── Validation status row ───────────────────────────────────────────────────
function ValidationRow({ colName, info }) {
  const has = info?.hasValidator
  return (
    <div style={{
      padding: '8px 10px', marginBottom: 6, borderRadius: 6,
      background: 'rgba(255,255,255,0.03)',
      border: `1px solid ${has ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.15)'}`,
      display: 'flex', alignItems: 'center', gap: 8
    }}>
      {has
        ? <ShieldCheck size={13} color={COLORS.green} />
        : <AlertTriangle size={13} color={COLORS.amber} />
      }
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-primary)' }}>{colName}</div>
        <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 1 }}>
          {has
            ? <>Level: <b style={{ color: COLORS.blue }}>{info.validationLevel}</b> · Action: <b style={{ color: COLORS.green }}>{info.validationAction}</b></>
            : 'No validator applied'
          }
        </div>
      </div>
      <span style={{
        fontSize: 9, padding: '2px 7px', borderRadius: 8, fontWeight: 700,
        background: has ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.12)',
        color: has ? COLORS.green : COLORS.red
      }}>
        {has ? 'ACTIVE' : 'NONE'}
      </span>
    </div>
  )
}

// ─── Text Search Demo ─────────────────────────────────────────────────────────
function TextSearchDemo() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState(null)
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)

  const doSearch = async (e) => {
    e.preventDefault()
    const q = query.trim()
    if (!q) return
    setLoading(true)
    setSearched(true)
    try {
      const res = await fetch(`/api/faults?q=${encodeURIComponent(q)}`)
      if (res.ok) setResults(await res.json())
      else setResults({ results: [], count: 0, query: q })
    } catch {
      setResults(null)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="panel" style={{ padding: 0, marginBottom: 12, overflow: 'hidden' }}>
      <div style={{ padding: '10px 14px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Search size={13} color={COLORS.cyan} />
          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>
            Full-Text Search — MongoDB Text Index Demo
          </span>
        </div>
      </div>
      <div style={{ padding: '10px 14px' }}>
        <p style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 8, lineHeight: 1.6 }}>
          Uses <code style={{ color: COLORS.cyan }}>$text / $search</code> against <code style={{ color: COLORS.cyan }}>idx_faults_description_text</code>.
          Results sorted by <code style={{ color: COLORS.cyan }}>{'{$meta: "textScore"}'}</code>. Try:{' '}
          <em style={{ color: COLORS.amber }}>temperature, fan, HDD, battery, packet</em>
        </p>
        <form onSubmit={doSearch} style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search fault descriptions..."
            style={{
              flex: 1, padding: '6px 10px', borderRadius: 6,
              background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)',
              color: 'var(--text-primary)', fontSize: 12, outline: 'none',
            }}
          />
          <button type="submit" disabled={loading || !query.trim()} style={{
            padding: '6px 14px', borderRadius: 6, border: 'none',
            background: 'var(--blue-base)', color: '#fff', fontSize: 11, fontWeight: 600,
            cursor: (loading || !query.trim()) ? 'not-allowed' : 'pointer',
            opacity: (loading || !query.trim()) ? 0.5 : 1
          }}>
            {loading ? '...' : 'Search'}
          </button>
        </form>
        {searched && results && (
          <div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 6 }}>
              {results.count ?? 0} result(s) for &ldquo;<em>{results.query}</em>&rdquo;
            </div>
            {(results.results || []).length === 0
              ? <div style={{ fontSize: 11, color: 'var(--text-muted)', padding: '6px 0' }}>No matching faults found.</div>
              : (results.results || []).map(f => (
                  <div key={f.id} style={{
                    padding: '7px 10px', marginBottom: 5, borderRadius: 6,
                    background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                      <code style={{ fontSize: 10, color: COLORS.blue, fontWeight: 700 }}>{f.id}</code>
                      <span style={{
                        fontSize: 9, padding: '1px 5px', borderRadius: 4, fontWeight: 700,
                        background: `${SEV_COLORS[f.severity] || COLORS.gray}20`,
                        color: SEV_COLORS[f.severity] || COLORS.gray
                      }}>{f.severity}</span>
                      <span style={{ fontSize: 10, color: 'var(--text-muted)', marginLeft: 'auto' }}>{f.equipId}</span>
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-primary)', lineHeight: 1.4 }}>{f.description}</div>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>{f.status} · {f.reportedDate}</div>
                  </div>
                ))
            }
          </div>
        )}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Analytics Page Component
// ─────────────────────────────────────────────────────────────────────────────
export default function Analytics() {
  const [overview,      setOverview]      = useState(null)
  const [equipByLab,    setEquipByLab]    = useState([])
  const [faultAnalysis, setFaultAnalysis] = useState(null)
  const [maintSummary,  setMaintSummary]  = useState(null)
  const [queryPerf,     setQueryPerf]     = useState(null)
  const [indexes,       setIndexes]       = useState(null)
  const [validation,    setValidation]    = useState(null)
  const [loading,       setLoading]       = useState(false)
  const [error,         setError]         = useState(null)
  const [expandedSection, setExpandedSection] = useState('perf')

  const fetchAll = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [ovRes, labRes, faultRes, maintRes, perfRes, idxRes, valRes] = await Promise.all([
        fetch('/api/analytics/overview-summary'),
        fetch('/api/analytics/equipment-by-lab'),
        fetch('/api/analytics/fault-analysis'),
        fetch('/api/analytics/maintenance-summary'),
        fetch('/api/database/query-performance'),
        fetch('/api/database/indexes'),
        fetch('/api/database/validation'),
      ])
      if (ovRes.ok)    setOverview(await ovRes.json())
      if (labRes.ok)   setEquipByLab(await labRes.json())
      if (faultRes.ok) setFaultAnalysis(await faultRes.json())
      if (maintRes.ok) setMaintSummary(await maintRes.json())
      if (perfRes.ok)  setQueryPerf(await perfRes.json())
      if (idxRes.ok)   setIndexes(await idxRes.json())
      if (valRes.ok)   setValidation(await valRes.json())
    } catch {
      setError('Could not reach backend. Is the Flask server running on port 5000?')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  const toggleSection = (key) => setExpandedSection(prev => prev === key ? null : key)

  const labChartData = equipByLab.map(l => ({
    name: l.labId,
    Healthy: l.healthy,
    Warning: l.warning,
    Critical: l.critical,
  }))

  const sevChartData = (faultAnalysis?.bySeverity || []).map(s => ({
    name: s.severity,
    Open: s.open,
    Resolved: s.resolved,
  }))

  const maintDonutData = (maintSummary?.byStatus || []).map(s => ({
    name: s.status,
    value: s.count,
    color: s.status === 'Completed' ? COLORS.green
         : s.status === 'Overdue'   ? COLORS.red
         : s.status === 'Due'       ? COLORS.amber
         : COLORS.blue,
  }))

  const allIndexes = indexes
    ? Object.entries(indexes).filter(([k]) => k !== 'error')
    : []

  return (
    <div style={{ padding: '14px 16px 28px' }}>

      {/* Page Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <div style={{ flex: 1 }}>
          <h1 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.3px' }}>
            Analytics &amp; Database Insights
          </h1>
          <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3 }}>
            Live MongoDB aggregations · Indexes · Schema validation · Query performance
          </p>
        </div>
        <button
          onClick={fetchAll}
          disabled={loading}
          style={{
            display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px',
            background: 'var(--blue-base)', border: 'none', borderRadius: 6,
            color: '#fff', fontSize: 11, fontWeight: 600, cursor: loading ? 'wait' : 'pointer',
            opacity: loading ? 0.7 : 1,
          }}
        >
          <RefreshCw size={11} />
          {loading ? 'Fetching...' : 'Refresh'}
        </button>
      </div>

      {error && (
        <div style={{
          padding: '10px 14px', borderRadius: 8, marginBottom: 14,
          background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
          color: '#ef4444', fontSize: 12
        }}>
          &#9888; {error}
        </div>
      )}

      {/* Overview Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 14 }}>
        <MiniStat icon={HardDrive}     label="Total Equipment" value={overview?.equipment?.total}    color={COLORS.blue}   />
        <MiniStat icon={CheckCircle2}  label="Healthy"         value={overview?.equipment?.healthy}  color={COLORS.green}  />
        <MiniStat icon={AlertTriangle} label="Open Faults"     value={overview?.faults?.open}        color={COLORS.amber}  />
        <MiniStat icon={Zap}           label="Critical Faults" value={overview?.faults?.critical}    color={COLORS.red}    />
      </div>

      {/* Charts row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
        <div className="panel" style={{ padding: '10px 12px' }}>
          <div className="section-label" style={{ marginBottom: 6 }}>
            Equipment by Lab &middot; <span style={{ color: COLORS.cyan, fontStyle: 'italic' }}>Live $group aggregation</span>
          </div>
          {labChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={150}>
              <BarChart data={labChartData} margin={{ top: 0, right: 0, bottom: 0, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="name" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} />
                <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 10 }} />
                <Tooltip contentStyle={{ background: 'var(--panel-bg)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, fontSize: 11 }} />
                <Bar dataKey="Healthy"  fill={COLORS.green} radius={[2,2,0,0]} />
                <Bar dataKey="Warning"  fill={COLORS.amber} radius={[2,2,0,0]} />
                <Bar dataKey="Critical" fill={COLORS.red}   radius={[2,2,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ height: 150, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: 11 }}>
              {loading ? 'Loading…' : 'No data (backend offline?)'}
            </div>
          )}
        </div>

        <div className="panel" style={{ padding: '10px 12px' }}>
          <div className="section-label" style={{ marginBottom: 6 }}>
            Faults by Severity &middot; <span style={{ color: COLORS.cyan, fontStyle: 'italic' }}>Live $group aggregation</span>
          </div>
          {sevChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={150}>
              <BarChart data={sevChartData} margin={{ top: 0, right: 0, bottom: 0, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="name" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} />
                <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 10 }} />
                <Tooltip contentStyle={{ background: 'var(--panel-bg)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, fontSize: 11 }} />
                <Bar dataKey="Open"     fill={COLORS.red}   radius={[2,2,0,0]} />
                <Bar dataKey="Resolved" fill={COLORS.green} radius={[2,2,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ height: 150, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: 11 }}>
              {loading ? 'Loading…' : 'No data'}
            </div>
          )}
        </div>
      </div>

      {/* Maintenance donut + Fleet averages */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
        <div className="panel" style={{ padding: '10px 12px' }}>
          <div className="section-label" style={{ marginBottom: 6 }}>
            Maintenance Status &middot; <span style={{ color: COLORS.cyan, fontStyle: 'italic' }}>Live $group</span>
          </div>
          {maintDonutData.length > 0 ? (
            <ResponsiveContainer width="100%" height={140}>
              <PieChart>
                <Pie data={maintDonutData} cx="50%" cy="50%" innerRadius={38} outerRadius={58}
                     paddingAngle={3} dataKey="value">
                  {maintDonutData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Legend iconType="circle" iconSize={8}
                  formatter={v => <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{v}</span>} />
                <Tooltip contentStyle={{ background: 'var(--panel-bg)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ height: 140, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: 11 }}>
              {loading ? 'Loading…' : 'No data'}
            </div>
          )}
        </div>

        <div className="panel" style={{ padding: '10px 12px' }}>
          <div className="section-label" style={{ marginBottom: 8 }}>
            Fleet Averages &middot; <span style={{ color: COLORS.cyan, fontStyle: 'italic' }}>$avg aggregation</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6, marginBottom: 10 }}>
            {[
              { label: 'Avg CPU %',   value: overview?.equipment?.avgCpu,  color: COLORS.blue   },
              { label: 'Avg Temp °C', value: overview?.equipment?.avgTemp, color: COLORS.amber  },
              { label: 'Avg RAM %',   value: overview?.equipment?.avgRam,  color: COLORS.purple },
            ].map(m => (
              <div key={m.label} style={{
                textAlign: 'center', padding: '10px 6px', borderRadius: 6,
                background: 'rgba(255,255,255,0.03)'
              }}>
                <div style={{ fontSize: 20, fontWeight: 700, color: m.color }}>{m.value ?? '—'}</div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 3 }}>{m.label}</div>
              </div>
            ))}
          </div>
          {faultAnalysis?.bySeverity && (
            <>
              <div className="section-label" style={{ marginBottom: 6 }}>Avg Repair Hours by Severity</div>
              {faultAnalysis.bySeverity.map(s => (
                <div key={s.severity} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <span style={{
                    fontSize: 9, padding: '1px 5px', borderRadius: 5, fontWeight: 700,
                    background: `${SEV_COLORS[s.severity] || COLORS.gray}22`,
                    color: SEV_COLORS[s.severity] || COLORS.gray, minWidth: 50, textAlign: 'center'
                  }}>{s.severity}</span>
                  <div style={{ flex: 1, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.07)', overflow: 'hidden' }}>
                    <div style={{
                      height: '100%', borderRadius: 2,
                      width: `${Math.min((s.avgRepairHours || 0) / 5 * 100, 100)}%`,
                      background: SEV_COLORS[s.severity] || COLORS.gray
                    }} />
                  </div>
                  <span style={{ fontSize: 10, color: 'var(--text-primary)', minWidth: 36, textAlign: 'right' }}>
                    {s.avgRepairHours != null ? `${s.avgRepairHours}h` : 'N/A'}
                  </span>
                </div>
              ))}
            </>
          )}
        </div>
      </div>

      {/* ══ DATABASE INSIGHTS ══════════════════════════════════════════════════ */}
      <div style={{ borderTop: '2px solid rgba(59,130,246,0.3)', paddingTop: 14, marginTop: 4 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <Database size={15} color={COLORS.blue} />
          <h2 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.2px' }}>
            Database Insights
          </h2>
          <span style={{
            fontSize: 9, padding: '2px 8px', borderRadius: 10,
            background: 'rgba(59,130,246,0.15)', color: COLORS.blue, fontWeight: 700, letterSpacing: '0.5px'
          }}>CSE494 — Step 5</span>
        </div>

        {/* Query Performance */}
        <CollapsiblePanel sKey="perf" label="Query Execution Analysis — explain('executionStats')"
          icon={Zap} iconColor={COLORS.amber} expandedSection={expandedSection} onToggle={toggleSection}>
          <p style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 8, lineHeight: 1.6 }}>
            <code style={{ color: COLORS.cyan }}>explain('executionStats')</code> shows HOW MongoDB executed a query.
            <b style={{ color: COLORS.green }}> IXSCAN</b> = index used (efficient) ·
            <b style={{ color: COLORS.red }}> COLLSCAN</b> = full scan (slow).
          </p>
          {queryPerf?.queries?.length > 0
            ? queryPerf.queries.map((q, i) => <QueryPerfRow key={i} q={q} />)
            : <div style={{ color: 'var(--text-muted)', fontSize: 11, padding: '8px 0' }}>
                {loading ? 'Loading execution stats…' : 'No data. Is Flask running?'}
              </div>
          }
        </CollapsiblePanel>

        {/* Indexes */}
        <CollapsiblePanel sKey="indexes" label="Index Definitions — Unique, Compound & Text Indexes"
          icon={Layers} iconColor={COLORS.purple} expandedSection={expandedSection} onToggle={toggleSection}>
          <p style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 8, lineHeight: 1.6 }}>
            Three index types used:
            <b style={{ color: COLORS.purple }}> UNIQUE</b> (primary key),
            <b style={{ color: COLORS.blue }}> COMPOUND</b> (labId+status, equipId+status), and
            <b style={{ color: COLORS.cyan }}> TEXT</b> (fault keyword search).
          </p>
          {allIndexes.length > 0
            ? allIndexes.map(([colName, idxList]) => (
                <div key={colName} style={{ marginBottom: 10 }}>
                  <div style={{
                    fontSize: 10, fontWeight: 700, color: COLORS.blue,
                    textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 5
                  }}>{colName} collection</div>
                  {idxList
                    .filter(idx => idx.name !== '_id_')
                    .map((idx, i) => <IndexCard key={i} idx={idx} />)
                  }
                </div>
              ))
            : <div style={{ color: 'var(--text-muted)', fontSize: 11 }}>
                {loading ? 'Loading indexes…' : 'No index data. Is Flask running?'}
              </div>
          }
        </CollapsiblePanel>

        {/* Schema Validation */}
        <CollapsiblePanel sKey="validation" label="JSON Schema Validation — $jsonSchema Validators"
          icon={ShieldCheck} iconColor={COLORS.green} expandedSection={expandedSection} onToggle={toggleSection}>
          <p style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 8, lineHeight: 1.6 }}>
            Each collection has a <code style={{ color: COLORS.cyan }}>$jsonSchema</code> validator applied via
            <code style={{ color: COLORS.cyan }}> db.command(collMod)</code>.
            Validation level <b style={{ color: COLORS.blue }}>moderate</b> enforces rules on inserts and updates to compliant documents.
          </p>
          {validation && !validation.error
            ? Object.entries(validation).map(([colName, info]) => (
                <ValidationRow key={colName} colName={colName} info={info} />
              ))
            : <div style={{ color: 'var(--text-muted)', fontSize: 11 }}>
                {loading ? 'Checking validators…' : (validation?.error || 'No data. Is Flask running?')}
              </div>
          }
        </CollapsiblePanel>

        {/* Text Search Demo */}
        <TextSearchDemo />

        {/* Aggregation Pipeline Reference */}
        <CollapsiblePanel sKey="pipelines" label="Aggregation Pipeline Reference — Stage-by-Stage"
          icon={Activity} iconColor={COLORS.cyan} expandedSection={expandedSection} onToggle={toggleSection}>
          <p style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 10, lineHeight: 1.6 }}>
            MongoDB aggregation pipelines process documents through a series of stages (like Unix pipes).
            Below are the four pipelines used in LabPulse.
          </p>
          {[
            {
              name: 'Equipment by Lab',
              endpoint: 'GET /api/analytics/equipment-by-lab',
              stages: ['$group (by labId)', '$project (rename + round)', '$sort (labId ASC)'],
              purpose: 'Count healthy/warning/critical equipment and average CPU/temp per lab.',
            },
            {
              name: 'Fault Analysis by Severity',
              endpoint: 'GET /api/analytics/fault-analysis',
              stages: ['$group (by severity)', '$project (round repairHours)', '$sort (total DESC)'],
              purpose: 'Count faults per severity and compute average repair time.',
            },
            {
              name: 'Maintenance Summary',
              endpoint: 'GET /api/analytics/maintenance-summary',
              stages: ['$match (non-completed only)', '$group (by labId)', '$project', '$sort (overdue DESC)'],
              purpose: 'Show pending, due, and overdue maintenance tasks per lab.',
            },
            {
              name: 'Overview Summary',
              endpoint: 'GET /api/analytics/overview-summary',
              stages: ['$group (_id: null)', '$avg (cpu/temp/ram)', '$project (round values)'],
              purpose: 'Fleet-wide averages and counts for the dashboard summary.',
            },
          ].map(p => (
            <div key={p.name} style={{
              padding: '8px 10px', marginBottom: 6, borderRadius: 6,
              background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-primary)' }}>{p.name}</span>
                <code style={{ fontSize: 9, color: COLORS.cyan, marginLeft: 'auto' }}>{p.endpoint}</code>
              </div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 5 }}>{p.purpose}</div>
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                {p.stages.map((s, i) => (
                  <span key={i} style={{
                    fontSize: 9, padding: '1px 6px', borderRadius: 5,
                    background: `${COLORS.blue}15`, color: COLORS.blue, fontWeight: 600
                  }}>{s}</span>
                ))}
              </div>
            </div>
          ))}
        </CollapsiblePanel>

      </div>
    </div>
  )
}
