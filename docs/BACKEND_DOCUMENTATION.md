# VSP-CMS Backend Documentation
## Node.js + Express + MongoDB

---

## Entry Point

### `server.js`
The root file that boots the entire application:
1. Loads `.env` variables via `dotenv`
2. Creates an HTTP server wrapping the Express app
3. Calls `connectDB()` → connects to MongoDB
4. Calls `initSocket(server)` → attaches Socket.IO to the HTTP server
5. Calls `initQueues()` → starts BullMQ workers
6. Starts listening on `PORT` (default 5000)
7. Registers `SIGTERM` handler for graceful shutdown (important in containers)

---

## `src/app.js`
The Express application factory:
- Applies all global middleware in order: Helmet → CORS → Rate limiter → Body parsers → Cookie parser → Mongo sanitize → XSS clean → HPP → Compression → Morgan logger
- Mounts all route modules under `/api/v1/`
- Has a `/health` check endpoint (used by Docker healthcheck and load balancers)
- Registers the 404 handler and global error handler last

---

## `src/config/`

### `database.js`
Connects to MongoDB using Mongoose. Sets up `error` and `disconnected` event listeners for logging. Calls `process.exit(1)` if the initial connection fails so the container restarts.

### `redis.js`
Creates a singleton `ioredis` client using the `getRedisClient()` factory. Uses a retry strategy (exponential backoff up to 2 seconds). Shared across Socket.IO adapter, BullMQ, and anywhere else Redis is needed — avoids creating multiple connections.

### `cloudinary.js`
Configures the Cloudinary v2 SDK with credentials from environment variables. This singleton is imported by `middleware/upload.js` and `modules/media/media.routes.js`.

### `constants.js`
Central source of truth for:
- `SLA_CONFIG` — hours deadline and department mapping per complaint category
- `ROLES` — the 4 role strings
- `COMPLAINT_STATUS` — all valid status values
- `DEPARTMENTS` — all valid department names
Used in models (for enum validation) and middleware (for role checks).

---

## `src/middleware/`

### `auth.js` — JWT Authentication
The `protect` middleware runs on every protected route:
1. Extracts token from `Authorization: Bearer <token>` header or `accessToken` cookie
2. Verifies the JWT signature with `JWT_ACCESS_SECRET`
3. Loads the user from MongoDB (checks they still exist and are active)
4. Checks if password was changed after the token was issued
5. Attaches `req.user` for downstream handlers

### `rbac.js` — Role-Based Access Control
Four exported functions:
- `restrictTo(...roles)` — Middleware factory. Returns a middleware that rejects the request if `req.user.role` isn't in the allowed list. Used like `router.patch('/status', restrictTo('supervisor', 'super_admin'), ...)`
- `supervisorGuard` — Injects `req.departmentFilter = { assignedDept: req.user.department }` for supervisors and dept_admins so their queries are automatically scoped
- `employeeGuard` — Injects `req.ownerFilter = { raisedBy: req.user._id }` so employees only see their own complaints
- `selfOrAdmin` — Allows users to access their own resources, or admin to access any

### `upload.js` — Photo Upload Handler
- Creates a `CloudinaryStorage` instance pointing to the `vizag-steel-cms/complaints` folder
- Configures Multer with: image-only file filter, 10MB size limit, max 5 files
- Exports `handlePhotoUpload` — a promisified version of the Multer middleware for use in async controllers
- Multer errors (file too large, too many files) are caught and converted to `AppError` instances

### `errorHandler.js` — Global Error Handler
The last middleware in `app.js`. Handles all errors passed via `next(err)`:
- Mongoose `CastError` → 400 (invalid ID format)
- MongoDB duplicate key `11000` → 400 with field name in message
- Mongoose `ValidationError` → 400 with all validation messages joined
- JWT `JsonWebTokenError` → 401
- JWT `TokenExpiredError` → 401
- Everything else: 500 in production (with stack trace in development)
Logs all 500+ errors via Winston.

---

## `src/modules/auth/`

### `user.model.js`
Mongoose schema for the `users` collection. Key design decisions:
- `employeeId` and `email` are unique indexes
- `password` has `select: false` — never returned in queries unless explicitly requested with `.select('+password')`
- `refreshTokens` is an embedded array: `[{ token, createdAt, expiresAt }]`. Expired tokens are pruned on every login.
- Pre-save hook hashes the password with bcrypt (cost 12) whenever `password` is modified
- `changedPasswordAfter(JWTTimestamp)` method checks if a password change after token issuance should invalidate it
- `toSafeObject()` strips sensitive fields before sending to client

