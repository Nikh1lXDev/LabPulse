// src/data/mockEquipment.js
// ─────────────────────────────────────────────────────────────────────────────
// Demo data module for LabPulse.
// Replace with MongoDB-backed API calls in a later step.
// ─────────────────────────────────────────────────────────────────────────────

export const LABS = [
  { id: 'LAB-A', name: 'Computer Lab A', location: 'Block 3, Floor 1', capacity: 40 },
  { id: 'LAB-B', name: 'Computer Lab B', location: 'Block 3, Floor 2', capacity: 40 },
  { id: 'LAB-C', name: 'Networking Lab', location: 'Block 4, Floor 1', capacity: 20 },
];

// Each entry represents one physical piece of equipment.
// status: 'healthy' | 'warning' | 'critical'
// riskLevel: 'low' | 'medium' | 'high'
export const EQUIPMENT = [
  {
    id: 'PC-01', type: 'Desktop PC', labId: 'LAB-A', labName: 'Computer Lab A',
    status: 'healthy', riskLevel: 'low',
    fault: null, faultType: null,
    lastMaintenance: '2026-09-10', nextMaintenance: '2026-12-10',
    cpu: 38, ram: 45, temp: 52, uptime: '99.2%',
    notes: 'Operating within normal parameters.',
  },
  {
    id: 'PC-02', type: 'Desktop PC', labId: 'LAB-A', labName: 'Computer Lab A',
    status: 'healthy', riskLevel: 'low',
    fault: null, faultType: null,
    lastMaintenance: '2026-09-10', nextMaintenance: '2026-12-10',
    cpu: 42, ram: 50, temp: 55, uptime: '98.7%',
    notes: 'Operating within normal parameters.',
  },
  {
    id: 'PC-03', type: 'Desktop PC', labId: 'LAB-A', labName: 'Computer Lab A',
    status: 'healthy', riskLevel: 'low',
    fault: null, faultType: null,
    lastMaintenance: '2026-08-22', nextMaintenance: '2026-11-22',
    cpu: 35, ram: 40, temp: 49, uptime: '99.5%',
    notes: 'RAM recently upgraded.',
  },
  {
    id: 'PC-04', type: 'Desktop PC', labId: 'LAB-A', labName: 'Computer Lab A',
    status: 'warning', riskLevel: 'medium',
    fault: 'Fan speed intermittently low', faultType: 'Cooling',
    lastMaintenance: '2026-07-15', nextMaintenance: '2026-10-20',
    cpu: 61, ram: 58, temp: 72, uptime: '96.1%',
    notes: 'Fan replacement scheduled.',
  },
  {
    id: 'PC-05', type: 'Desktop PC', labId: 'LAB-A', labName: 'Computer Lab A',
    status: 'healthy', riskLevel: 'low',
    fault: null, faultType: null,
    lastMaintenance: '2026-09-10', nextMaintenance: '2026-12-10',
    cpu: 44, ram: 52, temp: 57, uptime: '98.9%',
    notes: 'Operating within normal parameters.',
  },
  {
    id: 'PC-06', type: 'Desktop PC', labId: 'LAB-A', labName: 'Computer Lab A',
    status: 'healthy', riskLevel: 'low',
    fault: null, faultType: null,
    lastMaintenance: '2026-09-10', nextMaintenance: '2026-12-10',
    cpu: 39, ram: 48, temp: 53, uptime: '99.1%',
    notes: 'Operating within normal parameters.',
  },
  {
    // ⚠ Illustrative fault record — not a real ML prediction
    id: 'PC-07', type: 'Desktop PC', labId: 'LAB-A', labName: 'Computer Lab A',
    status: 'critical', riskLevel: 'high',
    fault: 'CPU temperature critically high — possible thermal paste failure',
    faultType: 'Overheating',
    lastMaintenance: '2026-05-30', nextMaintenance: '2026-10-17', // overdue
    cpu: 94, ram: 68, temp: 91, uptime: '81.3%',
    notes: 'Immediate inspection required. Do not power on without cooling check.',
  },
  {
    id: 'PC-08', type: 'Desktop PC', labId: 'LAB-A', labName: 'Computer Lab A',
    status: 'healthy', riskLevel: 'low',
    fault: null, faultType: null,
    lastMaintenance: '2026-09-10', nextMaintenance: '2026-12-10',
    cpu: 41, ram: 46, temp: 54, uptime: '99.0%',
    notes: 'Operating within normal parameters.',
  },
  {
    id: 'PC-09', type: 'Desktop PC', labId: 'LAB-B', labName: 'Computer Lab B',
    status: 'healthy', riskLevel: 'low',
    fault: null, faultType: null,
    lastMaintenance: '2026-09-15', nextMaintenance: '2026-12-15',
    cpu: 36, ram: 42, temp: 50, uptime: '99.4%',
    notes: 'Operating within normal parameters.',
  },
  {
    id: 'PC-10', type: 'Desktop PC', labId: 'LAB-B', labName: 'Computer Lab B',
    status: 'healthy', riskLevel: 'low',
    fault: null, faultType: null,
    lastMaintenance: '2026-09-15', nextMaintenance: '2026-12-15',
    cpu: 43, ram: 49, temp: 56, uptime: '98.8%',
    notes: 'Operating within normal parameters.',
  },
  {
    id: 'PC-11', type: 'Desktop PC', labId: 'LAB-B', labName: 'Computer Lab B',
    status: 'warning', riskLevel: 'medium',
    fault: 'HDD showing SMART pre-failure attribute', faultType: 'Storage',
    lastMaintenance: '2026-06-20', nextMaintenance: '2026-10-25',
    cpu: 55, ram: 60, temp: 63, uptime: '94.5%',
    notes: 'Back up user data; replace HDD at next maintenance window.',
  },
  {
    id: 'PC-12', type: 'Desktop PC', labId: 'LAB-B', labName: 'Computer Lab B',
    status: 'healthy', riskLevel: 'low',
    fault: null, faultType: null,
    lastMaintenance: '2026-09-15', nextMaintenance: '2026-12-15',
    cpu: 38, ram: 44, temp: 51, uptime: '99.3%',
    notes: 'Fully operational. New SSD installed last cycle.',
  },
  {
    id: 'PC-13', type: 'Desktop PC', labId: 'LAB-B', labName: 'Computer Lab B',
    status: 'healthy', riskLevel: 'low',
    fault: null, faultType: null,
    lastMaintenance: '2026-09-15', nextMaintenance: '2026-12-15',
    cpu: 40, ram: 47, temp: 53, uptime: '99.1%',
    notes: 'Operating within normal parameters.',
  },
  {
    id: 'PC-14', type: 'Desktop PC', labId: 'LAB-B', labName: 'Computer Lab B',
    status: 'healthy', riskLevel: 'low',
    fault: null, faultType: null,
    lastMaintenance: '2026-09-15', nextMaintenance: '2026-12-15',
    cpu: 37, ram: 43, temp: 50, uptime: '99.5%',
    notes: 'Operating within normal parameters.',
  },
  {
    id: 'PC-15', type: 'Desktop PC', labId: 'LAB-B', labName: 'Computer Lab B',
    status: 'warning', riskLevel: 'medium',
    fault: 'Intermittent freeze under high load — possible RAM issue',
    faultType: 'Performance',
    lastMaintenance: '2026-07-01', nextMaintenance: '2026-10-22',
    cpu: 78, ram: 87, temp: 69, uptime: '90.2%',
    notes: 'Run memtest86 at next available window.',
  },
  {
    id: 'LAPTOP-01', type: 'Laptop', labId: 'LAB-A', labName: 'Computer Lab A',
    status: 'healthy', riskLevel: 'low',
    fault: null, faultType: null,
    lastMaintenance: '2026-09-20', nextMaintenance: '2026-12-20',
    cpu: 33, ram: 40, temp: 48, uptime: '99.0%',
    notes: 'Instructor demo laptop. OS recently updated.',
  },
  {
    id: 'LAPTOP-02', type: 'Laptop', labId: 'LAB-B', labName: 'Computer Lab B',
    status: 'warning', riskLevel: 'medium',
    fault: 'Battery health at 62% — replacement recommended',
    faultType: 'Battery',
    lastMaintenance: '2026-06-10', nextMaintenance: '2026-10-18',
    cpu: 48, ram: 55, temp: 61, uptime: '95.0%',
    notes: 'Keep plugged in during use until battery replaced.',
  },
  {
    id: 'PROJ-01', type: 'Projector', labId: 'LAB-A', labName: 'Computer Lab A',
    status: 'warning', riskLevel: 'medium',
    fault: 'Lamp hours approaching rated limit (3200 / 3500 hrs)',
    faultType: 'Lamp Life',
    lastMaintenance: '2026-04-05', nextMaintenance: '2026-10-19',
    cpu: null, ram: null, temp: 74, uptime: '93.1%',
    notes: 'Order replacement lamp. Current lamp may fail within 2–4 weeks.',
  },
  {
    id: 'PROJ-02', type: 'Projector', labId: 'LAB-B', labName: 'Computer Lab B',
    status: 'healthy', riskLevel: 'low',
    fault: null, faultType: null,
    lastMaintenance: '2026-08-30', nextMaintenance: '2026-11-30',
    cpu: null, ram: null, temp: 65, uptime: '98.5%',
    notes: 'Lamp at 1800 hrs. Adequate life remaining.',
  },
  {
    id: 'ROUTER-01', type: 'Network Router', labId: 'LAB-C', labName: 'Networking Lab',
    status: 'healthy', riskLevel: 'low',
    fault: null, faultType: null,
    lastMaintenance: '2026-08-01', nextMaintenance: '2026-11-01',
    cpu: 25, ram: 30, temp: 42, uptime: '99.9%',
    notes: 'Core lab router. Firmware up to date.',
  },
  {
    id: 'ROUTER-02', type: 'Network Router', labId: 'LAB-A', labName: 'Computer Lab A',
    status: 'healthy', riskLevel: 'low',
    fault: null, faultType: null,
    lastMaintenance: '2026-08-01', nextMaintenance: '2026-11-01',
    cpu: 22, ram: 28, temp: 40, uptime: '99.8%',
    notes: 'Stable. Handles Lab A traffic distribution.',
  },
  {
    id: 'ROUTER-03', type: 'Network Router', labId: 'LAB-C', labName: 'Networking Lab',
    status: 'critical', riskLevel: 'high',
    fault: 'Packet loss >12% on WAN interface — possible port failure',
    faultType: 'Network',
    lastMaintenance: '2026-03-15', nextMaintenance: '2026-10-16', // overdue
    cpu: 88, ram: 72, temp: 78, uptime: '72.4%',
    notes: 'Failover to backup router. Escalate to network admin.',
  },
  {
    id: 'SWITCH-01', type: 'Network Switch', labId: 'LAB-C', labName: 'Networking Lab',
    status: 'healthy', riskLevel: 'low',
    fault: null, faultType: null,
    lastMaintenance: '2026-08-01', nextMaintenance: '2026-11-01',
    cpu: 18, ram: 20, temp: 38, uptime: '99.9%',
    notes: '24-port managed switch. All ports operational.',
  },
];

