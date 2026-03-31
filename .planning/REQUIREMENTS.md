# Requirements: IoT Device Control Platform

**Defined:** 2026-03-31
**Core Value:** Users can reliably turn connected hardware on/off from anywhere via a web interface, with every action recorded as an auditable blockchain transaction.

## v1 Requirements

Requirements for initial release. Each maps to roadmap phases.

### Authentication

- [ ] **AUTH-01**: User can sign up with email and password
- [ ] **AUTH-02**: User can log in and stay logged in across sessions
- [ ] **AUTH-03**: User can log out from any page
- [ ] **AUTH-04**: User can reset password via email link

### Device Management

- [ ] **DEV-01**: User can register a new ESP32 device with the system
- [ ] **DEV-02**: User can view registered devices in a list
- [ ] **DEV-03**: User can assign a custom name to a device
- [ ] **DEV-04**: User can view current device online/offline status

### Real-Time Control

- [ ] **CTRL-01**: User can toggle relay ON from the web dashboard
- [ ] **CTRL-02**: User can toggle relay OFF from the web dashboard
- [ ] **CTRL-03**: Dashboard shows real-time relay state (ON/OFF)
- [ ] **CTRL-04**: Dashboard shows device connection status (connected/disconnected)
- [ ] **CTRL-05**: Control commands are acknowledged with success/failure feedback

### Transaction Logging

- [ ] **TXN-01**: Every ON/OFF action is recorded as an immutable transaction entry
- [ ] **TXN-02**: Each transaction includes timestamp, user, device, action, and duration
- [ ] **TXN-03**: Transactions are hash-chained for tamper detection
- [ ] **TXN-04**: User can view transaction history in a table format

### Dashboard

- [ ] **DASH-01**: Dashboard displays device control interface
- [ ] **DASH-02**: Dashboard shows ON/OFF log history with timestamps
- [ ] **DASH-03**: Dashboard shows total duration device was ON
- [ ] **DASH-04**: Dashboard is responsive and works on mobile browsers

### ESP32 Firmware

- [ ] **FW-01**: ESP32 connects to configured WiFi network on boot
- [ ] **FW-02**: ESP32 maintains persistent connection to backend server
- [ ] **FW-03**: ESP32 auto-reconnects on WiFi or server disconnection
- [ ] **FW-04**: ESP32 actuates relay based on received backend commands
- [ ] **FW-05**: ESP32 reports current relay state to backend

### Backend Infrastructure

- [ ] **BE-01**: Backend server accepts and authenticates WebSocket connections
- [ ] **BE-02**: Backend routes control commands from web app to correct ESP32
- [ ] **BE-03**: Backend persists all transactions to MongoDB Atlas
- [ ] **BE-04**: Backend maintains device shadow state for queries
- [ ] **BE-05**: Backend is deployed and accessible on Render

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Advanced Features

- **SCHED-01**: User can schedule automatic ON/OFF times for devices
- **SCHED-02**: User can create recurring schedules (daily, weekly)
- **ANALYT-01**: Dashboard shows usage analytics (daily/weekly/monthly ON time)
- **ANALYT-02**: Dashboard shows cost estimation based on usage
- **API-01**: REST API for programmatic device control
- **WEBHOOK-01**: User can configure webhooks for state change notifications
- **MULTI-01**: Support for multiple ESP32 devices per user account
- **OTA-01**: Over-the-air firmware updates for ESP32

### Security & Access

- **RBAC-01**: Role-based access control (admin, viewer)
- **2FA-01**: Two-factor authentication for user accounts
- **AUDIT-01**: Admin audit log for all system changes

## Out of Scope

| Feature | Reason |
|---------|--------|
| Direct ESP32-to-websocket without backend | Architecture requires all traffic through server for logging and security |
| Actual on-chain blockchain transactions | DB-based hash chain provides sufficient audit trail for v1 without gas costs |
| Native mobile app | Web-first approach; responsive design covers mobile use cases |
| Multiple relay types beyond SRD-05VDC-SL-C | v1 focuses on single relay control pattern |
| Sensor data collection | Not part of core control value; defer to v2+ |
| Voice assistant integration (Alexa/Google) | High complexity, not core to control value |
| Multi-protocol support (Zigbee/Z-Wave) | WiFi-only for v1 |
| Complex automation rules | Defer to v2+; focus on manual control first |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| AUTH-01 | Phase 1 | Pending |
| AUTH-02 | Phase 1 | Pending |
| AUTH-03 | Phase 1 | Pending |
| AUTH-04 | Phase 1 | Pending |
| DEV-01 | Phase 1 | Pending |
| DEV-02 | Phase 3 | Pending |
| DEV-03 | Phase 3 | Pending |
| DEV-04 | Phase 2 | Pending |
| CTRL-01 | Phase 3 | Pending |
| CTRL-02 | Phase 3 | Pending |
| CTRL-03 | Phase 3 | Pending |
| CTRL-04 | Phase 3 | Pending |
| CTRL-05 | Phase 3 | Pending |
| TXN-01 | Phase 4 | Pending |
| TXN-02 | Phase 4 | Pending |
| TXN-03 | Phase 4 | Pending |
| TXN-04 | Phase 4 | Pending |
| DASH-01 | Phase 3 | Pending |
| DASH-02 | Phase 4 | Pending |
| DASH-03 | Phase 4 | Pending |
| DASH-04 | Phase 3 | Pending |
| FW-01 | Phase 2 | Pending |
| FW-02 | Phase 2 | Pending |
| FW-03 | Phase 2 | Pending |
| FW-04 | Phase 2 | Pending |
| FW-05 | Phase 2 | Pending |
| BE-01 | Phase 2 | Pending |
| BE-02 | Phase 3 | Pending |
| BE-03 | Phase 4 | Pending |
| BE-04 | Phase 2 | Pending |
| BE-05 | Phase 1 | Pending |

**Coverage:**
- v1 requirements: 31 total
- Mapped to phases: 31
- Unmapped: 0 ✓

---
*Requirements defined: 2026-03-31*
*Last updated: 2026-03-31 after initial definition*
