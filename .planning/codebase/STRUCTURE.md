# Codebase Structure

**Analysis Date:** 2026-04-01

## Directory Layout

```
R:\Code\IoT\
├── .env.example           # Environment variable template
├── .gitignore             # Git ignore patterns
├── .renderignore          # Render deploy ignore
├── CLAUDE.md              # Project documentation
├── package.json           # Node.js project manifest (type: module)
├── package-lock.json      # Dependency lock file
├── render.yaml             # Render deployment config
├── .planning/              # GSD planning artifacts
│   └── codebase/          # Codebase maps (this directory)
├── src/                   # Backend source code
│   ├── index.js           # Express app entry point
│   ├── db/                # Database connection
│   │   └── connection.js  # MongoDB/Mongoose singleton
│   ├── middleware/         # Express middleware
│   │   └── auth.middleware.js  # requireAuth, optionalAuth
│   ├── models/            # Mongoose schemas
│   │   ├── Device.js      # ESP32 device schema
│   │   └── User.js        # User account schema
│   ├── routes/            # Express route handlers
│   │   ├── auth.routes.js # POST /api/auth/*
│   │   └── device.routes.js # CRUD /api/devices/*
│   └── utils/             # Pure utility functions
│       ├── deviceToken.js # Device token generation
│       ├── jwt.js         # JWT sign/verify/decode
│       └── password.js    # bcrypt hash/verify
└── tests/                 # Test files (empty — no tests yet)
```

## Directory Purposes

**`src/`:**
- Purpose: Backend source root
- Contains: Express server, all route handlers, models, middleware, utilities
- Key files: `index.js` (entry point)

**`src/db/`:**
- Purpose: Database connection management
- Contains: `connection.js` — MongoDB connection singleton
- Key files: `connection.js`

**`src/middleware/`:**
- Purpose: Express middleware functions
- Contains: `auth.middleware.js` — JWT authentication middleware
- Key files: `auth.middleware.js`

**`src/models/`:**
- Purpose: Mongoose schema definitions
- Contains: `User.js`, `Device.js`
- Key files: Both files are key

**`src/routes/`:**
- Purpose: Express route handlers organized by resource
- Contains: `auth.routes.js`, `device.routes.js`
- Key files: Both files are key

**`src/utils/`:**
- Purpose: Pure utility functions with no side effects
- Contains: `jwt.js`, `password.js`, `deviceToken.js`
- Key files: All three are key

**`.planning/codebase/`:**
- Purpose: GSD codebase mapping output
- Contains: `ARCHITECTURE.md`, `STRUCTURE.md` (this file)
- Generated: Yes (by this analysis)

**`tests/`:**
- Purpose: Test files (currently empty)
- Contains: No test files present

## Key File Locations

**Entry Points:**
- `src/index.js`: Express app bootstrap, middleware setup, route registration, HTTP server startup, graceful shutdown

**Configuration:**
- `.env.example`: Template for required environment variables
- `package.json`: Node.js project config with ES module type

**Core Logic:**
- `src/routes/auth.routes.js`: All authentication endpoints (signup, login, logout, refresh, me, forgot-password, reset-password)
- `src/routes/device.routes.js`: Device CRUD endpoints (create, list, get, update, delete)
- `src/models/User.js`: User Mongoose schema
- `src/models/Device.js`: Device Mongoose schema

**Testing:**
- `tests/`: Empty directory — no test files present

## Naming Conventions

**Files:**
- camelCase for JavaScript files: `auth.routes.js`, `deviceToken.js`
- PascalCase for model files: `User.js`, `Device.js`

**Directories:**
- lowercase: `db/`, `middleware/`, `models/`, `routes/`, `utils/`

**Functions/Variables:**
- camelCase: `hashPassword`, `verifyToken`, `generateAccessToken`
- PascalCase: Constructor/class things: `User` model, `Device` model

## Where to Add New Code

**New Route:**
- Add new file in `src/routes/` (e.g., `transaction.routes.js`)
- Register in `src/index.js`: `app.use('/api/transactions', transactionRoutes)`

**New Model:**
- Add new file in `src/models/` (e.g., `Transaction.js`)
- Use existing models as template with Mongoose schema
- Import in routes as needed

**New Middleware:**
- Add new file in `src/middleware/` (e.g., `rateLimit.js`)
- Import and apply in route files or globally in `src/index.js`

**New Utility:**
- Add new file in `src/utils/` (e.g., `validation.js`)
- Pure functions with no side effects
- Import in route files as needed

**New Test:**
- Add test files in `tests/` directory (no subdirectory convention yet)
- Name pattern: `*.test.js` or `*.spec.js`

## Special Directories

**`.planning/`:**
- Purpose: GSD workflow planning artifacts
- Generated: Yes
- Committed: Yes

**`node_modules/`:**
- Purpose: npm dependencies
- Generated: Yes (by `npm install`)
- Committed: No (in `.gitignore`)

**`tests/`:**
- Purpose: Test files
- Generated: No
- Committed: Yes (empty directory for now)

## Module Responsibilities

| Module | File | Responsibility |
|--------|------|----------------|
| Server | `src/index.js` | App bootstrap, middleware, routes, shutdown |
| Database | `src/db/connection.js` | MongoDB connection singleton |
| Auth Middleware | `src/middleware/auth.middleware.js` | JWT validation from cookies |
| User Model | `src/models/User.js` | User schema, email/passwordHash storage |
| Device Model | `src/models/Device.js` | Device schema, status, lastSeen |
| Auth Routes | `src/routes/auth.routes.js` | Login, signup, logout, token refresh, password reset |
| Device Routes | `src/routes/device.routes.js` | Device CRUD, scoped to authenticated user |
| JWT Utils | `src/utils/jwt.js` | Access/refresh token generation and verification |
| Password Utils | `src/utils/password.js` | bcrypt hashing and comparison |
| Device Token Utils | `src/utils/deviceToken.js` | Unique device token generation |

## Missing Directories (Per CLAUDE.md)

The following directories do not exist but are referenced in project documentation:

- `frontend/` — Next.js frontend (not yet created)
- `firmware/` — ESP32 PlatformIO project (not yet created)

---

*Structure analysis: 2026-04-01*
