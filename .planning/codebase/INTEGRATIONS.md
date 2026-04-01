# External Integrations

**Analysis Date:** 2026-04-01

## APIs & External Services

### Database

**MongoDB Atlas**
- **Purpose:** Primary data store for users, devices, and transaction logs
- **Tier:** M0 (Free tier) — 512MB storage, auto-scaling
- **Driver:** `mongoose` 8.13.1 (Node.js ODM)
- **Connection:** `MONGODB_URI` environment variable
- **Stable API:** Enabled via `serverApi: { version: '1' }` in connection options

**Collections:**
| Collection | Purpose | Key Fields |
|------------|---------|------------|
| `users` | User accounts | `_id`, `email`, `passwordHash`, `createdAt` |
| `devices` | ESP32 device registry | `_id`, `userId`, `deviceId`, `name`, `status`, `lastSeen` |

**Connection Pattern:**
- Single shared `mongoose` connection cached in `src/db/connection.js`
- Connection event listeners for error and disconnect logging
- Stable API version ensures compatibility with future Atlas upgrades

### Hosting & Backend

**Render Web Service**
- **Purpose:** Backend server hosting
- **Runtime:** Node.js 22.x
- **Plan:** Free tier
- **Region:** Oregon
- **Config file:** `render.yaml`

**Render Settings:**
| Setting | Value |
|---------|-------|
| `buildCommand` | `npm ci --omit=dev` |
| `startCommand` | `node src/index.js` |
| `healthCheckPath` | `/health` |
| `NODE_ENV` | `production` |
| `PORT` | `3000` |

**WebSocket Support (Render Free Tier):**
- WebSockets are fully supported on free tier
- Services stay active while receiving WebSocket messages
- No maximum connection duration
- No hard limit on concurrent connections (constrained by instance resources)
- Clients must implement reconnection with exponential backoff
- Server implements ping/pong heartbeat

### Authentication & Identity

**JWT (jsonwebtoken 9.0.2)**
- **Implementation:** Custom utils in `src/utils/jwt.js`
- **Access Token:** 15-minute expiry, stored in `accessToken` httpOnly cookie
- **Refresh Token:** 7-day expiry, stored in `refreshToken` httpOnly cookie
- **Algorithm:** HS256 (default)
- **Secrets:** `JWT_SECRET` and `JWT_REFRESH_SECRET` env vars (user-provided on Render)

**Password Hashing (bcrypt 5.1.1)**
- **Salt rounds:** 12
- **Usage:** `hashPassword()` and `verifyPassword()` in `src/utils/password.js`

### Client Communication

**ESP32 ↔ Backend Communication**
| Aspect | Choice | Implementation |
|--------|--------|----------------|
| **Protocol** | WebSocket Secure (WSS) | Native ESP32 `esp_websocket_client` |
| **Message format** | JSON | Parsed via ArduinoJson |
| **Authentication** | Device token in connection headers | Generated as UUID v4 via `generateDeviceToken()` |
| **Keepalive** | Ping/pong | ESP32 client ping interval + server-side `ws.ping()` |
| **Reconnect** | Auto-reconnect with backoff | ESP32 client `reconnect_timeout_ms` config |

**Device Token Generation:**
- Method: `crypto.randomUUID()` (Node.js built-in)
- Format: UUID v4 string
- Returned once at device registration, user flashes to ESP32

### CORS Configuration

**cors** 2.8.5
- Origin: `FRONTEND_URL` environment variable
- Empty string = no CORS restrictions
- Credentials: Supported via `accessToken` and `refreshToken` httpOnly cookies

## Environment Configuration

### Required Environment Variables

| Variable | Purpose | Where Set |
|----------|---------|-----------|
| `MONGODB_URI` | MongoDB Atlas connection string | Render (user-provided) |
| `JWT_SECRET` | Access token signing secret | Render (user-provided) |
| `JWT_REFRESH_SECRET` | Refresh token signing secret | Render (user-provided) |
| `FRONTEND_URL` | CORS origin | Render (empty = open) |
| `NODE_ENV` | Runtime environment | Render auto-set to `production` |
| `PORT` | Server port | Render auto-set to `3000` |

### Secrets Location

- **Render:** Environment variables panel (not committed to git)
- **Local development:** `.env` file (in `.gitignore`)

## Deployment Pipeline

### Render Deployment Flow

1. **Build:** `npm ci --omit=dev` installs production dependencies
2. **Start:** `node src/index.js` launches Express server
3. **Health check:** `GET /health` endpoint (handled by Express)
4. **WebSocket:** Same server on port 3000 (Render handles TLS termination)

### Environment Variable Sync

| Variable | Sync Enabled | Notes |
|----------|--------------|-------|
| `MONGODB_URI` | No | User provides after creating Atlas cluster |
| `JWT_SECRET` | No | User generates secure random string |
| `JWT_REFRESH_SECRET` | No | User generates secure random string |
| `FRONTEND_URL` | Yes | Empty string initially |
| `NODE_ENV` | Yes | Auto-set to `production` |
| `PORT` | Yes | Auto-set to `3000` |

## What NOT to Use

| Integration | Why Not | Alternative |
|-------------|---------|-------------|
| **MQTT Broker (Mosquitto, etc.)** | Requires persistent non-HTTP service — not supported on Render free tier. Adds infrastructure complexity. | WebSocket on same Express server |
| **Firebase Realtime Database** | Vendor lock-in, unpredictable pricing, already using MongoDB Atlas. | MongoDB Atlas with WebSocket for real-time |
| **Socket.io** | ESP32 cannot use Socket.io protocol. Would need custom client or HTTP fallback. | Native WebSocket via `esp_websocket_client` |
| **PostgreSQL** | No advantage for document-based data model. MongoDB Atlas free tier simpler. | MongoDB Atlas |
| **Redis** | Adds cost and complexity. JWT refresh tokens in httpOnly cookies sufficient. | Cookie-based refresh tokens |
| **Docker** | Render handles Node.js natively. Docker adds build time. | Native Node.js deployment |
| **Separate Auth Service** | Overkill for this scale. JWT in cookies sufficient. | Same Express server |

---

*Integration audit: 2026-04-01*