// ─── Derived helpers ─────────────────────────────────────────────────────────

export const getTotalEquipment = () => EQUIPMENT.length;
export const getOpenFaults = () => EQUIPMENT.filter(e => e.status !== 'healthy').length;
export const getCriticalCount = () => EQUIPMENT.filter(e => e.status === 'critical').length;
export const getWarningCount = () => EQUIPMENT.filter(e => e.status === 'warning').length;
export const getHealthyCount = () => EQUIPMENT.filter(e => e.status === 'healthy').length;

// Median repair time — illustrative figure, not a real ML prediction
export const MEDIAN_REPAIR_HOURS = 2.4;
// Repeat-failure risk — illustrative figure for demo only
export const REPEAT_FAILURE_RISK_PCT = 18;

// ─── Fault trend (last 7 days — demo data only) ───────────────────────────
export const FAULT_TREND = [
  { day: 'Mon', faults: 2 },
  { day: 'Tue', faults: 3 },
  { day: 'Wed', faults: 1 },
  { day: 'Thu', faults: 5 },
  { day: 'Fri', faults: 4 },
  { day: 'Sat', faults: 2 },
  { day: 'Sun', faults: 3 },
];

// ─── Fault type distribution (demo data only) ─────────────────────────────
export const FAULT_TYPES = [
  { name: 'Overheating', value: 4, fill: '#e8453c' },
  { name: 'Storage',     value: 3, fill: '#f5a623' },
  { name: 'Performance', value: 5, fill: '#4a9eff' },
  { name: 'Network',     value: 2, fill: '#a78bfa' },
  { name: 'Battery',     value: 2, fill: '#34d399' },
  { name: 'Lamp Life',   value: 1, fill: '#fbbf24' },
  { name: 'Cooling',     value: 2, fill: '#fb923c' },
];

