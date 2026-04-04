# Codebase Concerns

**Analysis Date:** 2026-04-04

## Security Concerns

### Critical: Password Reset Token Has No Expiry
- **File:** `src/routes/auth.routes.js` (lines 179-206)
- **Issue:** The password reset flow accepts any non-empty token without validation or expiry checking
- **Impact:** Anyone who knows a user's email can reset their password without a time-limited token
- **Current behavior:** Line 195 only checks `if (!user || !token)` - token can be any non-empty string
- **Fix approach:** Implement token store with expiry (store hashed token in DB with timestamp), or integrate with a real email service

### High: Insecure TLS on ESP32
- **File:** `firmware/src/websocket_client.cpp` (line 46)
- **Issue:** Uses `setInsecure()` for WSS connections - TLS certificate verification is disabled
- **Current code:** `_ws.beginSSL(_backendUrl.c_str(), 443, "/ws", "", "");`
- **Impact:** ESP32 cannot verify it's connecting to the legitimate backend server
- **Risk:** Man-in-the-middle attack could intercept device commands
- **Note:** Comment explains this is due to unstable cert-bundle API in Arduino V3 / ESP-IDF 5.x

### Medium: JWT Secrets via Environment Variables
- **Files:** `render.yaml` (lines 17-19), `src/utils/jwt.js`
- **Issue:** JWT_SECRET and JWT_REFRESH_SECRET are environment variables only
- **Impact:** If Render credentials are compromised, tokens can be forged
- **Mitigation:** Use strong random secrets, rotate periodically
- **Missing:** No documented secret rotation procedure

### Medium: Device Token Exposed in Logs
- **File:** `firmware/src/main.cpp` (line 69)
- **Issue:** Device token prefix is printed to serial output: `Serial.printf("  Device Token: %.8s...\n", DEVICE_TOKEN);`
- **Impact:** Physical access to device + serial connection exposes token
- **Mitigation:** Only show partial token (already done), but full token still in memory

### Low: CORS Allows All Origins in Development
- **File:** `src/index.js` (lines 20-25)
- **Current code:** `origin: true` allows any origin
- **Production:** Should be restricted to `FRONTEND_URL` only
- **Impact:** In development, any site can make authenticated requests

---

## Hardware & Firmware Concerns

### Critical: Relay Flyback Protection Required
- **Files:** `firmware/src/relay_controller.h` (lines 1-44), STATE.md blocker
- **Issue:** Hardware damage will occur without proper flyback diode (1N4007)
- **Impact:** Without diode, voltage spike when relay de-energizes can damage ESP32 GPIO
- **Mitigation:** Documentation includes wiring diagram, but user must follow it
- **Risk level:** HIGH for users unfamiliar with electronics

### Medium: Single GPIO Pin for Relay
- **File:** `firmware/src/relay_controller.cpp` (line 25)
- **Current:** Only GPIO 2 is supported
- **Impact:** Cannot expand to multiple relays without code changes
- **Fix approach:** Make pin configurable via build flag

### Medium: WiFi Credentials Baked Into Firmware
- **Files:** `firmware/src/main.cpp` (lines 32-46), `WiFiManager.h` (lines 108-129)
- **Issue:** WiFi SSID/password must be set at compile time via build flags
- **Impact:** 
  - Cannot change WiFi network without recompiling
  - Token regeneration required when credentials change
  - Credentials visible in compiled binary
- **Fix approach:** Implement WiFi provisioning (BLE, SmartConfig, or captive portal)

### Medium: No Watchdog Timer Configuration
- **File:** `firmware/src/main.cpp` (line 237)
- **Issue:** Uses `delay(100)` but no explicit ESP32 watchdog configuration
- **Impact:** Long-running operations could trigger watchdog reset
- **Recommendation:** Configure `esp_task_wdt_init()` for production

### Low: ESP32 Heap Monitoring
- **File:** `firmware/src/main.cpp` (line 254)
- **Current:** Prints free heap but no monitoring/alerting
- **Risk:** Memory leak could cause instability over time
- **Recommendation:** Add periodic heap check and reconnect on low memory

---

## Backend Concerns

### High: MongoDB Free Tier Storage Limit
- **Files:** `src/db/connection.js`, STACK.md
- **Issue:** MongoDB Atlas M0 free tier limits to 512MB
- **Impact:** Transaction log grows unbounded - will hit limit eventually
- **Current state:** No cleanup/archival strategy implemented
- **Fix approach:** Implement TTL indexes on transactions, archive old records

### Medium: WebSocket Server at /ws Only Accepts Devices
- **File:** `src/ws/hub.js` (lines 42-154)
- **Issue:** WebSocket endpoint is designed for ESP32 devices only
- **Impact:** Frontend uses HTTP polling instead of WebSocket (see `frontend/src/store/deviceStore.ts` line 69)
- **Code note:** Hub sends `welcome` message with device-specific payload
- **Future:** If frontend needs real-time updates, separate WebSocket endpoint required

