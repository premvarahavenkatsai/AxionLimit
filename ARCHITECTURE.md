# AxionLimit — Full Project Architecture

> Plain English. No jargon. Every file explained. Every connection shown.

---

## What Is This Project?

AxionLimit is a **rate limiting service**.

Think of it like a security guard at a door. You tell the guard:
> "Allow max 100 people per minute through this door."

The guard counts. When 100 is hit, the next person gets turned away.

AxionLimit does this for API requests — not people.

---

## The 2 Big Pieces

```
AxionLimit/
│
├── Backend/    ← The security guard (brain of the system - REST API service)
└── Frontend/   ← The control panel (dashboard & documentation in browser)
```

---

## THE BACKEND — How It Works

### Folder Structure
```
Backend/
├── server.js           ← Entry point. Starts everything.
├── config/
│   ├── db.js           ← Connects to MongoDB and Redis
│   └── passport.js     ← Sets up Google Login
├── models/
│   ├── User.js         ← What a user looks like in MongoDB
│   └── ApiKey.js       ← What an API key looks like in MongoDB
├── routes/
│   ├── auth.js         ← Login/logout endpoints
│   ├── apiKeys.js      ← Create/delete API key endpoints
│   └── rateLimit.js    ← The main rate check + analytics endpoints
├── middleware/
│   └── auth.js         ← Guards that protect endpoints
└── services/
    ├── rateLimiter.js  ← The actual counting logic (Redis Lua script)
    └── telemetry.js    ← Records stats (who used what, how many blocked)
```

---

### server.js — The Starting Point

**What it does:**
- This is the first file that runs when you do `npm run dev`
- It creates the Express app
- It connects to the databases (MongoDB + Redis)
- It registers all the routes
- It starts listening on port 5000

**Think of it as:** The main switch that turns everything on.

---

### config/db.js — The Database Connector

**What it does:**
- Connects to **MongoDB** (stores users and API keys permanently)
- Connects to **Redis** (stores rate limit counts and analytics temporarily)
- Exports a function `getRedisClient()` so other files can use Redis

**Think of it as:** The extension cord that plugs into both databases.

**MongoDB** = hard drive (permanent storage)
**Redis** = RAM (super fast, temporary)

---

### models/User.js and models/ApiKey.js — Database Blueprints

**What they do:**
- Define what shape data is stored in MongoDB
- `User.js` says: "A user has a name, email, and Google ID"
- `ApiKey.js` says: "An API key has a key string, belongs to a user, and has a rate limit (e.g. 100 requests per 60 seconds)"

**Think of them as:** Form templates that MongoDB fills in.

---

### routes/auth.js — Login System


**Endpoints it creates:**
- `GET /auth/google` → Redirect user to Google login page
- `GET /auth/google/callback` → Google sends user back here after login → creates JWT token → sends to frontend
- `GET /auth/me` → "Who am I?" — returns logged-in user info


**Think of it as:** The front door of the building (you must log in to enter).

---

### routes/apiKeys.js — API Key Management

**Endpoints it creates:**
- `GET /api/keys` → List all your API keys
- `POST /api/keys` → Create a new API key (with a name, limit, and window)
- `DELETE /api/keys/:id` → Delete/revoke a key

**Daily limit:** You can create max 3 keys per day (tracked in Redis).

**Think of it as:** The key cabinet where you manage your access cards.

---

### routes/rateLimit.js — The Core Endpoint (Most Important)

**Endpoints it creates:**

**1. `GET /api/check-limit`** — This is the main one
- A developer (via their backend middleware) calls this with their API key in the header
- It runs the rate limiter check
- Returns `200 OK` if allowed, `429 Too Many Requests` if blocked
- Also logs the result to telemetry (who called, which endpoint, allowed or blocked)

**2. `GET /api/analytics/stats`** — Dashboard uses this
- Returns: total requests, allowed count, blocked count, top users, top endpoints

**3. `POST /api/analytics/reset`** — Dashboard "Reset Stats" button
- Wipes all analytics counters in Redis back to zero

---

### middleware/auth.js — The Guards

**Two guards:**

**`verifyJWT`** — Protects dashboard routes
- Reads the `Authorization: Bearer <token>` header
- Verifies the JWT token is valid
- If valid → lets request through. If not → returns 401 Unauthorized
- Used on: analytics routes, API key management routes

