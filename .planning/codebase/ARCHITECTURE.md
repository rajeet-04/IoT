# Architecture

**Analysis Date:** 2026-04-04

## Pattern Overview

**Overall:** Three-tier IoT system with real-time WebSocket communication between ESP32 devices and a centralized backend, with a separate Next.js frontend for user interaction.

**Key Characteristics:**
- **ESP32 devices** connect via WSS (WebSocket Secure) to backend, using device tokens for authentication
- **Backend server** (Express + ws) handles both REST API (user auth, device management) and real-time WebSocket (device commands)
- **Frontend** (Next.js) uses HTTP polling for device state, HTTP API for commands
- **MongoDB** stores users, devices, and immutable transaction logs

## Layers

### **ESP32 Firmware Layer**
- Purpose: Hardware control and cloud connectivity
- Location: `firmware/src/`
- Contains: `main.cpp`, `websocket_client.cpp`, `relay_controller.cpp`, `WiFiManager.cpp`
- Depends on: Arduino framework, WiFi, WebSockets library, ArduinoJson
- Used by: Physical relay hardware (SRD-05VDC-SL-C)

### **Backend Server Layer**
- Purpose: API gateway, WebSocket hub, business logic
- Location: `src/`
- Contains: Express routes, WebSocket hub, Mongoose models, auth middleware
- Depends on: MongoDB, Express, ws, JWT
- Used by: ESP32 devices (WebSocket), Frontend (HTTP/WebSocket)

### **Frontend Web Application Layer**
- Purpose: User interface for device control and monitoring
- Location: `frontend/src/`
- Contains: Next.js App Router pages, Zustand store, API client
- Depends on: Next.js, React, Zustand
- Used by: End users via browser

### **Database Layer**
- Purpose: Persistent storage for users, devices, and transaction logs
- Location: MongoDB Atlas (external)
- Contains: `users`, `devices`, `transactions` collections

## Data Flow

### **Device Registration Flow:**
```
User → Frontend (/api/devices POST) → Backend → MongoDB
                                     ↓
                              Returns device token
                                     ↓
User flashes token → ESP32 firmware
```

### **Device Connection Flow:**
```
ESP32 → WSS /ws (with Bearer token) → Backend Hub
                                        ↓
                              Validates token against devices collection
                                        ↓
                              Registers connection in ConnectionRegistry
                                        ↓
                              Sends 'welcome' message with initial state
```

### **Command Flow (User → Device):**
```
User clicks toggle → Frontend → POST /api/devices/:id/command
                                          ↓
                                    Creates Transaction record
                                    (computes hash chain)
                                          ↓
                                    Gets device WebSocket from Registry
                                          ↓
                                    Sends command via WebSocket
                                          ↓
ESP32 ← WSS message ← Backend Hub ← ← ← ← ←
    ↓
Executes relay action
    ↓
Sends ack + state_report via WebSocket
    ↓
Backend updates device state + broadcasts to subscribed web clients
```

### **State Management:**
- **ESP32:** Local relay state variable, synced via WebSocket
- **Backend:** `Device.relayState` is source of truth, updated on `state_report` messages
- **Frontend:** Polls `/api/devices` every 10 seconds, optimistic UI updates on command send

## Communication Patterns

### **ESP32 ↔ Backend (WebSocket)**
- Protocol: WSS (WebSocket Secure)
- Path: `/ws`
- Authentication: `Authorization: Bearer <device_token>` header
- Heartbeat: ESP32 sends `heartbeat` every 30 seconds; server sends ping every 30 seconds
- Message format: JSON

**Incoming messages from ESP32:**
- `heartbeat` - Device alive signal with uptime
- `state_report` - Relay state update
- `ack` - Command acknowledgment with `commandId`

**Outgoing messages to ESP32:**
- `welcome` - Initial state on connection
- `command` - Control commands (turn_on, turn_off, toggle)
- `server_shutdown` - Graceful shutdown notification

