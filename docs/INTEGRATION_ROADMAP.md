# VSP-CMS Integration Roadmap
## Step-by-Step Guide: Connecting Frontend to Backend

---

## Overview

This roadmap walks you through every integration step in order — from local setup to production deployment. Follow it sequentially; each phase depends on the previous.

---

## Phase 1 — Local Environment Setup

### Step 1.1 — Start Backend Infrastructure

```bash
# Clone / unzip the backend
cd vizag-steel-cms

# Install dependencies
npm install

# Copy environment file
cp .env.example .env
```

Edit `.env` with these minimum values for local development:
```env
PORT=5000
NODE_ENV=development
MONGO_URI=mongodb://admin:password123@localhost:27017/vizag-steel-cms?authSource=admin
JWT_ACCESS_SECRET=local_dev_access_secret_min_32_chars_here
JWT_REFRESH_SECRET=local_dev_refresh_secret_min_32_chars_here
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=redispassword
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

Start MongoDB and Redis via Docker:
```bash
docker-compose up -d
```

Verify containers:
```bash
docker ps
# Should show: vizag-mongodb (27017) and vizag-redis (6379)
```

Start the backend:
```bash
npm run dev
```

Verify it works:
```bash
curl http://localhost:5000/health
# Expected: {"success":true,"message":"Vizag Steel CMS API is running",...}
```

---

### Step 1.2 — Set Up Cloudinary (Required for photo uploads)

1. Go to [cloudinary.com](https://cloudinary.com) → Sign up free
2. Dashboard → copy `Cloud Name`, `API Key`, `API Secret`
3. Paste into `.env` (backend) as `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`
4. Restart backend

Test: `POST /api/v1/auth/register` then `POST /api/v1/complaints` with a photo — check Cloudinary Media Library for the uploaded image.

---

### Step 1.3 — Start Frontend

```bash
cd vizag-steel-frontend

# Install dependencies
npm install

# Copy environment file
cp .env.example .env
```

Edit frontend `.env`:
```env
REACT_APP_API_URL=http://localhost:5000/api/v1
REACT_APP_SOCKET_URL=http://localhost:5000
```

Start the React dev server:
```bash
npm start
# Opens http://localhost:3000
```

---

## Phase 2 — Auth Integration Verification

### Step 2.1 — Test Registration

1. Navigate to `http://localhost:3000/register`
2. Fill in: Employee ID `VSP001`, Name, Email, Password, Department
3. Click "Create Account"

**Expected:** Redirect to `/login` with success toast.

**If it fails:**
- Open browser DevTools → Network tab
- Find the `POST /auth/register` request
- Check if it hits `localhost:5000` (not 3000)
- If 404: verify backend is running and `REACT_APP_API_URL` is set correctly
- If CORS error: check backend `.env` has `FRONTEND_URL=http://localhost:3000`

---

### Step 2.2 — Test Login + Token Storage

1. Navigate to `http://localhost:3000/login`
2. Enter credentials and log in

**Expected:** Redirect to `/dashboard`. Open DevTools → Application → Local Storage → `localhost:3000` → should see `accessToken` key.

**Also verify cookies:** DevTools → Application → Cookies → `localhost:3000` → should see `accessToken` and `refreshToken` (both `HttpOnly`).

---

### Step 2.3 — Test Token Refresh

To simulate an expired access token:
1. DevTools → Application → Local Storage → delete `accessToken`
2. Set a fake value: `localStorage.setItem('accessToken', 'fake_expired_token')`
3. Navigate to `/complaints`
4. Open Network tab — watch for `POST /auth/refresh-token` followed by a retry of the failed request

**Expected:** The app silently refreshes and loads the page without redirecting to login.

---

## Phase 3 — Complaint Module Integration

### Step 3.1 — Create First Admin User

The first user must be created manually with super_admin role. Use a REST client (Postman, Thunder Client, curl):

