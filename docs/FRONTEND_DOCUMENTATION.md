# VSP-CMS Frontend Documentation
## React 18 + React Query + Socket.IO Client

---

## Project Structure

```
src/
├── App.jsx                    ← Root component: routes + providers
├── index.js                   ← ReactDOM render entry
├── styles/
│   └── globals.css            ← Design tokens, utility classes, animations
├── context/
│   ├── AuthContext.jsx        ← Global auth state + user session
│   └── NotificationContext.jsx ← Real-time notification inbox
├── services/
│   ├── api.js                 ← Axios instance with interceptors
│   ├── services.js            ← All API functions by module
│   └── socket.js              ← Socket.IO client + room helpers
├── components/
│   ├── common/
│   │   ├── UI.jsx             ← Reusable components (Button, Card, Modal…)
│   │   └── RouteGuards.jsx    ← ProtectedRoute, PublicRoute, RoleRoute
│   └── layout/
│       ├── Layout.jsx         ← Sidebar + TopBar shell
│       ├── Sidebar.jsx        ← Navigation with role-based menu
│       └── TopBar.jsx         ← Header with notification dropdown
├── pages/
│   ├── shared/                ← Pages used by all roles
│   │   ├── LoginPage.jsx
│   │   ├── RegisterPage.jsx
│   │   ├── ComplaintsListPage.jsx
│   │   ├── ComplaintDetailPage.jsx
│   │   ├── NotificationsPage.jsx
│   │   ├── ProfilePage.jsx
│   │   └── MapPage.jsx
│   ├── employee/              ← Employee-specific pages
│   │   ├── EmployeeDashboard.jsx
│   │   └── NewComplaintPage.jsx
│   └── admin/                 ← Admin/Supervisor-specific pages
│       ├── AdminDashboard.jsx
│       ├── UserManagementPage.jsx
│       └── AuditLogPage.jsx
├── hooks/
│   └── index.js               ← Custom React hooks
└── utils/
    └── helpers.js             ← Formatters, constants
```

---

## File-by-File Documentation

---

### `src/App.jsx` — Application Root

The top-level component that:
1. Creates a `QueryClient` (React Query) with global defaults (1 retry, no refetch on window focus)
2. Wraps the app in `<QueryClientProvider>` → `<BrowserRouter>` → `<AuthProvider>` → `<NotificationProvider>`
3. Defines all routes using React Router v6 `<Routes>` / `<Route>`
4. Uses `React.lazy()` for code splitting — each page is loaded only when navigated to
5. The `<SmartDashboard>` component checks the user's role and renders `AdminDashboard` or `EmployeeDashboard`
6. `<ToastContainer>` renders toast notifications globally with dark theme

**Route protection pattern:**
```jsx
<Route path="/complaints" element={
  <ProtectedRoute>           ← Must be logged in
    <Layout>                 ← Sidebar + TopBar shell
      <ComplaintsListPage /> ← Actual page content
    </Layout>
  </ProtectedRoute>
} />
```

---

### `src/styles/globals.css` — Design System

