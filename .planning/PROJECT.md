# IoT Device Control Platform

## What This Is

A fullstack IoT system that lets users remotely control hardware devices (relays, sensors, etc.) connected to ESP32 microcontrollers via a cloud backend. The system provides a web dashboard for real-time device control, logging, and blockchain-backed transaction records of all on/off events.

## Core Value

Users can reliably turn connected hardware on/off from anywhere via a web interface, with every action recorded as an auditable blockchain transaction.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] ESP32 firmware connects to WiFi and communicates with backend server
- [ ] ESP32 controls relay (SRD-05VDC-SL-C) based on backend commands
- [ ] Backend server hosted on Render receives and routes device commands
- [ ] MongoDB Atlas stores device state, user accounts, and transaction logs
- [ ] Web app provides user authentication and device management
- [ ] Web app dashboard shows real-time device status and control interface
- [ ] On/off actions recorded as blockchain transactions in database
- [ ] Dashboard displays on/off logs with timestamps and duration metrics
- [ ] All ESP32 ↔ Web App communication flows through Render backend

### Out of Scope

- [Direct ESP32-to-websocket without backend] — architecture requires all traffic through server
- [Multiple device types beyond relay] — v1 focuses on single relay control
- [Mobile native app] — web-first approach
- [Blockchain on-chain transactions] — transactions stored in DB, not on actual chain (v1)

## Context

- **Hardware:** ESP32 microcontroller, SRD-05VDC-SL-C 5V relay, known WiFi network
- **Backend:** Node.js/Express server deployed on Render (free/low-cost tier)
- **Database:** MongoDB Atlas for persistent storage
- **Frontend:** React/Next.js web application
- **Communication:** HTTP/WebSocket via Render server as central hub
- **Transactions:** Blockchain-style transaction records stored in MongoDB (immutable log pattern)

## Constraints

- **[Hosting]**: Render backend — free/low-cost tier limits — shapes architecture choices
- **[Hardware]**: ESP32 with known WiFi — no cellular/ethernet fallback in v1
- **[Relay]**: SRD-05VDC-SL-C — 5V DC coil, specific wiring requirements
- **[Blockchain]**: Transactions stored in DB, not on actual blockchain — reduces complexity and cost for v1

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| All traffic through Render server | Centralized control, logging, security | — Pending |
| Blockchain transactions in DB | Auditable without actual chain complexity | — Pending |
| MongoDB Atlas | Managed MongoDB, free tier available | — Pending |
| Render for backend | Simple deployment, free tier | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-03-31 after initialization*