**`verifyApiKey`** — Protects the rate limit check route
- Reads the `x-api-key` header
- Checks Redis cache first (fast), then MongoDB (fallback)
- If key is valid and active → attaches key info to the request
- If invalid → returns 401 Unauthorized
- Used on: `/api/check-limit`

---

### services/rateLimiter.js — The Counting Brain

**What it does:**
This is the most technically interesting file. It runs a **Sliding Window algorithm** in Redis.

**How the algorithm works (simple version):**

Imagine a sliding 60-second window moving through time.

Every time a request comes in:
1. Delete all timestamps older than 60 seconds from Redis
2. Count how many timestamps remain
3. If count < limit → allow the request, add current timestamp
4. If count >= limit → block the request, tell them how long to wait

**Why Redis?** Because counting must happen in milliseconds and must be accurate even when 1000 requests come in simultaneously.

**Why Lua script?** The check (steps 1-4) must happen atomically — all at once, uninterruptable. A Lua script in Redis runs as one single operation, preventing race conditions.

**Think of it as:** A stamp machine that stamps each request with a timestamp, and only allows up to N stamps in any sliding 60-second window.

---

### services/telemetry.js — The Analytics Logger

**What it does:**
- Every time `/api/check-limit` is called, this records the result in Redis
- It tracks: total requests, allowed count, blocked count, top API key users, top endpoints
- Uses Redis **pipelines** (sends multiple commands in one trip) for speed
- Runs **fire-and-forget** — doesn't wait for it to finish (won't slow down the main response)

**What it stores in Redis:**
```
telemetry:total_requests    → counter (e.g. 1500)
telemetry:allowed_requests  → counter (e.g. 1200)
telemetry:blocked_requests  → counter (e.g. 300)
telemetry:top_users         → sorted set (key_name → request count)
telemetry:top_endpoints     → sorted set (/api/weather → request count)
```

**Think of it as:** A silent notepad that records everything happening, shown on the dashboard.

---

## THE FRONTEND — The Control Panel

### Folder Structure
```
Frontend/src/
├── main.jsx          ← Entry point, renders the React app
├── App.jsx           ← Router — decides which page to show
├── api/
│   └── client.js     ← All API calls to the backend (axios)
├── context/
│   ├── AuthContext.jsx   ← Stores "are you logged in?" globally
│   └── ThemeContext.jsx  ← Stores "dark or light mode?" globally
├── components/
│   ├── Navbar.jsx        ← Top navigation bar
│   ├── Toast.jsx         ← Pop-up notifications
│   └── ProtectedRoute.jsx← Redirects to login if not logged in
└── pages/
    ├── LoginPage.jsx     ← Google login button
    ├── DashboardPage.jsx ← Charts, stats, API key management
    └── SandboxPage.jsx   ← Test your API keys manually
```

---

### api/client.js — The Frontend's Phone to the Backend

**What it does:**
- Creates an axios instance with `baseURL: '/'`
- Automatically attaches the JWT token from localStorage to every request
- Exports named functions for every backend call:

```
getApiKeys()          → GET    /api/keys
createApiKey(data)    → POST   /api/keys
deleteApiKey(id)      → DELETE /api/keys/:id
getStats()            → GET    /api/analytics/stats
resetStats()          → POST   /api/analytics/reset
checkRateLimit(key)   → POST   /api/check-limit  (with x-api-key header)
```

**Think of it as:** A phone book. Instead of writing raw HTTP calls everywhere, all pages import from here.

---

### DashboardPage.jsx — The Main Dashboard

**What it shows:**
- Stat cards: Total, Allowed, Blocked, Block Rate
- Line chart: Allowed vs Blocked over time (auto-polls every 4 seconds)
- Top Endpoints leaderboard (which endpoints are called most)
- Top API Key Users leaderboard (which keys are used most)
- API Keys panel: list all keys, create new ones, revoke them

**How it gets data:**
- Calls `getStats()` every 4 seconds → updates charts live
- Calls `getApiKeys()` on load → shows your keys

---

### SandboxPage.jsx — The Testing Ground

