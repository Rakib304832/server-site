# StudioSpace API

Express 5 + MongoDB API for the StudioSpace marketplace. It serves studio listings, handles Better Auth sessions, and enforces booking ownership and **double-booking prevention** (Challenge 2).

## 🏆 Challenge Implementations

### Challenge 1: JWT Security with HTTPOnly Cookies
- Better Auth MongoDB adapter stores JWT in HTTP-only cookies (`connect.sid`)
- All protected mutations (`POST /api/studios`, `DELETE /api/studios/[id]`, `POST /api/bookings`) require valid session
- Unauthorized requests rejected with **401 Unauthorized**
- Custom `verifyJwt` middleware reads cookie, verifies token, attaches user to request

### Challenge 2: Booking Double-Booking Prevention
- `POST /api/bookings` checks for overlapping **Confirmed** bookings in MongoDB before saving new reservations
- Uses MongoDB range query operators (`$lt`/`$gt` on `startTime`/`endTime`)
- Returns **409 Conflict** with clear error: "This time slot is already booked. Pick another time."
- Only checks **Confirmed** status (not Pending) to allow pending requests while preventing confirmed overlaps

### Challenge 3: Theme Customization *(Client-side)*
- Persists theme preference in `localStorage`
- Applies `data-theme` attribute to `<html>` element for full system theming
- Light/dark toggle in header applies `data-theme="dark"` / `data-theme="light"`

## 📋 Setup

```bash
npm install
cp .env.example .env
npm run seed           # seeds studios and examiner demo account
npm run dev            # http://localhost:5000
```

**The API runs on `http://localhost:5000` by default.**

## 🌐 Environment Variables

| Variable | Required | Purpose |
| --- | --- | --- |
| `MONGODB_URI` | Yes | MongoDB connection string shared with the Next.js client |
| `BETTER_AUTH_SECRET` | Yes | Secret used to sign Better Auth sessions |
| `BETTER_AUTH_URL` | Yes | Client origin, normally `http://localhost:3000` |
| `PORT` | No | API port, defaults to `5000` |
| `CLIENT_ORIGINS` | No | Comma-separated production origins allowed by CORS |
| `GOOGLE_CLIENT_ID` | No | Enables Google sign-in |
| `GOOGLE_CLIENT_SECRET` | No | Enables Google sign-in |
| `JWT_SECRET` | Yes | Secret for JWT token signing (used in verifyJwt middleware) |

**Generate a secret with:**
```bash
openssl rand -base64 32
```

## 📜 Scripts

```bash
npm run dev       # Watch mode
npm run start     # Run once
npm run seed      # Reset studios and create the demo examiner account
```

## � API Endpoints

| Method | Route | Auth | Description |
| --- | --- | --- | --- |
| `GET` | `/api/health` | Public | Health check |
| `GET` | `/api/studios` | Public | List studios; supports `category`, `q`, and `mine=true` |
| `GET` | `/api/studios/:id` | Public | Studio details |
| `POST` | `/api/studios` | Required | Create a listing owned by the session user |
| `PATCH` | `/api/studios/:id` | Owner | Update a listing |
| `DELETE` | `/api/studios/:id` | Owner | Delete a listing and its bookings |
| `POST` | `/api/bookings` | Required | Create a pending booking after conflict check (Challenge 2) |
| `GET` | `/api/bookings` | Required | List bookings by `scope=guest`, `host`, or `all` |
| `PATCH` | `/api/bookings/:id` | Guest/Host | Confirm, complete, or cancel a booking |

## 📝 Booking Rules

- Start time must be in the future and end time must be after it
- A booking lasts between 30 minutes and 24 hours
- Guest count must be between 1 and the studio's `maxCapacity`
- **Challenge 2:** New requests rejected with `409` when they overlap an existing **Confirmed** booking for the same studio (MongoDB range query)
- Only the host can confirm or complete a booking. Guests can cancel their own pending requests

## 👤 Demo Account

`npm run seed` creates:

| Field | Value |
| --- | --- |
| **Email** | `examiner@studiospace.demo` |
| **Password** | `Studio123` |

*The seed also assigns `stu_001` to the demo user so listing management can be tested immediately.*

