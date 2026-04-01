# Phase 02: Firmware & Connection - Execution Summary

## Phase Status: COMPLETED ✅

**Completed:** 2026-04-01  
**Duration:** ~2 hours

---

## What Was Built

### ESP32 Firmware (Phase 2, Plans 01-02)

#### 1. PlatformIO Project Structure
```
firmware/
├── platformio.ini          # Build config for ESP32 Dev Module
├── lib/
│   └── WiFiManager/        # WiFi connection library
│       ├── WiFiManager.h
│       └── WiFiManager.cpp
└── src/
    ├── main.cpp             # Main firmware entry point
    ├── websocket_client.h   # WebSocket client with TLS auth
    ├── websocket_client.cpp
    ├── relay_controller.h   # Relay control with safe boot
    └── relay_controller.cpp
```

#### 2. WiFi Manager Features
- Connection to configured WiFi network
- Exponential backoff reconnection (1s → 2s → 4s → ... → 30s max)
- Event-based disconnection detection
- Credentials via build flags (not hardcoded)

#### 3. WebSocket Client Features
- WSS (WebSocket Secure) connection to backend
- Device token authentication via Bearer header
- Ping/pong keepalive (10 second interval)
- Heartbeat messages every 30 seconds
- Auto-reconnection on disconnect
- JSON message parsing and handling

#### 4. Relay Controller Features
- Safe boot state (relay OFF on startup)
- GPIO 26 as default control pin
- Flyback diode wiring diagram in comments
- State reporting to backend
- Acknowledgment handling

### Backend WebSocket Hub (Phase 2, Plan 03)

#### Files Created
```
src/ws/
├── hub.js                  # WebSocket server
├── connectionRegistry.js   # Connection tracking
└── messageRouter.js       # Message routing
```

#### Features
- WebSocket endpoint at `/ws`
- Device token authentication (Bearer header)
- Connection registry with MongoDB sync
- Ping/pong heartbeat (30s interval)
- Message routing (heartbeat, state_report, ack, error)
- Presence monitoring (90s stale threshold)
- Graceful shutdown

---

## Files Created/Modified

### Created
- `firmware/platformio.ini`
- `firmware/lib/WiFiManager/WiFiManager.h`
- `firmware/lib/WiFiManager/WiFiManager.cpp`
- `firmware/src/websocket_client.h`
- `firmware/src/websocket_client.cpp`
- `firmware/src/relay_controller.h`
- `firmware/src/relay_controller.cpp`
- `firmware/src/main.cpp`
- `src/ws/hub.js`
- `src/ws/connectionRegistry.js`
- `src/ws/messageRouter.js`

### Modified
- `src/index.js` - Integrated WebSocket hub
- `package.json` - Added `ws` dependency

---

## Configuration

### ESP32 Firmware Build Flags
```bash
# In platformio.ini or environment
WIFI_SSID="YourNetworkName"
WIFI_PASSWORD="YourPassword"
BACKEND_URL="your-backend.onrender.com"
DEVICE_TOKEN="uuid-from-device-registration"
```

### Backend Environment
```bash
MONGODB_URI="mongodb+srv://..."
JWT_SECRET="your-jwt-secret"
FRONTEND_URL="http://localhost:3001"
```

---

## Wiring Diagram

### Relay Control Circuit
```
ESP32 GPIO 26 ──[1kΩ]──┬──[2N2222 NPN]──┬── GND
                          │                │
                    [1N4007 Flyback]       │
                          │                │
                         +5V ──────────────┘
                          │
                    [SRD-05VDC-SL-C Relay]
```

---

## Testing

### Build ESP32 Firmware
```bash
cd firmware
pio run -e esp32dev
```

### Flash to ESP32
```bash
pio run -e esp32dev --target upload
```

### Test Backend Locally
```bash
npm run dev
# Server runs on http://localhost:3000
# WebSocket at ws://localhost:3000/ws
```

---

## Next Steps

### Phase 3: Real-Time Control Dashboard
- Backend command routing (03-01)
- Next.js web app shell (03-02)
- Real-time dashboard UI (03-03)
- Responsive design (03-04)

---

## Decisions Made

| Decision | Rationale |
|----------|-----------|
| GPIO 26 for relay | Common choice, not used by default SPI/I2C |
| WSS over ws:// | Render requires TLS; ESP32 can't follow 301 redirects |
| Bearer token auth | Standard OAuth pattern, works with ESP32 headers |
| Exponential backoff | Prevents server overload during outages |
| Safe boot OFF | Prevents accidental relay activation on power loss |

---

*Summary generated: 2026-04-01*