**What it does:**
- Lets you pick one of your API keys
- Type an endpoint name (e.g. `/api/weather`)
- Click "Fire Request" → calls `/api/check-limit` → shows if allowed or blocked
- "Auto-Fire" button → fires every 600ms automatically to trigger rate limiting
- Shows request history (timestamp, allowed/blocked)

**Think of it as:** A test gun that lets you fire requests at your own rate limiter and see what happens.

---

## THE FULL FLOW — A Request End-to-End

### Scenario: Developer's app protects an API endpoint, a user hits their API

```
User's browser
    |
    |  GET /api/weather  (to Developer's app on port 4000)
    v
Developer's Express / FastAPI / Gin / Spring Boot App
    |
    |  Developer's HTTP Middleware intercepts request
    |
    v
AxionLimit Backend (port 5000) — GET /api/check-limit (headers: x-api-key, x-user-id)
    |
    |-- verifyApiKey middleware runs
    |     |-- Check Redis cache for this key's config  (fast path)
    |     +-- Cache miss? Check MongoDB → then cache it in Redis
    |
    |-- rateLimiter.isAllowed() runs
    |     |-- Construct key: rate_limit:<apiKeyHash>:<userId> (or rate_limit:<apiKeyHash> if global)
    |     |-- Run Lua script in Redis atomically
    |     |-- Delete timestamps older than the window
    |     |-- Count remaining timestamps
    |     +-- Under limit? Add timestamp → return allowed
    |         Over limit?  return blocked + retryAfter seconds
    |
    |-- telemetry.logAnalytics() fires (background, no waiting)
    |     +-- Increments counters in Redis for the dashboard
    |
    +-- Returns: { allowed: true,  remaining: 45 }
             OR: { allowed: false, retryAfter: 3 }
    |
    v
Developer Middleware receives response
    |-- 200 → calls next() / continues → /api/weather handler runs → user gets data  [ALLOWED]
    +-- 429 → returns { error: 'Too Many Requests' } to user                         [BLOCKED]
```

---

## THE TWO DATABASES — What Each Stores

### MongoDB (Permanent Storage)
```
users collection:
  { _id, googleId, name, email }

apikeys collection:
  { _id, key: "ax_abc123", userId, name: "My Key",
    rateLimit: { limit: 100, windowMs: 60000 }, isActive: true }
```

### Redis (Fast Temporary Storage)
```
apikey:ax_abc123           → cached API key metadata   (expires in 1 hour)
rate_limit:ax_abc123       → sorted set of request timestamps (sliding window)
telemetry:total_requests   → number counter (e.g. 1500)
telemetry:allowed_requests → number counter (e.g. 1200)
telemetry:blocked_requests → number counter (e.g. 300)
telemetry:top_users        → sorted set  (key_name → score/count)
telemetry:top_endpoints    → sorted set  (endpoint → score/count)
apikey_limit:userId:date   → daily key creation counter (expires in 24h)
```

---

## HOW AUTHENTICATION WORKS

```
1. You click "Login with Google" on the frontend
2. You're redirected to Google's login page
3. Google verifies you and sends you back to /auth/google/callback
4. Backend creates a JWT token (a signed string that proves who you are)
5. Frontend saves this token in localStorage
6. Every request from frontend includes this token in the Authorization header
7. verifyJWT middleware reads and validates it on protected routes
```

---

## SUMMARY TABLE

| File | Plain English Purpose |
|------|-----------------------|
| `server.js` | Starts the app, connects databases, registers all routes |
| `config/db.js` | Connects to MongoDB and Redis |
| `config/passport.js` | Sets up Google OAuth login |
| `models/User.js` | User shape in MongoDB |
| `models/ApiKey.js` | API key shape in MongoDB |
| `routes/auth.js` | Login, callback, "who am I" |
| `routes/apiKeys.js` | Create, list, delete API keys |
| `routes/rateLimit.js` | Check rate limit, get stats, reset stats |
| `middleware/auth.js` | JWT guard + API key guard |
| `services/rateLimiter.js` | Sliding window Lua script — the actual counting |
| `services/telemetry.js` | Record and fetch analytics stats |
| `api/client.js` | Frontend's collection of all backend calls |
| `DashboardPage.jsx` | Shows charts, stats, manages API keys |
| `SandboxPage.jsx` | Test API keys manually |