📁 Root Directory: server-site/
```
server-site/
├── package.json          # Dependencies and scripts
├── tsconfig.json         # TypeScript configuration
├── .env                 # Environment variables (not committed)
├── .env.example         # Template for environment variables
├── .gitignore           # Git ignore rules
├── src/                 # Source code directory
│   ├── index.ts         # Main Express app entry point
│   ├── auth.ts          # Better Auth configuration with MongoDB adapter
│   ├── config/          # Configuration files
│   │   └── db.ts        # MongoDB connection setup
│   ├── models/          # Mongoose models
│   │   ├── studio.model.ts    # Studio schema and model
│   │   └── booking.model.ts   # Booking schema and model
│   ├── middleware/      # Express middleware
│   │   ├── verifyJwt.ts     # JWT verification from HTTPOnly cookie (Challenge 1)
│   │   └── errorHandler.ts  # Global error handler
│   ├── routes/          # Express routes
│   │   ├── studio.routes.ts # Studio CRUD operations
│   │   └── booking.routes.ts # Booking operations with double-booking prevention (Challenge 2)
│   ├── controllers/     # Route controllers (integrated into routes)
│   ├── services/        # Business logic services
│   │   └── overlap.service.ts  # Time overlap query logic
│   └── utils/           # Utility utilities
│       └── jwt.ts           # JWT sign/verify utilities
├── README.md            # API documentation with challenge details
└── package-lock.json    # Lock file for dependencies 
```
🗂️ Detailed Module Breakdown
src/index.ts - Main Application
- Express app setup with CORS (credentials: true)
- JWT secret and session validation
- Routes registration (/api/studios, /api/bookings)
- Global error handler mounting
- Database connection startup
src/auth.ts - Authentication Configuration
- Better Auth with MongoDB adapter
- Google OAuth configuration
- Email/password setup
- Session management
src/models/ - Data Models
- studio.model.ts: Studio schema with fields: title, category, hourlyRate, securityDeposit, maxCapacity, location, image, gallery, amenities, overview, ownerId/Name/Email/Photo, rating, reviewsCount, timestamps
- booking.model.ts: Booking schema with fields: studioId, studioTitle, studioImage, studioCategory, studioLocation, ownerEmail, userId/Name/Email, startTime/endTime, hours, guests, totalPrice, status (Pending/Confirmed/Completed/Cancelled), timestamps
src/middleware/ - Express Middleware
- verifyJwt.ts: Reads HTTPOnly cookie (connect.sid), verifies JWT, returns 401 if missing/invalid (Challenge 1). Attaches user to request object.
- errorHandler.ts: Catches HttpError instances and returns appropriate status codes, logs unexpected errors
src/routes/ - API Routes
- studio.routes.ts: 
- GET /api/studios - List studios with category filter
- GET /api/studios/:id - Get single studio
- POST /api/studios - Create new studio (protected)
- PATCH /api/studios/:id - Update studio (owner only)
- DELETE /api/studios/:id - Delete studio (owner only)
- booking.routes.ts (Challenge 2):
- GET /api/bookings/mine - User's bookings
- POST /api/bookings - Create booking with overlap check against Confirmed bookings, capacity validation
- PATCH /api/bookings/:id - Update booking status (host only)
src/utils/jwt.ts - JWT Utilities
- generateToken(id, name, email): Creates JWT token
- verifyToken(token): Verifies and decodes JWT token
src/config/db.ts - Database Connection
- Mongoose connection setup
- Error handling for connection failures
- Called from src/index.ts on startup
🔐 Security Implementation
Challenge 1: JWT Security with HTTPOnly Cookies
- Better Auth stores session in connect.sid HTTP-only cookie
- verifyJwt middleware extracts cookie, verifies with JWT_SECRET
- Returns 401 Unauthorized if cookie missing, expired, or invalid
- All protected mutations require valid session:
- POST /api/studios ✅
- DELETE /api/studios/[id] ✅
- POST /api/bookings ✅
Challenge 2: Double-Booking Prevention
- POST /api/bookings checks for overlapping Confirmed bookings
- MongoDB query: { studioId, status: "Confirmed", startTime: { $lt: end }, endTime: { $gt: start } }
- Returns 409 Conflict with: "This time slot is already booked. Pick another time."
- Only checks Confirmed status (allows Pending requests while preventing confirmed overlaps)
📊 Project Statistics
Metric	Value
Total Files	~20 source files
Routes	7 API endpoints
Models	2 Mongoose schemas
Middleware	2 Express middleware
Challenges Implemented	3
Auth Method	HTTPOnly cookies + Better Auth
Database	MongoDB with Mongoose
🚀 Deployment
- Development: npm run dev (runs on http://localhost:5000)
- Production: Build and deploy to Render/Vercel
- Environment: .env file required (MONGODB_URI, BETTER_AUTH_SECRET, etc.)
- GitHub: https://github.com/Rakib304832/server-site
The server-site is fully structured, documented, and ready for deployment alongside the client-side application.

## ⚠️ Security & Challenge Notes

- **Challenge 1:** JWT Security with HTTPOnly Cookies — Better Auth MongoDB adapter stores session token in HTTP-only cookie. The custom `verifyJwt` middleware extracts and verifies this cookie on every protected route. Returns 401 if missing or invalid.

- **Challenge 2:** Double-Booking Prevention — `POST /api/bookings` performs a MongoDB query: `{ studioId, status: "Confirmed", startTime: { $lt: end }, endTime: { $gt: start } }`. If a matching document exists, the request is rejected with 409 and message "This time slot is already booked."

- **Challenge 3:** Theme Customization — Client-side implementation; persists in `localStorage`, applies `data-theme` to `<html>` element.

- **Ownership Checks** — Only the studio owner can edit/delete their listings or confirm/complete bookings.

## 📦 Related Repository

- **Client:** https://github.com/Rakib304832/client-side1

---

**StudioSpace API — Powering the peer-to-peer creative workspace marketplace.**
