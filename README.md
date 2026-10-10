# HomeServe 🏠⚡

HomeServe is an enterprise-grade, hyperlocal home-services marketplace connecting homeowners with verified, high-quality local professionals for essential household services (Electricians, Plumbers, Cleaning, Painting, AC Repair, Carpenters, and Appliance Repair).

---

## 🌟 Platform Capabilities & Phases

HomeServe is engineered with full-stack best practices, featuring 12 end-to-end completed phases:

1. **Architecture & Foundation**: React + Vite frontend, Express.js backend, resilient MongoDB connection handling, and centralized API client.
2. **Authentication & RBAC**: JWT tokens with role-based access control (`CUSTOMER`, `TECHNICIAN`, `ADMIN`), bcrypt password hashing, and protected route wrappers.
3. **Service Catalog Engine**: Hyperlocal categorization, dynamic filtering, transparent pricing models, and service detail pages.
4. **Technician Management**: Technician profile onboarding, availability toggle (`isAvailable`), admin verification pipeline, and skill matching.
5. **Full Booking Lifecycle**: Customer booking flow, scheduled slots, technician assignment, status state machine (`REQUESTED` → `CONFIRMED` → `IN_PROGRESS` → `COMPLETED` / `CANCELLED`).
6. **Dynamic Pricing & Billing**: Pricing tier breakdowns, emergency surcharges, taxes, and itemized invoice totals.
7. **Real-Time WebSockets**: Socket.IO bidirectional event bus with room isolation and live connection badges.
8. **Live GPS Technician Tracking**: Real-time geolocation sharing, Leaflet interactive maps, marker animation, and dynamic ETA calculation.
9. **Role Room Isolation & Safety**: Secure room joining authorization preventing unauthorized access to tracking broadcasts.
10. **Enterprise Security Hardening**: Helmet HTTP headers, CORS origin allowlist, Express rate-limiting, NoSQL injection sanitization, 50KB payload guards, and strict environment validation.
11. **Reviews & Ratings System**: Verified reviews for completed bookings, automated technician rating aggregation, and admin review moderation.
12. **Admin Analytics & Business Intelligence**: Operational dashboard displaying revenue metrics, booking distributions, category breakdowns, and technician performance.

---

## 📁 Project Structure

```
homeserve/
│
├── client/                                # React + Vite Frontend
│   ├── public/                            # Static assets
│   ├── src/
│   │   ├── assets/                        # Images & media assets
│   │   ├── components/
│   │   │   ├── auth/                      # Authentication branding & forms
│   │   │   ├── cards/                     # ServiceCard, TechnicianCard, TestimonialCard
│   │   │   ├── common/                    # Button, Badges, Modals, Spinners, Skeleton
│   │   │   ├── maps/                      # LiveTrackingMap (Leaflet GPS tracking)
│   │   │   └── reviews/                   # ReviewSection & TechnicianReviewList
│   │   ├── context/                       # AuthContext & SocketContext
│   │   ├── hooks/                         # useBookingSocket, useGeolocationTracker
│   │   ├── layouts/                       # MainLayout app shell
│   │   ├── pages/
│   │   │   ├── admin/                     # AdminAnalyticsPage, AdminReviewsPage, AdminBookingsPage, AdminTechniciansPage
│   │   │   ├── bookings/                  # NewBookingPage, MyBookingsPage, BookingDetailPage
│   │   │   ├── technician/                # TechnicianDashboardPage, TechnicianProfilePage
│   │   │   ├── HomePage.jsx
│   │   │   ├── ServicesPage.jsx
│   │   │   ├── LoginPage.jsx & SignupPage.jsx
│   │   │   └── ProfilePage.jsx
│   │   ├── services/                      # Centralized Axios API client (api.js)
│   │   ├── App.jsx                        # Full React Router routing hierarchy
│   │   ├── index.css                      # Tailwind styling directives
│   │   └── main.jsx                       # Entry point
│   ├── package.json
│   ├── tailwind.config.js
│   └── vite.config.js
│
├── server/                                # Express.js Backend REST & Socket API
│   ├── config/                            # MongoDB connection & Env validation
│   ├── controllers/                       # Auth, Booking, Service, Technician, Review, Analytics
│   ├── middleware/                        # Auth RBAC, Security headers, Rate limiters, Sanitizers
│   ├── models/                            # User, Technician, Service, Booking, Review schemas
│   ├── routes/                            # Modular Express router endpoints
│   ├── services/                          # Business logic (pricing calculator)
│   ├── sockets/                           # Socket.IO handlers & rooms
│   ├── tests/                             # Jest automated test suites (Security, Reviews, Analytics)
│   ├── utils/                             # Verification scripts & database seeders
│   ├── package.json
│   └── server.js                          # Server setup & middleware stack
│
├── .env.example                           # Root environment variable template
├── .gitignore                             # Git ignore rules
└── README.md                              # Project documentation
```

---

## ⚙️ Environment Configuration

Set up environment files before running the project:

### Backend (`server/.env` and root `.env`)
```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://127.0.0.1:27017/homeserve
CLIENT_URL=http://localhost:5173
JWT_SECRET=your_super_secret_jwt_key_here
JWT_EXPIRES_IN=7d
```

### Frontend (`client/.env`)
```env
VITE_API_BASE_URL=http://localhost:5000/api
```

---

## 🚦 How to Run the Application

### 1. Database
Ensure MongoDB is running locally on port `27017`:
```powershell
net start MongoDB
```

### 2. Start Backend API
```bash
cd server
npm install
npm run dev
```
The server will start on `http://localhost:5000`.

### 3. Start Frontend App
```bash
cd client
npm install
npm run dev
```
The client will start on `http://localhost:5173`.

---

## 🧪 Testing & Verification

Run the automated backend test suites:
```bash
cd server
npm test
```
The test suite covers:
- **Security Invariants**: Rate limiting, NoSQL query sanitization, 50KB payload guard, Helmet HTTP headers, CORS validation.
- **Review Engine**: Verified review posting, automated technician rating aggregation, and admin moderation controls.
- **Admin Analytics**: Revenue computation, monthly trends, technician ranking, and category metrics.

To verify frontend production bundle:
```bash
cd client
npm run build
```
