# Codebase Concerns

**Analysis Date:** 2026-04-01

## Overview

Phase 1 (Foundation & Auth) is complete and deployed. The backend has solid fundamentals: bcrypt password hashing, JWT access/refresh separation, Zod validation on all endpoints, HTTP-only cookies, and graceful shutdown handling. However, several significant concerns remain — some by design (pending phases), some requiring immediate attention, and some that represent real technical debt.

---

## Critical Concerns

### C1: WebSocket Server Not Implemented
**Severity:** Critical  
**Phase:** Phase 2 (not started)  
**Files:** `src/index.js`

The entire real-time IoT control system depends on WebSocket communication, but `src/index.js` has no WebSocket server. The `ws` library is listed in STACK.md but is not imported or used anywhere. The Express server handles only HTTP.

**Impact:** Phase 2 cannot begin. ESP32 cannot connect. All real-time device control is blocked.

**Fix:** Implement WebSocket server in `src/index.js` using `ws` library, integrated with the Express HTTP server. Phase 2 plan 02-03 covers this.

---

### C2: No Device Shadow State or Connection Registry
**Severity:** Critical  
**Phase:** Phase 2 (not started)  
**Files:** `src/models/Device.js`

`Device.js` tracks `status` and `lastSeen` fields, but there's no server-side mechanism to maintain a live connection registry mapping `deviceId → WebSocket`. Without this, the server cannot route commands to specific devices.

**Impact:** Commands from web dashboard cannot be routed to ESP32 devices. BE-04 (device shadow state) is unimplemented.

**Fix:** Phase 2 plan 02-03 requires building a `Map<deviceId, WebSocket>` registry with ping/pong heartbeat tracking.

---

### C3: Password Reset Tokens Have No Expiry or Storage
**Severity:** High  
**Phase:** Phase 1 (implemented)  
**Files:** `src/routes/auth.routes.js` (lines 142-198)

The password reset flow (line 158-161) generates a random token and logs it to the console. The reset endpoint (line 172-198) only checks that the token is "non-empty" — no expiry, no token store, no single-use enforcement. Anyone who obtains the token and email can reset the password.

```javascript
// Line 187-188 — token only checked for truthiness
if (!user || !token) {
  return res.status(400).json({ error: 'Invalid reset request' });
}
```

**Impact:** Token leakage via server logs = account takeover. Tokens cannot be revoked.

**Fix (Phase 2):** Store reset tokens in a `PasswordReset` collection with expiry timestamps. Delete token after use.

---

### C4: JWT Refresh Token Not Invalidated on Use
**Severity:** High  
**Phase:** Phase 1 (implemented)  
**Files:** `src/routes/auth.routes.js` (lines 216-237)

The `/api/auth/refresh` endpoint validates the refresh token and issues new access + refresh tokens, but does not invalidate the used refresh token. This is token reuse — an attacker who intercepts a refresh token can continue using it even after legitimate use.

**Impact:** Stolen refresh tokens remain valid for up to 7 days. No way to revoke compromised tokens.

**Fix (Phase 2):** Implement token families or a denylist. On refresh, store `jti` (JWT ID) in a revoked tokens collection with expiry matching the token's remaining lifetime.

---

## Security Considerations

### S1: No Rate Limiting on Auth Endpoints
**Severity:** High  
**Files:** `src/routes/auth.routes.js`

There is no rate limiting on `/api/auth/login`, `/api/auth/signup`, or `/api/auth/forgot-password`. An attacker can brute-force passwords or flood the signup endpoint.

**Current mitigation:** None. `express-rate-limit` not installed.

**Fix:** Add `express-rate-limit` middleware to auth routes. Specifically:
- Login: 5 attempts per IP per 15 minutes
- Signup: 10 attempts per IP per hour
- Forgot password: 3 per IP per hour

---

### S2: CORS Allows Any Subdomain of Frontend_URL
**Severity:** Medium  
**Files:** `src/index.js` (lines 17-22)

```javascript
cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3001',
  credentials: true,
})
```

If `FRONTEND_URL=https://example.com`, this allows `https://anything.example.com`. For a production IoT dashboard, this is too permissive.

**Fix:** Parse the origin and verify it matches exactly, or use a list of allowed origins.

---

### S3: Device Tokens Stored in Plain Text in Database
**Severity:** Medium  
**Files:** `src/models/Device.js`, `src/utils/deviceToken.js`

