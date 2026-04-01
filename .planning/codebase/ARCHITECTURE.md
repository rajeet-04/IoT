# Architecture

**Analysis Date:** 2026-04-01

## Pattern Overview

**Overall:** Monolithic Express.js backend with REST API, serving a separate Next.js frontend and ESP32 firmware clients.

**Key Characteristics:**
- Single Express server handles both HTTP REST and WebSocket connections (future)
- MongoDB/Mongoose provides persistence via Mongoose ODM
- JWT-based authentication with httpOnly cookie transport
- Zod for runtime request validation at API boundaries
- Device registry pattern where ESP32 devices are registered and receive bearer tokens

## Layers

**HTTP/REST Layer:**
- Location: `src/index.js`
- Contains: Express app, middleware setup, route registration, error handlers, graceful shutdown
- Depends on: `express`, `cookie-parser`, `cors`
- Used by: Frontend (Next.js), ESP32 (future WebSocket upgrade)

**Route Layer:**
- Location: `src/routes/`
- Contains: `auth.routes.js`, `device.routes.js`
- Depends on: Models, middleware, utilities (Zod, JWT, bcrypt)
- Used by: Frontend HTTP clients

**Middleware Layer:**
- Location: `src/middleware/auth.middleware.js`
- Contains: `requireAuth`, `optionalAuth` Express middleware
- Depends on: `src/utils/jwt.js`
- Used by: Routes that need authentication

**Model Layer:**
- Location: `src/models/`
- Contains: `User.js`, `Device.js` Mongoose schemas
- Depends on: `mongoose`
- Used by: Routes for CRUD operations

**Database Layer:**
- Location: `src/db/connection.js`
- Contains: `connectDB()` singleton, `getDB()` accessor
- Depends on: `mongoose`
- Used by: `src/index.js` at startup

**Utility Layer:**
- Location: `src/utils/`
- Contains: `jwt.js` (token generation/verification), `password.js` (bcrypt hashing), `deviceToken.js` (device token generation)
- Depends on: `jsonwebtoken`, `bcrypt`
- Used by: Routes, middleware

## Data Flow

**User Authentication (Signup/Login):**

1. Frontend sends `POST /api/auth/signup` or `/api/auth/login` with `{email, password}`
2. `auth.routes.js` validates with Zod schema
3. Password hashed via `password.hashPassword()` (bcrypt, 12 rounds)
4. User document created/fetched via Mongoose `User` model
5. JWT tokens generated: short-lived access token (15m) + long-lived refresh token (7d)
6. Tokens set as `httpOnly` cookies via `setAuthCookies()`
7. Response returned with user JSON (no token in body — cookies only)

**Device Registration:**

1. Authenticated user sends `POST /api/devices` with optional `{name}`
2. `device.routes.js` calls `requireAuth` middleware → validates JWT cookie → sets `req.userId`
3. `generateDeviceToken()` creates a unique device token string
4. `Device` document created with `userId`, `deviceId`, and `name`
5. Device token returned **once** in response — user must flash it to ESP32

**Device Control (future WebSocket):**

1. ESP32 establishes WSS connection with `Authorization: Bearer <device-token>` header
2. Server validates device token against `Device.deviceId` field
3. Bidirectional JSON messages for relay on/off commands
4. Each action logged to blockchain-style `Transaction` collection

**Request Lifecycle:**

```
Client Request
    │
    ▼
src/index.js (Express app)
    │ app.use(express.json())
    │ app.use(cookieParser())
    │ app.use(cors())
    ▼
Route Handler (auth.routes.js or device.routes.js)
    │
    ├── Zod validation (req.body)
    │
    ├── requireAuth middleware (device.routes.js only)
    │   └── verifyToken from jwt.js
    │
    ├── Model operation (User/Device via Mongoose)
    │
    └── Response (JSON or cookie)
```

## Key Abstractions

**Authentication:**
- `src/utils/jwt.js` — Pure JWT operations (sign, verify, decode)
- `src/middleware/auth.middleware.js` — Express middleware that extracts user from cookies
- `src/routes/auth.routes.js` — Auth endpoints with Zod validation

**Device Management:**
- `src/models/Device.js` — Mongoose schema for ESP32 devices
- `src/routes/device.routes.js` — CRUD endpoints with user scoping
- `src/utils/deviceToken.js` — Unique device token generation

**Database:**
- `src/db/connection.js` — Singleton MongoDB connection with caching

## Entry Points

**Backend Server:**
- Location: `src/index.js`
- Triggers: `node src/index.js` or `npm start`
- Responsibilities:
  - Load environment variables (`dotenv`)
  - Connect to MongoDB (`connectDB`)
  - Configure Express middleware
  - Register routes (`/api/auth`, `/api/devices`)
  - Start HTTP server on `PORT`
  - Handle graceful shutdown (SIGTERM, SIGINT)

## Error Handling

**Strategy:** Central error handler middleware + per-route try/catch with `next(err)`

**Patterns:**
- Route handlers wrap logic in `try/catch` and call `next(err)` on failure
- Global error handler at `src/index.js` catches all unhandled errors, returns 500 JSON
- Zod validation failures return 400 with structured error details
- Authentication failures return 401
- Resource-not-found returns 404
- Conflict (duplicate email) returns 409

**Error Response Shape:**
```json
{ "error": "Message" }
{ "error": "Validation failed", "details": [...] }
```

## Cross-Cutting Concerns

**Logging:** `console.log`/`console.error` directly — no structured logging library

**Validation:** Zod schemas defined inline in route files, `safeParse()` used for non-throwing validation

**Authentication:** JWT access tokens in httpOnly cookies, refresh tokens for rotation

**CORS:** Configured for frontend origin with `credentials: true`

---

*Architecture analysis: 2026-04-01*
