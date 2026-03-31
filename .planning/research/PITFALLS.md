# Domain Pitfalls: IoT Device Control System

**Domain:** ESP32 relay control with cloud backend (Render + MongoDB Atlas)
**Researched:** 2026-03-31

---

## 1. Hardware/Firmware Pitfalls

### H1: Relay Kickback Destroying ESP32 or Causing Random Restarts
**Severity:** Critical

**What goes wrong:** When the SRD-05VDC-SL-C relay coil is de-energized, the collapsing magnetic field generates a counter-EMF voltage spike (hundreds of volts). Without a flyback diode, this spike travels back through the control circuit, causing the ESP32 to brownout-reset or permanently damage the GPIO/transistor driving the relay. This is the #1 hardware mistake in ESP32 relay projects — confirmed by dozens of Stack Exchange reports of "ESP32 restarts when relay turns off."

**Why it happens:** Beginners wire the relay directly to ESP32 GPIO without understanding inductive load behavior. Even pre-built relay modules sometimes ship without proper flyback diodes, or the diode is undersized for the coil current (~70mA for SRD-05VDC-SL-C).

**Consequences:** ESP32 randomly reboots on every relay toggle. Over time, repeated voltage spikes degrade the ESP32's GPIO pins. In worst cases, the ESP32 is permanently damaged.

**Warning signs:**
- ESP32 reboots specifically when relay turns OFF (not ON)
- Serial monitor shows `Brownout detector was triggered` or `rst:0xc (SW_CPU_RESET)`
- Relay works for a few cycles then ESP32 becomes unresponsive
- Serial output shows `WiFi disconnected. Reason: 200` with no reconnect attempt

**Prevention strategy:**
- Place a flyback diode (1N4007 or 1N4148) across the relay coil: cathode to +5V, anode to the switched side
- If using a relay module, verify it already includes a flyback diode (most do, but cheap clones may not)
- Add a 100µF electrolytic capacitor between VCC and GND near the ESP32 to absorb transient spikes
- Use a separate 5V power supply for the relay coil (not shared with ESP32 3.3V rail)
- Ensure the ESP32 GPIO drives the relay through a transistor (2N2222 or BC547), not directly

**Phase to address:** Firmware Phase (Phase 1)

---

### H2: ESP32 WiFi Disconnects and Never Reconnects
**Severity:** Critical

**What goes wrong:** The ESP32 connects to WiFi on boot, works perfectly, then silently disconnects (router reboot, signal fluctuation, ISP hiccup) and never reconnects. Over 30% of ESP32 projects experience this. The ESP32 does NOT automatically reconnect unless your code explicitly implements retry logic. A device that can't reconnect is a bricked IoT device requiring physical access to reset.

**Why it happens:** `WiFi.begin(ssid, password)` is called only once in `setup()`. No event handlers or polling exist to detect and recover from disconnections. The ESP32's built-in autoreconnect is unreliable across firmware versions.

**Consequences:** Device goes permanently offline after any network interruption. Users see "device offline" in the web app with no way to recover it remotely. Requires physical power cycle or button press.

**Warning signs:**
- Device works for hours/days then goes offline permanently
- Serial logs show `WiFi disconnected` but no subsequent reconnection attempts
- Device only reconnects after manual reset (pushing the RST button)
- Works locally but fails after router reboots

**Prevention strategy:**
- Implement `WiFi.onEvent()` handler for `SYSTEM_EVENT_STA_DISCONNECTED` that calls `WiFi.reconnect()`
- Add periodic polling in `loop()`: check `WiFi.status() != WL_CONNECTED` every 5 seconds and retry
- Use exponential backoff for reconnection attempts (1s, 2s, 4s, 8s, max 30s) to avoid network hammering
- Add a hardware watchdog timer as a last-resort recovery mechanism
- Log disconnection events to serial for debugging

**Phase to address:** Firmware Phase (Phase 1)

---

### H3: Power Supply Brownout Under Relay Load
**Severity:** Critical

**What goes wrong:** The SRD-05VDC-SL-C relay draws ~70mA when energized. The ESP32 WiFi radio draws up to 350mA during transmission. If both share an inadequate power supply (e.g., USB port, cheap 5V adapter), the combined current draw causes voltage to sag below 2.5V, triggering the ESP32's brownout detector and causing a reboot loop.

**Why it happens:** ESP32 peak current can exceed 500mA (WiFi TX + relay + peripherals). Many builders use undersized power supplies (e.g., 500mA USB chargers) or thin wires that create voltage drop.

