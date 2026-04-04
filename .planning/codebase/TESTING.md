# Testing Patterns

**Analysis Date:** 2026-04-04

## Test Framework Status

**Current State:** No test files exist in the codebase.

Jest is configured in `package.json` but no tests have been written yet.

---

## Framework Configuration

### Backend (Jest)

**Location:** `package.json`

```json
{
  "jest": {
    "testEnvironment": "node",
    "transform": {}
  },
  "scripts": {
    "test": "node --experimental-vm-modules node_modules/jest/bin/jest.js"
  }
}
```

**Key Details:**
- ES modules support via `--experimental-vm-modules` flag
- Node.js environment for backend tests
- No transform needed (native ES modules)

### Run Commands

```bash
npm test              # Run all tests
npm run server        # Start backend with nodemon
npm run client        # Start frontend dev server
npm run dev           # Run both concurrently
```

---

## Test File Organization

**Expected Pattern (not yet implemented):**

```
R:\Code\IoT\
├── src\
│   ├── __tests__\           # Unit tests
│   │   ├── routes\
│   │   │   ├── auth.routes.test.js
│   │   │   ├── device.routes.test.js
│   │   │   └── transaction.routes.test.js
│   │   ├── utils\
│   │   │   ├── password.test.js
│   │   │   ├── jwt.test.js
│   │   │   └── deviceToken.test.js
│   │   ├── models\
│   │   │   ├── User.test.js
│   │   │   ├── Device.test.js
│   │   │   └── Transaction.test.js
│   │   └── ws\
│   │       ├── hub.test.js
│   │       ├── connectionRegistry.test.js
│   │       └── messageRouter.test.js
│   └── setup\
│       └── jest.setup.js
└── frontend\
    ├── src\
    │   └── __tests__\       # Frontend tests (not configured)
    │       ├── components\
    │       └── lib\
    └── jest.config.js
```

---

## Recommended Test Patterns

### Backend Route Tests

```javascript
// src/__tests__/routes/auth.routes.test.js
import request from 'supertest';
import express from 'express';
import authRoutes from '../../routes/auth.routes.js';

const app = express();
app.use(express.json());
app.use('/api/auth', authRoutes);

describe('POST /api/auth/signup', () => {
  it('should create a new user with valid credentials', async () => {
    const res = await request(app)
      .post('/api/auth/signup')
      .send({ email: 'test@example.com', password: 'password123' });
    
    expect(res.status).toBe(201);
    expect(res.body.user).toBeDefined();
    expect(res.body.accessToken).toBeDefined();
  });

  it('should reject duplicate email', async () => {
    // Setup: create user first
    await request(app)
      .post('/api/auth/signup')
      .send({ email: 'test@example.com', password: 'password123' });

    // Test: try to create same user
    const res = await request(app)
      .post('/api/auth/signup')
      .send({ email: 'test@example.com', password: 'password123' });
    
    expect(res.status).toBe(409);
  });

  it('should validate email format', async () => {
    const res = await request(app)
      .post('/api/auth/signup')
      .send({ email: 'invalid-email', password: 'password123' });
    
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Validation failed');
  });

  it('should reject short passwords', async () => {
    const res = await request(app)
      .post('/api/auth/signup')
      .send({ email: 'test@example.com', password: 'short' });
    
    expect(res.status).toBe(400);
  });
});
```

### Utility Function Tests

```javascript
// src/__tests__/utils/password.test.js
import { hashPassword, verifyPassword } from '../../utils/password.js';

describe('password utilities', () => {
  describe('hashPassword', () => {
    it('should hash a password', async () => {
      const hash = await hashPassword('testPassword123');
      expect(hash).toBeDefined();
      expect(hash).not.toBe('testPassword123');
      expect(hash.length).toBe(60); // bcrypt hash length
    });

    it('should generate different hashes for same password', async () => {
      const hash1 = await hashPassword('testPassword123');
      const hash2 = await hashPassword('testPassword123');
      expect(hash1).not.toBe(hash2);
    });
  });

  describe('verifyPassword', () => {
    it('should verify correct password', async () => {
      const hash = await hashPassword('testPassword123');
      const isValid = await verifyPassword('testPassword123', hash);
      expect(isValid).toBe(true);
    });

    it('should reject incorrect password', async () => {
      const hash = await hashPassword('testPassword123');
      const isValid = await verifyPassword('wrongPassword', hash);
      expect(isValid).toBe(false);
    });
  });
});
```

### Model Tests

```javascript
// src/__tests__/models/Device.test.js
import mongoose from 'mongoose';
import Device from '../../models/Device.js';

describe('Device model', () => {
  beforeAll(async () => {
    await mongoose.connect(process.env.MONGODB_URI_TEST);
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  afterEach(async () => {
    await Device.deleteMany({});
  });

  it('should create a device with required fields', async () => {
    const deviceData = {
      userId: new mongoose.Types.ObjectId(),
      deviceId: 'test-device-123',
    };
    
    const device = await Device.create(deviceData);
    
    expect(device._id).toBeDefined();
    expect(device.deviceId).toBe('test-device-123');
    expect(device.status).toBe('offline');
    expect(device.relayState).toBe(false);
  });

  it('should auto-generate name if not provided', async () => {
    const device = await Device.create({
      userId: new mongoose.Types.ObjectId(),
      deviceId: 'abc12345',
    });
    
    expect(device.name).toBe('Device-abc12345');
  });

  it('should validate status enum', async () => {
    const device = new Device({
      userId: new mongoose.Types.ObjectId(),
      deviceId: 'test-device',
      status: 'invalid_status',
    });
    
    await expect(device.save()).rejects.toThrow();
  });
});
```

