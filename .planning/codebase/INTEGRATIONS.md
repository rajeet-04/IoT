# External Integrations

**Analysis Date:** 2026-04-04

## Overview

This document describes all external services, APIs, and integrations used by the IoT Device Control Platform.

---

## 1. Database

### MongoDB Atlas
| Setting | Value |
|---------|-------|
| **Provider** | MongoDB Atlas |
| **Tier** | M0 (Free) |
| **Connection** | `MONGODB_URI` environment variable |
| **Client** | Mongoose ODM |
| **API Version** | Stable API v1 |

### Connection Configuration
```javascript
// src/db/connection.js
await mongoose.connect(uri, {
  serverApi: { version: '1' },
});
```

### Collections
- `users` - User accounts
- `devices` - ESP32 device registry
- `transactions` - Blockchain-style audit log

---

## 2. Authentication & Identity

### JWT Authentication
| Token | Expiry | Secret Env Var |
|-------|--------|----------------|
| Access Token | 15 minutes | `JWT_SECRET` |
| Refresh Token | 7 days | `JWT_REFRESH_SECRET` |

### Implementation
- Tokens signed with `jsonwebtoken` library
- Stored in httpOnly cookies (same-domain) + localStorage (cross-origin)
- Refresh token rotation on each refresh

### User Authentication Endpoints
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/auth/signup` | POST | Register new user |
| `/api/auth/login` | POST | Authenticate user |
| `/api/auth/logout` | POST | Clear cookies |
| `/api/auth/me` | GET | Get current user |
| `/api/auth/refresh` | POST | Refresh access token |
| `/api/auth/forgot-password` | POST | Generate reset token (v1: console log) |
| `/api/auth/reset-password` | POST | Reset password |

---

## 3. ESP32 Device Communication

### WebSocket Connection
| Setting | Value |
|---------|-------|
| **Protocol** | WSS (WebSocket Secure) |
| **Port** | 443 |
| **Path** | `/ws` |
| **Auth** | Bearer token in `Authorization` header |

### Device Token Authentication
- Token generated on device registration (`src/utils/deviceToken.js`)
- Stored in MongoDB `devices.deviceId` field
- Sent as `Authorization: Bearer <token>` during WebSocket handshake
- Server validates against `Device.findOne({ deviceId: token })`

### Message Protocol (JSON)

#### ESP32 → Server
```json
{ "type": "heartbeat", "deviceId": "...", "uptime": 12345 }
{ "type": "state_report", "relay": 1, "relayState": true, "deviceId": "...", "uptime": 12345 }
{ "type": "ack", "commandId": "cmd_...", "status": "success", "relayState": 1 }
```

#### Server → ESP32
```json
{ "type": "command", "action": "turn_on", "commandId": "cmd_...", "timestamp": "..." }
{ "type": "command", "action": "set_relay", "state": 1, "commandId": "..." }
{ "type": "welcome", "deviceId": "...", "relayState": 0, "timestamp": "..." }
```

---

## 4. Frontend → Backend API

### Base URL Configuration
```typescript
// frontend/src/lib/api.ts
const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3000';
```

### REST Endpoints Used by Frontend

#### Authentication
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/auth/signup` | POST | Register |
| `/api/auth/login` | POST | Login |
| `/api/auth/logout` | POST | Logout |
| `/api/auth/me` | GET | Get current user |

#### Devices
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/devices` | GET | List user's devices |
| `/api/devices` | POST | Register new device |
| `/api/devices/:id` | PUT | Update device name |
| `/api/devices/:id` | DELETE | Delete device |
| `/api/devices/:id/command` | POST | Send command to device |

#### Transactions
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/transactions` | GET | List transaction history |

### HTTP Polling Strategy
The frontend uses HTTP polling (not WebSocket) for device state:
- Poll `/api/devices` every 10 seconds
- Commands sent via POST `/api/devices/:id/command`

---

## 5. Deployment Integrations

### Render (Backend)
| Service | Setting | Value |
|---------|---------|-------|
| **Hosting** | Render Web Service | Free tier |
| **Region** | Oregon | - |
| **Runtime** | Node.js 22.x | - |
| **Health Check** | GET `/health` | - |

### Vercel (Frontend)
- Frontend hosted at: `https://io-t-beige.vercel.app`
- Configured in `render.yaml` as `FRONTEND_URL`

### Environment Variables on Render
```yaml
# render.yaml
envVars:
  - key: MONGODB_URI
    sync: false  # Set via Render dashboard
  - key: JWT_SECRET
    sync: false
  - key: JWT_REFRESH_SECRET
    sync: false
  - key: FRONTEND_URL
    value: "https://io-t-beige.vercel.app"
```

---

## 6. Device Token Generation

### Implementation
```javascript
// src/utils/deviceToken.js
import crypto from 'node:crypto';

export function generateDeviceToken() {
  return crypto.randomUUID();
}
```

### Token Flow
1. User registers device via `POST /api/devices`
2. Server generates UUID via `crypto.randomUUID()`
3. Token returned ONCE to user
4. User flashes token to ESP32 via `platformio.ini` build flag
5. ESP32 uses token for WebSocket authentication

---

## 7. Security Considerations

### Implemented
| Security Measure | Implementation |
|-------------------|----------------|
| Password hashing | bcrypt (salt rounds handled by library) |
| JWT access tokens | 15-minute expiry, signed with `JWT_SECRET` |
| JWT refresh tokens | 7-day expiry, signed with `JWT_REFRESH_SECRET` |
| httpOnly cookies | Same-domain auth (production) |
| CORS | Configured with credentials support |
| Device token auth | Bearer token validation on WebSocket |

### Missing (v2+)
| Security Gap | Current State | Recommended |
|--------------|---------------|-------------|
| Password reset email | Console log only | Implement email service (SendGrid, etc.) |
| Rate limiting | None | Add express-rate-limit |
| Device token rotation | None | Allow token regeneration |
| 2FA | None | Add TOTP via speakeasy |

---

## 8. Network Configuration

### Backend Server
- **HTTP**: Port 3000 (or `PORT` env var)
- **WebSocket**: `/ws` path on same port
- **Health Check**: GET `/health`

### ESP32 Device
- **WiFi**: Configured via build flags
- **Backend URL**: Configured via `BACKEND_URL` build flag
- **TLS**: Insecure mode (no CA verification)

### Frontend
- **Backend URL**: `NEXT_PUBLIC_BACKEND_URL` env var
- **WebSocket URL**: Derived from backend URL (http→ws)

---

## 9. Environment Configuration Files

### Backend (`.env.example`)
```
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/iot-control?retryWrites=true&w=majority
JWT_SECRET=change-me-to-random-string
JWT_REFRESH_SECRET=change-me-to-random-string-too
PORT=3000
NODE_ENV=development
FRONTEND_URL=http://localhost:3001
```

### ESP32 (`platformio.ini`)
```
build_flags =
    -DWIFI_SSID='"SSID"'
    -DWIFI_PASSWORD='"password"'
    -DBACKEND_URL='"backend.example.com"'
    -DDEVICE_TOKEN='"uuid-token"'
```

### Frontend
- `NEXT_PUBLIC_BACKEND_URL` - Set during deployment (Vercel dashboard)

---

## 10. External Service Dependencies Summary

| Service | Type | Critical | Fallback |
|---------|------|----------|----------|
| MongoDB Atlas | Database | Yes | None (app fails) |
| Render | Backend hosting | Yes | None |
| Vercel | Frontend hosting | No | Can use Render static |
| WiFi Internet | Device connectivity | Yes | Device offline |

---

*Integration audit: 2026-04-04*
