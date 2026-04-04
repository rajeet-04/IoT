# Technology Stack

**Analysis Date:** 2026-04-04

## Overview

This document describes the actual technology stack implemented in the IoT Device Control Platform codebase.

---

## 1. ESP32 Firmware Stack

### Core Framework
| Technology | Version | Purpose | File |
|------------|---------|---------|------|
| **arduino-esp32** | ~6.x (via PlatformIO `espressif32`) | Arduino framework on ESP32 | `firmware/platformio.ini` |
| **ArduinoJson** | ^7.4.0 | JSON serialization/deserialization | `firmware/platformio.ini` |
| **WebSockets** | ^2.4.1 (links2004/WebSockets) | WebSocket client library | `firmware/platformio.ini` |

### Build System
- **PlatformIO** - ESP32 build and flash tool
- Config: `firmware/platformio.ini`

### Key Libraries
- `WiFiManager` (custom) - WiFi connection management with auto-reconnect
- `WebSocketsClient` (links2004) - WSS client for ESP32

### Implementation Files
- `firmware/src/main.cpp` - Entry point, hardware initialization
- `firmware/src/websocket_client.cpp` - WebSocket client implementation
- `firmware/src/relay_controller.cpp` - Relay GPIO control

### Deviation from Research
The ESP32 uses `links2004/WebSockets` library instead of the built-in `esp_websocket_client`. This is because:
- The Arduino framework wraps ESP-IDF differently
- The links2004 library provides better Arduino compatibility
- TLS is disabled (insecure mode) due to cert-bundle API instability

---

## 2. Backend Server Stack

### Runtime & Framework
| Technology | Version | Purpose | File |
|------------|---------|---------|------|
| **Node.js** | >=22.0.0 | JavaScript runtime | `package.json` |
| **Express** | ^5.1.0 | HTTP REST API | `package.json`, `src/index.js` |
| **ws** | ^8.19.0 | WebSocket server | `src/ws/hub.js` |

### Data Layer
| Technology | Version | Purpose | File |
|------------|---------|---------|------|
| **Mongoose** | ^8.13.1 | MongoDB ODM with schemas | `src/db/connection.js` |
| **MongoDB** driver | ^7.1.1 | Database driver (peer dep) | `package.json` |

### Authentication & Security
| Technology | Version | Purpose | File |
|------------|---------|---------|------|
| **bcrypt** | ^5.1.1 | Password hashing | `src/utils/password.js` |
| **jsonwebtoken** | ^9.0.2 | JWT access/refresh tokens | `src/utils/jwt.js` |
| **zod** | ^3.24.2 | Request validation | All route files |

### Utilities
| Technology | Version | Purpose | File |
|------------|---------|---------|------|
| **cookie-parser** | ^1.4.7 | Cookie parsing | `src/index.js` |
| **cors** | ^2.8.5 | CORS middleware | `src/index.js` |
| **dotenv** | ^16.4.7 | Environment config | `src/index.js` |

### Dev Dependencies
| Technology | Version | Purpose |
|------------|---------|---------|
| **nodemon** | ^3.1.9 | Auto-restart during development |
| **jest** | ^29.7.0 | Testing framework |
| **concurrently** | ^9.2.1 | Run backend + frontend simultaneously |

### Entry Point
- `src/index.js` - Express + ws server with graceful shutdown

---

## 3. Database Stack

### MongoDB Atlas (Free Tier M0)
| Setting | Value | Source |
|---------|-------|--------|
| **Driver** | Mongoose 8.23.0 | `src/db/connection.js` |
| **API Version** | Stable API v1 | `src/db/connection.js` |
| **Connection URI** | `MONGODB_URI` env var | `.env.example` |

### Collections
| Collection | Schema File | Purpose |
|------------|-------------|---------|
| `users` | `src/models/User.js` | User accounts (email, passwordHash) |
| `devices` | `src/models/Device.js` | ESP32 device registry |
| `transactions` | `src/models/Transaction.js` | Blockchain-style audit log |

### Transaction Hashing
The `transactions` collection uses SHA-256 hashing for blockchain-style immutability:
- Each transaction links to `prevHash`
- Hash computed in Mongoose `pre('validate')` hook
- `duration` calculated as time since previous transaction

---

## 4. Frontend Web App Stack

### Core Framework
| Technology | Version | Purpose | File |
|------------|---------|---------|------|
| **Next.js** | ^15.0.0 | Full-stack React framework | `frontend/package.json` |
| **React** | ^19.0.0 | UI library | `frontend/package.json` |
| **TypeScript** | ^5.7.0 | Type safety | `frontend/tsconfig.json` |

