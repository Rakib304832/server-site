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

## ⚠️ Security & Challenge Notes

- **Challenge 1:** JWT Security with HTTPOnly Cookies — Better Auth MongoDB adapter stores session token in HTTP-only cookie. The custom `verifyJwt` middleware extracts and verifies this cookie on every protected route. Returns 401 if missing or invalid.

- **Challenge 2:** Double-Booking Prevention — `POST /api/bookings` performs a MongoDB query: `{ studioId, status: "Confirmed", startTime: { $lt: end }, endTime: { $gt: start } }`. If a matching document exists, the request is rejected with 409 and message "This time slot is already booked."

- **Challenge 3:** Theme Customization — Client-side implementation; persists in `localStorage`, applies `data-theme` to `<html>` element.

- **Ownership Checks** — Only the studio owner can edit/delete their listings or confirm/complete bookings.

## 📦 Related Repository

- **Client:** https://github.com/Rakib304832/client-side1

---

**StudioSpace API — Powering the peer-to-peer creative workspace marketplace.**