Defines all CSS custom properties (design tokens) used throughout the app:
- **Color palette:** `--color-bg-primary` (#0B1220 deep navy), `--color-accent` (#3B82F6 steel blue), semantic colors for success/warning/danger/critical
- **Status colors:** Each complaint status has its own CSS variable
- **Typography:** Inter (sans-serif) + JetBrains Mono (for IDs, coordinates, JSON)
- **Spacing, radius, shadow:** Consistent scale used via `var(--space-6)`, `var(--radius-lg)` etc.
- **Badge classes:** `.badge-pending`, `.badge-resolved` etc. applied by the `<Badge>` component
- **Animations:** `fadeIn`, `slideIn`, `pulse`, `spin` — applied via utility class names

**Design rationale:** Industrial dark theme (navy blue) signals authority and precision. Steel blue accent (#3B82F6) ties to the "steel" in Vizag Steel. JetBrains Mono for IDs and coordinates gives a technical, data-instrument feel.

---

### `src/services/api.js` — Axios HTTP Client

Creates a configured Axios instance with:
- `baseURL`: `/api/v1` (proxied to backend in dev via `"proxy"` in package.json)
- `withCredentials: true`: sends httpOnly refresh token cookie on every request
- `timeout: 30000`: fails if backend doesn't respond in 30 seconds

**Request interceptor:** Reads `accessToken` from `localStorage` and adds `Authorization: Bearer <token>` header.

**Response interceptor (token refresh logic):**
1. If a 401 is received and the request hasn't been retried yet, set `_retry: true`
2. If a refresh is already in progress (another request also got 401), queue this request using a Promise-based queue
3. Call `/auth/refresh-token` to get a new access token
4. Store new token in localStorage, update default headers, resolve the queue
5. Retry the original failed request with the new token
6. If refresh fails: clear token, redirect to `/login`

This means the user never sees a 401 error if their token simply expired during a session.

---

### `src/services/services.js` — API Service Functions

Organized by domain module. Every function returns the Axios promise. Usage:
```js
const { data } = await complaintService.getAll({ status: 'pending', page: 1 });
```

Modules:
- `authService` — login, register, logout, getMe, changePassword, updateFcmToken
- `complaintService` — create (multipart), getAll, getById, updateStatus, assign, submitFeedback, getNearby, getHeatmap
- `notificationService` — getAll, markRead, markAllRead, delete
- `analyticsService` — dashboard, byDept, overTime, resolutionTime, categories, sla, employees, downloadPdfReport (blob)
- `userService` — getAll, getById, update, deactivate
- `mediaService` — addPhotos, deletePhoto
- `auditService` — getForComplaint, getAll

---

### `src/services/socket.js` — Socket.IO Client

- `connectSocket(token)` — Creates Socket.IO connection with JWT in `auth` header. Configures reconnection (5 attempts, 1 second delay). Returns the socket instance.
- `disconnectSocket()` — Called on logout
- `getSocket()` — Access the socket anywhere
- `joinComplaintRoom(id)` / `leaveComplaintRoom(id)` — Emit room join/leave events (used in `ComplaintDetailPage`)
- `onSocketEvent(event, handler)` — Subscribe to an event, returns a cleanup function for use in `useEffect` cleanup

---

### `src/context/AuthContext.jsx` — Authentication State

A React Context that wraps the entire app. Provides:
- `user` — current user object (null if not logged in)
- `loading` — true during initial session restoration
- `login(email, password)` — calls API, stores token, connects socket, sets user state
- `logout()` — calls API, clears token, disconnects socket, clears user
- `updateUser(updates)` — merge updates into user state (used after profile save)
- Role booleans: `isEmployee`, `isSupervisor`, `isDeptAdmin`, `isSuperAdmin`, `isAdmin`, `canManage`

**Session restoration:** On app load, reads `accessToken` from localStorage. If found, calls `GET /auth/me` to restore the user session. If it fails (token expired), clears storage.

---

### `src/context/NotificationContext.jsx` — Notification Inbox

Maintains the notification list and unread count globally. On login:
1. Loads the last 30 notifications from the API
2. Subscribes to the `notification:new` Socket.IO event
3. On new socket notification: prepends to list, increments unread count, shows a toast

`markRead(ids)` and `markAllRead()` update both the API and local state optimistically.

---

### `src/components/common/UI.jsx` — Component Library

All styled with inline styles using CSS variables. Zero external UI library dependency.

| Component | Props | Purpose |
|-----------|-------|---------|
| `Button` | `variant`, `size`, `loading`, `disabled` | Primary, secondary, danger, ghost, success variants |
| `Input` | `label`, `error`, `ref` (forwarded) | Labeled input with error state |
| `Select` | `label`, `error`, `options[]`, `ref` | Styled dropdown |
| `Card` | `style`, `className` | Surface container with border and background |
| `Badge` | `status` or `priority` | Auto-colored badge for complaint status or priority |
| `Spinner` | `size`, `color` | SVG spinning loader |
| `Modal` | `open`, `onClose`, `title`, `width` | Overlay dialog with fade animation |
| `EmptyState` | `icon`, `title`, `description`, `action` | Empty list placeholder |
| `StatCard` | `label`, `value`, `icon`, `color`, `delta` | Dashboard KPI tile |
| `Table` | `columns[]`, `data[]`, `onRowClick`, `emptyMessage` | Generic sortable table |

---

### `src/components/common/RouteGuards.jsx`

Three wrapper components:
- `ProtectedRoute` — Shows spinner during loading, redirects to `/login` if no user
- `PublicRoute` — Redirects to `/dashboard` if already logged in (prevents logged-in users seeing login page)
- `RoleRoute` — Redirects to `/dashboard` if user's role isn't in the allowed `roles` array

---

### `src/components/layout/Sidebar.jsx`

Collapsible navigation sidebar:
- Role-based menu: each role sees only their relevant links (employees see 5 items, super_admin sees 8)
- Active route highlighted with left border accent and background tint
- Notification badge on the Bell icon showing unread count
- Collapse toggle button at 50% height — collapses to 64px showing only icons
- Bottom section: user name/role/dept card + sign out button with hover danger state
- Width transition animated with CSS `transition: width 0.22s ease`

---

### `src/components/layout/TopBar.jsx`

56px header bar:
- Left: Shows "FirstName · EmployeeID" from auth context
- Right: Notification bell with red dot indicator
- Notification dropdown: shows last 15 notifications with type color dot, title, body, timestamp
- Click on notification: marks as read, navigates to related complaint
- Outside click closes the dropdown (uses `useRef` + `document.addEventListener`)

---

### `src/pages/shared/LoginPage.jsx`

Simple login form with:
- Show/hide password toggle
- Calls `useAuth().login()` on submit
- Navigates to `/dashboard` on success
- Toast on error

---

### `src/pages/shared/RegisterPage.jsx`

Registration form with all required fields. Calls `authService.register()` directly (no auto-login — redirects to login). Department dropdown uses the `DEPARTMENTS` constant.

---

### `src/pages/shared/ComplaintsListPage.jsx`

Paginated complaint list with:
- Status and Category filter dropdowns
- Role-scoped: API automatically scopes results based on JWT (employee=own, supervisor=dept, admin=all)
- `useQuery(['complaints', filters], ...)` with `keepPreviousData: true` for smooth pagination
- `Table` component with click-to-navigate rows
- SLA breach shown as red "BREACHED" text

---

### `src/pages/shared/ComplaintDetailPage.jsx`

The most complex page:
- **Socket room subscription:** joins `complaint:<id>` room on mount, leaves on unmount. Live `status:changed` events update the page and show a toast.
- **Status update modal:** Role-based status options; shows `resolutionNote` textarea only when status is `resolved`
- **Status timeline:** Visual vertical timeline from `statusHistory[]` with badge, remark, timestamp, changed-by name
- **Feedback modal:** Star rating (1–5) + comment; only shown to the complaint creator when resolved
- **Location card:** Shows lat/lng coordinates + "Open in Maps" link to Google Maps
- **Photo grid:** Clickable thumbnails linking to full Cloudinary URLs

---

### `src/pages/employee/NewComplaintPage.jsx`

Multi-step complaint submission form:
1. **Issue Details:** Title, category, description, zone, building
2. **Location:** "Capture Current Location" button calls `navigator.geolocation.getCurrentPosition()`. Shows lat/lng + accuracy after capture. Can be cleared and retried.
3. **Photos:** React Dropzone for drag-and-drop. Up to 5 files. Shows previews with individual remove buttons. On submit, all photos are added to `FormData` with key `photos`.
4. **Submit:** Builds `FormData`, appends all fields and files, POSTs as `multipart/form-data`. On success, navigates to `/complaints`.

---

### `src/pages/employee/EmployeeDashboard.jsx`

Employee's home screen:
- 4 stat cards: Total, Pending, In Progress, Resolved (computed from the loaded complaint list)
- Recent 5 complaints as clickable cards showing title, complaint number, date, priority badge, status badge
- "Raise Complaint" button top-right
- Uses React Query with 30-second stale time (doesn't refetch on every render)

---

### `src/pages/admin/AdminDashboard.jsx`

Analytics dashboard using Recharts:
- **6 stat cards:** Total, Pending, In Progress, Resolved, SLA Breached, Escalated
- **Line chart:** Complaints raised vs resolved over 30 days (timeline)
- **Pie chart:** Breakdown by category with legend
- **Bar chart (horizontal):** Total and resolved per department
- **SLA performance table:** Breach rate with inline progress bar per department — color-coded red/yellow/green
- **Download button:** Calls `analyticsService.downloadPdfReport()`, receives a blob, uses `URL.createObjectURL` to trigger browser download

---

### `src/pages/shared/MapPage.jsx`

Leaflet map integration:
- Uses `window.L` (Leaflet loaded via CDN in `index.html`) to avoid SSR issues
- Centers on Vizag Steel Plant coordinates (17.6868, 83.2185)
- Dark map tiles from CartoDB
- Plots `CircleMarker` for each complaint from the heatmap API, color-coded by priority
- Legend card showing priority → color mapping
- Nearby complaints list below the map (2km radius from plant center)

---

### `src/pages/admin/UserManagementPage.jsx`

Admin user directory:
- Search input filters by name, employeeId, or email
- Table shows all users with role badge and active status
- Edit button opens modal with editable fields (name, phone, designation, role, department)
- Deactivate button (with confirmation) calls the deactivate API

---

### `src/pages/shared/NotificationsPage.jsx`

Full notification inbox:
- All notifications from `NotificationContext`
- Type color dot (red=escalation, blue=status_update, yellow=assigned, orange=sla_warning)
- Click navigates to related complaint
- Individual delete button per notification
- "Mark all read" button in header

---

### `src/pages/admin/AuditLogPage.jsx`

Immutable system log viewer:
- Table with action (color-coded monospace), performed-by, related complaint, details (JSON preview), timestamp, IP
- Pagination (30 records per page)
- Admin+ access only

---

### `src/pages/shared/ProfilePage.jsx`

User profile management:
- Read-only section: avatar (first letter), name, employeeId, department, role badge
- Edit section: name, phone, designation, zone
- Change password section: current + new + confirm with mismatch validation

---

### `src/hooks/index.js` — Custom Hooks

- **`useComplaints(initialFilters)`** — Wraps `useQuery` for complaints list. Subscribes to socket events (`complaint:new`, `status:changed`) to auto-invalidate cache. Returns `{ complaints, pagination, isLoading, filters, setFilters, setPage }`.
- **`useGeolocation()`** — Wraps `navigator.geolocation` with loading/error state. Returns `{ location, loading, error, getLocation, clear }`.
- **`useSocketEvent(event, handler, deps)`** — Subscribes to a socket event in a `useEffect` with cleanup.
- **`useDebounce(value, delay)`** — Debounces a value for search inputs.

---

### `src/utils/helpers.js` — Utilities

- `formatDate(d)` — "Jan 15, 2024"
- `formatDateTime(d)` — "Jan 15, 2024 · 3:42 PM"
- `timeAgo(d)` — "2 hours ago"
- Constant arrays: `CATEGORIES`, `DEPARTMENTS`, `ROLES`, `STATUSES`
- Color maps: `priorityColor`, `statusColor` (hex values keyed by name)
- `downloadBlob(blob, filename)` — Creates a temporary anchor element to trigger file download

---

## State Management Architecture

```
App State Layer:
  AuthContext          ← User session (persisted via localStorage)
  NotificationContext  ← Real-time inbox (Socket.IO driven)

Server State Layer (React Query):
  useQuery('complaints', filters)     ← Paginated complaint list
  useQuery(['complaint', id])         ← Single complaint detail
  useQuery('dashboard')               ← Analytics summary
  useQuery('byDept')                  ← Department analytics
  ... (one query key per data source)

Real-time Sync:
  Socket.IO events → queryClient.invalidateQueries()
  → React Query refetches → UI updates automatically
```

## Role → Pages Matrix

| Page | Employee | Supervisor | Dept Admin | Super Admin |
|------|----------|------------|------------|-------------|
| Dashboard | EmployeeDashboard | AdminDashboard | AdminDashboard | AdminDashboard |
| Complaints List | Own only | Dept only | Dept only | All |
| Complaint Detail | Own only | Dept only | Dept only | All |
| Raise Complaint | ✓ | ✓ | ✓ | ✓ |
| Update Status | ✗ | ✓ (limited) | ✓ | ✓ (full) |
| Map / Heatmap | ✗ | ✓ | ✓ | ✓ |
| Analytics | ✗ | ✗ | ✓ | ✓ |
| User Management | ✗ | ✗ | ✓ (dept) | ✓ (all) |
| Audit Log | ✗ | ✗ | ✓ | ✓ |
| Profile | ✓ | ✓ | ✓ | ✓ |
| Notifications | ✓ | ✓ | ✓ | ✓ |