### Styling
| Technology | Version | Purpose | File |
|------------|---------|---------|------|
| **Tailwind CSS** | ^4.0.0 | Utility-first CSS | `frontend/postcss.config.mjs` |
| **@tailwindcss/postcss** | ^4.0.0 | Tailwind v4 PostCSS plugin | `frontend/postcss.config.mjs` |

### State Management
| Technology | Version | Purpose | File |
|------------|---------|---------|------|
| **zustand** | ^5.0.0 | Lightweight state store | `frontend/src/store/deviceStore.ts` |

### UI Components
| Technology | Version | Purpose |
|------------|---------|---------|
| **lucide-react** | ^0.468.0 | Icon library |
| **framer-motion** | ^12.38.0 | Animations |
| **sonner** | ^1.7.0 | Toast notifications |
| **class-variance-authority** | ^0.7.1 | Component variants |
| **@radix-ui/react-slot** | ^1.1.1 | Headless UI primitive |

### Dev Dependencies
| Technology | Version | Purpose |
|------------|---------|---------|
| **eslint** + **eslint-config-next** | ^9.0, ^15.0 | Linting |
| **@types/** packages | ^22, ^19 | TypeScript types |

### Build Configuration
- `frontend/next.config.ts` - Next.js config with standalone output
- `frontend/tsconfig.json` - TypeScript with path alias `@/*`
- `frontend/postcss.config.mjs` - Tailwind v4 CSS-first config

---

## 5. Deployment Configuration

### Render Deployment (`render.yaml`)
| Setting | Value |
|---------|-------|
| **Runtime** | node |
| **Region** | oregon |
| **Plan** | free |
| **Build Command** | `npm ci --omit=dev` |
| **Start Command** | `node src/index.js` |
| **Health Check** | GET `/health` |

### Environment Variables
| Variable | Source | Purpose |
|----------|--------|---------|
| `MONGODB_URI` | Render (sync: false) | MongoDB Atlas connection |
| `JWT_SECRET` | Render (sync: false) | Access token signing |
| `JWT_REFRESH_SECRET` | Render (sync: false) | Refresh token signing |
| `PORT` | Render (default: 3000) | HTTP server port |
| `NODE_ENV` | Render (production) | Runtime environment |
| `FRONTEND_URL` | Render | CORS origin |

### Frontend Deployment
- Hosted on **Vercel** (based on `FRONTEND_URL`)
- Backend URL configured via `NEXT_PUBLIC_BACKEND_URL`

---

## 6. Communication Protocols

### ESP32 ↔ Backend (WebSocket)
| Aspect | Implementation |
|--------|-----------------|
| **Protocol** | WSS (WebSocket Secure) |
| **Library** | links2004/WebSockets |
| **Auth** | `Authorization: Bearer <device-token>` header |
| **Keepalive** | Ping/pong every 25s (ESP32), 30s (server) |
| **Reconnect** | 5 second interval |

### Frontend ↔ Backend
| Channel | Protocol | Purpose |
|---------|----------|---------|
| **Commands** | HTTPS REST | POST `/api/devices/:id/command` |
| **Status polling** | HTTPS REST | GET `/api/devices` (every 10s) |
| **Auth** | HTTPS REST | POST `/api/auth/*` |

---

## 7. Dependencies Comparison: Research vs Implementation

| Category | Research (Planned) | Implementation (Actual) | Status |
|----------|-------------------|-------------------------|--------|
| Express | 5.x | 5.2.1 | ✅ Match |
| ws | 8.x | 8.20.0 | ✅ Match |
| bcrypt | 5.x | 5.1.1 | ✅ Match |
| jsonwebtoken | 9.x | 9.0.3 | ✅ Match |
| zod | 3.x | 3.25.76 | ✅ Match |
| MongoDB driver | 7.1.x | 7.1.1 | ✅ Match |
| Mongoose | 8.x (optional) | 8.23.0 | ✅ Added |
| Next.js | 16.x | 15.0.0 | ⚠️ Lower |
| React | 19.x | 19.0.0 | ✅ Match |
| TypeScript | 5.x | 5.7.x | ✅ Match |
| Tailwind CSS | 4.x | 4.0.0 | ✅ Match |
| Zustand | 5.x | 5.0.x | ✅ Match |
| ArduinoJson | 7.x | 7.4.0 | ✅ Match |
| WebSocket lib | esp_websocket_client (built-in) | links2004/WebSockets 2.4.1 | ⚠️ Changed |

---

*Stack analysis: 2026-04-04*
