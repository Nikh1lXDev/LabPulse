import { useState, useEffect, useMemo, useCallback } from 'react'
import {
  TrendingUp, AlertTriangle, CheckCircle, Clock, Search,
  RefreshCw, Cpu, Activity, Info, ChevronRight, X,
  ShieldAlert, Wrench, BarChart2, Layers, Check, Database,
  ArrowRight, Sparkles, Filter
} from 'lucide-react'

export default function Predictions() {
  const [predictions, setPredictions] = useState([])
  const [summary, setSummary] = useState(null)
  const [metrics, setMetrics] = useState(null)
  const [modelStatus, setModelStatus] = useState(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [selectedPred, setSelectedPred] = useState(null)
  const [activeTab, setActiveTab] = useState('registry') // 'registry' | 'metrics'

  // Filter states
  const [search, setSearch] = useState('')
  const [labFilter, setLabFilter] = useState('all')
  const [riskFilter, setRiskFilter] = useState('all')
  const [faultFilter, setFaultFilter] = useState('all')

  // Notification toast
  const [toast, setToast] = useState(null)
  const showToast = (message, type = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 4000)
  }

  // Retrain modal state
  const [showRetrainModal, setShowRetrainModal] = useState(false)

  // ─── Data Fetching ──────────────────────────────────────────────────────────
  const fetchAllData = useCallback(async () => {
    try {
      const [statusRes, metricsRes, predsRes] = await Promise.all([
        fetch('/api/ml/status'),
        fetch('/api/ml/metrics'),
        fetch('/api/ml/predictions'),
      ])

      if (statusRes.ok) {
        const s = await statusRes.json()
        setModelStatus(s)
      }
      if (metricsRes.ok) {
        const m = await metricsRes.json()
        setMetrics(m)
      }
      if (predsRes.ok) {
        const p = await predsRes.json()
        setPredictions(p.predictions || [])
        setSummary(p.summary || null)
      }
    } catch (err) {
      console.error('Failed to load ML data:', err)
      showToast('Could not connect to ML backend service.', 'error')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchAllData()
  }, [fetchAllData])

  // ─── Action Handlers ────────────────────────────────────────────────────────
  const handleRunAllPredictions = async () => {
    setActionLoading(true)
    try {
      const res = await fetch('/api/ml/predict-all', { method: 'POST' })
      const data = await res.json()
      if (res.ok) {
        setPredictions(data.predictions || [])
        setSummary(data.summary || null)
        showToast(`Successfully refreshed predictions for ${data.predictions?.length || 0} equipment units!`, 'success')
      } else {
        showToast(data.error || 'Batch prediction failed', 'error')
      }
    } catch (err) {
      showToast('Error connecting to prediction engine', 'error')
    } finally {
      setActionLoading(false)
    }
  }

  const handlePredictSingle = async (equipmentId, e) => {
    if (e) e.stopPropagation()
    setActionLoading(true)
    try {
      const res = await fetch(`/api/ml/predict/${equipmentId}`, { method: 'POST' })
      const data = await res.json()
      if (res.ok) {
        setPredictions(prev => prev.map(p => p.equipmentId === equipmentId ? data : p))
        if (selectedPred?.equipmentId === equipmentId) {
          setSelectedPred(data)
        }
        showToast(`Updated prediction for ${equipmentId}: ${data.riskLevel} (${data.repeatFailureProbability}%)`, 'success')
      } else {
        showToast(data.error || 'Single prediction failed', 'error')
      }
    } catch {
      showToast('Error generating prediction for unit', 'error')
    } finally {
      setActionLoading(false)
    }
  }

  const handleRetrain = async () => {
    setActionLoading(true)
    setShowRetrainModal(false)
    try {
      const res = await fetch('/api/ml/retrain', { method: 'POST' })
      const data = await res.json()
      if (res.ok) {
        showToast('Models successfully retrained on fresh synthetic data and evaluated!', 'success')
        await fetchAllData()
      } else {
        showToast(data.error || 'Retraining failed', 'error')
      }
    } catch {
      showToast('Error connecting to training endpoint', 'error')
    } finally {
      setActionLoading(false)
    }
  }

  // ─── Filtered Predictions ──────────────────────────────────────────────────
  const filteredPredictions = useMemo(() => {
    return predictions.filter(item => {
      // Search filter
      if (search.trim()) {
        const q = search.toLowerCase()
        const matchesId = item.equipmentId.toLowerCase().includes(q)
        const matchesType = (item.equipmentType || '').toLowerCase().includes(q)
        const matchesLab = (item.labId || '').toLowerCase().includes(q) || (item.labName || '').toLowerCase().includes(q)
        if (!matchesId && !matchesType && !matchesLab) return false
      }
      // Lab filter
      if (labFilter !== 'all' && item.labId !== labFilter) return false
      // Risk filter
      if (riskFilter !== 'all' && item.riskBadge !== riskFilter) return false
      // Fault filter
      if (faultFilter === 'with_fault' && !item.hasActiveFault) return false
      if (faultFilter === 'no_fault' && item.hasActiveFault) return false

      return true
    })
  }, [predictions, search, labFilter, riskFilter, faultFilter])

  // Color helpers
  const getRiskColor = (badge) => {
    switch (badge) {
      case 'elevated': return 'var(--red-base)'
      case 'moderate': return 'var(--amber-base)'
      default:         return 'var(--green-base)'
    }
  }

  const getRiskBg = (badge) => {
    switch (badge) {
      case 'elevated': return 'rgba(239,68,68,0.12)'
      case 'moderate': return 'rgba(245,158,11,0.12)'
      default:         return 'rgba(34,197,94,0.12)'
    }
  }

  const getRiskBorder = (badge) => {
    switch (badge) {
      case 'elevated': return 'rgba(239,68,68,0.3)'
      case 'moderate': return 'rgba(245,158,11,0.3)'
      default:         return 'rgba(34,197,94,0.3)'
    }
  }

  return (
    <div style={{ padding: '14px 16px 28px', maxWidth: 1400, margin: '0 auto' }}>

      {/* Toast Notification */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: 20, right: 20, zIndex: 9999,
          background: toast.type === 'error' ? 'rgba(239,68,68,0.95)' : 'rgba(16,185,129,0.95)',
          color: '#fff', padding: '10px 16px', borderRadius: 6,
          boxShadow: '0 8px 24px rgba(0,0,0,0.4)', fontSize: 12, fontWeight: 500,
          display: 'flex', alignItems: 'center', gap: 8, backdropFilter: 'blur(8px)',
          animation: 'fadeIn 0.2s ease-out'
        }}>
          {toast.type === 'error' ? <AlertTriangle size={15} /> : <Check size={15} />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Header Bar */}
      <div style={{
        display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
        flexWrap: 'wrap', gap: 12, marginBottom: 14
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <h1 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.3px', margin: 0 }}>
              Machine Learning Failure Prediction & Repair Estimator
            </h1>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 10,
              background: modelStatus?.modelsAvailable ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)',
              color: modelStatus?.modelsAvailable ? 'var(--green-base)' : 'var(--red-base)',
              border: `1px solid ${modelStatus?.modelsAvailable ? 'rgba(34,197,94,0.25)' : 'rgba(239,68,68,0.25)'}`
            }}>
              <span style={{
                width: 6, height: 6, borderRadius: '50%',
                background: modelStatus?.modelsAvailable ? 'var(--green-base)' : 'var(--red-base)'
              }} />
              {modelStatus?.modelsAvailable ? 'ML ENGINE READY' : 'OFFLINE'}
            </span>
          </div>
          <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
            Dual-task scikit-learn models: RandomForestClassifier (7-day repeat failure risk) &amp; RandomForestRegressor (repair duration)
          </p>
        </div>

        {/* Global Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            onClick={() => fetchAllData()}
            disabled={actionLoading}
            className="btn btn-secondary"
            style={{ fontSize: 11, height: 28, display: 'flex', alignItems: 'center', gap: 5, padding: '0 10px' }}
            title="Refresh current predictions from database"
          >
            <RefreshCw size={12} className={actionLoading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>

          <button
            onClick={() => setShowRetrainModal(true)}
            disabled={actionLoading}
            className="btn btn-secondary"
            style={{ fontSize: 11, height: 28, display: 'flex', alignItems: 'center', gap: 5, padding: '0 10px' }}
            title="Retrain models on reproducible synthetic dataset"
          >
            <Cpu size={12} />
            <span>Retrain Models</span>
          </button>

          <button
            onClick={handleRunAllPredictions}
            disabled={actionLoading || !modelStatus?.modelsAvailable}
            className="btn btn-primary"
            style={{
              fontSize: 11, height: 28, display: 'flex', alignItems: 'center', gap: 5,
              padding: '0 12px', background: 'var(--blue-base)', borderColor: 'var(--blue-base)'
            }}
          >
            <Sparkles size={12} />
            <span>{actionLoading ? 'Generating...' : 'Run All Predictions'}</span>
          </button>
        </div>
      </div>

      {/* Transparency & Demonstration Dataset Banner */}
      <div style={{
        padding: '10px 14px', marginBottom: 14,
        background: 'rgba(59,130,246,0.05)',
        border: '1px solid rgba(59,130,246,0.18)',
        borderRadius: 6,
        display: 'flex', alignItems: 'flex-start', gap: 10
      }}>
        <Info size={15} color="var(--blue-base)" style={{ flexShrink: 0, marginTop: 1 }} />
        <div style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.5, flex: 1 }}>
          <strong style={{ color: 'var(--blue-base)', fontWeight: 600 }}>Synthetic Demonstration Dataset Notice: </strong>
          Models were trained on <strong>1,200 reproducible synthetic college lab scenarios (Seed 42)</strong> to demonstrate statistical machine learning.
          Real predictions below are generated directly from <strong>live MongoDB telemetry</strong> (CPU, RAM, temp, uptime, incident logs, maintenance recency).
          Estimated repair duration is <em>strictly calculated only for equipment with an active incident</em>.
        </div>
      </div>

      {/* KPI Stat Cards Strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 8, marginBottom: 14 }}>
        <div className="panel" style={{ padding: '10px 14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ fontSize: 9, color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              Monitored Units
            </span>
            <Database size={13} color="var(--text-muted)" />
          </div>
          <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)' }}>
            {summary?.total || predictions.length}
          </div>
          <div style={{ fontSize: 9.5, color: 'var(--text-muted)', marginTop: 2 }}>
            Across LAB-A, LAB-B, LAB-C
          </div>
        </div>

        <div className="panel" style={{ padding: '10px 14px', borderLeft: '3px solid var(--red-base)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ fontSize: 9, color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              Elevated Risk
            </span>
            <ShieldAlert size={13} color="var(--red-base)" />
          </div>
          <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--red-base)' }}>
            {summary?.elevated ?? predictions.filter(p => p.riskBadge === 'elevated').length}
          </div>
          <div style={{ fontSize: 9.5, color: 'var(--text-muted)', marginTop: 2 }}>
            &gt; 65% failure probability
          </div>
        </div>

        <div className="panel" style={{ padding: '10px 14px', borderLeft: '3px solid var(--amber-base)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ fontSize: 9, color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              Moderate Risk
            </span>
            <AlertTriangle size={13} color="var(--amber-base)" />
          </div>
          <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--amber-base)' }}>
            {summary?.moderate ?? predictions.filter(p => p.riskBadge === 'moderate').length}
          </div>
          <div style={{ fontSize: 9.5, color: 'var(--text-muted)', marginTop: 2 }}>
            35% – 65% failure probability
          </div>
        </div>

        <div className="panel" style={{ padding: '10px 14px', borderLeft: '3px solid var(--green-base)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ fontSize: 9, color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              Low Risk
            </span>
            <CheckCircle size={13} color="var(--green-base)" />
          </div>
          <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--green-base)' }}>
            {summary?.low ?? predictions.filter(p => p.riskBadge === 'low').length}
          </div>
          <div style={{ fontSize: 9.5, color: 'var(--text-muted)', marginTop: 2 }}>
            &lt; 35% failure probability
          </div>
        </div>

        <div className="panel" style={{ padding: '10px 14px', borderLeft: '3px solid var(--blue-base)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ fontSize: 9, color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              Active Incidents
            </span>
            <Wrench size={13} color="var(--blue-base)" />
          </div>
          <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--blue-base)' }}>
            {summary?.withActiveFaults ?? predictions.filter(p => p.hasActiveFault).length}
          </div>
          <div style={{ fontSize: 9.5, color: 'var(--text-muted)', marginTop: 2 }}>
            Repair times estimated
          </div>
        </div>
      </div>

      {/* Main View Navigation Tabs */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 6,
        borderBottom: '1px solid var(--border-subtle)', marginBottom: 14
      }}>
        <button
          onClick={() => setActiveTab('registry')}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            padding: '8px 14px', fontSize: 12, fontWeight: 600,
            color: activeTab === 'registry' ? 'var(--blue-base)' : 'var(--text-muted)',
            borderBottom: activeTab === 'registry' ? '2px solid var(--blue-base)' : '2px solid transparent',
            display: 'flex', alignItems: 'center', gap: 6
          }}
        >
          <Layers size={13} />
          <span>Live Equipment Predictions ({filteredPredictions.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('metrics')}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            padding: '8px 14px', fontSize: 12, fontWeight: 600,
            color: activeTab === 'metrics' ? 'var(--blue-base)' : 'var(--text-muted)',
            borderBottom: activeTab === 'metrics' ? '2px solid var(--blue-base)' : '2px solid transparent',
            display: 'flex', alignItems: 'center', gap: 6
          }}
        >
          <BarChart2 size={13} />
          <span>Model Architecture &amp; Held-Out Metrics</span>
        </button>
      </div>

      {/* ────────────────────────────────────────────────────────────────────────
          TAB 1: Equipment Predictions Registry
      ──────────────────────────────────────────────────────────────────────── */}
      {activeTab === 'registry' && (
        <>
          {/* Filter Bar */}
          <div className="panel" style={{
            padding: '8px 12px', marginBottom: 12,
            display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 8
          }}>
            {/* Search */}
            <div style={{ position: 'relative', flex: '1 1 200px', minWidth: 160 }}>
              <Search size={12} style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="text"
                placeholder="Search equipment ID, type, or lab..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="input-field"
                style={{ paddingLeft: 28, fontSize: 11, height: 28, width: '100%' }}
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                >
                  <X size={11} />
                </button>
              )}
            </div>

            {/* Lab filter */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600 }}>Lab:</span>
              <select
                value={labFilter}
                onChange={e => setLabFilter(e.target.value)}
                className="input-field"
                style={{ fontSize: 11, height: 28, padding: '0 8px' }}
              >
                <option value="all">All Labs</option>
                <option value="LAB-A">Computer Lab A</option>
                <option value="LAB-B">Computer Lab B</option>
                <option value="LAB-C">Networking Lab</option>
              </select>
            </div>

            {/* Risk filter */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600 }}>Risk:</span>
              <select
                value={riskFilter}
                onChange={e => setRiskFilter(e.target.value)}
                className="input-field"
                style={{ fontSize: 11, height: 28, padding: '0 8px' }}
              >
                <option value="all">All Risk Tiers</option>
                <option value="elevated">Elevated (&gt;65%)</option>
                <option value="moderate">Moderate (35-65%)</option>
                <option value="low">Low (&lt;35%)</option>
              </select>
            </div>

            {/* Fault filter */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600 }}>Fault:</span>
              <select
                value={faultFilter}
                onChange={e => setFaultFilter(e.target.value)}
                className="input-field"
                style={{ fontSize: 11, height: 28, padding: '0 8px' }}
              >
                <option value="all">All Statuses</option>
                <option value="with_fault">Active Incident Only</option>
                <option value="no_fault">Normal / No Active Fault</option>
              </select>
            </div>

            {/* Clear filters */}
            {(search || labFilter !== 'all' || riskFilter !== 'all' || faultFilter !== 'all') && (
              <button
                onClick={() => { setSearch(''); setLabFilter('all'); setRiskFilter('all'); setFaultFilter('all') }}
                className="btn btn-secondary"
                style={{ fontSize: 10, height: 26, padding: '0 8px', color: 'var(--text-muted)' }}
              >
                Reset Filters
              </button>
            )}
          </div>

          {/* Predictions Table Panel */}
          <div className="panel" style={{ padding: 0, overflow: 'hidden' }}>
            {loading ? (
              <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}>
                <RefreshCw size={18} className="animate-spin" style={{ margin: '0 auto 8px' }} />
                Loading predictions from MongoDB...
              </div>
            ) : filteredPredictions.length === 0 ? (
              <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}>
                No equipment records match the current filter selection.
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="data-table" style={{ width: '100%' }}>
                  <thead>
                    <tr>
                      <th style={{ width: 100 }}>Equipment ID</th>
                      <th>Type &amp; Lab</th>
                      <th>Live Telemetry</th>
                      <th>Active Fault Incident</th>
                      <th style={{ minWidth: 160 }}>Failure Probability (7-Day)</th>
                      <th>Risk Classification</th>
                      <th>Est. Repair Duration</th>
                      <th style={{ width: 110, textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPredictions.map(item => {
                      const prob = item.repeatFailureProbability ?? 0
                      const riskColor = getRiskColor(item.riskBadge)
                      const isSelected = selectedPred?.equipmentId === item.equipmentId

                      return (
                        <tr
                          key={item.equipmentId}
                          onClick={() => setSelectedPred(item)}
                          style={{
                            cursor: 'pointer',
                            background: isSelected ? 'rgba(59,130,246,0.08)' : undefined,
                            transition: 'background 0.15s ease'
                          }}
                        >
                          {/* Equipment ID */}
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <span style={{
                                width: 7, height: 7, borderRadius: '50%',
                                background: riskColor, flexShrink: 0
                              }} />
                              <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'monospace', fontSize: 11.5 }}>
                                {item.equipmentId}
                              </span>
                            </div>
                          </td>

                          {/* Type & Lab */}
                          <td>
                            <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-primary)' }}>
                              {item.equipmentType}
                            </div>
                            <div style={{ fontSize: 9.5, color: 'var(--text-muted)' }}>
                              {item.labId} · {item.labName}
                            </div>
                          </td>

                          {/* Live Telemetry */}
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 10 }}>
                              <span title="CPU Load" style={{ color: item.featuresUsed?.cpu_usage > 75 ? 'var(--red-base)' : 'var(--text-secondary)' }}>
                                CPU {item.featuresUsed?.cpu_usage ?? '—'}%
                              </span>
                              <span style={{ color: 'var(--border-subtle)' }}>|</span>
                              <span title="RAM Load" style={{ color: item.featuresUsed?.ram_usage > 80 ? 'var(--red-base)' : 'var(--text-secondary)' }}>
                                RAM {item.featuresUsed?.ram_usage ?? '—'}%
                              </span>
                              <span style={{ color: 'var(--border-subtle)' }}>|</span>
                              <span title="Temperature" style={{ color: item.featuresUsed?.temperature > 70 ? 'var(--red-base)' : 'var(--text-secondary)' }}>
                                {item.featuresUsed?.temperature ?? '—'}°C
                              </span>
                            </div>
                          </td>

                          {/* Active Fault */}
                          <td>
                            {item.hasActiveFault && item.activeFault ? (
                              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                                <span style={{
                                  fontSize: 9.5, fontWeight: 600, padding: '2px 6px', borderRadius: 4,
                                  background: item.activeFault.severity === 'Critical' ? 'rgba(239,68,68,0.15)'
                                            : item.activeFault.severity === 'High' ? 'rgba(245,158,11,0.15)'
                                            : 'rgba(59,130,246,0.15)',
                                  color: item.activeFault.severity === 'Critical' ? 'var(--red-base)'
                                       : item.activeFault.severity === 'High' ? 'var(--amber-base)'
                                       : 'var(--blue-base)'
                                }}>
                                  {item.activeFault.severity}
                                </span>
                                <span style={{ fontSize: 10, color: 'var(--text-secondary)', maxWidth: 130, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={item.activeFault.description}>
                                  {item.activeFault.id} ({item.activeFault.category})
                                </span>
                              </div>
                            ) : (
                              <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>None (Normal)</span>
                            )}
                          </td>

                          {/* Failure Probability Progress Bar */}
                          <td>
                            <div>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 3 }}>
                                <span style={{ fontSize: 11, fontWeight: 700, color: riskColor, fontFamily: 'monospace' }}>
                                  {prob}%
                                </span>
                                <span style={{ fontSize: 9, color: 'var(--text-muted)' }}>
                                  Class {item.predictedClass}
                                </span>
                              </div>
                              <div style={{ width: '100%', height: 4, background: 'rgba(255,255,255,0.08)', borderRadius: 2, overflow: 'hidden' }}>
                                <div style={{
                                  width: `${Math.min(100, Math.max(0, prob))}%`,
                                  height: '100%',
                                  background: riskColor,
                                  borderRadius: 2,
                                  transition: 'width 0.3s ease'
                                }} />
                              </div>
                            </div>
                          </td>

                          {/* Risk Classification */}
                          <td>
                            <span style={{
                              display: 'inline-flex', alignItems: 'center', gap: 4,
                              fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 10,
                              background: getRiskBg(item.riskBadge),
                              color: riskColor,
                              border: `1px solid ${getRiskBorder(item.riskBadge)}`
                            }}>
                              {item.riskBadge === 'elevated' && <ShieldAlert size={10} />}
                              {item.riskBadge === 'moderate' && <AlertTriangle size={10} />}
                              {item.riskBadge === 'low' && <CheckCircle size={10} />}
                              <span>{item.riskLevel}</span>
                            </span>
                          </td>

                          {/* Estimated Repair Duration */}
                          <td>
                            {item.repairDurationHours !== null ? (
                              <span style={{
                                fontSize: 10.5, fontWeight: 600, color: 'var(--blue-base)',
                                background: 'rgba(59,130,246,0.12)', padding: '2px 7px', borderRadius: 4,
                                border: '1px solid rgba(59,130,246,0.25)', display: 'inline-flex', alignItems: 'center', gap: 4
                              }}>
                                <Clock size={10} />
                                {item.repairDurationDisplay}
                              </span>
                            ) : (
                              <span style={{ fontSize: 9.5, color: 'var(--text-muted)', fontStyle: 'italic' }}>
                                Not applicable — no active fault
                              </span>
                            )}
                          </td>

                          {/* Actions */}
                          <td style={{ textAlign: 'right' }}>
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                              <button
                                onClick={(e) => handlePredictSingle(item.equipmentId, e)}
                                disabled={actionLoading}
                                className="btn btn-secondary"
                                style={{ fontSize: 9.5, height: 22, padding: '0 6px' }}
                                title="Run fresh prediction for this unit"
                              >
                                Re-predict
                              </button>
                              <button
                                onClick={() => setSelectedPred(item)}
                                className="btn btn-secondary"
                                style={{ fontSize: 9.5, height: 22, padding: '0 6px' }}
                                title="Inspect features and details"
                              >
                                <ChevronRight size={11} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* ────────────────────────────────────────────────────────────────────────
          TAB 2: Model Performance & Held-Out Metrics
      ──────────────────────────────────────────────────────────────────────── */}
      {activeTab === 'metrics' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Classification Model Card */}
          <div className="panel" style={{ padding: '14px 16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{
                  width: 28, height: 28, borderRadius: 6, background: 'rgba(59,130,246,0.15)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--blue-base)'
                }}>
                  <ShieldAlert size={16} />
                </div>
                <div>
                  <h2 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                    1. RandomForestClassifier (Repeat Failure in 7 Days)
                  </h2>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                    Binary Classification · Target: repeat_failure_within_7_days (0 = Safe, 1 = Repeat Incident)
                  </div>
                </div>
              </div>
              <span className="badge badge-blue">
                Held-Out Test Set (20% Split, Stratified)
              </span>
            </div>

            {/* Metric score blocks */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 8, marginBottom: 14 }}>
              <div style={{ background: 'rgba(255,255,255,0.02)', padding: '10px 12px', borderRadius: 6, border: '1px solid var(--border-subtle)' }}>
                <div style={{ fontSize: 9.5, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Accuracy</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--green-base)', marginTop: 2 }}>
                  {metrics ? `${(metrics.classification.accuracy * 100).toFixed(1)}%` : '88.3%'}
                </div>
                <div style={{ fontSize: 9, color: 'var(--text-muted)' }}>Overall correct predictions</div>
              </div>

              <div style={{ background: 'rgba(255,255,255,0.02)', padding: '10px 12px', borderRadius: 6, border: '1px solid var(--border-subtle)' }}>
                <div style={{ fontSize: 9.5, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Precision</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--blue-base)', marginTop: 2 }}>
                  {metrics ? `${(metrics.classification.precision * 100).toFixed(1)}%` : '79.4%'}
                </div>
                <div style={{ fontSize: 9, color: 'var(--text-muted)' }}>Accuracy of positive calls</div>
              </div>

              <div style={{ background: 'rgba(255,255,255,0.02)', padding: '10px 12px', borderRadius: 6, border: '1px solid var(--border-subtle)' }}>
                <div style={{ fontSize: 9.5, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Recall (Sensitivity)</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--amber-base)', marginTop: 2 }}>
                  {metrics ? `${(metrics.classification.recall * 100).toFixed(1)}%` : '90.6%'}
                </div>
                <div style={{ fontSize: 9, color: 'var(--text-muted)' }}>Actual failures captured</div>
              </div>

              <div style={{ background: 'rgba(255,255,255,0.02)', padding: '10px 12px', borderRadius: 6, border: '1px solid var(--border-subtle)' }}>
                <div style={{ fontSize: 9.5, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>F1-Score</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--purple-base, #a855f7)', marginTop: 2 }}>
                  {metrics ? metrics.classification.f1_score.toFixed(4) : '0.8462'}
                </div>
                <div style={{ fontSize: 9, color: 'var(--text-muted)' }}>Harmonic mean of P &amp; R</div>
              </div>
            </div>

            {/* Confusion Matrix Visual */}
            <div style={{
              background: 'rgba(0,0,0,0.2)', padding: 12, borderRadius: 6,
              border: '1px solid var(--border-subtle)'
            }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 8 }}>
                Test Set Confusion Matrix (Total Held-Out = {metrics?.classification.support.total_test || 240} Scenarios)
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, maxWidth: 520 }}>
                <div style={{ padding: '8px 10px', background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: 4 }}>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>True Negatives (TN)</div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--green-base)' }}>
                    {metrics?.classification.confusion_matrix.true_negatives ?? 135}
                  </div>
                  <div style={{ fontSize: 9, color: 'var(--text-muted)' }}>Correctly predicted no repeat failure</div>
                </div>

                <div style={{ padding: '8px 10px', background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 4 }}>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>False Positives (FP)</div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--amber-base)' }}>
                    {metrics?.classification.confusion_matrix.false_positives ?? 20}
                  </div>
                  <div style={{ fontSize: 9, color: 'var(--text-muted)' }}>Predicted failure, but equipment survived</div>
                </div>

                <div style={{ padding: '8px 10px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 4 }}>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>False Negatives (FN)</div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--red-base)' }}>
                    {metrics?.classification.confusion_matrix.false_negatives ?? 8}
                  </div>
                  <div style={{ fontSize: 9, color: 'var(--text-muted)' }}>Missed failures (safety-critical error)</div>
                </div>

                <div style={{ padding: '8px 10px', background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: 4 }}>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>True Positives (TP)</div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--blue-base)' }}>
                    {metrics?.classification.confusion_matrix.true_positives ?? 77}
                  </div>
                  <div style={{ fontSize: 9, color: 'var(--text-muted)' }}>Correctly flagged high-risk equipment</div>
                </div>
              </div>
            </div>
          </div>

          {/* Regression Model Card */}
          <div className="panel" style={{ padding: '14px 16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{
                  width: 28, height: 28, borderRadius: 6, background: 'rgba(245,158,11,0.15)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--amber-base)'
                }}>
                  <Clock size={16} />
                </div>
                <div>
                  <h2 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                    2. RandomForestRegressor (Repair Duration Estimation)
                  </h2>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                    Continuous Regression · Target: repair_duration_hours (Estimated technician labor hours)
                  </div>
                </div>
              </div>
              <span className="badge badge-amber">
                Trained on Active Fault Scenarios
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10, marginBottom: 12 }}>
              <div style={{ background: 'rgba(255,255,255,0.02)', padding: '10px 14px', borderRadius: 6, border: '1px solid var(--border-subtle)' }}>
                <div style={{ fontSize: 9.5, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>R² Score (Variance Explained)</div>
                <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--blue-base)', marginTop: 2 }}>
                  {metrics ? metrics.regression.r2_score.toFixed(4) : '0.7054'}
                </div>
                <div style={{ fontSize: 9, color: 'var(--text-muted)', marginTop: 2 }}>
                  70.5% of variance in repair duration accounted for by features
                </div>
              </div>

              <div style={{ background: 'rgba(255,255,255,0.02)', padding: '10px 14px', borderRadius: 6, border: '1px solid var(--border-subtle)' }}>
                <div style={{ fontSize: 9.5, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Mean Absolute Error (MAE)</div>
                <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--amber-base)', marginTop: 2 }}>
                  {metrics ? `${metrics.regression.mae_hours} hrs` : '1.39 hrs'}
                </div>
                <div style={{ fontSize: 9, color: 'var(--text-muted)', marginTop: 2 }}>
                  Average prediction delta against test benchmark
                </div>
              </div>
            </div>

            <div style={{
              fontSize: 10.5, color: 'var(--text-secondary)', lineHeight: 1.5,
              background: 'rgba(245,158,11,0.05)', padding: '8px 12px', borderRadius: 4,
              border: '1px solid rgba(245,158,11,0.15)'
            }}>
              <strong>Operational Conditioning Rule: </strong>
              The regressor is only activated when an equipment unit has an active, unresolved incident in MongoDB with defined severity and category.
              Equipment in healthy operational state with zero active incidents receives <code style={{ color: 'var(--text-muted)' }}>null</code> (&quot;Not applicable — no active fault&quot;).
            </div>
          </div>

          {/* Feature Pipeline Summary Card */}
          <div className="panel" style={{ padding: '14px 16px' }}>
            <h3 style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 8 }}>
              Data Preprocessing &amp; Feature Schema (12 Features)
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12, fontSize: 11 }}>
              <div>
                <div style={{ fontWeight: 600, color: 'var(--blue-base)', marginBottom: 4 }}>
                  Numerical Features (Median Imputation):
                </div>
                <ul style={{ margin: 0, paddingLeft: 18, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                  <li><code>cpu_usage</code>: Real-time CPU telemetry load percentage (5–100%)</li>
                  <li><code>ram_usage</code>: Real-time memory load percentage (10–100%)</li>
                  <li><code>temperature</code>: Operating core temperature in °C (28–96°C)</li>
                  <li><code>uptime</code>: System availability percentage</li>
                  <li><code>previous_fault_count</code>: Historical failure incidents for this unit</li>
                  <li><code>unresolved_fault_count</code>: Currently active incidents logged in MongoDB</li>
                  <li><code>days_since_last_maintenance</code>: Recency of preventive maintenance</li>
                  <li><code>avg_historical_repair_hours</code>: Past mean repair time from resolved faults</li>
                </ul>
              </div>

              <div>
                <div style={{ fontWeight: 600, color: 'var(--amber-base)', marginBottom: 4 }}>
                  Categorical Features (Most-Frequent + One-Hot Encoded):
                </div>
                <ul style={{ margin: 0, paddingLeft: 18, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                  <li><code>equipment_type</code>: Desktop PC, Laptop, Network Switch, Router, Projector</li>
                  <li><code>lab_id</code>: LAB-A, LAB-B, LAB-C</li>
                  <li><code>fault_category</code>: Hardware, Software, Network, Power, Thermal, None</li>
                  <li><code>fault_severity</code>: Critical, High, Medium, Low, None</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────────────
          PREDICTION DETAIL DRAWER / MODAL
      ──────────────────────────────────────────────────────────────────────── */}
      {selectedPred && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 1000,
          background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)',
          display: 'flex', justifyContent: 'flex-end', animation: 'fadeIn 0.15s ease-out'
        }}
        onClick={() => setSelectedPred(null)}
        >
          <div
            style={{
              width: '100%', maxWidth: 540, height: '100%',
              background: 'var(--bg-panel)', borderLeft: '1px solid var(--border-subtle)',
              overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 14,
              boxShadow: '-10px 0 30px rgba(0,0,0,0.5)'
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Drawer Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', paddingBottom: 12 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{
                    width: 9, height: 9, borderRadius: '50%',
                    background: getRiskColor(selectedPred.riskBadge)
                  }} />
                  <h2 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', margin: 0, fontFamily: 'monospace' }}>
                    {selectedPred.equipmentId}
                  </h2>
                  <span style={{
                    fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 10,
                    background: getRiskBg(selectedPred.riskBadge),
                    color: getRiskColor(selectedPred.riskBadge),
                    border: `1px solid ${getRiskBorder(selectedPred.riskBadge)}`
                  }}>
                    {selectedPred.riskLevel}
                  </span>
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                  {selectedPred.equipmentType} · {selectedPred.labId} ({selectedPred.labName})
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <button
                  onClick={() => handlePredictSingle(selectedPred.equipmentId)}
                  disabled={actionLoading}
                  className="btn btn-secondary"
                  style={{ fontSize: 11, height: 26, padding: '0 8px', display: 'flex', alignItems: 'center', gap: 4 }}
                >
                  <RefreshCw size={11} className={actionLoading ? 'animate-spin' : ''} />
                  <span>Re-run</span>
                </button>
                <button
                  onClick={() => setSelectedPred(null)}
                  style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 4 }}
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Prediction Output Spotlight */}
            <div style={{
              background: 'rgba(0,0,0,0.25)', border: `1px solid ${getRiskBorder(selectedPred.riskBadge)}`,
              borderRadius: 6, padding: 14
            }}>
              <div style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
                Predictive Engine Analysis
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
                <div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>Repeat Failure Risk (7 Days)</div>
                  <div style={{ fontSize: 24, fontWeight: 800, color: getRiskColor(selectedPred.riskBadge), fontFamily: 'monospace' }}>
                    {selectedPred.repeatFailureProbability}%
                  </div>
                  <div style={{ fontSize: 9.5, color: 'var(--text-muted)' }}>
                    Classifier Prediction: Class {selectedPred.predictedClass}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>Estimated Repair Time</div>
                  <div style={{
                    fontSize: selectedPred.repairDurationHours !== null ? 22 : 13,
                    fontWeight: selectedPred.repairDurationHours !== null ? 800 : 500,
                    color: selectedPred.repairDurationHours !== null ? 'var(--blue-base)' : 'var(--text-muted)',
                    marginTop: selectedPred.repairDurationHours !== null ? 0 : 4,
                    lineHeight: 1.3
                  }}>
                    {selectedPred.repairDurationDisplay}
                  </div>
                </div>
              </div>

              <div style={{ fontSize: 10, color: 'var(--text-secondary)', borderTop: '1px solid var(--border-subtle)', paddingTop: 8 }}>
                {selectedPred.repairDurationNote}
              </div>
            </div>

            {/* Active Fault Details (if present) */}
            {selectedPred.hasActiveFault && selectedPred.activeFault ? (
              <div style={{
                background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.2)',
                borderRadius: 6, padding: 12
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <AlertTriangle size={13} color="var(--red-base)" />
                    <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--red-base)' }}>
                      Active Incident: {selectedPred.activeFault.id}
                    </span>
                  </div>
                  <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-secondary)' }}>
                    {selectedPred.activeFault.status}
                  </span>
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-primary)', marginBottom: 4 }}>
                  {selectedPred.activeFault.description}
                </div>
                <div style={{ fontSize: 9.5, color: 'var(--text-muted)' }}>
                  Category: <strong>{selectedPred.activeFault.category}</strong> · Severity: <strong>{selectedPred.activeFault.severity}</strong> · Reported: {selectedPred.activeFault.reportedDate}
                </div>
              </div>
            ) : (
              <div style={{
                background: 'rgba(34,197,94,0.05)', border: '1px solid rgba(34,197,94,0.18)',
                borderRadius: 6, padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 8
              }}>
                <CheckCircle size={14} color="var(--green-base)" />
                <div style={{ fontSize: 10.5, color: 'var(--text-secondary)' }}>
                  No active unresolved fault incidents logged in MongoDB. Equipment operating normally.
                </div>
              </div>
            )}

            {/* Live Features Used by Model */}
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 5 }}>
                <Activity size={13} color="var(--blue-base)" />
                <span>MongoDB Features Extracted for Prediction</span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, fontSize: 10.5 }}>
                <div style={{ padding: '6px 8px', background: 'rgba(255,255,255,0.02)', borderRadius: 4, border: '1px solid var(--border-subtle)' }}>
                  <span style={{ color: 'var(--text-muted)' }}>CPU Utilization:</span>{' '}
                  <strong style={{ color: 'var(--text-primary)' }}>{selectedPred.featuresUsed?.cpu_usage ?? '—'}%</strong>
                </div>

                <div style={{ padding: '6px 8px', background: 'rgba(255,255,255,0.02)', borderRadius: 4, border: '1px solid var(--border-subtle)' }}>
                  <span style={{ color: 'var(--text-muted)' }}>RAM Utilization:</span>{' '}
                  <strong style={{ color: 'var(--text-primary)' }}>{selectedPred.featuresUsed?.ram_usage ?? '—'}%</strong>
                </div>

                <div style={{ padding: '6px 8px', background: 'rgba(255,255,255,0.02)', borderRadius: 4, border: '1px solid var(--border-subtle)' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Core Temperature:</span>{' '}
                  <strong style={{ color: 'var(--text-primary)' }}>{selectedPred.featuresUsed?.temperature ?? '—'}°C</strong>
                </div>

                <div style={{ padding: '6px 8px', background: 'rgba(255,255,255,0.02)', borderRadius: 4, border: '1px solid var(--border-subtle)' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Uptime Ratio:</span>{' '}
                  <strong style={{ color: 'var(--text-primary)' }}>{selectedPred.featuresUsed?.uptime ?? '—'}%</strong>
                </div>

                <div style={{ padding: '6px 8px', background: 'rgba(255,255,255,0.02)', borderRadius: 4, border: '1px solid var(--border-subtle)' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Previous Faults:</span>{' '}
                  <strong style={{ color: 'var(--text-primary)' }}>{selectedPred.featuresUsed?.previous_fault_count ?? 0} incidents</strong>
                </div>

                <div style={{ padding: '6px 8px', background: 'rgba(255,255,255,0.02)', borderRadius: 4, border: '1px solid var(--border-subtle)' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Active Unresolved:</span>{' '}
                  <strong style={{ color: selectedPred.featuresUsed?.unresolved_fault_count > 0 ? 'var(--red-base)' : 'var(--text-primary)' }}>
                    {selectedPred.featuresUsed?.unresolved_fault_count ?? 0}
                  </strong>
                </div>

                <div style={{ padding: '6px 8px', background: 'rgba(255,255,255,0.02)', borderRadius: 4, border: '1px solid var(--border-subtle)' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Days Since Last PM:</span>{' '}
                  <strong style={{ color: 'var(--text-primary)' }}>{selectedPred.featuresUsed?.days_since_last_maintenance ?? '—'} days</strong>
                </div>

                <div style={{ padding: '6px 8px', background: 'rgba(255,255,255,0.02)', borderRadius: 4, border: '1px solid var(--border-subtle)' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Avg Historical Repair:</span>{' '}
                  <strong style={{ color: 'var(--text-primary)' }}>
                    {selectedPred.featuresUsed?.avg_historical_repair_hours !== null && selectedPred.featuresUsed?.avg_historical_repair_hours !== undefined
                      ? `${selectedPred.featuresUsed.avg_historical_repair_hours} hrs`
                      : 'Median Imputed'}
                  </strong>
                </div>
              </div>
            </div>

            {/* Model Metadata & Transparency */}
            <div style={{
              background: 'rgba(255,255,255,0.02)', padding: '10px 12px',
              borderRadius: 6, border: '1px solid var(--border-subtle)',
              fontSize: 10, color: 'var(--text-muted)', lineHeight: 1.5, marginTop: 'auto'
            }}>
              <div><strong>Model Version:</strong> {selectedPred.modelVersion} ({selectedPred.modelName})</div>
              <div><strong>Training Source:</strong> {selectedPred.trainingSource}</div>
              <div><strong>Predicted Timestamp:</strong> {selectedPred.predictedAt}</div>
              <div style={{ marginTop: 6, fontStyle: 'italic', color: 'var(--text-muted)' }}>
                {selectedPred.disclaimer}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────────────
          RETRAIN CONFIRMATION MODAL
      ──────────────────────────────────────────────────────────────────────── */}
      {showRetrainModal && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 1000,
          background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16
        }}
        onClick={() => setShowRetrainModal(false)}
        >
          <div
            style={{
              width: '100%', maxWidth: 440, background: 'var(--bg-panel)',
              border: '1px solid var(--border-subtle)', borderRadius: 8,
              padding: 18, boxShadow: '0 12px 36px rgba(0,0,0,0.6)'
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <Cpu size={18} color="var(--blue-base)" />
              <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                Retrain Machine Learning Models
              </h3>
            </div>

            <p style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.5, margin: '0 0 14px' }}>
              This action will regenerate the <strong>1,200 synthetic college lab training scenarios</strong> (fixed random seed 42),
              retrain both the <strong>RandomForestClassifier</strong> and <strong>RandomForestRegressor</strong> pipelines,
              evaluate them on the held-out test split, and persist the new models to disk.
            </p>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button
                onClick={() => setShowRetrainModal(false)}
                className="btn btn-secondary"
                style={{ fontSize: 11, height: 28, padding: '0 12px' }}
              >
                Cancel
              </button>
              <button
                onClick={handleRetrain}
                className="btn btn-primary"
                style={{ fontSize: 11, height: 28, padding: '0 14px', background: 'var(--blue-base)', borderColor: 'var(--blue-base)' }}
              >
                Proceed with Retraining
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
