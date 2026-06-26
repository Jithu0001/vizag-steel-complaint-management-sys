# Vizag Steel Plant — Complaint Management System
## Complete Application Documentation

---

## 1. Project Overview

The **Vizag Steel Plant Complaint Management System (VSP-CMS)** is a full-stack web application that digitizes and streamlines how plant employees report maintenance issues, safety hazards, and operational complaints. It replaces paper-based reporting with a real-time digital workflow — from complaint submission with photo evidence and GPS location, through department assignment, to resolution tracking and analytics.

### Core Goals
- **Speed** — Complaints reach the right department instantly via auto-routing
- **Accountability** — Every action is logged in an immutable audit trail
- **Transparency** — Employees track their complaints in real time via live status updates
- **Intelligence** — Analytics dashboards and heatmaps identify problem hotspots across the plant

---

## 2. Technology Stack

### Backend
| Technology | Version | Purpose |
|-----------|---------|---------|
| **Node.js** | 20.x | JavaScript runtime for the server |
| **Express.js** | 4.18 | HTTP web framework — handles routes, middleware |
| **MongoDB** | 7.0 | Primary database — stores users, complaints, logs |
| **Mongoose** | 7.6 | ODM (Object Document Mapper) — schema and query layer |
| **Socket.IO** | 4.6 | WebSocket server — real-time events |
| **Redis** | 7.2 | In-memory store — Socket.IO adapter, BullMQ queue |
| **BullMQ** | 4.x | Job queue — delayed escalations, email/SMS/push workers |
| **JWT** | 9.x | JSON Web Tokens — stateless authentication |
| **bcryptjs** | 2.x | Password hashing — bcrypt algorithm |
| **Cloudinary** | 1.x | Cloud image storage — stores complaint photos |
| **Multer** | 1.x | Multipart form parser — handles file uploads |
| **NodeMailer** | 6.x | Email delivery — SMTP-based notifications |
| **Twilio** | 4.x | SMS delivery — escalation alerts to phones |
| **Firebase Admin** | 11.x | Firebase Cloud Messaging (FCM) — push notifications |
| **PDFKit** | 0.14 | PDF generation — monthly complaint reports |
| **Winston** | 3.x | Structured logging — daily rotating log files |
| **Joi** | 17.x | Request validation — schema-based input checks |
| **Helmet** | 7.x | HTTP security headers |
| **express-rate-limit** | 7.x | API rate limiting — prevent abuse |

### Frontend
| Technology | Version | Purpose |
|-----------|---------|---------|
| **React** | 18.2 | UI component framework |
| **React Router v6** | 6.20 | Client-side routing |
| **React Query** | 3.39 | Server state management, caching, background refetch |
| **Axios** | 1.6 | HTTP client — API requests with interceptors |
| **Socket.IO Client** | 4.6 | WebSocket client — subscribes to live events |
| **React Hook Form** | 7.49 | Form state and validation |
| **Yup** | 1.3 | Schema validation for forms |
| **Recharts** | 2.10 | Charting library — analytics dashboards |
| **Leaflet / React Leaflet** | 1.9 / 4.2 | Interactive maps — GPS heatmap visualization |
| **React Dropzone** | 14.2 | Drag-and-drop photo upload UI |
| **React Toastify** | 9.1 | Toast notification popups |
| **date-fns** | 3.0 | Date formatting and manipulation |
| **lucide-react** | 0.294 | Icon library |
| **clsx** | 2.0 | Conditional class name utility |
| **Firebase** | 10.7 | FCM push notification client |

### Infrastructure
| Tool | Purpose |
|------|---------|
| **Docker / Docker Compose** | Local development — MongoDB + Redis containers |
| **Cloudinary** | Cloud CDN for complaint photo storage |
| **MongoDB Atlas** | Production cloud database |
| **Redis Cloud / Upstash** | Production Redis (queues + Socket.IO adapter) |
| **Render / Railway** | Production server deployment |

---

## 3. Technology Deep Dives

