# 📝 Papertrail - Full-Stack Notes Application

A modern, full-stack notes application built with **Django REST Framework** and **React 19**. Create, edit, pin, lock, and organise your notes with a beautiful dark-mode UI - backed by MongoDB Atlas and installable as a **Progressive Web App**.

🔗 **Live Demo:** [papertrail-notes.vercel.app](https://papertrail-notes.vercel.app)

<p>
  <img src="https://img.shields.io/badge/Python-3.11-blue?style=for-the-badge&logo=python&logoColor=white" alt="Python" />
  <img src="https://img.shields.io/badge/Django-5.2-green?style=for-the-badge&logo=django&logoColor=white" alt="Django" />
  <img src="https://img.shields.io/badge/DRF-3.16-red?style=for-the-badge&logo=django&logoColor=white" alt="DRF" />
  <img src="https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=white" alt="React" />
  <img src="https://img.shields.io/badge/Vite-7-646CFF?style=for-the-badge&logo=vite&logoColor=white" alt="Vite" />
  <img src="https://img.shields.io/badge/MongoDB-Atlas-47A248?style=for-the-badge&logo=mongodb&logoColor=white" alt="MongoDB" />
  <img src="https://img.shields.io/badge/PWA-Enabled-5A0FC8?style=for-the-badge&logo=pwa&logoColor=white" alt="PWA" />
</p>

---

## ✨ Features

### Core
- **JWT Authentication** - Secure register & login with custom token-based auth (7-day expiry)
- **CRUD Notes** - Create, read, update, and delete notes seamlessly
- **Pin Notes** - Keep important notes pinned at the top; sorted by creation date within groups
- **Checklists** - Convert any note into an interactive checklist with individually checkable items
- **Search** - Real-time client-side search across note titles, content, and checklist items

### Security & Privacy
- **Note Locking** - Password-protect sensitive notes; locked note content is masked (`****`) on the server
- **Rate Limiting** - Auth endpoints limited to 5 requests/min; global throttling for anonymous and authenticated users
- **Security Headers** - XSS filter, content-type sniffing protection, clickjacking prevention (`X-Frame-Options: DENY`), and HTTP-only cookies enabled out of the box

### Offline & PWA
- **Progressive Web App** - Installable on mobile and desktop via the browser's "Add to Home Screen" prompt
- **Offline Support** - Full offline queue system that caches notes locally and auto-syncs create/update/delete operations when connectivity is restored
- **Service Worker** - Powered by `vite-plugin-pwa` with Workbox for automatic cache management and navigation fallback

### Guest Mode
- **Try Without Signing Up** - Use the app as a guest; notes are stored in `localStorage`
- **Guest Banner** - Clear visual indicator with one-click links to register or log in

### User Experience
- **Dark Mode** - Elegant theme toggle with `localStorage` persistence
- **Responsive Design** - Fully responsive across mobile, tablet, and desktop breakpoints
- **Quick Create** - Rapidly add notes from an inline form without opening a modal
- **Create & Edit Modals** - Full-featured modals for detailed note creation and editing
- **Toast Notifications** - Contextual success/warning toasts for offline sync, lock actions, and errors
- **Scroll to Top** - Floating button appears when scrolling down for quick navigation
- **Loading Animations** - Rotating motivational messages during page transitions
- **Glassmorphism UI** - Modern design with smooth animations, CSS variables, and polished aesthetics

### Admin & Analytics
- **Django Admin Panel** - Full admin interface with bi-directional MongoDB ↔ SQLite sync for Users, Notes, and Stats
- **Visitor Counter** - Built-in stats endpoint tracking visitor count and total registered users
- **Health Check** - `/api/health/` endpoint for uptime monitoring

---

## 🏗️ Tech Stack

| Layer         | Technology                                                    |
|---------------|---------------------------------------------------------------|
| **Frontend**  | React 19, Vite 7, React Router 7, Axios                     |
| **Backend**   | Django 5.2, Django REST Framework 3.16                       |
| **Database**  | MongoDB Atlas (via MongoEngine 0.29) + SQLite (Admin sync)   |
| **Auth**      | Custom JWT (PyJWT 2.11) with Bearer token scheme             |
| **PWA**       | vite-plugin-pwa 1.3, Workbox                                 |
| **Styling**   | Vanilla CSS with CSS variables, theming & glassmorphism      |
| **Deployment**| Vercel (frontend) + Render (backend via Gunicorn)            |

---

## 📂 Project Structure

```
papertrail-notes/
├── .env.example              # Environment variable template
├── .gitignore
├── manage.py                 # Django management script
├── requirements.txt          # Python dependencies
├── build.sh                  # Render build script (pip install + collectstatic)
├── render.yaml               # Render deployment configuration
│
├── notes/                    # Django project configuration
│   ├── settings.py           # Settings (MongoDB, CORS, DRF, security headers)
│   ├── urls.py               # Root URL conf (/admin, /api)
│   ├── wsgi.py
│   └── asgi.py
│
├── notesApp/                 # Django app - API layer
│   ├── models.py             # MongoEngine models (User, Note, ChecklistItem, Stats)
│   │                         # + Django ORM mirrors (UserORM, NoteORM, StatsORM)
│   ├── views.py              # API views (Auth, Notes CRUD, Lock/Unlock, Stats, Health)
│   ├── serializers.py        # DRF serializers with locked-note content masking
│   ├── authentication.py     # Custom JWTAuthentication backend
│   ├── urls.py               # API route definitions
│   ├── utils.py              # Token generation & decoding helpers
│   └── admin.py              # Django Admin with MongoDB ↔ SQLite bi-directional sync
│
├── notes-frontend/           # React + Vite frontend
│   ├── vite.config.js        # Vite config with PWA plugin & manifest
│   ├── package.json
│   ├── index.html
│   └── src/
│       ├── App.jsx           # Root component with routing
│       ├── main.jsx          # Entry point
│       ├── index.css         # Global styles & CSS variables
│       ├── api/
│       │   └── axios.js      # Axios instance with JWT interceptor & auto-redirect
│       ├── components/
│       │   ├── ChecklistBuilder.jsx   # Interactive checklist editor
│       │   ├── CreateNoteModal.jsx    # Full note creation modal
│       │   ├── EditNoteModal.jsx      # Note editing modal
│       │   ├── NoteCard.jsx           # Individual note card with actions
│       │   ├── NotesNav.jsx           # Navigation bar with search & logout
│       │   ├── QuickCreateForm.jsx    # Inline quick-add form
│       │   ├── PasswordModal.jsx      # Password prompt for lock/unlock
│       │   ├── ThemeToggle.jsx        # Dark/light mode toggle
│       │   ├── Footer.jsx            # App footer
│       │   ├── LoginLoader.jsx        # Animated loading screen
│       │   ├── ReloadPrompt.jsx       # PWA update prompt
│       │   └── Spinner.jsx           # Loading spinner
│       ├── pages/
│       │   ├── Login.jsx     # Login page
│       │   ├── Register.jsx  # Registration page
│       │   ├── Notes.jsx     # Main notes dashboard
│       │   ├── login.css
│       │   ├── register.css
│       │   └── notes.css
│       ├── styles/           # Component-level CSS files
│       └── utils/
│           ├── dateFormatter.js   # Human-readable date formatting
│           └── offlineSync.js     # Offline queue & cache management
│
└── Project Screenshots/      # App screenshots for documentation
```

---

## 🚀 Getting Started

### Prerequisites

- **Python 3.10+**
- **Node.js 18+** and **npm**
- **MongoDB Atlas** account (or a local MongoDB instance)

### 1. Clone the Repository

```bash
git clone https://github.com/ARShaikh0801/papertrail-notes.git
cd papertrail-notes
```

### 2. Backend Setup

```bash
# Create and activate a virtual environment
python -m venv notesvenv
notesvenv\Scripts\activate        # Windows
# source notesvenv/bin/activate   # macOS/Linux

# Install dependencies
pip install -r requirements.txt

# Create your .env file from the template
cp .env.example .env
# Edit .env with your MongoDB URI, SECRET_KEY, and other config variables

# Run the Django development server
python manage.py runserver
```

The API will be available at **http://127.0.0.1:8000/api/**
The Admin panel will be available at **http://127.0.0.1:8000/admin/**

### 3. Frontend Setup

```bash
cd notes-frontend

# Install dependencies
npm install

# Start the Vite dev server
npm run dev
```

The app will be available at **http://localhost:5173**

### 4. Production Build (Frontend)

```bash
cd notes-frontend
npm run build    # Outputs to dist/
npm run preview  # Preview the production build locally
```

---

## 🔌 API Endpoints

### Authentication

| Method | Endpoint              | Description            | Auth     |
|--------|-----------------------|------------------------|----------|
| `POST` | `/api/auth/register/` | Register a new user    | No       |
| `POST` | `/api/auth/login/`    | Login & get JWT token  | No       |

### Notes CRUD

| Method   | Endpoint                  | Description           | Auth     |
|----------|---------------------------|-----------------------|----------|
| `GET`    | `/api/notes/`             | List all user notes   | Required |
| `POST`   | `/api/notes/`             | Create a new note     | Required |
| `PATCH`  | `/api/notes/<note_id>/`   | Update a note         | Required |
| `DELETE` | `/api/notes/<note_id>/`   | Delete a note         | Required |

### Note Locking

| Method | Endpoint                           | Description                        | Auth     |
|--------|------------------------------------|------------------------------------|----------|
| `POST` | `/api/notes/<note_id>/lock/`       | Lock a note (password required)    | Required |
| `POST` | `/api/notes/<note_id>/unlock/`     | Temporarily view locked note       | Required |
| `POST` | `/api/notes/<note_id>/remove-lock/`| Permanently remove lock            | Required |

### Utility

| Method | Endpoint         | Description                              | Auth |
|--------|------------------|------------------------------------------|------|
| `GET`  | `/api/stats/`    | Get visitor count & total users          | No   |
| `GET`  | `/api/stats/?inc=true` | Increment visitor count & return stats | No   |
| `GET`  | `/api/health/`   | Health check (returns `{"status": "healthy"}`) | No   |

---

## 🔐 Authentication Flow

```
┌─────────┐           ┌─────────────┐           ┌──────────────┐
│  Client │ ──POST──▶│ /auth/login/ │──token──▶│ localStorage │
└─────────┘           └─────────────┘           └──────────────┘
     │                                              │
     │ Every subsequent request                     │
     │ ┌────────────────────────────────────────────┘
     ▼ ▼
  Authorization: Bearer <token>
     │
     ▼
  JWT decoded → user_id extracted → MongoEngine User lookup → request.user
```

- Tokens expire after **7 days** (`exp` claim)
- Expired/invalid tokens trigger automatic logout and redirect to `/login`
- Passwords are hashed using Django's `make_password` (PBKDF2 by default)

---

## 📴 Offline Support

Papertrail works offline with a robust sync mechanism:

1. **Cache Layer** - Notes are cached in `localStorage` on every successful fetch
2. **Offline Queue** - When offline, create/update/delete operations are queued locally
3. **Auto-Sync** - When connectivity is restored, the queue is replayed against the API in order
4. **Visual Feedback** - Toast notifications inform users of offline status and sync progress

```
Online:   Client ──▶ API ──▶ MongoDB
Offline:  Client ──▶ localStorage (cached notes + offline queue)
Reconnect: Queue replayed ──▶ API ──▶ MongoDB ──▶ Fresh fetch
```

---

## 📱 Progressive Web App (PWA)

Papertrail is a fully installable PWA:

- **Install Prompt** - "Add to Home Screen" on mobile browsers and desktop Chrome/Edge
- **Standalone Mode** - Runs without browser chrome in portrait orientation
- **Auto-Update** - Service worker auto-updates when new versions are deployed
- **Update Prompt** - `ReloadPrompt` component notifies users when a new version is available
- **Offline Fallback** - Workbox caches all static assets and falls back to `index.html` for navigation

---

## 🛡️ Environment Variables

| Variable               | Description                                          | Default / Example                            |
|------------------------|------------------------------------------------------|----------------------------------------------|
| `MONGO_URI`            | MongoDB Atlas connection string                      | `mongodb+srv://user:pass@cluster/dbname`     |
| `SECRET_KEY`           | Django secret key (used for hashing & JWT signing)   | `django-insecure-...`                        |
| `DEBUG`                | Enable/disable debug mode (`False` in production)    | `True`                                       |
| `CORS_ALLOWED_ORIGINS` | Comma-separated allowed origins for CORS             | `http://localhost:5173,http://localhost:4173` |
| `ALLOWED_HOSTS`        | Comma-separated allowed host header domains          | `localhost,127.0.0.1`                        |

See [`.env.example`](.env.example) for the full template.

---

## 🚢 Deployment

### Frontend - Vercel

The React frontend is deployed on **Vercel** with automatic builds from the `notes-frontend/` directory.

### Backend - Render

The Django backend is deployed on **Render** using the included [`render.yaml`](render.yaml) and [`build.sh`](build.sh):

- **Runtime:** Python 3.11
- **Build:** `pip install -r requirements.txt` + `python manage.py collectstatic`
- **Start:** `gunicorn notes.wsgi:application`
- **Environment:** `SECRET_KEY` auto-generated; `MONGO_URI` and `CORS_ALLOWED_ORIGINS` set manually

---

## 🖼️ Screenshots

### Register Form
![Register](<Project Screenshots/register2.png>)

### Login Form
![Login](<Project Screenshots/login2.png>)

### Notes Dashboard
![Home](<Project Screenshots/login22.png>)

### Quick Note Add Form
![QuickForm](<Project Screenshots/quickform2.png>)

### Add Note Modal
![AddNoteForm](<Project Screenshots/addnoteform2.png>)

### Edit Note Modal
![EditNoteForm](<Project Screenshots/editnoteform2.png>)

### Note Pinning
![NotePinning](<Project Screenshots/notepinning2.png>)

### Dark Theme
![DarkTheme](<Project Screenshots/darktheme2.png>)

---

## 🔧 Key Dependencies

### Backend (`requirements.txt`)

| Package              | Version | Purpose                            |
|----------------------|---------|------------------------------------|
| `Django`             | 5.2.12  | Web framework                      |
| `djangorestframework`| 3.16.1  | REST API toolkit                   |
| `django-cors-headers`| 4.9.0  | Cross-origin request handling      |
| `mongoengine`        | 0.29.1  | MongoDB ODM                        |
| `pymongo`            | 4.16.0  | MongoDB driver                     |
| `PyJWT`              | 2.11.0  | JWT token encoding/decoding        |
| `python-dotenv`      | 1.2.2   | Environment variable loading       |
| `dnspython`          | 2.8.0   | DNS resolution for MongoDB SRV URIs|
| `gunicorn`           | 23.0.0  | Production WSGI server             |

### Frontend (`package.json`)

| Package              | Version  | Purpose                           |
|----------------------|----------|------------------------------------|
| `react`              | ^19.2.0  | UI library                         |
| `react-dom`          | ^19.2.0  | React DOM renderer                 |
| `react-router-dom`   | ^7.13.1  | Client-side routing                |
| `axios`              | ^1.13.6  | HTTP client                        |
| `vite`               | ^7.3.1   | Build tool & dev server            |
| `vite-plugin-pwa`    | ^1.3.0   | PWA support with Workbox           |
| `@vitejs/plugin-react`| ^5.1.1  | React fast refresh for Vite        |

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Tips

- The backend uses **two database layers**: MongoEngine for the API and Django ORM (SQLite) for the admin panel. Changes in admin are synced to MongoDB automatically.
- The frontend auto-detects the API URL based on the hostname (localhost, dev tunnels, or production).
- ESLint is configured for React Hooks and React Refresh rules - run `npm run lint` to check.

---

## 📄 License

This project is open source.

---

<p align="center">Built with ❤️ by <strong>A R Shaikh</strong></p>
