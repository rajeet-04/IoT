# Technology Stack

**Project:** IoT Device Control Platform
**Researched:** 2026-03-31

---

## 1. ESP32 Firmware Stack

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| **arduino-esp32** (ESP-IDF based) | 3.3.7 (based on ESP-IDF v5.5.2) | Core firmware framework | Official Espressif Arduino core. Latest stable as of March 2026. Mature ecosystem, massive community, direct WiFi + WebSocket support built-in. | HIGH |
| **esp_websocket_client** (built-in) | Bundled with arduino-esp32 3.x | WebSocket client for ESP32 | Official Espressif protocol component. Supports WSS/TLS with mbedtls, auto-reconnect, ping/pong keepalive, URI-based config. No external dependency needed. | HIGH |
| **ArduinoJson** | 7.x (latest 7.4+) | JSON serialization/deserialization | De facto standard for embedded JSON. Zero-allocation design, compile-time sized buffers. v7 is current stable with improved API. Essential for parsing server commands and serializing device state. | HIGH |
| **WiFi** (built-in) | Bundled with arduino-esp32 | WiFi connectivity | Native ESP32 WiFi library. Handles STA mode connection. No external library needed. | HIGH |

### Rationale

The ESP32 firmware uses the **Arduino framework** (not ESP-IDF native) because it provides the fastest development path for a simple relay-control device. The arduino-esp32 core 3.x series is based on ESP-IDF v5.5.x, giving access to modern WiFi and TLS capabilities.