### WebSocket Tests

```javascript
// src/__tests__/ws/hub.test.js
import { WebSocketServer } from 'ws';

describe('WebSocket Hub', () => {
  let wss;
  let server;

  beforeAll((done) => {
    server = createServer();
    wss = new WebSocketServer({ server, path: '/ws' });
    server.listen(3001, done);
  });

  afterAll((done) => {
    wss.close();
    server.close(done);
  });

  it('should accept connections with valid token', (done) => {
    const ws = new WebSocket('ws://localhost:3001/ws', {
      headers: { Authorization: `Bearer valid-device-token` },
    });

    ws.on('open', () => {
      expect(ws.readyState).toBe(WebSocket.OPEN);
      ws.close();
      done();
    });
  });

  it('should reject connections without auth header', (done) => {
    const ws = new WebSocket('ws://localhost:3001/ws');

    ws.on('close', (code) => {
      expect(code).toBe(4001); // Unauthorized
      done();
    });
  });
});
```

### Frontend Component Tests

```typescript
// frontend/src/__tests__/components/RelayToggle.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import RelayToggle from '@/components/dashboard/relay-toggle';

describe('RelayToggle', () => {
  const defaultProps = {
    deviceId: 'test-device',
    currentState: false,
    isOnline: true,
    isConnected: true,
    onToggle: jest.fn(),
  };

  it('should render OFF state correctly', () => {
    render(<RelayToggle {...defaultProps} />);
    expect(screen.getByText('OFF')).toBeInTheDocument();
  });

  it('should render ON state correctly', () => {
    render(<RelayToggle {...defaultProps} currentState={true} />);
    expect(screen.getByText('ON')).toBeInTheDocument();
  });

  it('should call onToggle with new state on click', () => {
    const onToggle = jest.fn();
    render(<RelayToggle {...defaultProps} onToggle={onToggle} />);
    
    fireEvent.click(screen.getByRole('button'));
    
    expect(onToggle).toHaveBeenCalledWith('test-device', true);
  });

  it('should be disabled when offline', () => {
    render(<RelayToggle {...defaultProps} isOnline={false} />);
    
    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
  });
});
```

### Store Tests (Zustand)

```typescript
// frontend/src/__tests__/store/deviceStore.test.ts
import { renderHook, act } from '@testing-library/react';
import { useDeviceStore } from '@/store/deviceStore';

describe('deviceStore', () => {
  beforeEach(() => {
    // Reset store before each test
    useDeviceStore.setState({
      devices: [],
      wsStatus: 'disconnected',
    });
  });

  it('should initialize with empty devices', () => {
    const { result } = renderHook(() => useDeviceStore());
    expect(result.current.devices).toEqual([]);
  });

  it('should update device state', async () => {
    const { result } = renderHook(() => useDeviceStore());
    
    act(() => {
      result.current.updateDevice('device-1', { relayState: true });
    });
    
    expect(result.current.devices[0]?.relayState).toBe(true);
  });
});
```

---

## Testing Recommendations

### Immediate Needs

1. **Backend Route Tests** - Critical for auth and device endpoints
2. **JWT/Password Utility Tests** - Security-critical code
3. **Zod Validation Tests** - Ensure schemas work correctly

### Coverage Targets

| Component | Target |
|-----------|--------|
| Routes | 90% |
| Utilities | 100% |
| Models | 80% |
| WebSocket | 70% |
| Frontend | 60% |

### Testing Dependencies to Add

```bash
# Backend
npm install --save-dev supertest   # HTTP assertion
npm install --save-dev mongodb-memory-server  # In-memory DB for tests

# Frontend
npm install --save-dev @testing-library/react @testing-library/jest-dom
npm install --save-dev jest-environment-jsdom
```

### Mock Patterns

```javascript
// Mock MongoDB
jest.mock('../../db/connection.js', () => ({
  connectDB: jest.fn(),
  getDB: jest.fn(),
}));

// Mock WebSocket
jest.mock('../../ws/hub.js', () => ({
  attachWebSocketHub: jest.fn(),
  getRegistry: jest.fn(() => ({
    isConnected: jest.fn(),
    sendCommand: jest.fn(),
  })),
}));
```

---

## CI/CD Testing

**Current:** No CI configured.

### Recommended GitHub Actions

```yaml
# .github/workflows/test.yml
name: Test

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      mongodb:
        image: mongo:7
        ports:
          - 27017:27017
    
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: 'npm'
      
      - run: npm ci
      - run: npm test -- --coverage
      - uses: actions/upload-artifact@v4
        with:
          name: coverage
          path: coverage/
```

---

*Testing analysis: 2026-04-04*
