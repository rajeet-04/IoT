# Copilot Instructions for IoT Device Control Platform

This document helps Copilot (and other AI assistants) work effectively in this monorepo. Refer to `CLAUDE.md` for project context, constraints, and the complete technology stack rationale.

---

## Build, Test & Lint Commands

### Backend (Node.js + Express)

```bash
# Install dependencies
npm install

# Development server (auto-reload with nodemon)
npm run server

# Run all tests
npm test

# Run tests in watch mode
node --experimental-vm-modules node_modules/jest/bin/jest.js --watch

# Production start
npm start

# Run backend + frontend together (from root)
npm run dev
```

**Test Setup:** Jest with Node.js test environment. Tests run with `--experimental-vm-modules` because the project uses ES modules (`"type": "module"` in package.json). Config in `package.json` under `jest` key.

### Frontend (Next.js)

```bash
# Install dependencies
cd frontend && pnpm install

# Development server (Turbopack)
pnpm dev

# Build for production
pnpm build

# Start production server
pnpm start

# Lint with ESLint
pnpm lint
```

**Note:** Frontend uses `pnpm` (workspace-aware package manager), not npm. Workspace config in `pnpm-workspace.yaml` at root.

### ESP32 Firmware (PlatformIO)

```bash
# Build firmware
platformio run -e esp32dev

# Upload to device
platformio run -e esp32dev --target upload

# Monitor serial output
platformio device monitor -b 115200

# Clean build
platformio run -e esp32dev --target clean
```

**Build Flags:** Credentials are in `firmware/platformio.ini` under build_flags (WiFi SSID/password, backend URL, device token). These should eventually be injected at build time via environment variables or a separate secrets file to avoid committing credentials.

---

## High-Level Architecture

### Communication Flow

```
┌─────────────┐         WebSocket (WSS)          ┌──────────────────┐
│   ESP32     │◄────────────────────────────────►│ Express Backend  │
│  Relay Dev  │  Bearer token auth + JSON msgs   │  (Render: port   │
└─────────────┘                                  │    3000)         │
                                                 │                  │
                                                 │ Manages:         │
                                                 │ • Devices        │
                                                 │ • Users          │
                                                 │ • Transactions   │
                                                 └────────┬─────────┘
                                                          │
                                                        MongoDB
                                                       (Mongoose)
                                                          │
                                                     Collections:
                                                     • users
                                                     • devices
                                                     • transactions

┌──────────────────────────┐  REST API + WSS     ┌─────────────────┐
│  Next.js Dashboard       │◄───────────────────►│ Express Backend │
│  (Render or Vercel)      │  Real-time updates  │   (same as      │
│                          │  via shared         │    above)       │
│ Features:                │  WebSocket server   │                 │
│ • Device control UI      │                     └─────────────────┘
│ • Real-time status       │
│ • Transaction history    │
│ • User auth (JWT)        │
└──────────────────────────┘
```

### Codebase Structure

**Backend** (`src/`)
- `index.js` — Main Express app, WebSocket server setup, graceful shutdown
- `routes/` — REST API endpoints for auth, devices, transactions
- `models/` — Mongoose schemas (User, Device, Transaction) with validation & hooks
- `middleware/` — Auth middleware (JWT verification)
- `ws/` — WebSocket hub, connection registry, message routing logic
- `db/` — MongoDB connection setup
- `utils/` — Helper functions

**Frontend** (`frontend/src/`)
- `app/` — Next.js App Router pages (layout, auth, dashboard)
- `components/` — React components (UI controls, device cards, etc.)
- `lib/` — Utilities (API calls, constants)
- `store/` — Zustand state management (WebSocket connection state, device status cache)

**Firmware** (`firmware/`)
- `src/main.cpp` — Entry point, WiFi setup, main loop
- `src/websocket_client.{cpp,h}` — ESP WebSocket client with reconnect logic
- `src/relay_controller.{cpp,h}` — GPIO relay control
- `lib/` — Arduino libraries (managed by PlatformIO)
- `platformio.ini` — Build config, board selection, library versions, build flags

### Data Flow: Turning a Relay On/Off

1. **User clicks toggle in Next.js dashboard**
2. Frontend sends HTTP request or WebSocket message to backend
3. Backend validates user auth (JWT token)
4. Backend sends command via WebSocket to ESP32 (if connected)
5. ESP32 receives command, validates device token, controls GPIO 2
6. ESP32 sends state_report back to backend confirming new relay state
7. Backend logs transaction (immutable blockchain-style record)
8. Backend broadcasts state update to all connected WebSocket clients (dashboard + other devices)
9. Dashboard updates UI in real-time (Zustand store update)

### Key Design Decisions

