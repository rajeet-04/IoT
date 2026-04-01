# Testing Patterns

**Analysis Date:** 2026-04-01

## Test Framework

**Runner:** Jest 29.7.0
- Configured in `package.json` under `jest` key
- Run command: `npm test` (executes `node --experimental-vm-modules node_modules/jest/bin/jest.js`)
- Uses `--experimental-vm-modules` flag for ES module support

**Assertion:** Jest built-in assertions (`expect`)

**Environment:** Node.js (configured via `"testEnvironment": "node"`)

**No transform:** `"transform": {}` — Jest does not transform files (relies on Node.js native ES module handling)

---

## Current Test Status

**No test files exist in the codebase.**

The `tests/` directory does not exist, and no `*.test.js` or `*.spec.js` files were found anywhere in the project.

Jest is installed as a dev dependency and configured in `package.json`, but no tests have been written yet.

---

## Test Configuration

### package.json Configuration
```json
{
  "scripts": {
    "test": "node --experimental-vm-modules node_modules/jest/bin/jest.js"
  },
  "jest": {
    "testEnvironment": "node",
    "transform": {}
  }
}
```

### Key Configuration Notes
- **`testEnvironment: "node"`** — Tests run in Node.js environment (not JSDOM)
- **`transform: {}`** — No Babel/transpilation; relies on Node.js 22's native ES module support
- **ES Modules** — Requires `--experimental-vm-modules` flag when running Jest

---

## Recommended Test Structure

Based on codebase conventions, tests should follow this structure:

### Location
- Unit tests: `tests/unit/` or co-located `*.test.js` next to source files
- Integration tests: `tests/integration/`

### Naming
- Test files: `*.test.js` (e.g., `auth.routes.test.js`)
- Test database: Separate MongoDB instance or mock

### Example Test Structure (for future implementation)

**Route tests** (`tests/routes/auth.routes.test.js`):
```javascript
import { jest } from '@jest/globals';

describe('POST /api/auth/signup', () => {
  it('should return 201 on valid signup', async () => {
    // Test implementation
  });

  it('should return 400 on invalid email', async () => {
    // Test implementation
  });

  it('should return 409 if email already exists', async () => {
    // Test implementation
  });
});
```

**Utility tests** (`tests/utils/password.test.js`):
```javascript
import { hashPassword, verifyPassword } from '../../src/utils/password.js';

describe('hashPassword', () => {
  it('should hash a password', async () => {
    const hash = await hashPassword('testPassword123');
    expect(hash).not.toBe('testPassword123');
    expect(hash.length).toBeGreaterThan(0);
  });

  it('should produce different hashes for same password', async () => {
    const hash1 = await hashPassword('testPassword123');
    const hash2 = await hashPassword('testPassword123');
    expect(hash1).not.toBe(hash2);
  });
});

describe('verifyPassword', () => {
  it('should return true for correct password', async () => {
    const hash = await hashPassword('testPassword123');
    const result = await verifyPassword('testPassword123', hash);
    expect(result).toBe(true);
  });

  it('should return false for incorrect password', async () => {
    const hash = await hashPassword('testPassword123');
    const result = await verifyPassword('wrongPassword', hash);
    expect(result).toBe(false);
  });
});
```

**Middleware tests** (`tests/middleware/auth.middleware.test.js`):
```javascript
import { jest } from '@jest/globals';

describe('requireAuth', () => {
  it('should return 401 if no token', () => {
    const req = { cookies: {} };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    const next = jest.fn();

    requireAuth(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('should call next() with valid token', () => {
    // Test implementation
  });
});
```

**Model tests** (`tests/models/user.test.js`):
```javascript
import { jest } from '@jest/globals';

describe('User model', () => {
  it('should hash password before save', async () => {
    // Requires MongoDB memory server or mock
  });
});
```

---

## Mocking Strategy

### What to Mock
- **Database (Mongoose):** Use `mongodb-memory-server` or mock Mongoose methods
- **JWT verification:** Mock `jwt.verify()` in unit tests
- **bcrypt:** Already async, may want to mock for unit tests

### What NOT to Mock
- **Zod validation:** Simple enough to test with real data
- **Utility functions:** Test with real implementations (e.g., `hashPassword`, `generateDeviceToken`)

### MongoDB Mocking
```javascript
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});
```

---

## Running Tests

```bash
# Run all tests
npm test

# Run with coverage (if configured)
npm test -- --coverage

# Run specific test file
npm test -- tests/routes/auth.routes.test.js

# Watch mode (if enabled)
npm test -- --watch
```

---

## Coverage Requirements

**No coverage requirements currently enforced.**

To add coverage reporting, add to `jest` config in `package.json`:
```json
{
  "jest": {
    "collectCoverageFrom": [
      "src/**/*.js",
      "!src/index.js"
    ],
    "coverageThreshold": {
      "global": {
        "branches": 70,
        "functions": 70,
        "lines": 70,
        "statements": 70
      }
    }
  }
}
```

---

## Test Types Recommended

### Unit Tests
- **Utils:** `password.js`, `jwt.js`, `deviceToken.js`
- **Middleware:** `auth.middleware.js`
- **Zod schemas:** Validation logic

### Integration Tests
- **Routes:** Full request/response with test database
- **Auth flow:** Signup → login → access protected route
- **Device CRUD:** Create device → list → update → delete

### Priority Order
1. **Auth utilities** (`password.js`, `jwt.js`) — Critical for security
2. **Auth middleware** — Core security boundary
3. **Route handlers** — HTTP contract
4. **Models** — Data integrity

---

## Jest Configuration for ES Modules

The project uses ES modules (`"type": "module"` in `package.json`). Jest requires special handling:

### Required: experimental-vm-modules
```bash
node --experimental-vm-modules node_modules/jest/bin/jest.js
```

This is already configured in `package.json` scripts.

### jest.config.js Alternative
Create `jest.config.js` for cleaner configuration:
```javascript
export default {
  testEnvironment: 'node',
  transform: {},
  testMatch: ['**/tests/**/*.test.js'],
  moduleFileExtensions: ['js'],
  verbose: true,
};
```

---

*Testing analysis: 2026-04-01*