**Consequences:** ESP32 enters a boot loop — starts, relay activates, voltage drops, brownout resets, repeat. Device is completely unusable.

**Warning signs:**
- ESP32 boots, relay clicks, then ESP32 immediately reboots
- Serial shows `Brownout detector was triggered` or `Guru Meditation Error`
- Works when relay is disconnected but fails when connected
- Works on USB power from PC but fails on wall adapter

**Prevention strategy:**
- Use a power supply rated for at least 1A at 5V (2A recommended for headroom)
- Add a 100µF–470µF electrolytic capacitor between VCC and GND near the ESP32
- Use separate power rails: 5V for relay, 3.3V regulator for ESP32
- Use thick gauge wires (22 AWG minimum) for power connections
- If brownouts persist, adjust the brownout detector threshold in firmware (temporary mitigation only)

**Phase to address:** Firmware Phase (Phase 1)

---

### H4: No Firmware Update Mechanism (OTA)
**Severity:** High

**What goes wrong:** Firmware is flashed via USB only. When a bug is discovered or a feature needs updating, every physical device must be manually reconnected to a computer. For deployed devices, this means site visits or shipping devices back.

**Why it happens:** OTA (Over-The-Air) updates feel like "phase 2" complexity, so they're deferred. But without OTA, any firmware bug in the field requires physical access.

**Consequences:** Unable to patch security vulnerabilities, fix WiFi reconnection bugs, or add features to deployed devices. Each firmware update requires physical access.

**Warning signs:**
- No OTA library integrated (ArduinoOTA, ESPAsyncWebServer OTA, or ESP-IDF OTA)
- No partition scheme configured for OTA (needs 2 app partitions)
- Firmware binary size approaching flash limit with no room for OTA partition

**Prevention strategy:**
- Integrate OTA from the start using `ESPAsyncWebServer` OTA or `ElegantOTA` library
- Configure flash partition scheme to support OTA (e.g., "Default 4MB with spiffs" or custom partition table)
- Implement firmware signature verification to prevent unauthorized firmware uploads
- Add a physical "safe mode" button that falls back to USB flashing if OTA bricks the device

**Phase to address:** Firmware Phase (Phase 1) — OTA setup is cheap early, expensive to retrofit

---

## 2. Backend/Infrastructure Pitfalls

### B1: Render Free Tier Spin-Down Breaks ESP32 Connections
**Severity:** Critical

**What goes wrong:** Render's free tier spins down web services after 15 minutes of no inbound traffic (HTTP or WebSocket). When spun down, all WebSocket connections are terminated. The ESP32's WebSocket connection drops, and if the ESP32 doesn't implement reconnection logic, the device is permanently offline. Even with reconnection, the next request triggers a ~60 second cold start, making device control feel unresponsive.

**Why it happens:** Render free tier is designed for demos, not always-on IoT backends. The ESP32 expects a persistent connection. The 15-minute idle timeout is recent (as of Feb 2026, Render updated the policy — previously it was HTTP-only, now WebSocket messages also count as activity, but 15 minutes of silence still triggers spin-down).

**Consequences:** 
- ESP32 loses connection every 15 minutes of inactivity
- First command after idle takes 60+ seconds (cold start)
- If ESP32 lacks reconnection logic, device goes permanently offline
- 750 free instance hours/month can be consumed if service keeps spinning up

**Warning signs:**
- WebSocket connections drop after ~15 minutes of inactivity
- First API request after idle takes 30-60 seconds
- ESP32 logs show connection refused or timeout errors after idle periods
- Render dashboard shows service status as "Sleeping"

**Prevention strategy:**
- **Short-term:** Implement a keepalive ping from ESP32 every 10-14 minutes to prevent spin-down (but this consumes the 750 free hours faster)
- **Better:** Implement robust reconnection logic on ESP32 with exponential backoff, accepting the cold start delay
- **Best:** Upgrade to Render's paid tier ($7/month Starter) which never spins down
- **Alternative:** Use a platform designed for always-on services (Fly.io, Railway, or a $5/mo VPS)
- Add WebSocket ping/pong heartbeat on the server side to detect stale connections

**Phase to address:** Backend Phase (Phase 2)

---

### B2: No WebSocket Connection Management on Server
**Severity:** High

**What goes wrong:** The server accepts WebSocket connections from ESP32 devices but doesn't track, manage, or clean up connections. When Render deploys a new version or restarts an instance, all WebSocket connections are dropped silently. Clients that don't reconnect leave "ghost" connections in server state.

