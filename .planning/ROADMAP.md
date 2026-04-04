# Roadmap: IoT Device Control Platform

## Overview

This roadmap delivers a fullstack IoT system where users remotely control ESP32-connected relays via a web dashboard. The journey starts with user authentication and backend deployment, moves through ESP32 firmware and real-time WebSocket control, and culminates in a tamper-evident blockchain-style transaction audit system. Every phase delivers a verifiable capability — by the end, users can reliably toggle hardware from anywhere with every action immutably logged.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Foundation & Auth** - User accounts, deployed backend, and device registration (completed 2026-03-31)
- [ ] **Phase 2: Firmware & Connection** - ESP32 connects to backend with persistent WebSocket
- [ ] **Phase 3: Real-Time Control & Dashboard** - End-to-end relay control from web dashboard
- [ ] **Phase 4: Transaction Audit System** - Blockchain-style immutable logging with history UI

## Phase Details

### Phase 1: Foundation & Auth
**Goal**: Users can create accounts, authenticate, and the backend is deployed and ready to accept connections
**Depends on**: Nothing (first phase)
**Requirements**: AUTH-01, AUTH-02, AUTH-03, AUTH-04, BE-05, DEV-01
**Success Criteria** (what must be TRUE):
  1. User can sign up with email and password and receive account confirmation
  2. User can log in and stay logged in across browser refreshes and sessions
  3. User can log out from any page in the application
  4. User can reset forgotten password via email link
  5. Backend server is deployed on Render and accessible via HTTPS/WSS
  6. User can register a new ESP32 device and receive a device token
**Plans**: 4 plans

Plans:
- [x] 01-01: MongoDB Atlas setup with user and device collections, schemas, and indexes
- [x] 01-02: Backend REST API with Express 5 — user auth (signup, login, logout, password reset) using JWT and bcrypt
- [x] 01-03: Device registration endpoint — user can claim an ESP32 and receive an auth token
- [x] 01-04: Deploy backend to Render with environment variables, health check, and MongoDB connection

### Phase 2: Firmware & Connection
**Goal**: ESP32 connects to the backend and maintains a persistent, authenticated WebSocket connection with relay control capability
**Depends on**: Phase 1
**Requirements**: FW-01, FW-02, FW-03, FW-04, FW-05, BE-01, BE-04, DEV-04
**Success Criteria** (what must be TRUE):
  1. ESP32 connects to configured WiFi network and establishes WSS connection on boot
  2. ESP32 auto-reconnects after WiFi dropout or server disconnection with exponential backoff
  3. ESP32 actuates the relay when receiving ON/OFF commands from the backend
  4. ESP32 reports current relay state to backend on connection and state changes
  5. Backend authenticates ESP32 WebSocket connections using device tokens
  6. Dashboard shows device online/offline status based on connection state
**Plans**: 4 plans

Plans:
- [ ] 02-01: ESP32 firmware — WiFi connection, WSS client with device token auth, ping/pong keepalive, auto-reconnect logic
- [ ] 02-02: ESP32 firmware — relay actuation (SRD-05VDC-SL-C with flyback diode), state reporting via JSON messages
- [ ] 02-03: Backend WebSocket hub — connection registry, device token validation, message routing, device shadow state
- [ ] 02-04: Device presence detection — heartbeat monitoring, online/offline status tracking, dashboard status endpoint

### Phase 3: Real-Time Control & Dashboard
**Goal**: Users can control their relay from the web dashboard with real-time state updates and responsive UI
**Depends on**: Phase 2
**Requirements**: CTRL-01, CTRL-02, CTRL-03, CTRL-04, CTRL-05, BE-02, DEV-02, DEV-03, DASH-01, DASH-04
**Success Criteria** (what must be TRUE):
  1. User can toggle relay ON from the web dashboard and see confirmation
  2. User can toggle relay OFF from the web dashboard and see confirmation
  3. Dashboard shows real-time relay state (ON/OFF) that updates without page refresh
  4. Dashboard shows device connection status (connected/disconnected)
  5. Control commands display success or failure feedback to the user
  6. User can view registered devices in a list and assign custom names
  7. Dashboard is responsive and works on mobile browsers
**Plans**: 4 plans

Plans:
- [ ] 03-01: Backend command routing — WebSocket message handler routes control commands from web clients to correct ESP32 with validation
- [ ] 03-02: Next.js web app shell — authentication pages, dashboard layout, device list with naming
- [ ] 03-03: Real-time dashboard — WebSocket client connection, Zustand store for device state, relay control UI with ON/OFF toggle
- [ ] 03-04: Responsive design — Tailwind CSS mobile-first layout, connection status indicator, command feedback (success/error toasts)

### Phase 4: Transaction Audit System
**Goal**: Every relay action is recorded as an actual blockchain transaction using MetaMask wallet integration on Sepolia testnet
**Depends on**: Phase 3
**Requirements**: TXN-01, TXN-02, TXN-03, TXN-04, BE-03, DASH-02, DASH-03
**Success Criteria** (what must be TRUE):
  1. Users can connect their MetaMask wallet to the dashboard
  2. Every ON/OFF action creates an actual blockchain transaction on Sepolia testnet
  3. Each transaction is signed by the user's wallet (no server-side key management)
  4. Transaction history shows on-chain verification status with Etherscan links
  5. Dashboard displays total ON duration metrics for the device
**Plans**: 3 plans

Plans:
- [ ] 04-01: Wallet integration — MetaMask Connect EVM SDK, wallet connection UI, IOTEventLog smart contract deployed to Sepolia
- [ ] 04-02: Blockchain transaction recording — Transaction model with txHash, backend event listener, transaction history API with Etherscan links
- [ ] 04-03: Transaction history UI — paginated table with blockchain verification, duration summary cards, wallet connect integration

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation & Auth | 4/4 | Complete   | 2026-03-31 |
| 2. Firmware & Connection | 0/4 | Not started | - |
| 3. Real-Time Control & Dashboard | 0/4 | Not started | - |
| 4. Transaction Audit System | 0/3 | Not started | - |
