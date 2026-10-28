import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { EquipmentProvider } from './context/EquipmentContext'
import EquipmentDrawer from './components/EquipmentDrawer'
import EquipmentModal from './components/EquipmentModal'
import ReportFaultModal from './components/ReportFaultModal'
import FaultDetailDrawer from './components/FaultDetailDrawer'
import MaintenanceModal from './components/MaintenanceModal'
import Toast from './components/Toast'
import Shell from './components/Shell'
import Overview    from './pages/Overview'
import Equipment   from './pages/Equipment'
import FaultLogs   from './pages/FaultLogs'
import Predictions from './pages/Predictions'
import Labs        from './pages/Labs'
import Analytics   from './pages/Analytics'
import Settings    from './pages/Settings'

export default function App() {
  return (
    <EquipmentProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Shell />}>
            <Route index element={<Navigate to="/overview" replace />} />
            <Route path="overview"    element={<Overview />} />
            <Route path="equipment"   element={<Equipment />} />
            <Route path="fault-logs"  element={<FaultLogs />} />
            <Route path="predictions" element={<Predictions />} />
            <Route path="labs"        element={<Labs />} />
            <Route path="analytics"   element={<Analytics />} />
            <Route path="settings"    element={<Settings />} />
          </Route>
        </Routes>
        <EquipmentDrawer />
        <EquipmentModal />
        <ReportFaultModal />
        <FaultDetailDrawer />
        <MaintenanceModal />
        <Toast />
      </BrowserRouter>
    </EquipmentProvider>
  )
}