```bash
curl -X POST http://localhost:5000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "employeeId": "ADMIN001",
    "name": "System Admin",
    "email": "admin@vizagsteel.com",
    "phone": "+919876543210",
    "password": "Admin@1234",
    "department": "General",
    "role": "super_admin"
  }'
```

Note: The `role` field in register is only used if no user is logged in — the first registration gets `employee` by default. To fix this temporarily, comment out the role restriction in `auth.controller.js`:
```js
// const assignedRole = role && req.user?.role === 'super_admin' ? role : 'employee';
const assignedRole = role || 'employee'; // Temporary: remove after creating admin
```

After creating your first super_admin, restore the line.

Alternatively, update directly in MongoDB:
```bash
# Connect to MongoDB shell
docker exec -it vizag-mongodb mongosh -u admin -p password123

use vizag-steel-cms
db.users.updateOne(
  { email: "admin@vizagsteel.com" },
  { $set: { role: "super_admin" } }
)
```

---

### Step 3.2 — Test Complaint Submission with GPS + Photo

1. Login as an employee
2. Navigate to `http://localhost:3000/complaints/new`
3. Fill in title, description, select category
4. Click "Capture Current Location" — browser will ask for permission
5. Upload 1–2 photos via drag-and-drop
6. Click "Submit Complaint"

**Expected:** Success toast, redirect to `/complaints`, new complaint in list.

**Verify in MongoDB:**
```bash
docker exec -it vizag-mongodb mongosh -u admin -p password123 --eval "
  use vizag-steel-cms;
  db.complaints.findOne({}, { title:1, location:1, photos:1, complaintNumber:1 })
"
```

**If GPS fails:** The browser requires HTTPS or localhost for geolocation. Development on `localhost` works fine. If testing on a real device with HTTP, geolocation will be blocked — you'd need HTTPS (see Phase 6).

**If photos aren't uploading:** Check Cloudinary credentials in backend `.env`. Check browser Network tab for the `POST /complaints` request — look at the response body.

---

### Step 3.3 — Test Real-Time Status Updates

1. Open two browser windows (or one incognito)
2. Window 1: Login as **supervisor** or admin
3. Window 2: Login as an **employee** who has a complaint
4. Window 2: Open the complaint detail page
5. Window 1: Go to the same complaint, click "Update Status", change to "in_progress"

**Expected in Window 2:** Status badge updates automatically and a toast appears — without refreshing the page.

**If real-time doesn't work:**
- Check backend logs for `Socket.IO initialized`
- Check browser console for `[Socket] Connected: <socketId>`
- Verify `REACT_APP_SOCKET_URL=http://localhost:5000` in frontend `.env`
- If Redis is unavailable, Socket.IO still works with in-memory adapter (single server only)

---

## Phase 4 — Notification System Integration

### Step 4.1 — Test In-App Notifications

After assigning a complaint:
1. Login as supervisor → assign complaint to an employee
2. While logged in as the employee in another window:

**Expected:** Bell icon gets a red dot, notification dropdown shows the assignment notification, a toast pops up.

**Verify notification in DB:**
```bash
db.notifications.find({ recipient: ObjectId("employee_id_here") })
```

---

### Step 4.2 — Set Up Email Notifications (Optional for dev)

