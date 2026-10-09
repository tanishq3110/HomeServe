# HomeServe 🏠⚡

HomeServe is a hyperlocal home-services marketplace connecting homeowners with verified, high-quality local professionals for essential household services (Electricians, Plumbers, Cleaning, Painting, AC Repair, Carpenters, and Appliance Repair).

---

## 🚀 Phase 1: Project Foundation & Basic Architecture

This repository contains the Phase 1 architectural foundation:
- **Frontend**: React + Vite + Tailwind CSS v3 + React Router + Axios + Lucide React
- **Backend**: Node.js + Express.js + Mongoose
- **Database**: MongoDB with resilient connection handling
- **API Communication**: Centralized Axios service with dynamic health monitoring

---

## 📁 Project Structure

```
homeserve/
│
├── client/                      # React + Vite Frontend
│   ├── public/                  # Public assets
│   ├── src/
│   │   ├── assets/              # Icons, images & illustrations
│   │   ├── components/          # Reusable UI components (Navbar, Footer)
│   │   ├── context/             # State & React context providers (future auth/cart)
│   │   ├── hooks/               # Custom React hooks
│   │   ├── layouts/             # App shell layouts (MainLayout)
│   │   ├── pages/               # Application pages (HomePage)
│   │   ├── services/            # Centralized API layer (api.js)
│   │   ├── utils/               # Helper & formatting utilities
│   │   ├── App.jsx              # React Router route definitions
│   │   ├── index.css            # Tailwind CSS directives & theme base
│   │   └── main.jsx             # React DOM entry point
│   ├── .env.example             # Frontend environment template
│   ├── index.html               # HTML template
│   ├── package.json             # Frontend dependencies
│   ├── postcss.config.js        # PostCSS configuration
│   ├── tailwind.config.js       # Tailwind CSS v3 design system
│   └── vite.config.js           # Vite build configuration
│
├── server/                      # Node.js + Express Backend
│   ├── config/                  # Configuration & DB connection (db.js)
│   ├── controllers/             # Express route controllers (health.controller.js)
│   ├── middleware/              # Custom middleware (error handling, auth)
│   ├── models/                  # Mongoose data schemas (future User, Booking, etc.)
│   ├── routes/                  # Express API routes (health.routes.js)
│   ├── services/                # Business logic services
│   ├── sockets/                 # Socket.IO handlers (future real-time tracking)
│   ├── utils/                   # Server-side helper utilities
│   ├── .env.example             # Backend environment template
│   ├── package.json             # Backend dependencies
│   └── server.js                # Express app initialization & server entry
│
├── .env.example                 # Root environment variable template
├── .gitignore                   # Git ignore for node_modules, .env, and builds
└── README.md                    # Project documentation
```

---

## 📦 Installed Packages

### Frontend (`client/`)
| Package | Version | Purpose |
| :--- | :--- | :--- |
| `react` | `^18.3.1` | Core UI library |
| `react-dom` | `^18.3.1` | React DOM renderer |
| `react-router-dom` | `^6.28.0` | Client-side routing |
| `axios` | `^1.7.9` | HTTP client for backend communication |
| `lucide-react` | `^0.468.0` | Modern SVG icons |
| `tailwindcss` | `^3.4.17` | Utility-first styling (v3) |
| `postcss` | `^8.4.49` | CSS processing |
| `autoprefixer` | `^10.4.20` | CSS vendor prefixing |
| `vite` | `^6.0.7` | Fast development bundler |
| `@vitejs/plugin-react` | `^4.3.4` | Vite React fast refresh plugin |

### Backend (`server/`)
| Package | Version | Purpose |
| :--- | :--- | :--- |
| `express` | `^4.21.2` | Minimalist web application framework |
| `mongoose` | `^8.9.5` | Elegant MongoDB object modeling |
| `cors` | `^2.8.5` | Cross-Origin Resource Sharing |
| `dotenv` | `^16.4.7` | Zero-dependency environment variable loader |
| `nodemon` *(dev)* | `^3.1.9` | Automatic server reload during development |

---

## ⚙️ Environment Configuration

Both root and sub-folders provide `.env.example` templates.
**Important**: `.env` files contain local secrets and are strictly ignored by Git.

### Backend (`server/.env`)
```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://127.0.0.1:27017/homeserve
CLIENT_URL=http://localhost:5173
JWT_SECRET=your_jwt_secret_key_here
```

### Frontend (`client/.env`)
```env
VITE_API_BASE_URL=http://localhost:5000/api
```

---

## 🗄️ MongoDB Configuration

1. **Local MongoDB Service**:
   Ensure MongoDB service is running locally on port `27017`:
   - Windows: Start via Windows Services (`MongoDB Server`) or run:
     ```powershell
     net start MongoDB
     ```
   - Linux/macOS:
     ```bash
     sudo systemctl start mongod
     # or
     brew services start mongodb-community
     ```

2. **MongoDB Atlas (Cloud)**:
   If using MongoDB Atlas, replace `MONGODB_URI` in `server/.env`:
   ```env
   MONGODB_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/homeserve?retryWrites=true&w=majority
   ```

*Resilience Note*: If MongoDB is temporarily offline, the server will **not** crash. The health endpoint will gracefully report `"database": "disconnected"`.

---

## 🚦 How to Run the Application

### 1. Start the Backend Server
```bash
cd server
npm run dev
# Or for standard node start:
npm start
```
The server will start on `http://localhost:5000`.

### 2. Start the Frontend Client
```bash
cd client
npm run dev
```
The frontend will start on `http://localhost:5173`.

---

## 🧪 Verification & Health Check

### API Health Check
Send a `GET` request to:
```
http://localhost:5000/api/health
```

**Expected response when MongoDB is connected:**
```json
{
  "success": true,
  "message": "HomeServe API is running",
  "database": "connected"
}
```

### Frontend Verification
1. Open `http://localhost:5173` in your browser.
2. Observe the **Full-Stack Connection Verification** card on the homepage:
   - Express Backend status: **Online**
   - MongoDB status: **Connected** (queried dynamically from `/api/health`)
   - Frontend Axios Client: Active with live round-trip latency in milliseconds.