For WebSocket communication, the **built-in `esp_websocket_client`** component is the right choice over third-party libraries like `WebSockets2_Generic` because:
- It's maintained by Espressif directly
- Supports WSS (TLS) out of the box with mbedtls
- Has built-in auto-reconnect with configurable timeout
- Has built-in ping/pong keepalive (critical for Render's instance rotation)
- Zero additional dependencies

**ArduinoJson v7** is non-negotiable for JSON handling — it's the only JSON library designed for embedded C++ with compile-time memory sizing, preventing heap fragmentation on the ESP32's limited RAM.

### Installation (PlatformIO / Arduino Library Manager)

```ini
; platformio.ini
[env:esp32dev]
platform = espressif32 @ ^6.9.0
board = esp32dev
framework = arduino
lib_deps =
    bblanchon/ArduinoJson @ ^7.4.0
```

---

## 2. Backend Server Stack (Render)

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| **Node.js** | 22.x LTS | Runtime | Current LTS as of early 2026. Excellent WebSocket support, native `fetch`, stable performance. Render supports Node 22 natively. | HIGH |
| **Express** | 5.x | HTTP API framework | Industry standard. Express 5 is stable and production-ready. Minimal overhead, massive ecosystem. Handles REST API routes for device management, auth, and transaction logs. | HIGH |
| **ws** | 8.x (latest 8.19) | WebSocket server | ~80M weekly npm downloads. Minimal, fast, no dependencies. Render's own docs recommend `ws` for Express WebSocket integration. Supports ping/pong, connection tracking, and graceful shutdown. | HIGH |
| **zod** | 3.x | Runtime validation | Type-safe request validation for both HTTP and WebSocket messages. Catches malformed payloads from ESP32 or frontend before they hit business logic. | HIGH |
| **bcrypt** | 5.x | Password hashing | Industry standard for password hashing. Argon2 is technically superior but bcrypt has broader ecosystem support and is sufficient for this scale. | HIGH |
| **jsonwebtoken** | 9.x | JWT auth | Standard JWT implementation for API authentication. Lightweight, well-maintained. | HIGH |

### Rationale

The backend runs a **single Node.js process** combining Express (HTTP REST API) and `ws` (WebSocket server) on the same port. This is the pattern Render's own documentation demonstrates and is optimal for a low-cost single-instance deployment.

**Why `ws` over Socket.io:**
- Socket.io adds ~10x bundle size for features we don't need (rooms, namespaces, fallback transports)
- ESP32 clients connect via raw WebSocket — Socket.io's protocol wrapper would require a custom ESP32 client
- `ws` is lighter, faster, and sufficient for our connection count (1 ESP32 + a handful of browser clients)
- Render's official WebSocket docs use `ws` as their example

**Why Express 5 over alternatives:**
- Fastify is faster but adds complexity we don't need at this scale
- Hono is great for edge but Express has the ecosystem for auth, validation middleware, etc.
- Express 5 has resolved its long RC period and is production-stable

### Project Structure

```
backend/
├── src/
│   ├── server.js          # Express + ws server entry
│   ├── websocket/         # WebSocket handler (ESP32 + browser clients)
│   ├── routes/            # Express REST routes
│   ├── middleware/        # Auth, validation
│   ├── db/                # MongoDB connection & queries
│   └── models/            # Data schemas (zod + Mongoose optional)
├── package.json
└── render.yaml
```

---

## 3. Database Stack (MongoDB Atlas)

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| **MongoDB Atlas** | Free tier (M0) | Managed database | Zero-ops, auto-scaling, built-in backups. Free tier gives 512MB — more than enough for device state, user accounts, and transaction logs in v1. | HIGH |
| **mongodb** (Node.js driver) | 7.1.x | Database driver | Official driver. v7 released Nov 2025 with improved performance, better TypeScript types, and connection pooling. Direct use (no Mongoose) for simplicity and performance. | HIGH |
| **Mongoose** (optional) | 8.x | ODM layer | **Recommended for v1** — provides schema validation, middleware hooks, and query building. Saves boilerplate for user accounts, device documents, and transaction chains. | MEDIUM |

### Rationale

**Driver choice: Raw `mongodb` driver vs Mongoose**

Use **Mongoose** for this project because:
- Schema validation at the model level prevents bad data from entering the blockchain-style transaction log
- Middleware hooks (`pre('save')`) are perfect for computing transaction hashes in the immutable log pattern
- Virtuals and getters simplify duration calculations for on/off events
- The performance overhead is negligible at v1 scale

**Connection strategy:**
- Single `MongoClient` instance shared across the app (connection pooling built-in)
- Connect on server startup, reuse for all requests
- Use `serverApi: { version: '1' }` for Stable API compatibility with future Atlas upgrades

### Collections Design

| Collection | Purpose | Key Fields |
|------------|---------|------------|
| `users` | User accounts | `_id`, `email`, `passwordHash`, `createdAt` |
| `devices` | ESP32 device registry | `_id`, `userId`, `deviceId`, `name`, `status`, `lastSeen` |
| `transactions` | Blockchain-style immutable log | `_id`, `deviceId`, `action`, `timestamp`, `prevHash`, `hash`, `duration` |

---

## 4. Frontend Web App Stack

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| **Next.js** | 16.x (latest stable) | Full-stack React framework | Current major version as of March 2026. App Router, Server Components, built-in API routes. Turbopack for fast dev. The `ws` client connects from client components for real-time updates. | HIGH |
| **React** | 19.x | UI library | Ships with Next.js 16. Server Components reduce client-side JS bundle. | HIGH |
| **TypeScript** | 5.x | Type safety | Non-negotiable for a project with shared data models across ESP32, backend, and frontend. | HIGH |
| **Tailwind CSS** | 4.x | Styling | Zero-config, utility-first. v4 uses CSS-first configuration — no `tailwind.config.js` needed. Fast compile with Oxide engine. | HIGH |
| **shadcn/ui** | latest | UI components | Copy-paste component architecture (no runtime dependency). Built on Radix UI + Tailwind. Perfect for dashboards — data tables, cards, dialogs, toasts. | HIGH |
| **zustand** | 5.x | State management | Minimal, no boilerplate. Perfect for WebSocket connection state, device status, and transaction log cache. Simpler than Redux for this scope. | HIGH |

### Rationale

**Next.js 16** is the right choice because:
- The web frontend needs both SSR (for auth pages, SEO) and real-time client-side updates (WebSocket dashboard)
- Next.js App Router handles this split naturally — Server Components for static content, Client Components for the live dashboard
- API routes can proxy to the Render backend if needed, or connect directly to MongoDB Atlas for read-heavy pages
- Turbopack makes local development fast

**Why not a separate SPA (Vite + React):**
- Next.js gives us SSR for auth pages out of the box
- API route proxying simplifies CORS (frontend and backend on same origin)
- Single deploy target if hosting on Vercel, or can be built as static and served from Render Static Site

**State management: Zustand over alternatives:**
- Redux Toolkit is overkill for device status + transaction log state
- React Context + useReducer works but gets messy with WebSocket event handling
- Zustand provides a clean store with minimal boilerplate and built-in devtools

### Frontend Architecture

```
frontend/
├── src/
│   ├── app/                 # Next.js App Router
│   │   ├── (auth)/          # Login, register routes
│   │   ├── dashboard/       # Main device control UI
│   │   └── api/             # Proxy routes (optional)
│   ├── components/          # shadcn/ui + custom components
│   ├── lib/
│   │   ├── websocket.ts     # WebSocket client hook
│   │   ├── store.ts         # Zustand store
│   │   └── api.ts           # HTTP client
│   └── types/               # Shared types
├── next.config.ts
└── package.json
```

---

## 5. Communication Protocol Stack

### ESP32 ↔ Backend (WebSocket)

| Aspect | Choice | Rationale |
|--------|--------|-----------|
| **Protocol** | WSS (WebSocket Secure) | Render terminates TLS at the load balancer. ESP32 must connect via `wss://` — Render returns 301 redirect for `ws://` which ESP32 can't follow. |
| **Message format** | JSON | Human-readable, easy to debug, native support via ArduinoJson. Binary would save bytes but adds complexity for no real benefit at this scale. |
| **Authentication** | Device token in WebSocket headers | ESP32 sends `Authorization: Bearer <device-token>` in WebSocket handshake headers via `esp_websocket_client_append_header`. Server validates on connection. |
| **Keepalive** | Built-in ping/pong | `esp_websocket_client` has configurable `ping_interval_sec` (default 10s). Server uses `ws.ping()` every 30s. Critical for Render's instance rotation. |
| **Reconnect** | Auto-reconnect with exponential backoff | `esp_websocket_client` supports `disable_auto_reconnect` (default: false) and `reconnect_timeout_ms` (default: 10s). Configure to 5s for faster recovery. |

### Message Schema (JSON)

```json
// ESP32 → Server: Device state report
{
  "type": "state",
  "deviceId": "esp32-001",
  "relay": true,
  "timestamp": 1711900000
}

// Server → ESP32: Relay command
{
  "type": "command",
  "action": "set_relay",
  "value": true,
  "commandId": "cmd-123"
}

// ESP32 → Server: Command acknowledgment
{
  "type": "ack",
  "commandId": "cmd-123",
  "success": true
}
```

### Frontend ↔ Backend

| Channel | Protocol | Purpose |
|---------|----------|---------|
| **Real-time updates** | WSS (same WebSocket server) | Device state changes, live transaction log streaming |
| **Auth, CRUD** | HTTPS (REST via Express) | Login, register, device management, historical log queries |

### Why WebSocket over alternatives

| Alternative | Why Not |
|-------------|---------|
| MQTT | Requires a broker (Mosquitto, etc.). Render doesn't support long-running non-HTTP processes on free tier. Adds infrastructure complexity. |
| HTTP polling | Wasteful, high latency, poor UX. ESP32 would need to poll every 1-2s for "real-time" feel. |
| Server-Sent Events | One-way only (server → client). ESP32 needs bidirectional communication to receive commands. |
| HTTP long-polling | Complex, wasteful, WebSocket exists. |

---

## 6. Deployment & DevOps Stack

| Technology | Purpose | Why | Confidence |
|------------|---------|-----|------------|
| **Render Web Service** | Backend hosting | Free tier supports WebSockets (confirmed Feb 2026 update: free services stay active while receiving WebSocket messages). Single `render.yaml` for infra-as-code. | HIGH |
| **Render Static Site** | Frontend hosting | Free tier with global CDN. Built from Next.js `output: 'export'` or served via `next start` on a separate Web Service. | HIGH |
| **MongoDB Atlas M0** | Database | Free tier, 512MB, auto-scaling. No ops required. | HIGH |
| **PlatformIO** | ESP32 build system | Superior to Arduino IDE — dependency management, CI-friendly, version-locked platforms, serial monitor. | HIGH |
| **GitHub Actions** | CI/CD | Free for public repos. Automate backend tests, frontend builds, and ESP32 firmware compilation checks. | HIGH |
| **dotenv** | Environment config | Standard `.env` pattern. Render injects env vars at deploy time. | HIGH |

### Render Configuration

```yaml
# render.yaml
services:
  - type: web
    name: iot-backend
    runtime: node
    region: oregon
    plan: free
    buildCommand: npm ci
    startCommand: node src/server.js
    envVars:
      - key: NODE_ENV
        value: production
      - key: MONGODB_URI
        sync: false
      - key: JWT_SECRET
        generateValue: true
      - key: WS_HEARTBEAT_INTERVAL
        value: "30000"
```

### Render WebSocket Considerations

**Critical findings from Render's official docs (updated Feb 2026):**
- Free tier WebSockets are fully supported
- Free services spin down after **15 minutes** without HTTP or WebSocket activity
- WebSocket connections close when instances are replaced (deployments, maintenance)
- **No maximum connection duration** — connections last until instance shutdown
- **No hard limit on concurrent connections** — constrained only by instance resources
- Clients must implement reconnection logic with exponential backoff
- Server must implement ping/pong heartbeat to detect stale connections

### ESP32 Flash Process

| Method | When to Use |
|--------|-------------|
| USB serial flash (PlatformIO) | Development, initial provisioning |
| OTA (Over-The-Air) | Post-deployment updates (v2+) |

---

## 7. What NOT to Use and Why

| Technology | Why Not | What to Use Instead |
|------------|---------|---------------------|
| **Socket.io** | ESP32 can't use Socket.io protocol natively. Would need a custom ESP32 client or HTTP long-polling fallback. Overkill for our connection count. | Raw `ws` library + `esp_websocket_client` |
| **MQTT** | Requires a separate broker process. Render free tier doesn't support persistent non-HTTP services. Adds operational complexity. | WebSocket over the same Express server |
| **Firebase Realtime Database** | Vendor lock-in, pricing scales unpredictably. We already chose MongoDB Atlas. | MongoDB Atlas with change streams |
| **Mongoose (for ESP32)** | Doesn't exist — Mongoose is a Node.js ODM. ESP32 uses raw MongoDB wire protocol or HTTP API. | Direct WebSocket messages to backend |
| **ESP-IDF (native)** | Steeper learning curve, CMake build system, longer dev cycle. Overkill for a simple relay controller. | Arduino framework via arduino-esp32 |
| **ESPHome** | Designed for Home Assistant integration, not custom backend communication. Locks you into YAML config pattern. | Custom Arduino firmware |
| **Insecure `ws://` for ESP32** | Render returns 301 redirect for non-TLS WebSocket. ESP32's HTTPClient can't follow WebSocket redirects. | Always use `wss://` |
| **Next.js API routes as WebSocket server** | Next.js Edge Runtime doesn't support WebSockets. Node.js API routes work but add complexity vs dedicated backend. | Dedicated Express + ws server on Render |
| **Redux** | Excessive boilerplate for device state + transaction log. Adds bundle size. | Zustand |
| **Prisma** | MongoDB support is limited compared to PostgreSQL. Mongoose or raw driver is better for Atlas. | Mongoose or raw `mongodb` driver |
| **Docker for backend** | Render handles build/deploy natively for Node.js. Docker adds build time and image size for no benefit on free tier. | Native Node.js deployment |
| **PostgreSQL** | No advantage over MongoDB for our document-based data model (device state, transaction logs). MongoDB Atlas free tier is simpler. | MongoDB Atlas |

---

## Complete Installation Commands

### Backend

```bash
# Initialize
mkdir backend && cd backend && npm init -y

# Core dependencies
npm install express@^5.0 ws@^8.19 mongodb@^7.1 zod@^3.23 jsonwebtoken@^9.0 bcrypt@^5.1 dotenv@^16.4

# Dev dependencies
npm install -D typescript@^5.4 @types/node@^22 @types/express@^5.0 @types/ws@^8.5 @types/bcrypt@^5.0 nodemon@^3.1
```

### Frontend

```bash
# Create Next.js app
npx create-next-app@latest frontend --typescript --tailwind --app --eslint

# Additional dependencies
cd frontend
npm install zustand@^5.0 lucide-react@latest

# shadcn/ui setup
npx shadcn@latest init
npx shadcn@latest add button card table dialog toast badge
```

### ESP32 (PlatformIO)

```bash
# Install PlatformIO (VS Code extension or CLI)
# Then create project:
pio init --board esp32dev --project-option "framework=arduino"

# platformio.ini dependencies:
#   bblanchon/ArduinoJson @ ^7.4.0
```

---

## Sources

- **ESP WebSocket Client**: Espressif ESP-Protocols official docs — https://docs.espressif.com/projects/esp-protocols/esp_websocket_client/docs/latest/
- **arduino-esp32 v3.3.7**: GitHub releases — https://github.com/espressif/arduino-esp32/releases
- **ArduinoJson v7**: Official documentation — https://arduinojson.org/v7/
- **WebSockets on Render**: Render official docs — https://render.com/docs/websocket
- **Render free tier WebSocket update**: Render changelog (Feb 24, 2026) — https://render.com/changelog/free-web-services-now-remain-active-while-receiving-websocket-messages
- **ws library**: npm — https://www.npmjs.com/package/ws (v8.19.0)
- **MongoDB Node.js Driver v7.1.1**: npm — https://www.npmjs.com/package/mongodb
- **Next.js 16.2**: Next.js blog — https://nextjs.org/blog/next-16-2
- **Best WebSocket Libraries for Node.js 2026**: PkgPulse — https://www.pkgpulse.com/blog/best-websocket-libraries-nodejs-2026