For local email testing, use [Mailtrap](https://mailtrap.io) (free):
1. Sign up → Inboxes → SMTP Settings
2. Copy host, port, username, password into backend `.env`:
   ```env
   SMTP_HOST=smtp.mailtrap.io
   SMTP_PORT=587
   SMTP_USER=your_mailtrap_user
   SMTP_PASS=your_mailtrap_pass
   EMAIL_FROM=cms@vizagsteel.com
   ```
3. Restart backend
4. Assign a complaint → check Mailtrap inbox for email

---

### Step 4.3 — Set Up Firebase Push (Optional)

1. Go to [Firebase Console](https://console.firebase.google.com) → Create project
2. Project Settings → Service Accounts → Generate new private key → download JSON
3. Add to backend `.env`:
   ```env
   FIREBASE_PROJECT_ID=your-project-id
   FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
   FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxx@your-project.iam.gserviceaccount.com
   ```
4. In Firebase Console → Project Settings → General → Web App → copy config
5. Add to frontend `.env`:
   ```env
   REACT_APP_FIREBASE_API_KEY=AIza...
   REACT_APP_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
   REACT_APP_FIREBASE_PROJECT_ID=your-project-id
   REACT_APP_FIREBASE_MESSAGING_SENDER_ID=1234567890
   REACT_APP_FIREBASE_APP_ID=1:...:web:...
   REACT_APP_FIREBASE_VAPID_KEY=BH...
   ```
6. Restart both frontend and backend

---

## Phase 5 — Analytics Integration

### Step 5.1 — Verify Analytics Endpoints

Login as super_admin, navigate to `/dashboard`. Charts should load.

If charts are empty:
- You need data. Create 10+ complaints with different categories and update their statuses.
- Check browser Network tab for `GET /analytics/dashboard` — verify it returns data.

### Step 5.2 — Test PDF Report Download

1. Login as super_admin
2. Go to `/dashboard` → click "Download Report"
3. A PDF should download named `VSP-Report-YYYY-MM.pdf`

If it fails: Check that `pdfkit` is installed (`npm list pdfkit` in backend). Check backend logs for errors.

---

## Phase 6 — Production Deployment

### Step 6.1 — Deploy MongoDB to Atlas (Free Tier)

1. Go to [mongodb.com/atlas](https://www.mongodb.com/atlas) → Create free cluster
2. Database Access → Add Database User (username + password)
3. Network Access → Add IP Address → Allow from Anywhere (0.0.0.0/0)
4. Connect → Connect your application → copy the connection string:
   ```
   mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/vizag-steel-cms?retryWrites=true&w=majority
   ```
5. Set as `MONGO_URI` in your production environment

---

### Step 6.2 — Deploy Redis to Upstash (Free Tier)

1. Go to [upstash.com](https://upstash.com) → Create free Redis database
2. Copy the Redis connection URL (format: `redis://default:xxx@xxx.upstash.io:6379`)
3. Set in production environment:
   ```env
   REDIS_HOST=xxx.upstash.io
   REDIS_PORT=6379
   REDIS_PASSWORD=your_upstash_password
   ```

---

### Step 6.3 — Deploy Backend to Render

1. Push backend code to GitHub
2. Go to [render.com](https://render.com) → New → Web Service
3. Connect your GitHub repo
4. Settings:
   - **Build Command:** `npm install`
   - **Start Command:** `node server.js`
   - **Environment:** Node
5. Environment Variables tab → Add all your `.env` values
6. Create Web Service → wait for deploy
7. Your backend URL will be: `https://vizag-cms-backend.onrender.com`

---

### Step 6.4 — Deploy Frontend to Render / Netlify

**Update frontend `.env` with production backend URL:**
```env
REACT_APP_API_URL=https://vizag-cms-backend.onrender.com/api/v1
REACT_APP_SOCKET_URL=https://vizag-cms-backend.onrender.com
```

**Build the frontend:**
```bash
npm run build
# Creates /build folder with static files
```

**Deploy to Netlify (easiest):**
1. Go to [netlify.com](https://netlify.com) → Add new site → Import from Git
2. Build command: `npm run build`
3. Publish directory: `build`
4. Add environment variables (same as above)
5. Deploy → your URL: `https://vizag-cms.netlify.app`

**Fix React Router on Netlify:**
Create `public/_redirects`:
```
/*    /index.html   200
```

---

### Step 6.5 — Update Backend CORS for Production

In backend `.env`:
```env
FRONTEND_URL=https://vizag-cms.netlify.app
NODE_ENV=production
```

---

### Step 6.6 — Production Checklist

Before going live:

**Backend:**
- [ ] `NODE_ENV=production` set
- [ ] Strong JWT secrets (min 64 characters, random)
- [ ] MongoDB Atlas connected and accessible
- [ ] Redis (Upstash) connected
- [ ] Cloudinary credentials correct
- [ ] `FRONTEND_URL` set to production frontend URL
- [ ] Email (SMTP) configured
- [ ] Twilio SMS configured (optional)
- [ ] Firebase FCM configured (optional)

**Frontend:**
- [ ] `REACT_APP_API_URL` points to production backend
- [ ] `REACT_APP_SOCKET_URL` points to production backend
- [ ] Firebase config set (if using push notifications)
- [ ] `_redirects` file in `/public` for React Router

**Test after deploy:**
- [ ] Register a new user
- [ ] Login / logout
- [ ] Create a complaint with a photo and GPS
- [ ] Verify photo appears in Cloudinary dashboard
- [ ] Update status → verify real-time update in another tab
- [ ] Check notification received
- [ ] Download PDF report
- [ ] Check audit log has entries

---

## Phase 7 — Three-Team Coordination

Based on the original team split, here's how integration points are coordinated:

### Dev 1 (Auth & Security) integrates with Frontend:
```
Frontend LoginPage → POST /auth/login
├── Response: { user, accessToken }
├── Frontend stores accessToken in localStorage
├── Frontend connects Socket.IO with token
└── Frontend redirects based on user.role

Frontend api.js interceptor → POST /auth/refresh-token
├── Triggered on any 401 response
├── Uses httpOnly refreshToken cookie automatically
└── Retries original request with new accessToken
```

### Dev 2 (Complaints & GPS) integrates with Frontend:
```
Frontend NewComplaintPage → POST /complaints (multipart/form-data)
├── FormData: { title, description, category, latitude, longitude, photos[] }
├── Backend: Multer → Cloudinary → complaint document created
└── Backend: emits 'complaint:new' to dept socket room

Frontend ComplaintsListPage → GET /complaints?status=&page=&limit=
├── Backend auto-scopes by role (employee/supervisor/admin)
└── Frontend re-fetches when socket emits 'complaint:new'

Frontend ComplaintDetailPage → PATCH /complaints/:id/status
├── Backend: updates status, emits 'status:changed' to complaint:<id> room
└── Frontend: socket listener updates UI instantly
```

### Dev 3 (Real-time & Notifications) integrates with Frontend:
```
Frontend src/services/socket.js → io(SOCKET_URL, { auth: { token } })
├── Backend socketManager.js authenticates the connection
├── Auto-joins: user:<id>, dept:<dept>, admin:broadcast rooms

Frontend NotificationContext → subscribes to 'notification:new'
├── Backend notification.service.js → emitToUser(id, 'notification:new', ...)
└── Frontend: prepends to list, shows toast, increments badge

Frontend socket escalation events:
├── Backend escalationWorker → emits 'complaint:escalated'
└── Frontend AdminDashboard → shows alert toast
```

---

## Common Integration Issues & Fixes

| Problem | Cause | Fix |
|---------|-------|-----|
| CORS error on API calls | `FRONTEND_URL` in backend doesn't match | Set `FRONTEND_URL=http://localhost:3000` in backend `.env` |
| 401 on every request | Token not sent | Verify `withCredentials: true` in `api.js` and `Authorization` header is set |
| Socket doesn't connect | Wrong `REACT_APP_SOCKET_URL` | Must be the backend URL, not the API URL |
| Photos don't upload | Cloudinary not configured | Add all 3 Cloudinary env vars to backend |
| GPS doesn't work | HTTP on non-localhost | Requires HTTPS in production |
| Notifications don't appear | Socket not connected | Check browser console for `[Socket] Connected` |
| PDF download is empty | No complaints in date range | Create complaints in the current month |
| Refresh token fails | Cookie blocked | Ensure `withCredentials: true` on Axios and backend `credentials: true` in CORS |
| Real-time stops after deploy | Redis not configured | Add Redis connection to production environment |