### Medium: No Rate Limiting
- **Files:** `src/index.js`, route handlers
- **Issue:** No express-rate-limit or similar middleware
- **Impact:** 
  - Brute force attacks on auth endpoints
  - Command flooding from authenticated users
- **Fix approach:** Add rate limiting per IP and per user

### Medium: Error Messages Leak Internal Details
- **File:** `src/index.js` (line 45)
- **Current:** `console.error('Unhandled error:', err)` logs full stack traces
- **Issue:** Error responses could expose internal paths, queries, stack traces
- **Fix approach:** Sanitize errors in production, use custom error types

### Medium: Database Connection Not Pooled Explicitly
- **File:** `src/db/connection.js` (line 16)
- **Current:** Mongoose handles pooling by default
- **Risk:** At scale, connection pool configuration may be needed
- **Note:** Mongoose defaults are usually sufficient for low traffic

### Low: No Request ID / Correlation ID
- **Issue:** No request tracking across logs
- **Impact:** Hard to trace issues in distributed system
- **Fix approach:** Add request ID middleware

### Low: Graceful Shutdown Timeout Too Short
- **File:** `src/index.js` (line 60)
- **Current:** 1000ms (1 second) shutdown timeout
- **Risk:** In-flight WebSocket messages may be dropped on restart
- **Fix approach:** Increase to 5000ms minimum

---

## Frontend Concerns

### Medium: WebSocket Client Implemented But Unused
- **File:** `frontend/src/lib/api.ts` (lines 87-89)
- **Current:** `getWebSocketUrl()` function exists but frontend uses HTTP polling
- **Impact:** Dead code that may confuse developers
- **Reason:** Comment at `deviceStore.ts` line 69 explains: "/ws is for ESP32 device tokens only"

### Medium: Optimistic UI Updates Without Confirmation
- **File:** `frontend/src/store/deviceStore.ts` (lines 138-144)
- **Current:** Relay state updates optimistically before server confirmation
- **Impact:** UI shows "ON" but device might not have received command
- **Risk:** User assumes action completed, but relay state unchanged
- **Note:** 10-second timeout clears pending state, but no retry logic

### Medium: Token Stored in localStorage
- **File:** `frontend/src/lib/api.ts` (lines 11-33)
- **Issue:** Access tokens stored in localStorage (vulnerable to XSS)
- **Mitigation:** Tokens are short-lived (15 minutes), but refresh tokens also in localStorage
- **Better approach:** HttpOnly cookies (backend already sets them), but cross-origin CORS complicates this

### Low: No Loading States for Device List
- **File:** `frontend/src/store/deviceStore.ts` (line 91)
- **Issue:** `fetchDevices()` catches errors but doesn't expose loading state
- **Impact:** UI doesn't show loading spinner for initial device fetch

### Low: Dashboard Doesn't Auto-Refresh After Rename
- **File:** `frontend/src/components/dashboard/device-card.tsx`
- **Issue:** After rename, local state updates but doesn't re-fetch from server
- **Impact:** Potential stale data if rename API call fails silently

### Low: No Error Boundary in React
- **Files:** `frontend/src/app/*/page.tsx`
- **Issue:** No error boundary components for graceful error handling
- **Impact:** Uncaught errors crash entire page

---

## Operational Concerns

### High: Render Free Tier Spin-Down
- **Files:** `render.yaml` (line 6), STATE.md blocker
- **Issue:** Backend spins down after 15 minutes of inactivity
- **Impact:** First request after idle takes ~30 seconds (cold start)
- **Current mitigation:** WebSocket keepalive (30s ping) should prevent spin-down
- **Risk:** If keepalive fails or stops, users experience long delays
- **Note:** Render docs state WebSocket activity keeps instance alive

### High: No Database Backups
- **Issue:** MongoDB Atlas M0 free tier has no automated backups
- **Impact:** Data loss from accidental deletion or corruption is unrecoverable
- **Fix approach:** Manual exports, or upgrade to paid tier with backups

### Medium: No Monitoring/Observability
- **Issue:** No Application Insights, DataDog, or similar
- **Impact:** No visibility into:
  - API latency percentiles
  - Error rates
  - Device connection patterns
  - Transaction volume
- **Fix approach:** Add logging aggregator, error tracking service

### Medium: No CI/CD for ESP32 Firmware
- **Issue:** Firmware compiles locally only
- **Impact:** No automated builds, no regression testing
- **Future:** Add GitHub Actions workflow to compile firmware on PR/push

### Medium: No Staging Environment
- **Issue:** Single production environment (Render free tier)
- **Impact:** Changes tested directly in production
- **Fix approach:** Feature flags or separate staging branch/environment