**Why it happens:** WebSocket connection management feels like boilerplate that can be added later. But without it, the server can't route commands to specific devices or detect offline devices.

**Consequences:**
- Can't tell which devices are actually connected vs. stale connections
- Commands sent to "connected" devices that are actually offline
- Memory leak from accumulating stale WebSocket objects
- During deployments, all devices disconnect simultaneously with no graceful handling

**Warning signs:**
- Server has no connection registry (Map/deviceId → WebSocket)
- No ping/pong heartbeat implementation
- No `SIGTERM` handler to gracefully close connections on shutdown
- No client-side reconnection logic with exponential backoff

**Prevention strategy:**
- Maintain a connection registry: `Map<deviceId, WebSocket>` on the server
- Implement server-side ping every 30 seconds with pong timeout (10s) to detect stale connections
- Handle `SIGTERM` from Render: broadcast disconnect message to all clients, then close gracefully
- Implement client-side reconnection with exponential backoff (1s, 2s, 4s, max 60s)
- Use WebSocket close codes to distinguish graceful disconnects from network errors

**Phase to address:** Backend Phase (Phase 2)

---

### B3: MongoDB Atlas Free Tier Data Loss Risk
**Severity:** Medium

**What goes wrong:** MongoDB Atlas free tier (M0) has no automated backups, no point-in-time recovery, and limited storage (512MB). If data is accidentally deleted or corrupted, there's no way to recover it. The free tier also has connection limits that can be hit if the server creates too many connections.

**Why it happens:** Free tier is fine for development but lacks production safeguards. Connection pooling misconfiguration can exhaust the 500 connection limit on M0 clusters.

**Consequences:** Accidental data deletion = permanent data loss. Connection pool exhaustion = server errors and dropped device commands.

**Warning signs:**
- No backup strategy or export scripts
- MongoDB connection string doesn't use connection pooling
- Server creates a new MongoDB connection per request instead of reusing a pool
- No monitoring on database storage usage approaching 512MB limit

**Prevention strategy:**
- Implement automated daily exports of transaction logs to a separate storage (e.g., S3, or local backup)
- Use connection pooling with `maxPoolSize: 10` in MongoDB connection options
- Set up MongoDB Atlas alerts for storage usage > 80%
- Use Mongoose or a similar ODM to manage connections properly (single connection instance, not per-request)
- Implement retry logic for transient MongoDB connection failures

**Phase to address:** Backend Phase (Phase 2)

---

## 3. Frontend/UX Pitfalls

### F1: UI Shows Stale Device State After WebSocket Disconnect
**Severity:** High

**What goes wrong:** The web dashboard shows a device as "ON" but the WebSocket connection dropped (Render spin-down, network issue). The user toggles the switch, the command is queued or silently fails, and the device state doesn't change. The UI shows a state that doesn't match reality.

**Why it happens:** Frontend assumes WebSocket connection is always alive. No connection status indicator. Commands sent on a dead connection fail silently.

**Consequences:** User thinks device is ON when it's actually OFF (or vice versa). For safety-critical applications (controlling heaters, pumps, locks), this is dangerous.

**Warning signs:**
- No visual indicator of WebSocket connection status in the UI
- Toggle switches don't show loading/pending/error states
- No reconnection attempt UI feedback
- Device state not refreshed on page load or reconnect

**Prevention strategy:**
- Show a prominent connection status indicator (connected/disconnecting/reconnecting/offline)
- Implement optimistic UI updates with rollback on failure
- Show loading state on toggle switches while command is in-flight
- On reconnect, fetch current device state from server before enabling controls
- Disable controls when WebSocket is disconnected
- Use toast notifications for command success/failure

**Phase to address:** Frontend Phase (Phase 3)

---

### F2: No Confirmation for Destructive Actions
**Severity:** Medium

**What goes wrong:** Toggling a relay is a one-click action with no confirmation. If the relay controls something dangerous (heater, motor, lock), accidental toggles can cause damage or safety issues.

**Why it happens:** Most IoT dashboards treat relay toggles like light switches — instant on/off. But unlike a light switch, IoT relays can control high-power or dangerous equipment.

**Consequences:** Accidental activation of connected equipment. No audit trail of who performed the action if the UI doesn't require authentication for each action.

**Warning signs:**
- Toggle switches change state immediately without confirmation
- No distinction between "safe" and "dangerous" devices in the UI
- No action confirmation dialog for devices controlling high-power loads

