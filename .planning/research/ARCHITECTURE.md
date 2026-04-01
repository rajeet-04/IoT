# Architecture Patterns

**Domain:** IoT Device Control System
**Researched:** 2026-03-31

## 1. System Architecture Overview

This system follows a **hub-and-spoke (star) architecture** where the Render backend server acts as the central communication hub. All device-to-web and web-to-device communication flows through this hub, enabling centralized control, logging, and security enforcement.

```
┌─────────────┐          ┌──────────────────┐          ┌─────────────┐
│   ESP32     │◄────────►│  Render Backend  │◄────────►│  Web App    │
│  (Device)   │  WiFi    │  (Node.js/Express│  HTTP/   │(React/Next.js)
│             │          │   + WebSocket)   │   WS     │             │
└─────────────┘          └────────┬─────────┘          └─────────────┘
                                  │
                                  ▼
                         ┌──────────────────┐
                         │  MongoDB Atlas   │
                         │  (State + Logs)  │
                         └──────────────────┘
```

**Key Architectural Decisions:**

- **Centralized Hub Pattern**: Render server mediates all communication, preventing direct ESP32-to-web connections
- **Device Shadow Pattern**: Backend maintains current device state for quick queries without polling hardware
- **Blockchain Transaction Log**: Immutable append-only record of all state changes in MongoDB
- **Real-time Updates**: WebSocket connections for instant state propagation to all connected clients

## 2. Component Boundaries

| Component | Responsibility | Communicates With | Technology |
|-----------|---------------|-------------------|------------|
| **ESP32 Firmware** | WiFi connectivity, relay control, WebSocket client, heartbeat | Render Backend (WebSocket) | Arduino/C++, WebSockets library |
| **Render Backend API** | HTTP REST endpoints, authentication, device management | Web App (HTTP), MongoDB Atlas | Node.js, Express, Express-WS |
| **Render WebSocket Hub** | Real-time message routing, state broadcasting, connection management | ESP32 (WS), Web App (WS) | ws or socket.io |
| **Device State Manager** | Current state tracking, device shadow, online/offline detection | MongoDB Atlas, WebSocket Hub | In-memory + MongoDB |
| **Transaction Logger** | Blockchain-style immutable logging, hash chaining | MongoDB Atlas | MongoDB transactions |
| **Web App Frontend** | User interface, device control, real-time dashboard, auth | Render Backend (HTTP/WS) | React/Next.js |
| **MongoDB Atlas** | Persistent storage (users, devices, state, transactions) | Render Backend | MongoDB Driver |

### Component Isolation Rules

1. **ESP32 never talks directly to Web App** - all traffic routes through Render
2. **Web App never talks directly to MongoDB** - all data access through backend API
3. **ESP32 only authenticates with backend** - no direct database access
4. **Transaction Logger is append-only** - no updates/deletes on transaction records

## 3. Data Flow Diagrams (text-based)

### 3.1 Device Control Flow (Web → ESP32)

```
User clicks "ON" in Web App
    │
    ▼
Web App sends WebSocket message to Render Backend
    │ { "deviceId": "esp32-001", "action": "on", "timestamp": "..." }
    ▼
Render Backend validates user permissions
    │
    ▼
Backend records pending transaction in MongoDB
    │ { type: "state_change", from: "off", to: "on", status: "pending" }
    ▼
Backend routes command to ESP32 via WebSocket
    │ { "command": "set_relay", "state": 1 }
    ▼
ESP32 receives command, actuates relay
    │
    ▼
ESP32 sends acknowledgment back to Backend
    │ { "status": "success", "relay_state": 1 }
    ▼
Backend updates device state in MongoDB
    │
    ▼
Backend finalizes blockchain transaction record
    │ { ..., status: "confirmed", hash: "abc123..." }
    ▼
Backend broadcasts state update to all connected WebSocket clients
    │
    ▼
Web App updates UI to reflect new state
```

### 3.2 State Query Flow (Web App → Backend → DB)

```
User opens dashboard
    │
    ▼
Web App requests device state via HTTP GET /api/devices/:id
    │
    ▼
Backend queries MongoDB for latest device state
    │
    ▼
Backend returns current state + recent transaction history
    │
    ▼
Web App renders dashboard with current state
    │
    ▼
Web App establishes WebSocket connection for real-time updates
```

### 3.3 Device Heartbeat & Presence Flow

```
ESP32 sends periodic heartbeat (every 30s)
    │ { "type": "heartbeat", "deviceId": "esp32-001", "uptime": 12345 }
    ▼
Render Backend updates last_seen timestamp in MongoDB
    │
    ▼
Backend marks device as "online" in device shadow
    │
    ▼
If heartbeat missed for 90s → mark device as "offline"
    │
    ▼
Backend broadcasts presence change to connected WebSocket clients
```

### 3.4 Blockchain Transaction Chain Flow

