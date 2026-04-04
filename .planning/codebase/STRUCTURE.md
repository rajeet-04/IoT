# Codebase Structure

**Analysis Date:** 2026-04-04

## Directory Layout

```
R:\Code\IoT\
├── .env                     # Environment variables (not committed)
├── .env.example             # Template for environment variables
├── .gitignore               # Git ignore patterns
├── .planning/               # GSD planning artifacts
│   └── codebase/            # This document lives here
├── .github/                 # GitHub Actions workflows
├── src/                     # Backend server (Node.js/Express)
├── firmware/                # ESP32 firmware (PlatformIO)
├── frontend/                # Next.js web application
├── tests/                   # Backend tests
├── package.json             # Backend dependencies
├── pnpm-lock.yaml           # pnpm lockfile
├── pnpm-workspace.yaml      # pnpm workspace config
├── render.yaml              # Render deployment config
└── README.md                # Project documentation
```

## Directory Purposes

### **Backend Server (`src/`)**
- Purpose: Express server with WebSocket hub for IoT device control
- Contains: Routes, models, middleware, WebSocket handlers, utilities

### **ESP32 Firmware (`firmware/`)**
- Purpose: Arduino/PlatformIO firmware for ESP32 devices
- Contains: Main sketch, WebSocket client, relay controller, WiFi manager

### **Frontend Web App (`frontend/src/`)**
- Purpose: Next.js dashboard for device management
- Contains: App Router pages, React components, Zustand store, API client

## Backend Structure (`src/`)

```
src/
├── index.js              # Entry point - Express + WebSocket server
├── db/
│   └── connection.js    # MongoDB connection (Mongoose)
├── models/
│   ├── User.js          # User document schema
│   ├── Device.js        # Device document schema
│   └── Transaction.js    # Transaction document (blockchain-style)
├── routes/
│   ├── auth.routes.js    # /api/auth/* endpoints
│   ├── device.routes.js # /api/devices/* endpoints
│   └── transaction.routes.js # /api/transactions/* endpoints
├── middleware/
│   └── auth.middleware.js # JWT validation middleware
├── utils/
│   ├── jwt.js           # JWT generation/verification
│   ├── password.js      # bcrypt hashing
│   └── deviceToken.js   # Device token generation
└── ws/
    ├── hub.js           # WebSocket server + auth
    ├── messageRouter.js # Message type routing
    └── connectionRegistry.js # Connection tracking
```

### Key Backend Files

**`src/index.js`** (127 lines)
- Initializes Express with CORS, JSON, cookie-parser
- Mounts route handlers at `/api/auth`, `/api/devices`, `/api/transactions`
- Attaches WebSocket hub to HTTP server
- Handles graceful shutdown (SIGTERM, SIGINT)

**`src/db/connection.js`** (43 lines)
- `connectDB(uri)` - Connect to MongoDB with connection caching
- `getDB()` - Returns cached Mongoose instance

**`src/models/Device.js`** (51 lines)
- Fields: `userId`, `deviceId`, `name`, `status`, `lastSeen`, `relayState`
- Indexes: `userId`, `deviceId` (unique)

**`src/models/Transaction.js`** (96 lines)
- Fields: `deviceId`, `userId`, `action`, `relayState`, `timestamp`, `prevHash`, `hash`, `commandId`, `duration`
- Pre-validate hook computes SHA-256 hash chain
- Indexes: `deviceId`, `userId`, compound `[deviceId, timestamp]`

**`src/ws/hub.js`** (284 lines)
- `attachWebSocketHub(server)` - Creates WebSocketServer on `/ws` path
- Validates device tokens, manages connections
- Sends welcome message, handles ping/pong heartbeat
- `broadcastToDeviceSubscribers(deviceId, message)` - Broadcast to subscribed web clients