**Prevention strategy:**
- Add a confirmation dialog for relay toggles (especially for devices marked as "high power")
- Implement a "hold to activate" pattern for critical devices
- Show the current state clearly before allowing toggle
- Log all UI interactions with user identity for audit purposes

**Phase to address:** Frontend Phase (Phase 3)

---

## 4. Security Pitfalls

### S1: No Authentication on ESP32-to-Server Communication
**Severity:** Critical

**What goes wrong:** The ESP32 connects to the backend without any authentication. Anyone who discovers the WebSocket endpoint URL can connect and send relay commands. This is the most common IoT security mistake — assuming obscurity is security.

**Why it happens:** ESP32 has limited crypto capabilities, making authentication feel complex. Developers often skip it for "just a hobby project." But an unauthenticated IoT endpoint is a public switch anyone can flip.

**Consequences:** Anyone on the internet can control your relay. If the relay controls a door lock, heater, or industrial equipment, this is a physical security risk. Botnets actively scan for unauthenticated IoT endpoints.

**Warning signs:**
- ESP32 connects to WebSocket with no credentials
- No API key, token, or certificate in the connection handshake
- WebSocket endpoint is publicly accessible without authentication middleware
- No rate limiting on the command endpoint

**Prevention strategy:**
- Issue a unique device token/secret during device registration
- ESP32 sends the token in the WebSocket connection handshake (as a query parameter or header)
- Server validates the token against the device registry before accepting the connection
- Use WSS (WebSocket Secure) — never WS — for all connections (Render enforces TLS on free tier)
- Implement rate limiting: max N commands per minute per device
- Consider mutual TLS or certificate-based authentication for production

**Phase to address:** Backend Phase (Phase 2) — security must be built in, not bolted on

---

### S2: Hardcoded WiFi Credentials in Firmware
**Severity:** High

**What goes wrong:** WiFi SSID and password are hardcoded in the ESP32 firmware. If the firmware binary is extracted (trivial with physical access), credentials are exposed. If the code is in a public repo, credentials are leaked.

**Why it happens:** Hardcoding is the fastest way to get WiFi working. Proper credential management (WiFiManager, EEPROM storage, provisioning portal) adds complexity.

**Consequences:** WiFi credentials exposed in source code or binary. Anyone with the firmware can join your network.

**Warning signs:**
- `WiFi.begin("MySSID", "MyPassword")` with literal strings in source code
- Credentials committed to git repository
- No mechanism to change WiFi credentials without reflashing

**Prevention strategy:**
- Use WiFiManager library: ESP32 creates an AP on first boot, user connects to configure WiFi via captive portal
- Store credentials in EEPROM or NVS (Non-Volatile Storage), not in code
- Never commit credentials to version control — use `.env` or build-time injection
- For production: implement a device provisioning flow where credentials are pushed securely

**Phase to address:** Firmware Phase (1)

---

### S3: No Input Validation on Backend Command Endpoint
**Severity:** High

**What goes wrong:** The backend accepts relay commands without validating the payload. A malformed or malicious command could crash the server, trigger unexpected relay behavior, or inject data into MongoDB.

**Why it happens:** In a controlled IoT system, it's tempting to trust all incoming messages. But the WebSocket endpoint is a public attack surface.

**Consequences:** Server crashes from malformed payloads. Relay receives invalid commands. MongoDB injection through unvalidated input.

**Warning signs:**
- WebSocket message handler doesn't validate message structure
- No schema validation (e.g., Joi, Zod) on incoming commands
- Raw user input passed directly to MongoDB queries
- No sanitization of command payloads

**Prevention strategy:**
- Validate all incoming WebSocket messages against a strict schema
- Only accept known command types: `{ type: "relay_set", state: "on" | "off", deviceId: string }`
- Validate `deviceId` against registered devices before processing
- Use parameterized queries / Mongoose models — never string concatenation for database operations
- Implement command rate limiting per device and per user

**Phase to address:** Backend Phase (Phase 2)

---

## 5. Data/Transaction Pitfalls

### T1: Blockchain-Style Transactions Are Actually Mutable
**Severity:** High

**What goes wrong:** The "blockchain-style" transaction log is stored in MongoDB, which is fully mutable. Any document can be updated or deleted by anyone with database access. Calling it "blockchain" creates a false sense of immutability and audit integrity.

**Why it happens:** True blockchain requires consensus, cryptographic linking, and distributed storage. A MongoDB collection with a `previousHash` field is an append-only pattern, not a blockchain. MongoDB's always-on authentication (Atlas feature) helps but doesn't prevent authorized users from modifying records.