### `auth.controller.js`
Six route handlers:
- **`register`** — Creates user, generates token pair, stores refresh token, sets cookies
- **`login`** — Verifies credentials, prunes expired refresh tokens, issues new pair, updates `lastLogin`
- **`refreshToken`** — Verifies refresh token, finds it in the user's stored array, rotates (remove old, add new), issues new access token
- **`logout`** — Removes the specific refresh token from the array (other sessions stay alive)
- **`getMe`** — Returns current user profile
- **`changePassword`** — Verifies current password, updates, re-issues tokens

### `auth.routes.js`
Mounts auth routes with the `authLimiter` (20 requests per 15 minutes) applied at the app level.

### `user.routes.js`
Admin user management:
- `GET /users` — Paginated list; dept_admin sees only their department; super_admin sees all
- `GET /users/:id` — Single user (self or admin)
- `PATCH /users/:id` — Update profile; only admins can change role/department
- `PATCH /users/:id/deactivate` — Soft-disable (super_admin only)

---

## `src/modules/complaints/`

### `complaint.model.js`
The most complex schema in the system:
- **`location`** — GeoJSON Point `{ type: "Point", coordinates: [lng, lat] }`. The `2dsphere` index enables `$near` and `$geoWithin` queries.
- **`photos[]`** — Array of `{ url, publicId, capturedAt }`. `publicId` is Cloudinary's identifier used for deletion.
- **`statusHistory[]`** — Append-only embedded array. Every status change pushes a new entry — creates a full timeline.
- **`slaDeadline`** — Computed in the pre-save hook from `SLA_CONFIG[category].hours`
- **Pre-save hook** — Auto-generates `complaintNumber` (format: `VSP-2024-00001`), sets `assignedDept` and `priority` from `SLA_CONFIG`, pushes the first status history entry
- **`timeElapsedHours`** — Virtual field, not stored in DB, computed on read

### `complaint.controller.js`
Seven handlers covering the full lifecycle:
- **`createComplaint`** — Calls `handlePhotoUpload` first, builds the complaint document, saves, schedules escalation, emits Socket.IO events to dept and admin rooms
- **`getAllComplaints`** — Role-scoped filtering: employees only see their own, supervisors see their dept, super_admin sees everything. Supports 8 query parameters.
- **`getComplaint`** — Access-controlled single complaint with full population chain
- **`updateComplaintStatus`** — Validates state machine transitions per role (`getAllowedTransitions` helper), appends to `statusHistory`, cancels escalation job if resolved, emits Socket.IO event, creates in-app notification
- **`assignComplaint`** — Supervisors can assign within dept; dept_admin/super_admin can reassign across depts; emits personal socket event to assignee
- **`submitFeedback`** — Validates ownership and that complaint is resolved; one-time submission
- **`getNearbyComplaints`** — `$near` geo-query, returns sorted by distance
- **`getHeatmapData`** — Returns all GPS coordinates with category/status for frontend map rendering

---

## `src/modules/notifications/`

### `notification.model.js`
Stores every notification with `channels` flags (inApp, email, sms, push) and `isRead`/`readAt` for inbox management.

### `notification.service.js`
The `createNotification` function is the single entry point used by all other modules:
1. Creates the `Notification` document
2. If `inApp`: emits via Socket.IO to `user:<recipientId>` room
3. If `email`: enqueues in the `email` BullMQ queue
4. If `sms`: enqueues in the `sms` BullMQ queue
5. If `push`: looks up user's `fcmToken`, enqueues in `push` queue

### `notification.routes.js`
- `GET /notifications` — Inbox with unread count and pagination
- `PATCH /notifications/read` — Mark specific IDs (or all) as read
- `DELETE /notifications/:id` — Remove a notification

---

## `src/modules/analytics/`

### `analytics.controller.js`
All queries use MongoDB Aggregation Pipeline:
- **`getDashboardSummary`** — 6 parallel `countDocuments` calls (Promise.all for performance)
- **`getComplaintsByDepartment`** — `$group` by `assignedDept`, counts total/pending/resolved/SLA-breached
- **`getComplaintsOverTime`** — `$group` by date string or week number; supports daily/weekly periods
- **`getResolutionTime`** — `$avg` of `(resolvedAt - createdAt)` in hours, grouped by department
- **`getCategoryBreakdown`** — Category counts with average resolution time
- **`getSlaReport`** — Breach rate per department: `breached / total * 100`
- **`getEmployeeStats`** — `$lookup` join from complaints to users to show top reporters

### `analytics.routes.js`
Also includes the **PDF report generator** inline:
- Fetches complaints for the requested month
- Builds a PDF using PDFKit: header, summary stats, per-complaint table
- Streams the PDF directly to the response (`doc.pipe(res)`)
- Creates an audit log entry for every report download

