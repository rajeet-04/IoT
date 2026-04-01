# Coding Conventions

**Analysis Date:** 2026-04-01

## Overview

This codebase is an Express.js backend using ES modules, Mongoose ODM, and Zod validation. The conventions below are derived from actual patterns found in `src/routes/`, `src/models/`, `src/utils/`, and `src/middleware/`.

---

## File Structure & Naming

### Files
- **Naming:** kebab-case for files (`auth.routes.js`, `deviceToken.js`)
- **Extension:** `.js` for source, `.test.js` for tests
- **Route files:** `*.routes.js`
- **Model files:** PascalCase singular (`User.js`, `Device.js`)
- **Utility files:** camelCase singular (`jwt.js`, `password.js`, `deviceToken.js`)
- **Middleware files:** camelCase (`auth.middleware.js`)

### Directory Structure
```
src/
├── db/
│   └── connection.js          # Singleton DB connection
├── middleware/
│   └── auth.middleware.js     # Auth middleware (requireAuth, optionalAuth)
├── models/
│   ├── User.js                # Mongoose model
│   └── Device.js              # Mongoose model
├── routes/
│   ├── auth.routes.js         # Auth endpoints
│   └── device.routes.js       # Device CRUD endpoints
├── utils/
│   ├── jwt.js                 # JWT generation/verification
│   ├── password.js            # Bcrypt hashing
│   └── deviceToken.js         # Device token generation
└── index.js                  # App entry point
```

---

## Naming Conventions

### Variables & Functions
- **Functions:** camelCase (`hashPassword`, `verifyToken`, `generateAccessToken`)
- **Variables:** camelCase (`passwordHash`, `accessToken`, `deviceToken`)
- **Constants:** UPPER_SNAKE_CASE (`SALT_ROUNDS` in `src/utils/password.js`)
- **Private module-level:** underscore prefix (`_connection` in `src/db/connection.js`)

### Mongoose Schemas
- **Schema names:** camelCase (`userSchema`, `deviceSchema`)
- **Model name:** PascalCase singular (`User`, `Device`)
- **Collection field names:** camelCase (`userId`, `deviceId`, `lastSeen`)
- **Schema type options:** kebab-case in error messages (`'User ID is required'`)

### Routes
- **HTTP methods:** lowercase (`router.post`, `router.get`, `router.put`, `router.delete`)
- **Route paths:** kebab-case where multiple words (`/api/devices`)
- **Route variables:** camelCase (`/:id`)

### Imports
- **Import order:**
  1. Node built-ins (`express`, `crypto`, `node:crypto`)
  2. External packages (`mongoose`, `zod`, `bcrypt`, `jsonwebtoken`)
  3. Internal modules (`../models/User`, `../utils/jwt`)
- **File extensions:** Always include `.js` extension in imports (ES modules)

---

## Function Patterns

### Async Route Handlers
All async route handlers use try/catch with `next(err)`:
```javascript
router.post('/endpoint', async (req, res, next) => {
  try {
    // async logic
    return res.status(201).json({ /* ... */ });
  } catch (err) {
    next(err);
  }
});
```

### Middleware Functions
Two patterns observed:

**Blocking middleware** (requires auth):
```javascript
export function requireAuth(req, res, next) {
  const token = req.cookies?.accessToken;
  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  try {
    const payload = verifyToken(token);
    req.userId = payload.userId;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}
```

**Non-blocking middleware** (optional auth):
```javascript
export function optionalAuth(req, res, next) {
  const token = req.cookies?.accessToken;
  if (!token) {
    req.userId = null;
    return next();
  }
  try {
    const payload = verifyToken(token);
    req.userId = payload.userId;
  } catch {
    req.userId = null;
  }
  next();
}
```

### Singleton Pattern (Database Connection)
```javascript
let _connection = null;

export async function connectDB(uri) {
  if (_connection) {
    return _connection;
  }
  _connection = await mongoose.connect(uri, {
    serverApi: { version: '1' },
  });
  return _connection;
}

export function getDB() {
  if (!_connection) {
    throw new Error('Database not connected — call connectDB() first');
  }
  return _connection;
}
```