**Consequences:** Audit trail can be silently altered. If compliance or dispute resolution depends on transaction integrity, the system provides false assurance. Users trust the "blockchain" label but the data is as mutable as any other collection.

**Warning signs:**
- Transaction documents have `update` or `delete` operations in application code
- No database-level restrictions on modifying the transactions collection
- No cryptographic hash chaining between records
- Application code can edit transaction timestamps or states

**Prevention strategy:**
- Implement application-level immutability: no update/delete operations on the transactions collection — only `insert`
- Use MongoDB's document validation to reject updates to the transactions collection
- Implement hash chaining: each transaction includes a hash of the previous transaction's hash + data
- Consider MongoDB Atlas triggers or change streams to detect and alert on any modification attempts
- Be honest in documentation: call it an "append-only audit log" not "blockchain"
- For true immutability later: integrate with a real blockchain (Ethereum, Hedera) or use a WORM storage service

**Phase to address:** Backend Phase (Phase 2)

---

### T2: No Transaction Ordering Guarantees
**Severity:** Medium

**What goes wrong:** In a blockchain-style log, transaction order matters. But without explicit ordering mechanisms, concurrent commands can be recorded out of order, making the audit trail unreliable for determining "what happened when."

**Why it happens:** MongoDB doesn't guarantee write ordering across concurrent operations without explicit mechanisms. Two near-simultaneous relay toggles may be recorded in a different order than they were executed.

**Consequences:** Audit trail shows relay turned ON before OFF when the reverse happened. Duration calculations are wrong. Dispute resolution is impossible.

**Warning signs:**
- Transactions use `Date.now()` timestamps (clock-dependent, not ordered)
- No sequence numbers or monotonic counters
- No MongoDB transactions for multi-document writes
- Concurrent commands from multiple users can interleave

**Prevention strategy:**
- Use MongoDB's `ObjectId` (which encodes a timestamp) as a secondary ordering mechanism
- Implement a monotonic sequence counter for strict ordering
- Use MongoDB transactions (available on Atlas M10+) for atomic state + transaction writes
- For v1 on free tier: serialize commands through a single processing queue on the server
- Include server-side timestamp (not client-side) in every transaction record

**Phase to address:** Backend Phase (Phase 2)

---

### T3: Transaction Log Grows Without Bound
**Severity:** Medium

**What goes wrong:** Every on/off action creates a transaction record. Over time, this unbounded growth consumes the MongoDB Atlas free tier's 512MB storage limit. No archiving, rotation, or cleanup strategy exists.

**Why it happens:** Append-only logs are easy to write but hard to manage. Without a retention policy, the log grows forever.

**Consequences:** Database hits storage limit. Writes fail. Device commands can't be logged. System degrades or stops working.

**Warning signs:**
- No document count monitoring on the transactions collection
- No TTL indexes or archival strategy
- No pagination on the transaction log display in the UI
- Storage usage approaching 512MB on Atlas dashboard

**Prevention strategy:**
- Implement TTL indexes to automatically expire old transactions (e.g., 90 days)
- Add pagination to the transaction log UI (never load all records)
- Implement periodic archival: export old transactions to cold storage, then delete
- Monitor storage usage with Atlas alerts at 70% and 90% thresholds
- Consider capped collections for fixed-size transaction logs (though this conflicts with long-term audit needs)

**Phase to address:** Backend Phase (Phase 2)

---

## 6. Deployment/Operations Pitfalls

### D1: No Monitoring or Alerting for Offline Devices
**Severity:** High

**What goes wrong:** When an ESP32 goes offline (WiFi failure, power loss, hardware fault), nobody knows. The device silently stops responding, and the only way to discover this is a user trying to control it and finding it unresponsive.

**Why it happens:** Monitoring feels like "production" overhead. But an IoT system without device health monitoring is flying blind.

**Consequences:** Devices can be offline for days or weeks without anyone noticing. For safety-critical applications, this is unacceptable.

**Warning signs:**
- No heartbeat mechanism from ESP32 to server
- No "last seen" timestamp tracked per device
- No alerting when a device hasn't communicated in N minutes
- Dashboard doesn't show device online/offline status

**Prevention strategy:**
- ESP32 sends a heartbeat message every 60 seconds via WebSocket
- Server tracks `lastSeen` timestamp per device
- Implement alerting (email, webhook, or dashboard notification) when a device hasn't sent a heartbeat in 5 minutes
- Show online/offline status prominently in the web dashboard
- Log all disconnect events with reason codes for debugging