---

## `src/modules/audit/`

### `auditLog.model.js`
An **append-only** collection. The `pre('updateOne')` and `pre('updateMany')` hooks throw errors to prevent any modifications. Every action in the system calls `AuditLog.create(...)`. Fields: `action` (enum), `performedBy`, `targetComplaint`, `targetUser`, `details` (flexible Mixed type), `ipAddress`, `userAgent`.

### `audit.routes.js`
- `GET /audit/complaint/:id` — Timeline of all actions on a specific complaint
- `GET /audit` — System-wide log with filters by action type, user, date range

---

## `src/sockets/socketManager.js`

### `initSocket(server)`
1. Creates `Server` instance attached to the HTTP server
2. Attaches Redis adapter (pub/sub for multi-instance support)
3. Registers auth middleware: verifies JWT, loads user, attaches to `socket.user`
4. On connection: auto-joins `user:<id>`, `dept:<dept>`, and `admin:broadcast` rooms
5. Handles `join:complaint` / `leave:complaint` client events for per-complaint subscriptions

### `emitToRoom(room, event, data)` / `emitToUser(userId, event, data)`
Utility functions used by controllers and workers to emit events without importing Socket.IO directly.

---

## `src/jobs/`

### `queueManager.js`
Creates 4 BullMQ Queue instances (escalation, email, sms, push) with shared Redis connection and default retry options (3 attempts, exponential backoff). Then requires and starts all 4 workers.

### `escalationWorker.js`
- `scheduleEscalation(complaintId, dept, delayMs)` — Adds two delayed BullMQ jobs: Level 1 at `delayMs` (24h), Level 2 at `delayMs * 2` (48h)
- `cancelEscalation(complaintId)` — Removes both jobs by their deterministic `jobId` (`esc-l1-<id>`, `esc-l2-<id>`)
- Worker processor: checks if complaint is still unresolved → marks `status: escalated`, `slaBreached: true` → finds supervisors/super_admins → creates notifications for all of them

### `emailWorker.js`
Processes jobs from the `email` queue. Uses a template map (`complaintAssigned`, `escalation`, `statusUpdate`) to build HTML email bodies. NodeMailer sends via SMTP.

### `smsWorker.js`
Processes jobs from the `sms` queue. Uses Twilio client to send SMS to the user's phone number stored in MongoDB.

### `pushWorker.js`
Processes jobs from the `push` queue. Uses `firebase-admin.messaging()` to send FCM push to the device token. Skips silently if user has no `fcmToken`.

### `scheduler.js`
Two interval-based jobs (no external cron needed):
- **SLA checker** (every 30 min): Finds complaints approaching deadline (within 2 hours) → sends SLA_WARNING notifications to supervisors. Finds newly breached complaints → bulk updates `slaBreached: true` → emits socket event.
- **Archive job** (daily): Finds `status: closed` complaints older than 30 days → sets `isArchived: true`.

---

## `src/utils/`

### `logger.js`
Winston logger with 3 transports: colored console (dev only), daily rotating error log, daily rotating combined log. Log files are kept for 14–30 days and rotate at 20MB.

### `AppError.js`
Custom error class extending `Error`. Sets `isOperational: true` so the error handler knows it's a known/expected error (not a bug). Used throughout controllers: `return next(new AppError('Message', 404))`.

### `catchAsync.js`
Higher-order function that wraps async route handlers. Catches any rejected promise and passes it to Express's `next()`. Without this, unhandled promise rejections in async controllers would crash the process.

### `tokenUtils.js`
Six token-related utilities: `signAccessToken`, `signRefreshToken`, `verifyRefreshToken`, `setTokenCookies` (sets both tokens as httpOnly cookies with correct expiry), `clearTokenCookies`.

### `validators.js`
Joi validation schemas and a `validate(schema)` middleware factory. Schemas defined for: register, login, createComplaint, updateStatus, feedback.

---

## API Security Layers (in order)

```
Request
  ↓ Helmet (security headers)
  ↓ CORS check (origin whitelist)
  ↓ Rate limiter (global 200/15min, auth 20/15min)
  ↓ Body parser (JSON / multipart)
  ↓ Mongo sanitize (strip $ and . from inputs)
  ↓ XSS clean (sanitize HTML entities)
  ↓ HPP (remove duplicate query params)
  ↓ protect middleware (JWT verification)
  ↓ restrictTo / supervisorGuard (role check)
  ↓ Joi validate (schema validation)
  ↓ Controller (business logic)
  ↓ AppError / catchAsync (error handling)
  ↓ errorHandler (format and send response)
```