Device tokens (`deviceId` field) are UUID v4 generated via `crypto.randomUUID()`. They are stored unhashed, similar to passwords. If the database is breached, all device credentials are exposed.

**Current mitigation:** Device tokens are not passwords — they don't grant account access directly.

**Fix (Phase 4):** Consider hashing device tokens at rest, similar to password hashing. This adds lookup complexity but limits blast radius of database breaches.

---

### S4: No Input Validation on WebSocket Messages (Future Risk)
**Severity:** High (when implemented)  
**Phase:** Phase 2  
**Files:** Not yet implemented

PITFALLS.md S3 (No Input Validation on Backend Command Endpoint) is not yet applicable because WebSocket is not implemented. When Phase 2 adds WebSocket handling, Zod validation must be applied to all incoming messages.

**Fix:** Apply strict Zod schemas to all WebSocket message types. Phase 2 plan 02-03 must include message validation.

---

## Scalability Concerns

### SC1: MongoDB Connection Pool Unbounded
**Severity:** High  
**Files:** `src/db/connection.js` (lines 16-18)

```javascript
_connection = await mongoose.connect(uri, {
  serverApi: { version: '1' },
});
```

No `maxPoolSize` specified. MongoDB Atlas M0 has a 500 connection limit. With Render's free tier, multiple server instances cannot exist, but connection leaks from unclosed connections could still exhaust the pool.

**Fix:** Add `maxPoolSize: 10` to connection options.

---

### SC2: Transaction Log Will Grow Without Bound
**Severity:** Medium  
**Phase:** Phase 4 (not started)  
**Files:** `src/models/Device.js` (only — transactions collection not yet created)

The transactions collection (planned for Phase 4) has no TTL index or archival strategy. Every ON/OFF action creates a record. With frequent toggling, the 512MB Atlas M0 limit could be hit in months.

**Fix (Phase 4):** Add TTL index on transactions collection (e.g., expire after 1 year). Phase 4 plan 04-01 must include this.

---

### SC3: No Index on Transactions Collection
**Severity:** Medium  
**Phase:** Phase 4 (not started)

When the transactions collection is created, it will need indexes on `deviceId`, `userId`, and `timestamp` for efficient queries. Without these, transaction history queries will be slow.

**Fix (Phase 4):** Define indexes when creating the transactions schema.

---

### SC4: Render Free Tier Instance Hours
**Severity:** Low  
**Files:** `src/index.js`

The server implements a keepalive mechanism is not implemented. If ESP32 devices send frequent pings to prevent Render spin-down, the 750 free instance hours/month can be consumed quickly. A single always-on ESP32 polling every 5 minutes = 8,640 requests/month.

**Current mitigation:** Phase 2 plan 02-01 includes `ping_interval_sec` configuration. The ESP32 will send WebSocket pings, which count as activity on Render.

**Fix:** Monitor instance hour consumption in Render dashboard. Consider upgrading to paid tier if needed.

---

## Platform Risks

### P1: Render Free Tier Spin-Down
**Severity:** High  
**Phase:** Phase 2  
**Files:** Not yet implemented

PITFALLS.md B1 (Render Free Tier Spin-Down Breaks ESP32 Connections) is unaddressed because WebSocket isn't implemented yet. When the ESP32 connects and Render spins down after 15 minutes of inactivity, all WebSocket connections drop.

**Fix:** Phase 2 plan 02-01 includes reconnection logic with exponential backoff on the ESP32. Accept that first command after idle may take ~60 seconds.

---

### P2: MongoDB Atlas M0 Limitations
**Severity:** Low  
**Files:** `src/db/connection.js`

Atlas M0 free tier has no automated backups and limited storage (512MB). Data loss is possible if accidental deletion occurs.

**Current mitigation:** None.

**Fix (Phase 2+):** Implement periodic MongoDB export to cold storage. Set Atlas storage alerts at 70% threshold.

---

## Technical Debt

### TD1: Frontend Not Started
**Severity:** Medium  
**Phase:** Phase 3 (not started)

The frontend (Next.js app with shadcn/ui, Zustand, Tailwind v4) has not been created. The web dashboard, real-time controls, and user-facing device management UI are all pending.

**Fix:** Phase 3 implements the full frontend.

---

### TD2: ESP32 Firmware Not Started
**Severity:** High  
**Phase:** Phase 2 (not started)

The ESP32 firmware (WiFi connection, WSS client, relay actuation, reconnection logic) is not written. This is the core hardware interface.