- **WebSocket over alternatives:** Bidirectional, low-latency, Render supports it on free tier. Raw `ws` library (not Socket.io) chosen because ESP32 can't use Socket.io protocol natively.
- **Mongoose over raw MongoDB driver:** Schema validation, middleware hooks (`pre('save')` for computing transaction hashes), less boilerplate. Performance overhead negligible at v1 scale.
- **Zustand over Redux:** Minimal boilerplate for device state + transaction log cache. Perfect for WebSocket event handling.
- **MongoDB Atlas free tier (M0):** 512MB sufficient for devices, users, transaction logs. Zero-ops vs self-managed DB.
- **Secure WSS only:** Render returns 301 redirect for `ws://` which ESP32 can't follow. Always use `wss://`.

---

## Key Conventions

### Backend (Express + Node.js)

1. **Middleware order matters.** Stack in `src/index.js`:
   - JSON parsing first
   - Cookie parsing second
   - CORS third
   - Routes fourth
   - Error handler last

2. **Async/await everywhere.** All route handlers and utility functions use `async/await`, not callbacks or `.then()` chains.

3. **Error responses are JSON objects** with an `error` field (not bare strings):
   ```javascript
   res.status(400).json({ error: 'Device not found' });
   ```

4. **Mongoose schemas include validation.** Validators on fields prevent bad data at the model layer:
   ```javascript
   email: {
     type: String,
     required: [true, 'Email is required'],
     unique: true,
     lowercase: true,
     trim: true,
     match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email'],
   }
   ```

5. **Pre-hooks compute derived fields** before saving. Example: `Transaction` model likely has a pre-hook that computes transaction hash for the blockchain-style immutable log.

6. **WebSocket messages are JSON** with a `type` field and optional `data` payload:
   ```json
   { "type": "command", "data": { "action": "toggle", "deviceId": "abc-123" } }
   ```

7. **Device tokens are issued during registration,** not guessed. Clients (ESP32) include token in WebSocket handshake headers:
   ```
   Authorization: Bearer <device-token>
   ```

8. **JWT tokens (for users) are short-lived.** Refresh tokens are stored in HTTP-only cookies if used. Check `.env.example` for `JWT_SECRET` and `JWT_REFRESH_SECRET`.

9. **Imports use ES modules** (`import ... from ...`), not CommonJS. This applies to all backend files.

### Frontend (Next.js + React + TypeScript)

1. **App Router only.** Next.js 15 uses the `/app` directory for file-based routing, not Pages Router.

2. **TypeScript strict mode enabled.** `tsconfig.json` has `"strict": true`. All React components should be typed:
   ```typescript
   interface DeviceProps {
     deviceId: string;
     onToggle: (newState: boolean) => Promise<void>;
   }
   
   export default function Device({ deviceId, onToggle }: DeviceProps) {
     // ...
   }
   ```

3. **Path alias `@/*` maps to `src/`.** So `import Button from '@/components/Button'` is equivalent to `import Button from './src/components/Button'`.

4. **Zustand store pattern.** State is in `frontend/src/store/` with hooks-based API:
   ```typescript
   // store/deviceStore.ts
   import { create } from 'zustand';
   
   interface DeviceStoreState {
     devices: Device[];
     setDevices: (devices: Device[]) => void;
   }
   
   export const useDeviceStore = create<DeviceStoreState>((set) => ({
     devices: [],
     setDevices: (devices) => set({ devices }),
   }));
   ```

5. **WebSocket connection managed in store.** The `store/` likely has a hook that initializes the WebSocket connection on app load and manages reconnect logic.

6. **shadcn/ui components are copy-pasted.** They're in `frontend/src/components/ui/`. Don't import from npm; add new ones via `npx shadcn-ui@latest add <component>`.

7. **Tailwind CSS v4 (CSS-first).** No `tailwind.config.js` needed. Styling is pure utility classes in JSX. Config is in `postcss.config.mjs` if needed.

8. **Lucide React for icons.** Import icons like:
   ```typescript
   import { Power, Wifi, AlertCircle } from 'lucide-react';
   ```

### ESP32 Firmware (C++ / Arduino)

1. **Build flags define credentials:** WiFi SSID, password, backend URL, device token. Set in `platformio.ini` or inject at build time. **Never hardcode secrets in source files.**

2. **Auto-reconnect is critical.** The `esp_websocket_client` library (built into arduino-esp32) has configurable reconnect with exponential backoff. Render free tier spins down instances after 15 minutes of inactivity, so ESP32 must handle reconnection gracefully.

3. **Ping/pong keepalive prevents stale connections.** `esp_websocket_client` supports `ping_interval_sec` (default 10s). Configure appropriately to keep Render instance alive.

