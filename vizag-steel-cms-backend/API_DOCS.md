# Vizag Steel Plant CMS — Backend API Documentation

## Base URL
```
http://localhost:5000/api/v1
```

## Authentication
All protected routes require a Bearer token in the Authorization header:
```
Authorization: Bearer <accessToken>
```
Tokens are also set as httpOnly cookies automatically.

---

## 🔐 AUTH

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| POST | `/auth/register` | Public | Register new employee |
| POST | `/auth/login` | Public | Login, returns access + refresh tokens |
| POST | `/auth/refresh-token` | Public | Rotate refresh token |
| POST | `/auth/logout` | Protected | Invalidate tokens |
| GET | `/auth/me` | Protected | Get logged-in user profile |
| PATCH | `/auth/change-password` | Protected | Change own password |
| PATCH | `/auth/fcm-token` | Protected | Save Firebase push token |

### Register Body
```json
{
  "employeeId": "VSP001",
  "name": "Ravi Kumar",
  "email": "ravi@vizagsteel.com",
  "phone": "+919876543210",
  "password": "securePass123",
  "department": "Electrical",
  "designation": "Senior Engineer",
  "zone": "Zone-A"
}
```

---

## 📋 COMPLAINTS

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| POST | `/complaints` | Employee+ | Submit new complaint with photos |
| GET | `/complaints` | All | Get complaints (role-scoped) |
| GET | `/complaints/:id` | All | Get single complaint |
| PATCH | `/complaints/:id/status` | Supervisor+ | Update complaint status |
| PATCH | `/complaints/:id/assign` | Supervisor+ | Assign/reassign complaint |
| POST | `/complaints/:id/feedback` | Employee | Submit resolution feedback |
| GET | `/complaints/nearby` | All | Geo-query nearby complaints |
| GET | `/complaints/heatmap` | Supervisor+ | GPS coordinates for heatmap |

### Submit Complaint (multipart/form-data)
```
POST /complaints
Content-Type: multipart/form-data

Fields:
  title: "Electrical fault in Assembly Line 3"
  description: "Sparks coming from control panel since morning"
  category: "ELECTRICAL"
  longitude: 83.2185
  latitude: 17.6868
  address: "Assembly Block B, Building 4"
  zone: "Zone-B"
  building: "Assembly Block B"
  photos: [file1, file2]   (max 5 files, 10MB each)
```

### Status Update Body
```json
{
  "status": "in_progress",
  "remark": "Team dispatched to location",
  "assignedTo": "userId",
  "resolutionNote": "Panel repaired and tested"
}
```

### Valid Status Transitions by Role

| Role | Allowed Transitions |
|------|---------------------|
| Supervisor | pending→assigned, assigned→in_progress, in_progress→resolved, resolved→verified |
| Dept Admin | + verified→closed, escalated→assigned |
| Super Admin | Full control including escalation override |

### Complaint Query Parameters
```
GET /complaints?status=pending&category=ELECTRICAL&priority=high
                &assignedDept=Electrical&page=1&limit=20
                &sortBy=createdAt&order=desc
                &startDate=2024-01-01&endDate=2024-12-31
                &slaBreached=true
```

---

## 👥 USERS

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | `/users` | Admin+ | List all users (dept-scoped for dept_admin) |
| GET | `/users/:userId` | Self/Admin | Get user profile |
| PATCH | `/users/:userId` | Self/Admin | Update user |
| PATCH | `/users/:userId/deactivate` | Super Admin | Deactivate user |

---

## 📊 ANALYTICS

All analytics routes require `supervisor` role or above.

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/analytics/dashboard` | Summary stats (total, pending, resolved, etc.) |
| GET | `/analytics/by-department` | Breakdown per department |
| GET | `/analytics/over-time?period=daily&days=30` | Timeline chart data |
| GET | `/analytics/resolution-time` | Avg resolution time per dept |
| GET | `/analytics/categories` | Breakdown by category |
| GET | `/analytics/sla?startDate=&endDate=` | SLA breach rates |
| GET | `/analytics/employees` | Top reporters (admin only) |
| GET | `/analytics/report/pdf?month=1&year=2024` | Download PDF report |

---

## 🔔 NOTIFICATIONS

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/notifications?unreadOnly=true&page=1` | Get my notifications |
| PATCH | `/notifications/read` | Mark notifications as read |
| DELETE | `/notifications/:id` | Delete notification |

### Mark as Read Body
```json
{
  "ids": ["notificationId1", "notificationId2"]
}
```
Omit `ids` to mark ALL notifications as read.

---

## 🖼️ MEDIA

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| POST | `/media/complaint/:id/photos` | Owner/Admin | Add photos to complaint |
| DELETE | `/media/complaint/:id/photos/:publicId` | Admin | Remove a photo |