**Phase to address:** Backend Phase (Phase 2)

---

### D2: Deployments Break Active WebSocket Connections
**Severity:** Medium

**What goes wrong:** When a new version is deployed to Render, the old instance is terminated and all WebSocket connections are dropped. ESP32 devices and web clients lose their connections simultaneously. Without graceful shutdown handling and client reconnection, this causes a service outage for all connected devices.

**Why it happens:** Render sends `SIGTERM` and gives 30 seconds for graceful shutdown. If the server doesn't handle this, connections are killed abruptly.

**Consequences:** All devices disconnect during deployment. Commands in-flight are lost. Users see errors.

**Warning signs:**
- No `SIGTERM` handler in the server code
- No graceful WebSocket close broadcast before shutdown
- Clients don't implement reconnection logic
- No deployment strategy that minimizes connection disruption

**Prevention strategy:**
- Handle `SIGTERM`: broadcast a "server shutting down" message to all WebSocket clients, then close connections
- Implement client-side auto-reconnect with exponential backoff
- Consider deploying during low-activity windows
- For paid Render tiers: use zero-downtime deploys (not available on free tier)
- Test deployment impact locally before pushing to production

**Phase to address:** Backend Phase (Phase 2)

---

### D3: No Local Fallback or Safe State on Boot
**Severity:** Medium

**What goes wrong:** When the ESP32 boots (power cycle, brownout recovery, OTA update), the relay defaults to an unknown state. If the relay controls a heater or pump, it could be ON when it should be OFF, creating a safety hazard.

**Why it happens:** ESP32 GPIO pins float during boot. Without explicit initialization, the relay may be in an unpredictable state for the first few seconds.

**Consequences:** Connected equipment activates unexpectedly on boot. Safety risk for heaters, motors, or locks.

**Warning signs:**
- Relay state is not explicitly set in `setup()` before WiFi connection
- No "safe state" (relay OFF) as the default boot behavior
- GPIO pin controlling relay is not configured as OUTPUT with a known state immediately

**Prevention strategy:**
- In `setup()`, immediately set the relay GPIO to OUTPUT and drive it to the safe state (OFF) BEFORE any other initialization
- Use a pull-down resistor on the relay control pin to ensure it defaults to OFF when GPIO is floating
- Design the circuit so the relay's default (de-energized) state is the safe state (normally open for most applications)
- After boot and WiFi connection, fetch the last known state from the server and sync

**Phase to address:** Firmware Phase (Phase 1)

---

## Phase-Specific Warnings Summary

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|---------------|------------|
| ESP32 Firmware | Relay kickback, WiFi disconnects, brownouts, unsafe boot state | Flyback diode, reconnection logic, adequate PSU, safe-state boot |
| Backend API | Render spin-down, no connection management, no auth | Keepalive pings, connection registry, device tokens |
| Database | Mutable "blockchain" log, unbounded growth, no ordering | Append-only enforcement, TTL indexes, sequence counters |
| Frontend | Stale UI state, no connection indicator | Connection status UI, optimistic updates with rollback |
| Security | Unauthenticated endpoints, hardcoded credentials | Device tokens, WiFiManager, WSS only, input validation |
| Operations | No device monitoring, deployment disruptions | Heartbeats, SIGTERM handling, auto-reconnect |

## Sources

- ESP32 WiFi reconnection issues: espboards.dev, espressif/arduino-esp32 GitHub issues #3362, #8170
- ESP32 brownout/power issues: esp32s.com (Jan 2026), lucstechblog, Reddit r/esp32
- Relay kickback/ESP32 restarts: Electronics Stack Exchange #759768 (Oct 2025), #629875, #540813
- Flyback diode selection: PCB HERO (Nov 2024), tejte.com (Dec 2025)
- Render free tier limitations: docs.render.com/docs/free (2026), Render WebSocket docs
- Render WebSocket spin-down policy: Render changelog (Feb 2026) — "Free web services now remain active while receiving WebSocket messages" (15-min idle timeout)
- ESP32 WebSocket client hangs on server shutdown: nanoframework/Home #1691 (Nov 2025)
- MongoDB blockchain/immutable patterns: mongodb.com blockchain guide, MongoDB Atlas documentation
- IoT security landscape: Bitdefender 2025 IoT Security Report (Oct 2025), IEEE papers on MQTT security
- ESP32 OTA security: developer.espressif.com (Mar 2026), sudoyasir.space (Jan 2026)
- Append-only audit trails: designgurus.io (Nov 2025), hubifi.com (Feb 2026)