```
Transaction N:
{
  "index": 42,
  "timestamp": "2026-03-31T10:30:00Z",
  "deviceId": "esp32-001",
  "action": "on",
  "previousHash": "sha256_of_transaction_41",
  "hash": "sha256(index + timestamp + deviceId + action + previousHash)"
}
    │
    ▼
Inserted into MongoDB "transactions" collection (append-only)
    │
    ▼
Next transaction references this transaction's hash as previousHash
    │
    ▼
Tamper detection: recompute hash chain to verify integrity
```

## 4. Communication Patterns

### 4.1 Protocol Selection

| Communication Path | Protocol | Rationale |
|-------------------|----------|-----------|
| ESP32 ↔ Backend | **WebSocket** (primary) + HTTP (fallback) | Real-time bidirectional, low latency, ESP32 WebSocket libraries well-supported |
| Web App ↔ Backend | **WebSocket** (real-time) + **HTTP REST** (CRUD) | WebSocket for live updates, REST for initial load and auth |
| Backend ↔ MongoDB | **MongoDB Driver** (native) | Managed connection pool, official driver support |

### 4.2 WebSocket Message Schema

**ESP32 → Backend:**

```json
// Heartbeat
{ "type": "heartbeat", "deviceId": "esp32-001", "uptime": 12345 }

// State acknowledgment
{ "type": "ack", "commandId": "cmd-123", "status": "success", "relayState": 1 }

// Error report
{ "type": "error", "deviceId": "esp32-001", "code": "RELAY_TIMEOUT", "message": "..." }
```

**Backend → ESP32:**

```json
// Relay control command
{ "type": "command", "commandId": "cmd-123", "action": "set_relay", "state": 1 }

// Configuration update
{ "type": "config", "heartbeatInterval": 1000 }
```

**Backend ↔ Web App:**

```json
// State update broadcast
{ "type": "state_update", "deviceId": "esp32-001", "state": "on", "timestamp": "..." }

// Transaction confirmation
{ "type": "transaction_confirmed", "transactionId": "txn-456", "hash": "abc123..." }

// Device presence change
{ "type": "presence_change", "deviceId": "esp32-001", "status": "online" }
```

### 4.3 Connection Management

| Pattern | Implementation | Purpose |
|---------|---------------|---------|
| **Auto-reconnect** | ESP32 implements exponential backoff (1s, 2s, 4s, 8s max 30s) | Handle network drops gracefully |
| **Connection pooling** | Backend maintains WebSocket connection registry by deviceId | Route commands to correct device |
| **Heartbeat monitoring** | 30s interval from ESP32, 90s timeout for offline detection | Presence detection |
| **Graceful degradation** | HTTP fallback if WebSocket unavailable | Ensure basic functionality |

## 5. Security Architecture

### 5.1 Authentication Flow

```
┌─────────────┐     ┌──────────────────┐     ┌─────────────┐
│   Web App   │────►│  Render Backend  │────►│ MongoDB     │
│             │     │  Auth Middleware │     │ Atlas       │
└─────────────┘     └──────────────────┘     └─────────────┘
                           │
                           ▼
                     ┌─────────────┐
                     │   ESP32     │
                     │(Device Token)│
                     └─────────────┘
```

**Web App Authentication:**

- JWT-based authentication with refresh tokens
- HTTP-only cookies for token storage
- Protected API routes with middleware validation

**ESP32 Authentication:**

- Pre-shared device tokens stored in MongoDB
- Token sent during WebSocket handshake
- Backend validates token before accepting connection
- Token rotation capability for compromised devices

### 5.2 Data Protection

| Layer | Protection | Implementation |
|-------|-----------|----------------|
| **Transport** | TLS/SSL | WSS for WebSocket, HTTPS for REST |
| **Authentication** | Token-based | JWT for web, device tokens for ESP32 |
| **Authorization** | Role-based | User permissions per device |
| **Data at Rest** | MongoDB Atlas encryption | Built-in Atlas encryption |
| **Transaction Integrity** | Hash chaining | SHA-256 hash chain for tamper detection |

### 5.3 Attack Surface Mitigation

| Threat | Mitigation |
|--------|-----------|
| **Unauthorized device control** | JWT validation + device ownership checks |
| **Replay attacks** | Timestamp validation + commandId uniqueness |
| **Man-in-the-middle** | WSS/HTTPS only, certificate validation |
| **Device impersonation** | Unique device tokens, token rotation |
| **Transaction tampering** | Hash chain verification, append-only collection |
| **WebSocket flooding** | Rate limiting, connection limits per user |

## 6. Suggested Build Order

### Phase 1: Foundation (Week 1-2)

**Priority: Backend Core + Database Schema**

1. **MongoDB Atlas Setup**
   - Create database and collections (users, devices, transactions)
   - Define schemas and indexes
   - Set up connection from local development

2. **Render Backend - REST API**
   - Express server setup with basic routing
   - User authentication (register, login, JWT)
   - Device CRUD endpoints
   - MongoDB connection and data models