// ─── Predicted repair time by equipment type (demo — not real ML) ─────────
export const PRED_REPAIR = [
  { type: 'Desktop PC',  hours: 2.1 },
  { type: 'Laptop',      hours: 1.8 },
  { type: 'Projector',   hours: 3.5 },
  { type: 'Router',      hours: 4.2 },
  { type: 'Switch',      hours: 1.5 },
];

// ─── Upcoming maintenance (next 10 days) ─────────────────────────────────
export const UPCOMING_MAINTENANCE = EQUIPMENT
  .filter(e => e.nextMaintenance)
  .map(e => ({ ...e, nextDate: new Date(e.nextMaintenance) }))
  .sort((a, b) => a.nextDate - b.nextDate)
  .slice(0, 6);

// ─── Recent activity timeline (demo) ─────────────────────────────────────
export const RECENT_ACTIVITY = [
  { id: 1, time: '20:14', type: 'critical', msg: 'PC-07 — CPU temp exceeded 90 °C. Alert raised.', equipId: 'PC-07' },
  { id: 2, time: '19:52', type: 'warning',  msg: 'PROJ-01 — Lamp hours threshold reached (3200 hrs).', equipId: 'PROJ-01' },
  { id: 3, time: '18:31', type: 'critical', msg: 'ROUTER-03 — WAN packet loss >12% detected.', equipId: 'ROUTER-03' },
  { id: 4, time: '17:10', type: 'info',     msg: 'PC-12 — Maintenance completed. Status: Healthy.', equipId: 'PC-12' },
  { id: 5, time: '15:45', type: 'warning',  msg: 'PC-15 — Intermittent freeze logged (2×).', equipId: 'PC-15' },
  { id: 6, time: '14:22', type: 'info',     msg: 'LAPTOP-01 — OS updated to latest build.', equipId: 'LAPTOP-01' },
  { id: 7, time: '11:03', type: 'warning',  msg: 'PC-04 — Fan RPM below threshold.', equipId: 'PC-04' },
];

export const getEquipmentById = (id) => EQUIPMENT.find(e => e.id === id);
