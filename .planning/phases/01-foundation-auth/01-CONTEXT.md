# Phase 1: Foundation & Auth - Context

**Gathered:** 2026-03-31
**Status:** Ready for planning

<domain>
## Phase Boundary

This phase delivers the foundational infrastructure for the IoT Device Control Platform:
- MongoDB Atlas database setup with user and device collections
- Backend REST API with Express 5 handling user authentication (signup, login, logout, password reset)
- Device registration endpoint for ESP32 provisioning
- Backend deployment to Render with health checks and environment configuration

This phase does NOT include:
- WebSocket server (Phase 2)
- Frontend dashboard (Phase 3)
- Transaction logging (Phase 4)
- ESP32 firmware (Phase 2)

</domain>

<decisions>
## Implementation Decisions

### Authentication Strategy
- **D-01:** JWT-based auth with short-lived access tokens (15min) + refresh tokens (7 days)
- **D-02:** Tokens stored in httpOnly cookies to prevent XSS theft
- **D-03:** bcrypt for password hashing (industry standard, sufficient for v1 scale)
- **D-04:** Password reset via simple token endpoint with console logging for v1 (no email service integration yet)

### Device Registration
- **D-05:** Users generate device tokens from dashboard (Phase 3+) or API endpoint
- **D-06:** Manual provisioning flow: user copies token → flashes ESP32 → device validates on connect
- **D-07:** Device tokens are UUIDs stored in user's device array in MongoDB

### Database Design
- **D-08:** Mongoose ODM for schema validation and middleware hooks
- **D-09:** User schema: email (unique), passwordHash, createdAt, devices[]
- **D-10:** Device schema: userId (ref), deviceId (unique), name, status, lastSeen, createdAt
- **D-11:** Indexes on email (unique), deviceId (unique), userId for efficient queries

### Deployment
- **D-12:** Render Web Service with environment variables for MongoDB URI and JWT secret
- **D-13:** Health check endpoint at `/health` for Render monitoring
- **D-14:** Node.js 22 LTS runtime on Render

### the agent's Discretion
- Error response format and structure left to agent discretion
- Input validation library choice (zod recommended but not mandated)
- Logging strategy (console for v1, structured logging can be added later)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project Context
- `.planning/PROJECT.md` — Project vision, constraints, key decisions
- `.planning/REQUIREMENTS.md` — v1 requirements with REQ-IDs (AUTH-01..04, DEV-01, BE-05)
- `.planning/ROADMAP.md` — Phase 1 goals and success criteria

### Research
- `.planning/research/STACK.md` — Technology stack with versions and rationale
- `.planning/research/PITFALLS.md` — Critical pitfalls (security, deployment)
- `.planning/research/SUMMARY.md` — Research synthesis

### No external specs
No external specs — requirements fully captured in decisions above

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- No existing codebase — greenfield project

### Established Patterns
- No established patterns yet — this phase sets the foundation

### Integration Points
- MongoDB Atlas connection (external service)
- Render deployment target (external platform)
- Future WebSocket server will share this Express instance
- Future frontend will call these REST endpoints

</code_context>

<specifics>
## Specific Ideas

- Password reset email integration deferred to Phase 2+ (use token logging for v1)
- Device token generation should be simple UUID format
- All endpoints should return consistent JSON error format
- MongoDB Atlas free tier (M0) has 512MB limit — design schemas efficiently

</specifics>

<deferred>
## Deferred Ideas

- Email service integration for password reset (Phase 2+)
- OAuth login (Google, GitHub) — not needed for v1
- 2FA support — defer to Phase 4+
- Device QR code provisioning — defer to Phase 3+
- Multi-device management UI — Phase 3

None — discussion stayed within phase scope

</deferred>

---

*Phase: 01-foundation-auth*
*Context gathered: 2026-03-31*