### **Frontend ↔ Backend (HTTP)**
- Protocol: HTTPS
- Auth: JWT in `Authorization: Bearer` header or httpOnly cookies
- Endpoints: `/api/auth/*`, `/api/devices/*`, `/api/transactions/*`

### **Frontend ↔ Backend (WebSocket) - Future**
Currently frontend uses HTTP polling. WebSocket subscription infrastructure exists (`broadcastToDeviceSubscribers` in `hub.js`) but is not actively used.

## Key Abstractions

### **ConnectionRegistry** (`src/ws/connectionRegistry.js`)
- Purpose: Track active device connections in memory
- Pattern: Singleton Map of deviceId → WebSocket
- Key methods: `register()`, `unregister()`, `sendCommand()`, `isConnected()`

### **MessageRouter** (`src/ws/messageRouter.js`)
- Purpose: Parse and dispatch incoming device messages
- Pattern: Type-based routing switch statement
- Handles: heartbeat, state_report, ack, error

### **DeviceStore** (`frontend/src/store/deviceStore.ts`)
- Purpose: Frontend state management with Zustand
- Contains: Device list, pending commands, WebSocket status
- Pattern: Centralized store with actions

### **Transaction Model** (`src/models/Transaction.js`)
- Purpose: Blockchain-style immutable audit log
- Pattern: Hash chain with SHA-256, pre-validate hook computes hash
- Fields: `prevHash`, `hash`, `action`, `relayState`, `timestamp`, `duration`

## Entry Points

### **Backend Server**
- Location: `src/index.js`
- Triggers: `node src/index.js` or `npm start`
- Responsibilities:
  - Initialize Express middleware (CORS, JSON, cookies)
  - Attach route handlers
  - Start HTTP server on PORT
  - Attach WebSocket hub to HTTP server
  - Connect to MongoDB

### **ESP32 Firmware**
- Location: `firmware/src/main.cpp`
- Triggers: ESP32 boot / reset
- Responsibilities:
  - Initialize relay (safe OFF state)
  - Connect to WiFi
  - Establish WebSocket connection
  - Register message handler for commands
  - Handle loop (WiFi tick, WebSocket tick)

### **Frontend Next.js App**
- Location: `frontend/src/app/`
- Triggers: Browser navigation
- Responsibilities:
  - `/` - Landing page
  - `/login` - Authentication
  - `/register` - User signup
  - `/dashboard` - Device management and control

## Error Handling

**Backend:**
- Express error middleware catches unhandled errors (500 response)
- WebSocket errors logged and connection cleaned up
- MongoDB connection errors trigger graceful shutdown
- Unhandled rejections logged and trigger graceful shutdown

**ESP32:**
- WiFi disconnect triggers auto-reconnect with exponential backoff
- WebSocket disconnect triggers auto-reconnect (5s interval)
- JSON parse errors logged, message ignored
- Unknown message types return error response

**Frontend:**
- API errors caught and displayed via toast notifications
- Device fetch failures logged, stale data retained
- Network errors show disconnected status

## Security Boundaries and Trust Zones

### **Trusted Zone (Backend Server)**
- Accepts connections from ESP32 devices (WSS) and browsers (HTTPS)
- Validates device tokens against MongoDB
- Validates JWT tokens for user authentication
- Owns canonical state for devices and transactions

### **Device Zone (ESP32 Firmware)**
- Authenticates using pre-provisioned device token (UUID v4)
- Executes relay commands received from server
- Sends state reports back to server
- Uses insecure TLS (certificate verification disabled)

### **User Zone (Frontend)**
- Authenticates using email/password → JWT
- Can only manage devices belonging to authenticated user
- Can issue commands to online devices
- Cannot directly communicate with ESP32 devices

### **Untrusted Zone (Internet)**
- All traffic over TLS/WSS
- CORS configured to allow frontend origin
- Device tokens are UUIDs (hard to guess)
- Passwords hashed with bcrypt (12 rounds)
- JWT tokens short-lived (15 minutes access, 7 days refresh)

---

*Architecture analysis: 2026-04-04*
