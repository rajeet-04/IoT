# Coding Conventions

**Analysis Date:** 2026-04-04

## Overview

The project uses **three separate codebases** with different conventions:
- **Backend**: Node.js with ES modules, Express, Mongoose
- **Firmware**: C++ (Arduino framework) for ESP32
- **Frontend**: TypeScript with Next.js, React, Zustand

---

## Backend Conventions (Node.js/Express)

**Location:** `src/`

### File Naming

- **Routes**: `*.routes.js` (e.g., `auth.routes.js`, `device.routes.js`)
- **Models**: PascalCase singular (e.g., `User.js`, `Device.js`, `Transaction.js`)
- **Middleware**: `*.middleware.js` (e.g., `auth.middleware.js`)
- **Utils**: camelCase (e.g., `password.js`, `jwt.js`, `deviceToken.js`)
- **WebSocket**: camelCase (e.g., `hub.js`, `connectionRegistry.js`, `messageRouter.js`)

### Indentation & Style

```javascript
// 2-space indentation
const result = something
  .chain()
  .here();
```

### Imports

- ES module imports (`import ... from ...`)
- Relative imports with `.js` extension
- Path structure: `../models/`, `./utils/`, `@/store/` (frontend)

### Function Patterns

```javascript
// Async route handlers with try/catch
router.post('/endpoint', async (req, res, next) => {
  try {
    const result = await doSomething(req.body);
    return res.status(200).json({ data: result });
  } catch (err) {
    next(err);
  }
});

// Validation with Zod
const schema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});
```

### Error Handling

- Use `next(err)` to pass errors to Express error handler
- Global error handler at end of `src/index.js`:
  ```javascript
  app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({ error: 'Internal server error' });
  });
  ```
- Return appropriate HTTP status codes (400, 401, 404, 500)

### Documentation (JSDoc)

```javascript
/**
 * Hash a plain text password using bcrypt.
 * @param {string} plainText - Password to hash
 * @returns {Promise<string>} Bcrypt hash
 */
export async function hashPassword(plainText) {
  return bcrypt.hash(plainText, SALT_ROUNDS);
}
```

### Logging

- Console logging with context prefixes
- Backend: `[WS Hub]`, `[WS Registry]`, `[WS Router]`
- Error logging with `console.error()`
- Warn logging with `console.warn()`

---

## Firmware Conventions (ESP32/C++)

**Location:** `firmware/src/`

### File Structure

- Header files: `*.h` (declarations, documentation)
- Implementation files: `*.cpp`
- Main entry: `main.cpp`

### Indentation & Style

```cpp
// 4-space indentation
void setup() {
    if (condition) {
        doSomething();
    }
}
```

### Naming

- Classes: PascalCase (e.g., `WebSocketClient`, `RelayController`)
- Member variables: `_camelCase` with underscore prefix (e.g., `_gpioPin`, `_state`)
- Methods: camelCase (e.g., `begin()`, `setState()`)
- Constants: `SCREAMING_SNAKE_CASE` (e.g., `SALT_ROUNDS`)

### Class Structure

```cpp
// Header (.h) with pragma once
#pragma once

#include <Arduino.h>
#include <ArduinoJson.h>

class RelayController {
public:
    RelayController(int gpioPin = 2);
    void begin();
    void setOn();
    void setOff();
    bool getState() const;

private:
    int _gpioPin;
    bool _state;
};
```

### Documentation

```cpp
/**
 * RelayController - ESP32 Relay Control Module
 * 
 * Controls SRD-05VDC-SL-C relay with safe boot state and state reporting.
 * Includes flyback diode protection wiring diagram.
 * 
 * Default Pin: GPIO 2 (D2)
 * 
 * Safety Notes:
 *   - ALWAYS use flyback diode with inductive loads (relays)
 *   - Use separate 5V supply capable of 1A+ for relay power
 */
```

### State Machine Pattern

```cpp
// Event-based state handling
void WebSocketClient::handleEvent(WStype_t type, uint8_t* payload, size_t length) {
    switch (type) {
        case WStype_CONNECTED:
            _connected = true;
            sendHeartbeat();
            break;
        case WStype_DISCONNECTED:
            _connected = false;
            break;
        // ...
    }
}
```

---

## Frontend Conventions (Next.js/TypeScript)

**Location:** `frontend/src/`

### File Naming

- **Pages**: `page.tsx` (e.g., `dashboard/page.tsx`)
- **Layouts**: `layout.tsx`
- **Components**: PascalCase (e.g., `DeviceCard.tsx`, `RelayToggle.tsx`)
- **Utilities**: camelCase (e.g., `auth.ts`, `api.ts`)
- **Stores**: camelCase (e.g., `deviceStore.ts`)

### Indentation & Style

```typescript
// 4-space indentation
const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
};
```

### TypeScript Patterns

```typescript
// Explicit interfaces
interface Device {
    id: string;
    deviceId: string;
    name: string;
    status: 'online' | 'offline';
    lastSeen: string | null;
    isConnected: boolean;
    relayState: boolean;
}

// Type exports in stores
export interface DeviceState {
    devices: Device[];
    wsStatus: 'connecting' | 'connected' | 'disconnected' | 'reconnecting';
}

// Zustand store with types
export const useDeviceStore = create<DeviceState & DeviceActions>((set, get) => ({
    // ...
}));
```

### Client Components

```typescript
'use client';

import { useState } from 'react';

export default function MyComponent() {
    // Client-side logic
}
```

### Import Organization

1. External packages (react, next)
2. Internal imports (lib, store, components)
3. Path aliases (`@/lib/`, `@/store/`, `@/components/`)

### Tailwind CSS

- Utility classes for styling
- Custom utilities in `globals.css`:
  ```css
  .input { @apply w-full rounded-lg ...; }
  .btn-primary { @apply w-full bg-gradient-to-r ...; }
  .glass-panel { @apply bg-white/5 backdrop-blur-xl ...; }
  ```

---

## Testing Conventions

**Status:** No test files currently exist in the codebase.

**Framework Configured:** Jest 29.7.0 (in `package.json`)

```json
"jest": {
  "testEnvironment": "node",
  "transform": {}
}
```

**Test Command:** `npm test` runs Jest with ES module support

---

## Cross-Cutting Conventions

### Git Workflow

- Use GSD commands (`/gsd:quick`, `/gsd:debug`, `/gsd:execute-phase`)
- Commit messages should be descriptive

### Environment Variables

- Use `.env` files (never commit actual values)
- Environment variables accessed via `process.env.*`

### Security

- Passwords hashed with bcrypt (12 salt rounds)
- JWT tokens with 15-minute expiry for access, 7-day for refresh
- httpOnly cookies for tokens
- CORS configured with credentials

---

*Convention analysis: 2026-04-04*