**Fix:** Phase 2 plans 02-01 and 02-02 implement the firmware.

---

### TD3: No OTA Update Mechanism
**Severity:** Medium  
**Phase:** Out of scope for v1 (v2+)

PITFALLS.md H4 (No Firmware Update Mechanism) is deferred. Without OTA, firmware bugs in deployed devices require physical access to fix.

**Fix:** Implement OTA in v2. OTA-01 is in v2 requirements.

---

### TD4: "Blockchain" Immutability Is Misleading
**Severity:** Low (documentation)  
**Phase:** Phase 4 (not started)  
**Files:** Not yet implemented

PITFALLS.md T1 (Blockchain-Style Transactions Are Actually Mutable) — the append-only pattern planned for Phase 4 provides audit trail convenience but not true blockchain immutability. Documentation should be clear: "append-only audit log" not "blockchain."

**Fix:** Be precise in user-facing and internal documentation. Phase 4 plan 04-01 should enforce append-only at the application level.

---

## Missing Features (Not Yet Required)

These are concerns flagged in PITFALLS.md that are intentionally deferred to v2 or later:

| Concern | Severity | Phase | Status |
|---------|----------|-------|--------|
| Flyback diode / relay kickback protection | Critical | Phase 2 | Not started — hardware |
| ESP32 WiFi auto-reconnect | Critical | Phase 2 | Not started — firmware |
| Power supply brownout handling | Critical | Phase 2 | Not started — hardware |
| Safe boot state (relay defaults to OFF) | Medium | Phase 2 | Not started — firmware |
| No confirmation for destructive relay toggles | Medium | Phase 3 | Not started — frontend |
| No device monitoring / alerting | High | Phase 2 | Not started |
| Hardcoded WiFi credentials | High | Phase 1 | Not applicable — not started |
| Mutal TLS / certificate auth | High | v2 | Out of scope |
| 2FA / RBAC | Medium | v2 | Out of scope |

---

## What's Solid (Phase 1 Delivered)

The Phase 1 implementation is well-structured for its scope:

| Area | Assessment |
|------|------------|
| **Password hashing** | bcrypt with 12 salt rounds — industry standard |
| **JWT separation** | Access tokens (15m) vs refresh tokens (7d) with separate secrets |
| **Token storage** | HTTP-only cookies, not localStorage — XSS resistant |
| **Input validation** | Zod schemas on all endpoints — comprehensive |
| **Auth middleware** | `requireAuth` and `optionalAuth` — clean separation |
| **Error handling** | Global error handler + per-route try/catch with `next(err)` |
| **Graceful shutdown** | SIGTERM/SIGINT handlers, MongoDB connection close |
| **CORS** | Configurable origin, credentials enabled |
| **Connection reuse** | Mongoose connection cached and reused |

---

## Risk Summary

| ID | Concern | Severity | Fix Phase |
|----|---------|----------|-----------|
| C1 | WebSocket server not implemented | Critical | Phase 2 |
| C2 | No device connection registry | Critical | Phase 2 |
| C3 | Password reset tokens have no expiry | High | Phase 2 |
| C4 | JWT refresh tokens not invalidated on use | High | Phase 2 |
| S1 | No rate limiting on auth endpoints | High | Immediate |
| S2 | CORS origin too permissive | Medium | Phase 2 |
| S3 | Device tokens stored unhashed | Medium | Phase 4 |
| S4 | WebSocket input validation not yet | High | Phase 2 |
| SC1 | MongoDB connection pool unbounded | High | Immediate |
| SC2 | Transaction log grows unbounded | Medium | Phase 4 |
| SC3 | No indexes on transactions | Medium | Phase 4 |
| SC4 | Render free tier instance hours | Low | Monitor |
| P1 | Render spin-down breaks connections | High | Phase 2 |
| P2 | Atlas M0 limitations (no backup) | Low | Phase 2+ |
| TD1 | Frontend not started | Medium | Phase 3 |
| TD2 | ESP32 firmware not started | High | Phase 2 |
| TD3 | No OTA update mechanism | Medium | v2 |
| TD4 | "Blockchain" misnomer | Low | Phase 4 |

**Immediate action items (no phase required):**
1. Add `maxPoolSize: 10` to MongoDB connection options in `src/db/connection.js`
2. Add `express-rate-limit` to auth routes

---

*Concerns audit: 2026-04-01*