---

## Error Handling

### Route-Level Errors
- Use `try/catch` with `next(err)` for all async operations
- Return early on validation failures or not-found conditions
- Never swallow errors without passing to `next(err)`

### Validation Errors (Zod)
```javascript
const result = schema.safeParse(req.body);
if (!result.success) {
  return res.status(400).json({
    error: 'Validation failed',
    details: result.error.errors,
  });
}
```

### Not-Found Pattern
```javascript
if (!device) {
  return res.status(404).json({ error: 'Device not found' });
}
```

### Global Error Handler
Located in `src/index.js`:
```javascript
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});
```

### Security-Preserving Error Messages
Auth endpoints return generic messages to prevent enumeration:
```javascript
// Login failure - same message for user-not-found and bad password
return res.status(401).json({ error: 'Invalid email or password' });

// Password reset - always returns 200
return res.status(200).json({
  message: 'If an account exists, a reset token has been generated.',
});
```

---

## Response Patterns

### Success Responses
```javascript
// Create (201)
return res.status(201).json({
  device: { id: device._id, deviceId: device.deviceId, name: device.name, token },
});

// List (200)
return res.status(200).json({
  devices: devices.map((d) => ({ id: d._id, name: d.name, status: d.status })),
});

// Delete (200)
return res.status(200).json({ message: 'Device deleted successfully' });
```

### Error Responses
```javascript
return res.status(404).json({ error: 'Device not found' });
return res.status(401).json({ error: 'Invalid email or password' });
return res.status(400).json({
  error: 'Validation failed',
  details: result.error.errors,
});
```

### Cookie-Based Auth
```javascript
function setAuthCookies(res, accessToken, refreshToken) {
  const isProd = process.env.NODE_ENV === 'production';
  res.cookie('accessToken', accessToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',
    maxAge: 15 * 60 * 1000, // 15 minutes
  });
  // refreshToken cookie with 7 day maxAge
}

function clearAuthCookies(res) {
  const isProd = process.env.NODE_ENV === 'production';
  const opts = { httpOnly: true, secure: isProd, sameSite: 'lax' };
  res.clearCookie('accessToken', opts);
  res.clearCookie('refreshToken', opts);
}
```

---

## Validation Patterns

### Zod Schemas
Defined at module level (not inside route handlers):
```javascript
const signupSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});
```

### Mongoose Schema Validation
- Required fields use array syntax: `required: [true, 'Field description']`
- String constraints use `minlength`, `maxlength`, `match`
- Enums define allowed values: `enum: ['offline', 'online']`
- Defaults use functions for dynamic values: `default: function () { return ... }`

---

## Comments & Documentation

### JSDoc Format
Used for utility functions:
```javascript
/**
 * Hash a plain text password using bcrypt.
 * @param {string} plainText - Password to hash
 * @returns {Promise<string>} Bcrypt hash
 */
export async function hashPassword(plainText) { ... }
```

### Inline Comments
- Used sparingly for non-obvious logic
- Security notes marked with `v1`, `v2+`:
```javascript
// v1: simple validation — token must be non-empty, email must match a user
// v2+: use token store with expiry
```

---

## Architecture Patterns

### Layer Separation
- **Routes:** HTTP handling, input validation, response formatting
- **Models:** Mongoose schemas, data validation, persistence
- **Utils:** Pure functions (crypto, hashing, JWT)
- **Middleware:** Auth logic, request modification
- **DB:** Connection management, singleton access

### No Business Logic in Routes
Routes delegate to models and utilities:
```javascript
// Route just coordinates
const passwordHash = await hashPassword(password);
const user = await User.create({ email, passwordHash });
```

### Ownership Checks
Device routes always filter by `userId`:
```javascript
const device = await Device.findOne({
  _id: req.params.id,
  userId: req.userId,
});
```

---

*Convention analysis: 2026-04-01*