3. **Basic Web App Shell**
   - Next.js project setup
   - Authentication UI (login/register forms)
   - Basic dashboard layout
   - API integration for device listing

**Dependencies:** MongoDB Atlas must be ready before backend development

### Phase 2: Real-time Communication (Week 3-4)

**Priority: WebSocket Infrastructure**

1. **Backend WebSocket Hub**
   - WebSocket server setup on Render
   - Connection management (registry by deviceId)
   - Message routing logic
   - Heartbeat monitoring system

2. **ESP32 Firmware v1**
   - WiFi connection management
   - WebSocket client implementation
   - Relay control logic
   - Heartbeat sending
   - Basic error handling

3. **Web App Real-time Updates**
   - WebSocket client integration
   - Real-time state display
   - Device control UI (on/off buttons)
   - Presence indicators (online/offline)

**Dependencies:** Backend REST API must be functional before WebSocket layer

### Phase 3: Transaction System (Week 5-6)

**Priority: Blockchain-style Logging**

1. **Transaction Logger**
   - Hash chain implementation
   - Transaction recording on state changes
   - Append-only collection enforcement
   - Transaction verification utility

2. **Transaction History UI**
   - Transaction log display in dashboard
   - Hash chain visualization
   - Filtering and search capabilities
   - Export functionality

**Dependencies:** WebSocket communication must be stable before transaction logging

### Phase 4: Polish & Production (Week 7-8)

**Priority: Security, Reliability, Deployment**

1. **Security Hardening**
   - Device token authentication
   - Rate limiting
   - Input validation
   - Error handling improvements

2. **Production Deployment**
    - Render deployment configuration
    - Environment variable management
    - Monitoring and logging setup
    - Performance optimization

**Dependencies:** All core features must be tested before production deployment

### Build Order Rationale

```
MongoDB Atlas → Backend REST API → Web App Shell → WebSocket Hub → ESP32 Firmware → Real-time UI → Transaction System → Security → Production
```

**Key Dependencies:**

- Database schema must exist before any data operations
- REST API must work before WebSocket layer (fallback + auth)
- WebSocket communication must be stable before transaction logging
- Core features must be complete before security hardening

## 7. Scalability Considerations

### 7.1 Current Scale (v1 - Single Device)

| Component | Current Approach | Limitation |
|-----------|-----------------|------------|
| **ESP32** | Single device, direct WiFi | One relay, one network |
| **Backend** | Single Render instance | Free tier: spins down after 15min inactivity |
| **Database** | MongoDB Atlas free tier | 512MB storage, shared cluster |
| **WebSocket** | In-memory connection registry | Lost on server restart |

### 7.2 Growth Path

| Scale | Changes Required | Complexity |
|-------|-----------------|------------|
| **10 devices** | Add device registration UI, connection pooling | Low |
| **100 devices** | Persistent WebSocket registry (Redis), load balancing | Medium |
| **1,000 devices** | Message queue (RabbitMQ), horizontal scaling | High |
| **10,000+ devices** | IoT platform (AWS IoT Core, Azure IoT Hub), edge processing | Very High |

### 7.3 Render Free Tier Limitations

| Limitation | Impact | Mitigation |
|------------|--------|-----------|
| **15min spin-down** | WebSocket connections drop, delayed responses | Implement auto-reconnect, consider paid tier |
| **Single instance** | No horizontal scaling, single point of failure | Design for statelessness where possible |
| **Limited bandwidth** | 100GB/month transfer | Monitor usage, optimize message size |
| **No custom domains (free)** | Uses render.app subdomain | Acceptable for v1, upgrade later |

### 7.4 Future Architecture Evolution

```
Current (v1):                    Future (v2+):
┌──────┐    ┌────────┐           ┌──────┐    ┌────────┐    ┌──────┐
│ESP32 │───►│Render  │           │ESP32 │───►│IoT Hub │───►│Render│
└──────┘    └────────┘           └──────┘    └────────┘    └──────┘
                                  Multiple    Message       Backend
                                  Devices     Broker        Instances
```

**When to Consider Migration:**

- More than 10 devices requiring simultaneous connections
- Need for guaranteed message delivery
- Requirement for device provisioning at scale
- Need for edge computing capabilities

## Sources

- ESP32 WebSocket implementation patterns (VideoSDK Developer Hub, 2025)
- IoT backend system design patterns (System Design Substack, 2025)
- Enterprise IoT architecture best practices (Handoff Labs, 2025)
- ESP32 modular framework patterns (Medium, 2026)
- IoT device management at scale (ENQCODE, 2026)
- Device state management with Redis (OneUptime, 2026)
- ESP32 Firebase IoT projects (IoT Circuit Hub, 2025)
- Render hosting limitations and capabilities (Render docs)
- MongoDB Atlas free tier specifications (MongoDB docs)