4. **WebSocket auth via headers.** ESP32 sends device token in WebSocket handshake headers:
   ```cpp
   esp_websocket_client_append_header(client, "Authorization", "Bearer <device-token>");
   ```

5. **Use ArduinoJson for all JSON parsing.** Parse incoming command messages and serialize state reports as JSON. Example:
   ```cpp
   StaticJsonDocument<200> doc;
   deserializeJson(doc, payload);
   String messageType = doc["type"];
   ```

6. **Relay control via GPIO 2.** SRD-05VDC-SL-C relay is connected to GPIO 2 (signal), Vin (5V coil), GND. Control is a simple digitalWrite(2, HIGH/LOW).

7. **Serial debug output at 115200 baud.** Use `Serial.println()` for debugging. Output visible in PlatformIO's serial monitor.

---

## Deployment & Environment Variables

### Required Environment Variables

**Backend** (.env at root):
- `MONGODB_URI` — MongoDB Atlas connection string (e.g., `mongodb+srv://user:pass@cluster0.xyz.mongodb.net/?...`)
- `JWT_SECRET` — Secret key for signing JWTs
- `JWT_REFRESH_SECRET` — Secret for refresh tokens
- `FRONTEND_URL` — URL of the Next.js dashboard (for CORS)
- `NODE_ENV` — Set to `production` on Render

**Frontend** (.env.local in `frontend/`):
- `NEXT_PUBLIC_API_URL` — Backend URL (e.g., `https://iot-backend.onrender.com`)

**ESP32** (build flags in `platformio.ini`):
- `WIFI_SSID` — WiFi network name
- `WIFI_PASSWORD` — WiFi password
- `BACKEND_URL` — Backend domain (without `https://` or `/ws`)
- `DEVICE_TOKEN` — Unique device token (issued during registration)

### Deployment on Render

- **Backend:** Single Node.js Web Service in `render.yaml`. Health check at `/health` endpoint.
- **Frontend:** Separate Web Service (Root Directory: `frontend/`, Build Command: `pnpm install && pnpm build`, Start Command: `pnpm start`).
- **Free tier:** WebSockets fully supported. Services spin down after 15 min without HTTP/WebSocket activity. ESP32 must implement reconnect logic.

---

## Testing

- **Backend:** Jest with Node.js environment. Tests in any file matching `*.test.js` or `*.spec.js` pattern. Run with `npm test`.
- **Frontend:** Tests for Next.js components typically use Jest + React Testing Library. Command: `pnpm test` (if configured).
- **ESP32:** Unit testing is typically done with PlatformIO's test framework or on-device testing. See `platformio.ini` for test config.

Currently, test coverage is minimal. New features should include tests.

---

## Rendering & Performance Notes

- **Render Free Tier:** Instances spin down after 15 min of inactivity. WebSocket keepalive (ping/pong) counts as activity.
- **MongoDB Atlas M0:** 512MB storage. Query performance is excellent for this scale (100s of devices, 1000s of transactions). No connection pooling worries with Mongoose.
- **Next.js Turbopack:** Fast local dev iteration. Build time ~30s for production.

---

## Quick Reference

| Task | Command |
|------|---------|
| Install all deps | `npm install && cd frontend && pnpm install && cd ..` |
| Dev (all services) | `npm run dev` from root |
| Backend only | `npm run server` |
| Frontend only | `cd frontend && pnpm dev` |
| Test backend | `npm test` |
| Build frontend | `cd frontend && pnpm build` |
| Build firmware | `platformio run -e esp32dev` |
| Flash ESP32 | `platformio run -e esp32dev --target upload` |
| Monitor ESP32 serial | `platformio device monitor -b 115200` |

---

## Relevant Documentation

- **Project Overview & Constraints:** `CLAUDE.md` (GSD project markers)
- **Setup Instructions:** `setup.md` (full walkthrough for developers)
- **User-facing README:** `README.md` (features, wiring diagram, API reference)

---

## AI Assistant Notes

- This is a **three-tier system:** ESP32 firmware (C++ over Arduino) ↔ Express backend (Node.js) ↔ Next.js frontend (TypeScript/React).
- **Credential handling:** Build flags currently contain real WiFi & device tokens in `platformio.ini`. Recommend moving to environment-based injection before production.
- **Transaction log:** Referred to as "blockchain-inspired." Implementation is a Mongoose collection with immutable records, not an actual blockchain.
- **No ORM for ESP32:** Devices communicate via WebSocket JSON, not direct DB access. Backend handles all persistence.
- **State is authoritative on backend.** Frontend caches state in Zustand but backend is source of truth. Confirm with server on toggle actions.
