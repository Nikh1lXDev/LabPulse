// src/context/EquipmentContext.jsx
// ─────────────────────────────────────────────────────────────────────────────
// LabPulse — Central State Provider with MongoDB Backend Integration
// Course: CSE494 Intelligent NoSQL Databases
// ─────────────────────────────────────────────────────────────────────────────

import { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react'
import { EQUIPMENT as INITIAL_EQUIPMENT, LABS } from '../data/mockEquipment'
import { INITIAL_FAULTS, INITIAL_MAINTENANCE } from '../data/mockFaults'

const EquipmentContext = createContext(null)

const STORAGE_KEY_EQUIPMENT = 'labpulse_equipment_records_v1'
const STORAGE_KEY_FAULTS = 'labpulse_fault_records_v1'
const STORAGE_KEY_MAINTENANCE = 'labpulse_maintenance_records_v1'

export function EquipmentProvider({ children }) {
  // ─── 1. MongoDB Connection & Health State ──────────────────────────────────
  const [mongoStatus, setMongoStatus] = useState({
    isConnected: null, // null = checking, true = connected, false = disconnected
    database: 'labpulse_db',
    counts: { equipment: 0, faults: 0, maintenance: 0 },
    error: null,
    isLoading: true,
  })

  // ─── 2. Data State (Live from MongoDB) ────────────────────────────────────
  const [equipment, setEquipment] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_EQUIPMENT)
      if (saved) {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed) && parsed.length > 0) return parsed
      }
    } catch (e) {
      console.warn('Could not load cached equipment', e)
    }
    return INITIAL_EQUIPMENT
  })

  const [faults, setFaults] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_FAULTS)
      if (saved) {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed) && parsed.length > 0) return parsed
      }
    } catch (e) {
      console.warn('Could not load cached faults', e)
    }
    return INITIAL_FAULTS
  })

  const [maintenanceTasks, setMaintenanceTasks] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_MAINTENANCE)
      if (saved) {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed) && parsed.length > 0) return parsed
      }
    } catch (e) {
      console.warn('Could not load cached maintenance', e)
    }
    return INITIAL_MAINTENANCE
  })

  const [isApiLoading, setIsApiLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // ─── 3. UI Modals & Drawers ───────────────────────────────────────────────
  const [selectedEquip, setSelectedEquip] = useState(null)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [modalState, setModalState] = useState({ isOpen: false, mode: 'add', initialData: null })

  // Fault report modal
  const [faultModalState, setFaultModalState] = useState({ isOpen: false, defaultEquipId: null })

  // Fault detail drawer
  const [selectedFault, setSelectedFault] = useState(null)
  const [isFaultDrawerOpen, setIsFaultDrawerOpen] = useState(false)

  // Maintenance modal
  const [maintenanceModalState, setMaintenanceModalState] = useState({
    isOpen: false,
    mode: 'schedule', // 'schedule' | 'complete' | 'reschedule'
    task: null,
    defaultEquipId: null,
  })

  // Toast notification
  const [toast, setToast] = useState(null)

  const showToast = useCallback((message, type = 'success') => {
    setToast({ id: Date.now(), message, type })
    setTimeout(() => {
      setToast(prev => (prev?.message === message ? null : prev))
    }, 4500)
  }, [])

  const hideToast = useCallback(() => {
    setToast(null)
  }, [])

  // ─── 4. Health & Data Fetching from MongoDB ───────────────────────────────

  const fetchHealth = useCallback(async () => {
    try {
      const res = await fetch('/api/health')
      if (res.ok) {
        const data = await res.json()
        setMongoStatus({
          isConnected: Boolean(data.connected),
          database: data.database || 'labpulse_db',
          counts: data.counts || { equipment: 0, faults: 0, maintenance: 0 },
          error: null,
          isLoading: false,
        })
        return data
      } else {
        const errData = await res.json().catch(() => ({}))
        setMongoStatus({
          isConnected: false,
          database: 'labpulse_db',
          counts: { equipment: 0, faults: 0, maintenance: 0 },
          error: errData.error || 'MongoDB service returned non-200 status',
          isLoading: false,
        })
        return { connected: false }
      }
    } catch (err) {
      setMongoStatus({
        isConnected: false,
        database: 'labpulse_db',
        counts: { equipment: 0, faults: 0, maintenance: 0 },
        error: 'Unable to reach backend API. Check if Flask is running on port 5000.',
        isLoading: false,
      })
      return { connected: false }
    }
  }, [])

  const loadDataFromApi = useCallback(async () => {
    setIsApiLoading(true)
    try {
      const [eqRes, flRes, pmRes] = await Promise.all([
        fetch('/api/equipment'),
        fetch('/api/faults'),
        fetch('/api/maintenance'),
      ])

      if (eqRes.ok && flRes.ok && pmRes.ok) {
        const eqData = await eqRes.json()
        const flData = await flRes.json()
        const pmData = await pmRes.json()

        setEquipment(eqData)
        setFaults(flData)
        setMaintenanceTasks(pmData)

        // Keep local cache up-to-date for offline fallback
        try {
          localStorage.setItem(STORAGE_KEY_EQUIPMENT, JSON.stringify(eqData))
          localStorage.setItem(STORAGE_KEY_FAULTS, JSON.stringify(flData))
          localStorage.setItem(STORAGE_KEY_MAINTENANCE, JSON.stringify(pmData))
        } catch (e) {
          console.warn('Cache update error', e)
        }
      }
    } catch (e) {
      console.warn('Error fetching data from Flask API', e)
    } finally {
      setIsApiLoading(false)
    }
  }, [])

  // ─── 5. Initial Connection & One-Time Migration ───────────────────────────
  useEffect(() => {
    let isMounted = true

    async function initConnectionAndMigration() {
      const health = await fetchHealth()

      if (health && health.connected) {
        // If MongoDB collections are completely empty, check if browser has existing records to migrate
        const counts = health.counts || {}
        if (counts.equipment === 0 && counts.faults === 0 && counts.maintenance === 0) {
          console.log('[LabPulse] MongoDB collections empty. Performing one-time migration from browser storage...')
          try {
            const savedEq = localStorage.getItem(STORAGE_KEY_EQUIPMENT)
            const savedFl = localStorage.getItem(STORAGE_KEY_FAULTS)
            const savedPm = localStorage.getItem(STORAGE_KEY_MAINTENANCE)

            const migrationPayload = {
              equipment: savedEq ? JSON.parse(savedEq) : null,
              faults: savedFl ? JSON.parse(savedFl) : null,
              maintenance: savedPm ? JSON.parse(savedPm) : null,
            }

            await fetch('/api/migrate', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(migrationPayload),
            })
          } catch (migErr) {
            console.warn('[LabPulse] Migration payload send error:', migErr)
          }
        }

        // Now load latest records directly from MongoDB
        if (isMounted) {
          await loadDataFromApi()
        }
      } else {
        setIsApiLoading(false)
      }
    }

    initConnectionAndMigration()

    // Periodically poll health every 15 seconds to detect MongoDB disconnects/reconnects
    const intervalId = setInterval(fetchHealth, 15000)

    return () => {
      isMounted = false
      clearInterval(intervalId)
    }
  }, [fetchHealth, loadDataFromApi])

  // Synchronize selected equipment when updated or deleted
  useEffect(() => {
    if (selectedEquip) {
      const current = equipment.find(e => e.id === selectedEquip.id)
      if (current) {
        setSelectedEquip(current)
      } else {
        setSelectedEquip(null)
        setIsDrawerOpen(false)
      }
    }
  }, [equipment])

  // Synchronize selected fault when updated
  useEffect(() => {
    if (selectedFault) {
      const current = faults.find(f => f.id === selectedFault.id)
      if (current) {
        setSelectedFault(current)
      }
    }
  }, [faults])

  // ─── 6. Equipment Drawer & Modal Controls ─────────────────────────────────
  const openDrawer = (equip) => {
    setSelectedEquip(equip)
    setIsDrawerOpen(true)
  }

  const closeDrawer = () => {
    setIsDrawerOpen(false)
  }

  const openAddModal = () => {
    setModalState({ isOpen: true, mode: 'add', initialData: null })
  }

  const openEditModal = (equip) => {
    setModalState({ isOpen: true, mode: 'edit', initialData: equip })
  }

  const closeModal = () => {
    setModalState({ isOpen: false, mode: 'add', initialData: null })
  }

  // ─── 7. Fault Drawer & Modal Controls ─────────────────────────────────────
  const openReportFaultModal = (defaultEquipId = null) => {
    setFaultModalState({ isOpen: true, defaultEquipId })
  }

  const closeReportFaultModal = () => {
    setFaultModalState({ isOpen: false, defaultEquipId: null })
  }

  const openFaultDrawer = (fault) => {
    setSelectedFault(fault)
    setIsFaultDrawerOpen(true)
  }

  const closeFaultDrawer = () => {
    setIsFaultDrawerOpen(false)
  }

  // ─── 8. Maintenance Modal Controls ────────────────────────────────────────
  const openScheduleMaintenanceModal = (defaultEquipId = null) => {
    setMaintenanceModalState({ isOpen: true, mode: 'schedule', task: null, defaultEquipId })
  }

  const openCompleteMaintenanceModal = (task) => {
    setMaintenanceModalState({ isOpen: true, mode: 'complete', task, defaultEquipId: task.equipId })
  }

  const openRescheduleMaintenanceModal = (task) => {
    setMaintenanceModalState({ isOpen: true, mode: 'reschedule', task, defaultEquipId: task.equipId })
  }

  const closeMaintenanceModal = () => {
    setMaintenanceModalState({ isOpen: false, mode: 'schedule', task: null, defaultEquipId: null })
  }

  // ─── 9. API-Backed Equipment CRUD Operations ──────────────────────────────

  const addEquipment = async (newEquip) => {
    if (!mongoStatus.isConnected) {
      const errMsg = 'MongoDB is currently disconnected. Cannot save new equipment.'
      showToast(errMsg, 'error')
      throw new Error(errMsg)
    }

    setIsSubmitting(true)
    try {
      const res = await fetch('/api/equipment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newEquip),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Failed to create equipment in MongoDB')
      }

      setEquipment(prev => [data, ...prev])
      showToast(`Equipment ${data.id} saved to MongoDB.`, 'success')
      fetchHealth()
      return data
    } catch (err) {
      showToast(err.message, 'error')
      throw err
    } finally {
      setIsSubmitting(false)
    }
  }

  const updateEquipment = async (id, updates) => {
    if (!mongoStatus.isConnected) {
      const errMsg = 'MongoDB is currently disconnected. Cannot update equipment.'
      showToast(errMsg, 'error')
      throw new Error(errMsg)
    }

    setIsSubmitting(true)
    try {
      const res = await fetch(`/api/equipment/${encodeURIComponent(id)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update equipment in MongoDB')
      }

      setEquipment(prev => prev.map(item => (item.id === id ? data : item)))
      showToast(`Equipment ${id} updated in MongoDB.`, 'success')
      return data
    } catch (err) {
      showToast(err.message, 'error')
      throw err
    } finally {
      setIsSubmitting(false)
    }
  }

  const deleteEquipment = async (id) => {
    if (!mongoStatus.isConnected) {
      const errMsg = 'MongoDB is currently disconnected. Cannot delete equipment.'
      showToast(errMsg, 'error')
      throw new Error(errMsg)
    }

    setIsSubmitting(true)
    try {
      const res = await fetch(`/api/equipment/${encodeURIComponent(id)}`, {
        method: 'DELETE',
      })

      const data = await res.json()
      if (!res.ok) {
        // Backend returns 400 with explanation if active faults or pending maintenance exist
        throw new Error(data.error || 'Cannot delete equipment.')
      }

      setEquipment(prev => prev.filter(e => e.id !== id))
      if (selectedEquip?.id === id) {
        setSelectedEquip(null)
        setIsDrawerOpen(false)
      }
      showToast(`Equipment ${id} deleted from MongoDB.`, 'info')
      fetchHealth()
      return true
    } catch (err) {
      showToast(err.message, 'error')
      throw err
    } finally {
      setIsSubmitting(false)
    }
  }

  // ─── 10. API-Backed Fault Incident Operations ─────────────────────────────

  const getFaultsForEquipment = useCallback((equipId) => {
    if (!equipId) return []
    return faults
      .filter(f => f.equipId === equipId)
      .sort((a, b) => {
        const aActive = a.status !== 'Resolved' ? 1 : 0
        const bActive = b.status !== 'Resolved' ? 1 : 0
        if (aActive !== bActive) return bActive - aActive
        return new Date(b.reportedDate || 0) - new Date(a.reportedDate || 0)
      })
  }, [faults])

  const createFault = async (faultInput) => {
    if (!mongoStatus.isConnected) {
      const errMsg = 'MongoDB is currently disconnected. Cannot report fault.'
      showToast(errMsg, 'error')
      throw new Error(errMsg)
    }

    setIsSubmitting(true)
    try {
      const res = await fetch('/api/faults', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(faultInput),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Failed to create fault incident in MongoDB')
      }

      // Backend automatically synchronized equipment in MongoDB; refresh both
      setFaults(prev => [data, ...prev])
      const eqRes = await fetch('/api/equipment')
      if (eqRes.ok) {
        const eqData = await eqRes.json()
        setEquipment(eqData)
      }

      showToast(`Incident ${data.id} recorded in MongoDB. Equipment status synchronized.`, 'success')
      fetchHealth()
      return data
    } catch (err) {
      showToast(err.message, 'error')
      throw err
    } finally {
      setIsSubmitting(false)
    }
  }

  const updateFault = async (faultId, updates) => {
    if (!mongoStatus.isConnected) {
      const errMsg = 'MongoDB is currently disconnected. Cannot update incident.'
      showToast(errMsg, 'error')
      throw new Error(errMsg)
    }

    setIsSubmitting(true)
    try {
      const res = await fetch(`/api/faults/${encodeURIComponent(faultId)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update fault in MongoDB')
      }

      setFaults(prev => prev.map(f => (f.id === faultId ? data : f)))
      showToast(`Fault record ${faultId} updated in MongoDB.`, 'success')
      return data
    } catch (err) {
      showToast(err.message, 'error')
      throw err
    } finally {
      setIsSubmitting(false)
    }
  }

  const startRepair = async (faultId, { technician, repairNotes } = {}) => {
    return updateFault(faultId, {
      status: 'In Progress',
      technician: technician?.trim() || 'Assigned Technician',
      repairNotes: repairNotes?.trim() || '',
      startedAt: new Date().toISOString().replace('T', ' ').slice(0, 16),
    })
  }

  const resolveFault = async (faultId, { resolution, repairHours, resolvedBy } = {}) => {
    if (!mongoStatus.isConnected) {
      const errMsg = 'MongoDB is currently disconnected. Cannot resolve incident.'
      showToast(errMsg, 'error')
      throw new Error(errMsg)
    }

    setIsSubmitting(true)
    try {
      const res = await fetch(`/api/faults/${encodeURIComponent(faultId)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'Resolved',
          resolution: resolution?.trim(),
          repairHours: Number(repairHours),
          resolvedBy: resolvedBy?.trim() || 'Lab Technician',
          resolvedDate: new Date().toISOString().replace('T', ' ').slice(0, 16),
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Failed to resolve fault incident in MongoDB')
      }

      // Backend checked remaining active incidents in MongoDB and updated equipment status
      setFaults(prev => prev.map(f => (f.id === faultId ? data : f)))

      // Refresh equipment from MongoDB
      const eqRes = await fetch('/api/equipment')
      if (eqRes.ok) {
        const eqData = await eqRes.json()
        setEquipment(eqData)
      }

      showToast(`Incident ${faultId} marked Resolved in MongoDB. Equipment status synchronized.`, 'success')
      return data
    } catch (err) {
      showToast(err.message, 'error')
      throw err
    } finally {
      setIsSubmitting(false)
    }
  }

  // ─── 11. API-Backed Maintenance Scheduling Operations ─────────────────────

  const scheduleMaintenance = async ({ equipId, scheduledDate, taskType, assignedTo, notes } = {}) => {
    if (!mongoStatus.isConnected) {
      const errMsg = 'MongoDB is currently disconnected. Cannot schedule maintenance.'
      showToast(errMsg, 'error')
      throw new Error(errMsg)
    }

    setIsSubmitting(true)
    try {
      const res = await fetch('/api/maintenance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ equipId, scheduledDate, taskType, assignedTo, notes }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Failed to schedule maintenance in MongoDB')
      }

      setMaintenanceTasks(prev => [data, ...prev])

      // Refresh equipment nextMaintenance date
      const eqRes = await fetch('/api/equipment')
      if (eqRes.ok) {
        const eqData = await eqRes.json()
        setEquipment(eqData)
      }

      showToast(`Maintenance ${data.id} scheduled in MongoDB for ${equipId}.`, 'success')
      fetchHealth()
      return data
    } catch (err) {
      showToast(err.message, 'error')
      throw err
    } finally {
      setIsSubmitting(false)
    }
  }

  const completeMaintenance = async (taskId, { completedDate, completedBy, completionNotes, nextScheduledDate } = {}) => {
    if (!mongoStatus.isConnected) {
      const errMsg = 'MongoDB is currently disconnected. Cannot complete maintenance.'
      showToast(errMsg, 'error')
      throw new Error(errMsg)
    }

    setIsSubmitting(true)
    try {
      const res = await fetch(`/api/maintenance/${encodeURIComponent(taskId)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'Completed',
          completedDate,
          completedBy,
          completionNotes,
          nextScheduledDate,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Failed to complete maintenance in MongoDB')
      }

      setMaintenanceTasks(prev => prev.map(t => (t.id === taskId ? data : t)))

      // Refresh equipment from MongoDB (lastMaintenance & nextMaintenance updated)
      const eqRes = await fetch('/api/equipment')
      if (eqRes.ok) {
        const eqData = await eqRes.json()
        setEquipment(eqData)
      }

      showToast(`Maintenance ${taskId} marked Completed in MongoDB.`, 'success')
      return data
    } catch (err) {
      showToast(err.message, 'error')
      throw err
    } finally {
      setIsSubmitting(false)
    }
  }

  const rescheduleMaintenance = async (taskId, { newDate, notes } = {}) => {
    if (!mongoStatus.isConnected) {
      const errMsg = 'MongoDB is currently disconnected. Cannot reschedule maintenance.'
      showToast(errMsg, 'error')
      throw new Error(errMsg)
    }

    setIsSubmitting(true)
    try {
      const res = await fetch(`/api/maintenance/${encodeURIComponent(taskId)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scheduledDate: newDate, notes }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Failed to reschedule maintenance in MongoDB')
      }

      setMaintenanceTasks(prev => prev.map(t => (t.id === taskId ? data : t)))

      const eqRes = await fetch('/api/equipment')
      if (eqRes.ok) {
        const eqData = await eqRes.json()
        setEquipment(eqData)
      }

      showToast(`Maintenance ${taskId} rescheduled to ${newDate} in MongoDB.`, 'success')
      return data
    } catch (err) {
      showToast(err.message, 'error')
      throw err
    } finally {
      setIsSubmitting(false)
    }
  }

  // ─── 12. Reset to Initial Demo Data ───────────────────────────────────────
  const resetToDefaults = async () => {
    if (!mongoStatus.isConnected) {
      setEquipment(INITIAL_EQUIPMENT)
      setFaults(INITIAL_FAULTS)
      setMaintenanceTasks(INITIAL_MAINTENANCE)
      showToast('Reset local cached records to initial demo state.', 'info')
      return
    }

    setIsSubmitting(true)
    try {
      const res = await fetch('/api/reset-demo', { method: 'POST' })
      if (!res.ok) throw new Error('Reset failed')
      await loadDataFromApi()
      await fetchHealth()
      showToast('Database reset to initial demonstration state in MongoDB.', 'info')
    } catch (err) {
      showToast('Failed to reset MongoDB database: ' + err.message, 'error')
    } finally {
      setIsSubmitting(false)
    }
  }

  // ─── 13. Dynamic Statistics ───────────────────────────────────────────────
  const stats = useMemo(() => {
    const total = equipment.length
    const healthy = equipment.filter(e => e.status === 'healthy').length
    const warning = equipment.filter(e => e.status === 'warning').length
    const critical = equipment.filter(e => e.status === 'critical').length
    const activeFaults = warning + critical

    const now = new Date()
    const twoWeeks = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000)
    const maintenanceDue = equipment.filter(e => {
      if (e.status === 'critical') return true
      if (!e.nextMaintenance) return false
      const pmDate = new Date(e.nextMaintenance)
      return pmDate <= twoWeeks
    }).length

    return {
      total,
      healthy,
      warning,
      critical,
      activeFaults,
      maintenanceDue,
    }
  }, [equipment])

  const faultStats = useMemo(() => {
    const total = faults.length
    const open = faults.filter(f => f.status === 'Open').length
    const inProgress = faults.filter(f => f.status === 'In Progress').length
    const active = open + inProgress
    const resolved = faults.filter(f => f.status === 'Resolved').length
    const critical = faults.filter(f => f.status !== 'Resolved' && f.severity === 'Critical').length

    return {
      total,
      open,
      inProgress,
      active,
      resolved,
      critical,
    }
  }, [faults])

  const maintenanceStats = useMemo(() => {
    const total = maintenanceTasks.length
    const overdue = maintenanceTasks.filter(t => t.status === 'Overdue').length
    const due = maintenanceTasks.filter(t => t.status === 'Due').length
    const scheduled = maintenanceTasks.filter(t => t.status === 'Scheduled').length
    const completed = maintenanceTasks.filter(t => t.status === 'Completed').length

    return {
      total,
      overdue,
      due,
      scheduled,
      completed,
    }
  }, [maintenanceTasks])

  const value = {
    // MongoDB Status
    mongoStatus,
    fetchHealth,
    isApiLoading,
    isSubmitting,

    // Equipment
    equipment,
    labs: LABS,
    selectedEquip,
    setSelectedEquip,
    isDrawerOpen,
    openDrawer,
    closeDrawer,
    modalState,
    openAddModal,
    openEditModal,
    closeModal,
    addEquipment,
    updateEquipment,
    deleteEquipment,
    resetToDefaults,
    stats,

    // Faults
    faults,
    faultStats,
    selectedFault,
    setSelectedFault,
    isFaultDrawerOpen,
    openFaultDrawer,
    closeFaultDrawer,
    faultModalState,
    openReportFaultModal,
    closeReportFaultModal,
    createFault,
    updateFault,
    startRepair,
    resolveFault,
    getFaultsForEquipment,

    // Maintenance
    maintenanceTasks,
    maintenanceStats,
    maintenanceModalState,
    openScheduleMaintenanceModal,
    openCompleteMaintenanceModal,
    openRescheduleMaintenanceModal,
    closeMaintenanceModal,
    scheduleMaintenance,
    completeMaintenance,
    rescheduleMaintenance,

    // Toast
    toast,
    showToast,
    hideToast,
  }

  return (
    <EquipmentContext.Provider value={value}>
      {children}
    </EquipmentContext.Provider>
  )
}

export function useEquipment() {
  const context = useContext(EquipmentContext)
  if (!context) {
    throw new Error('useEquipment must be used within an EquipmentProvider')
  }
  return context
}