**`src/routes/device.routes.js`** (242 lines)
- `POST /` - Register new device (returns token ONCE)
- `GET /` - List user's devices
- `GET /:id` - Get specific device
- `PUT /:id` - Update device name
- `DELETE /:id` - Delete device
- `POST /:id/command` - Send command to device (creates Transaction, sends via WebSocket)

## ESP32 Firmware Structure (`firmware/`)

```
firmware/
├── platformio.ini         # PlatformIO configuration
├── cert.pem              # TLS certificate (for WSS)
├── esp32_iot_device/
│   └── esp32_iot_device.ino  # Alternative single-file sketch
├── src/
│   ├── main.cpp          # Main entry point
│   ├── websocket_client.cpp  # WebSocket client implementation
│   ├── websocket_client.h   # WebSocket client header
│   ├── relay_controller.cpp  # Relay control implementation
│   └── relay_controller.h    # Relay control header + wiring diagram
└── lib/
    └── WiFiManager/
        ├── WiFiManager.h     # WiFi manager header
        └── WiFiManager.cpp   # WiFi manager implementation
```

### Key Firmware Files

**`firmware/src/main.cpp`** (259 lines)
- Initializes relay in safe OFF state
- Connects to WiFi with auto-reconnect
- Establishes WebSocket connection with device token
- Message handler dispatches commands to relay
- Main loop handles WiFi and WebSocket ticks

**`firmware/src/websocket_client.cpp`** (166 lines)
- Wraps `WebSocketsClient` from links2004/WebSockets
- WSS with insecure TLS (no CA verification)
- Heartbeat every 30 seconds
- Sends heartbeats, state reports, acknowledgments
- Auto-reconnect on disconnect (5s interval)

**`firmware/src/relay_controller.cpp`** (75 lines)
- `begin()` - Sets GPIO output, ensures safe OFF state
- `setState(bool)` - Turns relay on/off
- `getStateJson()` - Returns state report JSON
- Default pin: GPIO 2

**`firmware/lib/WiFiManager/WiFiManager.cpp`** (144 lines)
- `connect()` - WiFi connection with 15s timeout
- `tick()` - Periodic status check and reconnection
- Exponential backoff: 1s → 30s max

**`firmware/platformio.ini`** (30 lines)
- Framework: arduino, Platform: espressif32
- Dependencies: ArduinoJson@^7.4.0, WebSockets@^2.4.1
- Build flags: WIFI_SSID, WIFI_PASSWORD, BACKEND_URL, DEVICE_TOKEN

## Frontend Structure (`frontend/src/`)

```
frontend/src/
├── app/                    # Next.js App Router pages
│   ├── layout.tsx          # Root layout with metadata
│   ├── page.tsx            # Landing page
│   ├── login/
│   │   └── page.tsx        # Login page with LoginForm
│   ├── register/
│   │   └── page.tsx        # Registration page with RegisterForm
│   └── dashboard/
│       ├── layout.tsx      # Dashboard layout with auth check + sidebar
│       └── page.tsx        # Device dashboard page
├── components/
│   ├── auth/
│   │   ├── login-form.tsx    # Login form with validation
│   │   └── register-form.tsx # Registration form with validation
│   └── dashboard/
│       ├── device-card.tsx       # Device display card
│       ├── relay-toggle.tsx      # Relay ON/OFF toggle button
│       ├── connection-status.tsx # WebSocket status indicator
│       └── sidebar.tsx           # Dashboard navigation sidebar
├── lib/
│   ├── api.ts              # HTTP client with token management
│   └── auth.ts             # Authentication utilities
├── store/
│   └── deviceStore.ts      # Zustand store for device state
└── app/
    ├── layout.tsx          # Root layout
    └── globals.css         # Tailwind + custom styles
```

### Key Frontend Files

**`frontend/src/store/deviceStore.ts`** (196 lines)
- Zustand store with device list, WebSocket status, pending commands
- `init(backendUrl)` - Sets up polling, fetches devices
- `sendCommand(deviceId, action)` - POSTs to API, updates state optimistically
- `fetchDevices()` - GET /api/devices
- `renameDevice(deviceId, name)` - PUT /api/devices/:id

