# Technology Stack

**Analysis Date:** 2026-04-01

## Languages

**Primary:**
- **JavaScript (ES2022+)** — Backend server code
- **Node.js 22.x LTS** — Runtime environment

## Runtime

**Environment:**
- **Node.js** 22.x LTS — Required by `package.json` engines field (`>=22.0.0`)
- **Platform:** Render Web Service (free tier)

**Package Manager:**
- **npm** 10.x+ — Lockfile: `package-lock.json` (auto-generated)
- Install command: `npm ci --omit=dev` (production build on Render)

## Frameworks

**Core:**
- **Express** 5.1.0 — HTTP API framework
  - Rationale: Industry standard, minimal overhead, massive ecosystem. Express 5 is stable and production-ready. Handles REST API routes for device management and authentication.
  - Alternative rejected: Fastify — faster but adds complexity not needed at this scale; Hono — great for edge but Express has the ecosystem for auth middleware, validation, etc.

- **Mongoose** 8.13.1 — MongoDB ODM
  - Rationale: Schema validation at the model level prevents bad data. Middleware hooks (`pre('save')`) for `updatedAt` timestamps. Virtuals and getters simplify data transformation. Performance overhead negligible at v1 scale.
  - Alternative rejected: Raw `mongodb` driver — would require manual validation boilerplate; Prisma — limited MongoDB support compared to PostgreSQL.

**Testing:**
- **Jest** 29.7.0 — Test runner
  - Rationale: Zero-config, built-in coverage, `node --experimental-vm-modules` for ES module support

**Build/Dev:**
- **nodemon** 3.1.9 — Development file watcher
  - Rationale: Auto-restarts on file changes; only in devDependencies

## Key Dependencies

### Authentication & Security

**bcrypt** 5.1.1 — Password hashing
- Salt rounds: 12
- Rationale: Industry standard. Argon2 technically superior but bcrypt has broader ecosystem support.
- Alternative rejected: Argon2 — better memory hardness but less ecosystem support at this scale.

**jsonwebtoken** 9.0.2 — JWT authentication
- Used in: `src/utils/jwt.js`
- Tokens: Access token (15m expiry), Refresh token (7d expiry)
- Rationale: Standard JWT implementation, lightweight, well-maintained.
- Alternative rejected: `jose` — supports more runtimes but `jsonwebtoken` is simpler for Express.

### Validation

**zod** 3.24.2 — Runtime validation
- Used in: All route handlers (`auth.routes.js`, `device.routes.js`)
- Rationale: Type-safe request validation for HTTP payloads. Catches malformed data before business logic.
- Alternative rejected: `joi` — class-based, more verbose; `yup` — larger bundle.

### HTTP Utilities

**cors** 2.8.5 — Cross-Origin Resource Sharing
- Used in: Express server setup
- Rationale: Enables frontend-backend communication; configured per `FRONTEND_URL` env var.

**cookie-parser** 1.4.7 — Cookie parsing middleware
- Used in: Express server setup
- Rationale: Parses `accessToken` and `refreshToken` cookies in auth flows.

### Database

**mongoose** 8.13.1 — MongoDB object modeling (listed above under Frameworks)

## Configuration

**Environment Variables (Render):**
- `NODE_ENV=production` — Render injects
- `PORT=3000` — Render injects
- `MONGODB_URI` — User-provided MongoDB Atlas connection string
- `JWT_SECRET` — User-provided secret for access tokens
- `JWT_REFRESH_SECRET` — User-provided secret for refresh tokens
- `FRONTEND_URL` — CORS origin (empty string = no restrictions)

**Environment Files:**
- `.env` — Local development (not committed to git)
- `render.yaml` — Render deployment config

**Project Configuration:**
- `package.json` with `"type": "module"` — ES modules throughout
- `jest` config in `package.json` — ES module support via `--experimental-vm-modules`

## Platform Requirements

**Development:**
- Node.js 22.x+
- npm 10.x+
- MongoDB Atlas M0 free tier (or local MongoDB)

**Production:**
- Render Web Service (free tier)
- MongoDB Atlas M0 (512MB, auto-scaling)

## What NOT to Use and Why

| Technology | Why Not | What to Use Instead |
|------------|---------|---------------------|
| **Socket.io** | ESP32 cannot use Socket.io protocol natively. Would need custom ESP32 client. Overkill for 1 ESP32 + a few browser clients. | Raw `ws` library + native WebSocket |
| **MQTT** | Requires a separate broker process. Render free tier doesn't support persistent non-HTTP services. | WebSocket on same Express server |
| **Firebase Realtime Database** | Vendor lock-in, unpredictable pricing. We already use MongoDB Atlas. | MongoDB Atlas with WebSocket |
| **Mongoose (for ESP32)** | Mongoose is a Node.js ODM — doesn't exist for embedded. | Direct WebSocket messages to backend |
| **Prisma** | Limited MongoDB support compared to PostgreSQL. | Mongoose or raw `mongodb` driver |
| **Redux** | Excessive boilerplate for device status + transaction log state. | Zustand |
| **Docker for backend** | Render handles Node.js build/deploy natively. Docker adds build time and image size. | Native Node.js deployment |
| **PostgreSQL** | No advantage over MongoDB for our document-based data model. MongoDB Atlas free tier is simpler. | MongoDB Atlas |
| **Next.js API routes as WebSocket server** | Next.js Edge Runtime doesn't support WebSockets. | Dedicated Express + ws server on Render |

## Project Structure

```
src/
├── db/
│   └── connection.js     # MongoDB connection management
├── models/
│   ├── User.js           # User document schema
│   └── Device.js         # Device document schema
├── routes/
│   ├── auth.routes.js    # Auth endpoints (signup, login, logout, refresh)
│   └── device.routes.js  # Device CRUD endpoints
├── middleware/
│   └── auth.middleware.js # requireAuth, optionalAuth
├── utils/
│   ├── jwt.js            # Token generation/verification
│   ├── password.js       # Password hashing/verification
│   └── deviceToken.js    # Device token generation (UUID v4)
└── index.js              # Server entry point
```

---

*Stack analysis: 2026-04-01*