### Low: No Health Checks for Dependencies
- **File:** `src/index.js` (lines 32-41)
- **Current:** `/health` returns server status but doesn't check MongoDB connectivity
- **Impact:** Render health check passes even if database is down
- **Fix approach:** Add database ping to health check endpoint

### Low: Missing Process Manager
- **File:** `package.json` (line 14)
- **Current:** Uses `node src/index.js` directly
- **Risk:** No auto-restart on crash, no cluster mode
- **Note:** Render handles basic restarts, but not cluster mode

---

## Scalability Concerns

### Low: Single WebSocket Server Instance
- **File:** `src/ws/hub.js`
- **Issue:** All device connections go to single instance
- **Current scale:** OK for single ESP32 + few web clients
- **Future:** Multi-instance requires sticky sessions or pub/sub (Redis)

### Low: Transaction Hashing on Every Insert
- **File:** `src/models/Transaction.js` (lines 56-92)
- **Issue:** `pre('validate')` hook queries for previous transaction on every insert
- **Impact:** Performance degrades as transaction count grows
- **Note:** Indexed query should remain fast, but consider batch processing for bulk imports

### Low: No Pagination on Device List
- **File:** `src/routes/device.routes.js` (line 58)
- **Current:** Returns all devices for user
- **Impact:** Users with many devices get slow responses
- **Fix approach:** Add cursor-based pagination

---

## Dependencies at Risk

### bcrypt
- **File:** `package.json` (line 25)
- **Risk:** CPU-intensive, could be target for timing attacks
- **Current:** Version ^5.1.1 - OK
- **Future:** Consider Argon2 for better password hashing (planned for v2 per STACK.md)

### jsonwebtoken
- **File:** `package.json` (line 30)
- **Risk:** Vulnerability in JWT library could allow token forgery
- **Current:** Version ^9.0.2 - stable
- **Mitigation:** Keep updated, use strong secrets

### ws (WebSocket library)
- **File:** `package.json` (line 33)
- **Risk:** Protocol-level bugs could crash server
- **Current:** Version ^8.19.0 - actively maintained
- **Mitigation:** Keep updated, monitor for security advisories

---

## Known Missing Features (Per Roadmap)

### Authentication
- [ ] Password reset via email (currently logs to console)
- [ ] Email verification on signup
- [ ] 2FA/MFA support
- [ ] Account lockout after failed attempts

### Devices
- [ ] Device groups/folders
- [ ] Device sharing between users
- [ ] Bulk device operations
- [ ] Device firmware update (OTA)

### Transactions
- [ ] Transaction export (CSV/JSON)
- [ ] Transaction replay/undo
- [ ] Real blockchain integration (currently simulated)
- [ ] Transaction verification API

### Frontend
- [ ] Real-time updates via WebSocket (currently polling)
- [ ] Mobile responsive improvements
- [ ] PWA/offline support
- [ ] Dark mode toggle

### Operations
- [ ] Email notifications
- [ ] SMS alerts
- [ ] Webhook support
- [ ] API rate limiting
- [ ] Usage analytics dashboard

---

## Test Coverage Gaps

### Backend
- **No unit tests** - `package.json` has jest configured but no tests exist
- **Missing coverage:** Auth routes, device commands, transaction creation, WebSocket message handling
- **Priority:** HIGH

### Frontend
- **No tests** - No test framework configured
- **Missing coverage:** Auth forms, device toggle, store actions
- **Priority:** MEDIUM

### ESP32 Firmware
- **No tests** - Embedded testing is challenging
- **Manual testing:** Required for relay control, WiFi reconnection, WebSocket commands
- **Priority:** LOW (integration testing via actual hardware)

---

## Technical Debt Summary

| Item | Priority | Files | Impact |
|------|----------|-------|--------|
| Password reset token expiry | CRITICAL | `src/routes/auth.routes.js` | Security vulnerability |
| TLS verification disabled on ESP32 | HIGH | `firmware/src/websocket_client.cpp` | MITM risk |
| MongoDB storage limit (512MB) | HIGH | `src/db/connection.js` | Data loss risk |
| Render spin-down latency | HIGH | `render.yaml` | Poor UX |
| No rate limiting | MEDIUM | `src/index.js` | DoS risk |
| No database backups | HIGH | `src/db/connection.js` | Data loss risk |
| No monitoring | MEDIUM | - | No observability |
| Dead WebSocket code in frontend | MEDIUM | `frontend/src/lib/api.ts` | Confusion |
| Optimistic UI without retry | MEDIUM | `frontend/src/store/deviceStore.ts` | UX inconsistency |
| Token in localStorage | MEDIUM | `frontend/src/lib/api.ts` | XSS vulnerability |
| No CI/CD for firmware | MEDIUM | - | Manual builds |
| Missing test coverage | HIGH | - | Bug risk |
| CORS too permissive | LOW | `src/index.js` | Security hardening |

---

*Concerns audit: 2026-04-04*