---

## 📝 AUDIT LOGS

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | `/audit/complaint/:complaintId` | Admin | Logs for a complaint |
| GET | `/audit?action=STATUS_CHANGED&userId=&page=1` | Admin | Query all logs |

---

## 🔌 WebSocket Events (Socket.IO)

### Connection
```javascript
const socket = io('http://localhost:5000', {
  auth: { token: 'your_access_token' }
});
```

### Client → Server Events
| Event | Payload | Description |
|-------|---------|-------------|
| `join:complaint` | `complaintId` | Subscribe to complaint updates |
| `leave:complaint` | `complaintId` | Unsubscribe |

### Server → Client Events
| Event | Payload | Description |
|-------|---------|-------------|
| `complaint:new` | `{complaintId, complaintNumber, title, category, priority, location}` | New complaint raised |
| `status:changed` | `{complaintId, complaintNumber, oldStatus, newStatus, updatedBy, updatedAt}` | Status updated |
| `complaint:assigned` | `{complaintId, complaintNumber}` | Assigned to you |
| `complaint:escalated` | `{complaintId, complaintNumber, level, department}` | Escalation alert |
| `notification:new` | `{id, title, body, type, relatedComplaint}` | New in-app notification |
| `sla:breached` | `{count, complaintIds}` | SLA breach alert (admin room) |
| `admin:online_count` | `{count}` | Active admin users |

### Rooms (auto-joined on connect)
- `user:<userId>` — Personal events
- `dept:<departmentName>` — Department-wide events  
- `admin:broadcast` — Admin-only broadcasts (supervisor+)
- `complaint:<id>` — Per-complaint live feed (join manually)

---

## 📁 Project Structure

```
vizag-steel-cms/
├── server.js                   # Entry point
├── src/
│   ├── app.js                  # Express setup, middleware, routes
│   ├── config/
│   │   ├── database.js         # MongoDB connection
│   │   ├── redis.js            # Redis client
│   │   ├── cloudinary.js       # File uploads
│   │   └── constants.js        # SLA config, roles, status enums
│   ├── middleware/
│   │   ├── auth.js             # JWT verify middleware
│   │   ├── rbac.js             # Role guards
│   │   ├── upload.js           # Multer + Cloudinary
│   │   └── errorHandler.js     # Global error handler
│   ├── modules/
│   │   ├── auth/               # Register, login, user model
│   │   ├── complaints/         # Core complaint CRUD + GPS
│   │   ├── media/              # Photo management
│   │   ├── notifications/      # In-app + push + email + SMS
│   │   ├── analytics/          # KPIs, charts, PDF reports
│   │   └── audit/              # Immutable event log
│   ├── jobs/
│   │   ├── queueManager.js     # BullMQ queue init
│   │   ├── escalationWorker.js # Auto-escalate unresolved
│   │   ├── emailWorker.js      # NodeMailer queue worker
│   │   ├── smsWorker.js        # Twilio queue worker
│   │   ├── pushWorker.js       # Firebase FCM worker
│   │   └── scheduler.js        # SLA checker + archiver cron
│   ├── sockets/
│   │   └── socketManager.js    # Socket.IO + Redis adapter
│   └── utils/
│       ├── logger.js           # Winston logger
│       ├── AppError.js         # Custom error class
│       ├── catchAsync.js       # Async error wrapper
│       ├── tokenUtils.js       # JWT helpers
│       └── validators.js       # Joi schemas
├── docker-compose.yml          # MongoDB + Redis local dev
├── Dockerfile                  # Production container
└── .env.example                # Environment variable template
```

---

## 🚀 Setup & Run

### 1. Install dependencies
```bash
npm install
```

### 2. Configure environment
```bash
cp .env.example .env
# Fill in your values
```

### 3. Start MongoDB + Redis (Docker)
```bash
docker-compose up -d
```

### 4. Start the server
```bash
# Development (auto-restart)
npm run dev

# Production
npm start
```

### 5. Test health
```bash
curl http://localhost:5000/health
```

---

## 🌐 Deployment (Render / Railway / EC2)

### Render.com (free tier available)
1. Push code to GitHub
2. New Web Service → connect repo
3. Build command: `npm install`
4. Start command: `node server.js`
5. Add all `.env` values in Environment tab
6. Use MongoDB Atlas (free tier) for cloud DB
7. Use Redis Cloud (free tier) or Upstash for Redis

### Environment variables for production
```
NODE_ENV=production
MONGO_URI=mongodb+srv://user:pass@cluster.mongodb.net/vizag-steel-cms
REDIS_HOST=your-redis-cloud-host
...
```
