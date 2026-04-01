---
status: testing
phase: 01-foundation-auth
source:
  - .planning/phases/01-foundation-auth/01-01-SUMMARY.md
  - .planning/phases/01-foundation-auth/01-02-SUMMARY.md
  - .planning/phases/01-foundation-auth/01-03-SUMMARY.md
  - .planning/phases/01-foundation-auth/01-04-SUMMARY.md
started: 2026-04-01T09:33:00Z
updated: 2026-04-01T09:33:00Z
---

## Current Test
number: 1
name: Backend Cold Start
expected: |
  Start the backend server. Server boots without errors, connects to MongoDB, and /health returns 200 OK with JSON.
awaiting: user response

## Tests

### 1. Backend Cold Start
expected: |
  Start the backend server. Server boots without errors, connects to MongoDB, and /health returns 200 OK with JSON.
result: pending

### 2. User Signup
expected: |
  POST /api/auth/signup with email and password (min 8 chars). Returns 201 with user object (no passwordHash). Check that user can be found in database.
result: pending

### 3. User Login
expected: |
  POST /api/auth/login with same credentials. Returns 200 with access token in httpOnly cookie (15min expiry) and refresh token in httpOnly cookie (7 day expiry).
result: pending

### 4. Get Current User
expected: |
  GET /api/auth/me with the access token cookie. Returns 200 with user object (id, email, createdAt). Without token, returns 401.
result: pending

### 5. User Logout
expected: |
  POST /api/auth/logout. Returns 200. Clears access and refresh cookies. Subsequent calls to /api/auth/me return 401.
result: pending

### 6. Password Reset Flow
expected: |
  POST /api/auth/forgot-password with email. Returns 200. Check server logs for reset token URL. POST /api/auth/reset-password with token and new password. Returns 200. User can then login with new password.
result: pending

### 7. Device Registration
expected: |
  POST /api/devices with auth token. Returns 201 with device object including deviceId (UUID) and token. Token is only returned this once.
result: pending

### 8. List User Devices
expected: |
  GET /api/devices with auth token. Returns 200 with array of user's devices. Each device has: deviceId, name, status, lastSeen, createdAt. Does NOT return token.
result: pending

### 9. Update Device Name
expected: |
  PUT /api/devices/:id with auth token and { "name": "My Relay" }. Returns 200 with updated device. GET /api/devices/:id confirms name changed.
result: pending

### 10. Delete Device
expected: |
  DELETE /api/devices/:id with auth token. Returns 200. GET /api/devices/:id returns 404.
result: pending

### 11. Token Refresh
expected: |
  POST /api/auth/login to get tokens. Wait 15+ minutes or manually expire access token. POST /api/auth/refresh with refresh token cookie. Returns 200 with new access and refresh cookies.
result: pending

### 12. Auth Token Validation
expected: |
  Modify access token cookie to invalid value. GET /api/auth/me returns 401 Unauthorized.
result: pending

### 13. Device Ownership Isolation
expected: |
  Create device with User A's token. Login as User B. GET /api/devices returns empty array (User B cannot see User A's devices).
result: pending

## Summary

total: 13
passed: 0
issues: 0
pending: 13
skipped: 0

## Gaps

[none yet]