### 3.1 MongoDB — Why and How
MongoDB is a NoSQL document database. Unlike SQL tables with fixed columns, MongoDB stores data as flexible JSON-like documents. This suits VSP-CMS because:
- Complaints have variable structures (some have photos, some don't; location sub-documents vary)
- The `statusHistory` is an embedded array that grows over time
- **2dsphere index** on the `location` field enables geo-queries like "find all complaints within 500m"

**Key MongoDB patterns used:**
- Embedded documents: `statusHistory[]`, `photos[]` inside the Complaint document
- References: `raisedBy: ObjectId` pointing to User collection
- Aggregation pipelines: for analytics (group by department, compute averages)
- Compound indexes: `{ status: 1, assignedDept: 1 }` for fast dashboard queries

### 3.2 Socket.IO — Real-Time Layer
Socket.IO wraps WebSockets (with HTTP long-polling fallback). When a supervisor updates a complaint status, the backend emits an event to a named **room**. Every connected client in that room receives the update instantly — no polling needed.

**Room architecture:**
```
complaint:<id>    → All viewers of that complaint (employee + assignee)
dept:<name>       → All Electrical/Safety/Civil/etc. staff
admin:broadcast   → All supervisor+ users
user:<id>         → Personal events (notifications, assignments)
```

**Redis adapter:** In production with multiple server instances, Socket.IO events must be shared across instances. The Redis adapter uses Redis pub/sub so a message emitted on Server A reaches clients connected to Server B.

### 3.3 BullMQ — Job Queues
BullMQ is a queue built on Redis. It handles work that should happen asynchronously or after a delay:

- **Escalation queue:** When a complaint is submitted, a delayed job is scheduled for 24 hours later. If the complaint is still unresolved when the job fires, it auto-escalates. BullMQ retries failed jobs with exponential backoff.
- **Email queue:** Sends NodeMailer emails without blocking the HTTP response
- **SMS queue:** Sends Twilio SMS without blocking the HTTP response
- **Push queue:** Sends Firebase FCM push notifications

### 3.4 Cloudinary — Photo Storage
When an employee uploads complaint photos, Multer parses the `multipart/form-data` request, and `multer-storage-cloudinary` pipes each file directly to Cloudinary's cloud storage. Cloudinary:
- Stores the original image
- Applies transformations (resize to max 1920×1080, compress quality)
- Returns a CDN URL that's stored in the Complaint's `photos[]` array
- Enables deletion via `public_id` when admins remove photos

### 3.5 Firebase FCM — Push Notifications
Firebase Cloud Messaging delivers push notifications to mobile browsers and native apps. The flow:
1. Employee logs in → frontend requests notification permission → Firebase generates a device token
2. Frontend POSTs the token to `PATCH /auth/fcm-token` → stored on User document
3. Backend sends push via `firebase-admin.messaging().send({ token, ... })`
4. Device shows a native OS notification even when the browser is closed

### 3.6 JWT + Refresh Token Rotation
The app uses two tokens:
- **Access token** (15 min): short-lived, attached to every API request
- **Refresh token** (7 days): stored in an `httpOnly` cookie, used only to get new access tokens

When the access token expires, the Axios interceptor automatically calls `/auth/refresh-token`, gets a new pair, and retries the original request transparently. **Refresh token rotation** means each refresh invalidates the old token and issues a new one — if an old refresh token is used, it signals a theft attempt.

### 3.7 GPS / Geolocation
- **Browser:** `navigator.geolocation.getCurrentPosition()` returns `{ latitude, longitude }` from the device's GPS/WiFi
- **Backend:** Stored as GeoJSON `{ type: "Point", coordinates: [longitude, latitude] }` with a `2dsphere` index
- **Geo query:** `$near` operator finds complaints sorted by distance; `$geoWithin` finds all within a radius
- **Map:** Leaflet renders an interactive dark-themed map; complaint markers are color-coded by priority

---

## 4. User Roles

| Role | Permissions |
|------|------------|
| **Employee** | Raise complaints, view own complaints, track status, submit feedback |
| **Supervisor** | View department complaints, assign to team members, update status to `in_progress` / `resolved` / `verified`, receive escalation alerts |
| **Department Admin** | All supervisor permissions + close complaints, view dept analytics, manage team users, generate reports |
| **Super Admin** | Full system access — all departments, user management, system-wide analytics, PDF reports, audit log |

---

## 5. Data Flow — Complaint Lifecycle

```
Employee submits → Photos → Cloudinary CDN
                → GPS → MongoDB 2dsphere index
                → Complaint doc created (status: pending)
                → Auto-routed to department by category
                → BullMQ: escalation job scheduled (24h)
                → Socket.IO: dept room notified
                ↓
Supervisor assigns → status: assigned
                  → Notification to assignee (in-app + email + push)
                  → Socket.IO: complaint room updated
                  ↓
Work done → status: in_progress → resolved
          → BullMQ: escalation job cancelled
          → SLA deadline checked → slaBreached flagged if overdue
          ↓
Supervisor verifies → status: verified
Admin closes → status: closed
            → Employee notified → Feedback requested
            → 30 days later → Auto-archived
```

---

## 6. Security Measures

| Layer | Measure |
|-------|---------|
| Passwords | bcrypt hash (cost factor 12) |
| Tokens | JWT with short expiry + httpOnly cookie refresh |
| API | Rate limiting (200 req/15min global, 20 req/15min auth) |
| Input | Joi validation + mongo-sanitize (NoSQL injection) + xss-clean (XSS) + hpp (param pollution) |
| Headers | Helmet (X-Frame-Options, CSP, HSTS, etc.) |
| CORS | Restricted to frontend origin |
| Role gates | Middleware checks role on every protected route |
| Audit | Immutable log of every sensitive action |
| Files | Type check (images only) + size limit (10MB) + Cloudinary scanning |

---

## 7. Project Structure

```
vizag-steel-cms/          ← Backend (Node.js)
├── server.js             ← Entry point
├── src/
│   ├── app.js            ← Express setup
│   ├── config/           ← DB, Redis, Cloudinary, constants
│   ├── middleware/        ← auth, RBAC, upload, errorHandler
│   ├── modules/          ← Feature modules (auth, complaints, etc.)
│   ├── jobs/             ← BullMQ workers
│   ├── sockets/          ← Socket.IO manager
│   └── utils/            ← logger, AppError, validators
└── docker-compose.yml    ← Local MongoDB + Redis

vizag-steel-frontend/     ← Frontend (React)
├── src/
│   ├── App.jsx           ← Root with routes
│   ├── context/          ← AuthContext, NotificationContext
│   ├── services/         ← API client, socket client
│   ├── components/       ← Reusable UI components
│   ├── pages/            ← Page-level components per role
│   ├── hooks/            ← Custom React hooks
│   ├── utils/            ← Helpers, constants
│   └── styles/           ← Global CSS design tokens
└── public/               ← index.html (with Leaflet CDN)
```
