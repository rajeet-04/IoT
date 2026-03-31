# ⚠️ User Setup Required — Plan 01-04: Render Deployment

This plan requires external service setup before deployment can be verified.

---

## 1. MongoDB Atlas (Required First)

| Item | Detail |
|------|--------|
| Purpose | Database for user accounts and device registry |
| Cost | Free (M0 tier, 512MB) |
| Status | ⬜ Incomplete |

### Steps

- [ ] Go to https://cloud.mongodb.com → Database → Deploy → Free (M0)
- [ ] Choose a cloud provider and region close to you
- [ ] Create cluster named `iot-control` (or any name)
- [ ] **Create Database User**: Database Access → Add New Database User
  - Role: **readWrite** on any database
  - Note the username and password
- [ ] **Whitelist Network Access**: Network Access → Add IP Address → `0.0.0.0/0` (allow all, for Render)
- [ ] **Get Connection String**: Connect → Connect your application
  - Driver: Node.js, Version: 5.5 or later
  - Copy the connection string

### Environment Variable

```
MONGODB_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/iot-control?retryWrites=true&w=majority
```

---

## 2. Generate JWT Secrets

Run these commands locally to generate secure random secrets:

```bash
# JWT_SECRET
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# JWT_REFRESH_SECRET (run again for a different value)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## 3. Render Web Service (After MongoDB is Ready)

| Item | Detail |
|------|--------|
| Purpose | Backend hosting with WebSocket support |
| Cost | Free tier |
| Status | ⬜ Incomplete |

### Steps

- [ ] Go to https://dashboard.render.com → New + → Web Service
- [ ] Connect your GitHub repository containing this code
- [ ] Render will auto-detect `render.yaml`
  - If not: manually set Build Command `npm ci --omit=dev`, Start Command `node src/index.js`
- [ ] **Add Environment Variables** (Environment tab):

| Variable | Value |
|----------|-------|
| `MONGODB_URI` | Your MongoDB Atlas connection string (from step 1) |
| `JWT_SECRET` | Random 64-char hex string (from step 2) |
| `JWT_REFRESH_SECRET` | Different random 64-char hex string (from step 2) |
| `NODE_ENV` | `production` |
| `FRONTEND_URL` | Leave empty for now (set when frontend is deployed) |

- [ ] Click **Create Web Service** and wait for build to complete
- [ ] Check deploy logs for `MongoDB connected` and `Server running on port 3000`

---

## 4. Verify Deployment

Once deployed, run these verification commands (replace URL with your Render URL):

```bash
# Health check
curl https://your-app.onrender.com/health
# Expected: {"status":"ok","uptime":...,"timestamp":"...","version":"1.0.0"}

# Signup test
curl -X POST https://your-app.onrender.com/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"securepass123"}' \
  -c cookies.txt -v
# Expected: HTTP 201, user object, Set-Cookie headers

# Login test
curl -X POST https://your-app.onrender.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"securepass123"}' \
  -b cookies.txt -c cookies.txt
# Expected: HTTP 200, user object
```

- [ ] All endpoints respond correctly
- [ ] MongoDB Atlas shows new documents in `users` collection
- [ ] Record your Render URL in `.planning/STATE.md` for future phases

---

## After Completion

Tell me **"approved"** if all endpoints respond correctly, or describe any issues for troubleshooting.