**`frontend/src/lib/api.ts`** (89 lines)
- `apiFetch(path, options)` - Fetch wrapper with JWT Bearer token
- `tokenStore` - localStorage management for access/refresh tokens
- `getBackendUrl()` - Returns backend URL from env
- `getWebSocketUrl()` - Converts http→ws for WebSocket URL

**`frontend/src/lib/auth.ts`** (73 lines)
- `login(email, password)` - POST /api/auth/login, stores tokens
- `register(email, password)` - POST /api/auth/signup, stores tokens
- `logout()` - POST /api/auth/logout, clears tokens
- `getCurrentUser()` - GET /api/auth/me

**`frontend/src/app/dashboard/page.tsx`** (95 lines)
- Fetches devices on mount
- Polls every 10 seconds for updates
- Renders device grid with toggle controls
- Shows empty state when no devices

**`frontend/src/app/dashboard/layout.tsx`** (45 lines)
- Client-side auth check
- Redirects to /login if not authenticated
- Renders Sidebar component

## Naming Conventions

### Backend (Node.js)
- **Files:** kebab-case or camelCase: `auth.middleware.js`, `deviceToken.js`
- **Models:** PascalCase: `User.js`, `Device.js`, `Transaction.js`
- **Routes:** kebab-case: `auth.routes.js`, `device.routes.js`
- **Functions:** camelCase: `generateDeviceToken`, `hashPassword`
- **Classes:** PascalCase: `ConnectionRegistry`

### ESP32 Firmware (C++)
- **Files:** snake_case: `websocket_client.cpp`, `relay_controller.cpp`
- **Classes:** PascalCase: `WebSocketClient`, `RelayController`, `WiFiManager`
- **Methods:** camelCase: `sendJson`, `getState`
- **Members:** underscore-prefix: `_connected`, `_deviceToken`

### Frontend (TypeScript/React)
- **Files:** kebab-case: `login-form.tsx`, `device-card.tsx`
- **Components:** PascalCase: `LoginForm`, `DeviceCard`
- **Hooks:** camelCase with use prefix: `useDeviceStore` (Zustand, not a hook)
- **Functions:** camelCase: `handleSubmit`, `formatRelativeTime`
- **Types/Interfaces:** PascalCase: `Device`, `PendingCommand`

## Where to Add New Code

### Backend New Feature
1. Add route handler in `src/routes/` (e.g., `notification.routes.js`)
2. Add model methods in `src/models/` if database changes needed
3. Add WebSocket message types in `src/ws/messageRouter.js`
4. Mount route in `src/index.js`

### ESP32 New Feature
1. Add device handler in `src/main.cpp` message callback
2. Create new module in `src/` if significant logic
3. Update `platformio.ini` build_flags for new credentials

### Frontend New Feature
1. Add page component in `frontend/src/app/`
2. Add UI components in `frontend/src/components/`
3. Add state management in `frontend/src/store/`
4. Add API methods in `frontend/src/lib/`

## Module Organization Patterns

### Backend
- **Routes:** Express Router per resource domain
- **Models:** One Mongoose model per collection
- **Middleware:** Single-purpose middleware functions
- **Utils:** Pure utility functions (no side effects)

### ESP32
- **Classes:** One class per logical component (WiFi, WebSocket, Relay)
- **Header/Implementation:** .h + .cpp pairs
- **Singleton instances:** Created in main.cpp, pointers passed as needed

### Frontend
- **Page components:** `frontend/src/app/{route}/page.tsx`
- **Layout components:** `frontend/src/app/{route}/layout.tsx`
- **UI components:** `frontend/src/components/{domain}/{component}.tsx`
- **State:** Single Zustand store in `frontend/src/store/`

---

*Structure analysis: 2026-04-04*
