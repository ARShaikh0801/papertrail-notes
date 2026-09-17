# 📝 Papertrail - Full-Stack Notes Application

A modern, full-stack notes application built with **Django REST Framework** and **React 19**. Create, edit, pin, lock, format, and organise your notes with a beautiful dark-mode UI - backed by MongoDB Atlas, Redis caching, Celery asynchronous processing, and installable as a **Progressive Web App**.

🔗 **Live Demo:** [papertrail-notes.vercel.app](https://papertrail-notes.vercel.app)

<p>
  <img src="https://img.shields.io/badge/Python-3.11-blue?style=for-the-badge&logo=python&logoColor=white" alt="Python" />
  <img src="https://img.shields.io/badge/Django-5.2-green?style=for-the-badge&logo=django&logoColor=white" alt="Django" />
  <img src="https://img.shields.io/badge/DRF-3.16-red?style=for-the-badge&logo=django&logoColor=white" alt="DRF" />
  <img src="https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=white" alt="React" />
  <img src="https://img.shields.io/badge/Vite-7-646CFF?style=for-the-badge&logo=vite&logoColor=white" alt="Vite" />
  <img src="https://img.shields.io/badge/MongoDB-Atlas-47A248?style=for-the-badge&logo=mongodb&logoColor=white" alt="MongoDB" />
  <img src="https://img.shields.io/badge/Redis-Cache-DC382D?style=for-the-badge&logo=redis&logoColor=white" alt="Redis" />
  <img src="https://img.shields.io/badge/PWA-Enabled-5A0FC8?style=for-the-badge&logo=pwa&logoColor=white" alt="PWA" />
</p>

---

## ✨ Features

### Core Notes & Organization
- **JWT Authentication** - Secure token-based auth with token-version invalidation on password change
- **Email OTP Verification** - 6-digit email verification for signups and self-service password resets
- **Rich Text & Formatting** - Rich note content formatting with a toolbar (bold, italic, underline, strikethrough, headings, lists) and secure HTML sanitization via Bleach
- **Checklists** - Convert any note into an interactive checklist with individually checkable items
- **Pin Notes** - Keep important notes pinned at the top with dedicated sorting
- **Real-Time Search & Filters** - Client-side search across titles, content, and checklist items with sidebar view filters (All Notes, Checklists, Locked, Trash)
- **Trash & Soft-Delete** - Safely recover deleted notes from Trash or permanently remove them, with automatic 30-day background purge

### Security & Privacy
- **Note Locking** - Password-protect sensitive notes; locked note content is masked (`****`) on the server
- **Granular Throttling** - Sensitive auth endpoints throttled to 5 requests/min; create and CRUD rate limits
- **HTML Sanitization** - Server-side XSS protection with strict tag and attribute whitelisting
- **Security Headers** - XSS filter, content-type sniffing protection, clickjacking prevention (`X-Frame-Options: DENY`), and HTTP-only cookies

### Offline & PWA
- **Local-First Storage (IndexedDB)** - Ultra-fast client-side persistence powered by IndexedDB
- **Offline Sync Queue** - Seamless offline operations with automatic synchronization when network connectivity is restored
- **Multi-Tab Sync** - Synchronized note state across multiple open tabs via BroadcastChannel events
- **Progressive Web App** - Installable on mobile and desktop via browser prompt with Workbox asset caching

### Guest Mode & Migration
- **Try Without Signing Up** - Experience the full app as a guest with local IndexedDB storage
- **Seamless Account Migration** - Automatically migrate all guest notes to your new account upon registration or login

### Performance & Architecture
- **Redis Caching** - Multi-tiered caching for user notes lists and admin dashboard metrics
- **Asynchronous Tasks (Celery)** - Non-blocking async email dispatch and scheduled periodic maintenance tasks

### Administration
- **Custom Admin Dashboard** - Dedicated admin web interface (`/dashboard/`) with platform telemetry, user management, and note moderation
- **Visitor Analytics** - Built-in stats endpoint tracking page visits and platform adoption
- **Health Check** - `/api/health/` endpoint for server and database uptime monitoring

---

## 🏗️ Tech Stack

| Layer         | Technology                                                         |
|---------------|--------------------------------------------------------------------|
| **Frontend**  | React 19, Vite 7, React Router 7, Axios, Lucide Icons              |
| **Backend**   | Django 5.2, Django REST Framework 3.16                             |
| **Database**  | MongoDB Atlas (via MongoEngine 0.29)                               |
| **Cache & Tasks** | Redis (Cache & Broker), Celery 5.6 (Async background processing)|
| **Auth**      | Custom JWT (PyJWT 2.11) with Bearer token scheme & Token Versioning|
| **PWA & Offline** | vite-plugin-pwa 1.3, Workbox, IndexedDB local-first storage   |
| **Security**  | Bleach 6.0 (HTML sanitization), Scoped DRF Throttling              |
| **Deployment**| Vercel (frontend) + Render (backend via Gunicorn)                 |

---

## 📂 Project Structure

```
papertrail-notes/
├── .env.example              # Backend environment variable template
├── .gitignore                # Git ignore rules
├── manage.py                 # Django management CLI script
├── requirements.txt          # Python dependencies
├── build.sh                  # Render deployment build script
├── render.yaml               # Render Infrastructure-as-Code blueprint
│
├── notes/                    # Django project core
│   ├── __init__.py           # Celery app registration
│   ├── celery.py             # Celery broker & worker configuration
│   ├── settings.py           # Project settings (MongoDB, Redis, JWT, CORS, Email)
│   ├── urls.py               # Top-level URL routing (/dashboard, /api)
│   ├── wsgi.py               # WSGI entrypoint for Gunicorn
│   └── asgi.py               # ASGI interface
│
├── notesApp/                 # Backend API Application
│   ├── models.py             # MongoEngine Document models (User, Note, VerificationCode, Stats)
│   ├── views.py              # Core API views (Auth, Notes CRUD, Trash, Lock, Stats, Health)
│   ├── admin_views.py        # Admin dashboard APIs (metrics, users, notes moderation)
│   ├── permissions.py        # Custom permissions (IsAdmin)
│   ├── serializers.py        # DRF serializers with data sanitization & masking
│   ├── authentication.py     # Custom JWT Authentication backend
│   ├── tasks.py              # Celery async tasks (email delivery, trash cleanup)
│   ├── urls.py               # App API route definitions
│   ├── utils.py              # Token generators, time helpers & HTML sanitization
│   ├── templates/            # HTML templates
│   │   └── admin/
│   │       └── index.html    # Custom Admin Dashboard web portal
│   └── management/
│       └── commands/
│           ├── make_admin.py          # Promote a user to admin role
│           └── purge_expired_trash.py # CLI command for expired trash cleanup
│
└── notes-frontend/           # React + Vite frontend SPA
    ├── .env.example          # Frontend environment template
    ├── .gitignore
    ├── vite.config.js        # Vite config with PWA plugin & manifest
    ├── package.json
    ├── index.html
    └── src/
        ├── App.jsx           # Root component with router & auth guards
        ├── main.jsx          # Entry point
        ├── index.css         # Global design system & theme variables
        ├── api/
        │   └── axios.js      # Axios instance with JWT interceptor & auto-redirect
        ├── context/
        │   └── NoteContext.jsx # Global notes state & filter management
        ├── hooks/
        │   ├── useNotes.js        # Note CRUD, locking, and pinning actions
        │   ├── useOfflineSync.js  # Online/offline sync queue dispatcher
        │   ├── useToast.js        # Toast notification dispatcher
        │   └── useTrash.js        # Trash list, restore & permanent delete
        ├── components/
        │   ├── ChecklistBuilder.jsx # Interactive checklist editor
        │   ├── ConfirmModal.jsx     # Universal confirmation modal
        │   ├── CreateNoteModal.jsx  # Full note creation modal
        │   ├── EditNoteModal.jsx    # Note editing modal
        │   ├── FormattingToolbar.jsx # Rich-text format buttons
        │   ├── GuestBanner.jsx      # Banner for unauthenticated guest sessions
        │   ├── NoteCard.jsx         # Note card with actions
        │   ├── NotesGrid.jsx        # Responsive grid/masonry container
        │   ├── NotesNav.jsx         # Top navigation bar
        │   ├── PasswordModal.jsx    # Password prompt for locked notes
        │   ├── QuickCreateForm.jsx  # Inline quick-add form
        │   ├── Sidebar.jsx          # Navigation sidebar (All, Checklists, Locked, Trash)
        │   ├── ThemeToggle.jsx      # Dark/light mode switch
        │   ├── ToastContainer.jsx   # Toast notifications container
        │   └── TrashBanner.jsx      # Informational banner inside Trash view
        ├── pages/
        │   ├── Login.jsx            # Login & forgot-password page
        │   ├── Register.jsx         # Registration & email verification page
        │   └── Notes.jsx            # Main notes dashboard
        ├── styles/                  # Component modular CSS
        └── utils/
            ├── dateFormatter.js     # Human-readable date formatting
            ├── guestMigration.js    # Guest-to-user local note migration
            ├── indexedDB.js         # Client-side IndexedDB database layer
            └── offlineSync.js       # Offline queue & auto-sync logic
```

---

## 🚀 Getting Started

### Prerequisites

- **Python 3.10+**
- **Node.js 18+** and **npm**
- **MongoDB Atlas** account (or local MongoDB instance)
- *(Optional)* **Redis** instance for caching and background Celery tasks

---

### 1. Clone the Repository

```bash
git clone https://github.com/ARShaikh0801/papertrail-notes.git
cd papertrail-notes
```

---

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
# Configure your MONGO_URI, SECRET_KEY, and EMAIL settings in .env

# Run the Django development server
python manage.py runserver
```

- API Base URL: **http://127.0.0.1:8000/api/**
- Admin Dashboard: **http://127.0.0.1:8000/dashboard/**

> **Tip:** To grant admin access to a user account, run:
> ```bash
> python manage.py make_admin <username>
> ```

---

### 3. Frontend Setup

```bash
cd notes-frontend

# Install dependencies
npm install

# Start the Vite dev server
npm run dev
```

- App Web URL: **http://localhost:5173**

---

### 4. Production Build (Frontend)

```bash
cd notes-frontend
npm run build    # Outputs to dist/
npm run preview  # Preview the production bundle locally
```

---

## 🔌 API Endpoints

### 🔑 Authentication (`/api/auth/`)

| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `POST` | `/api/auth/send-code/` | Send 6-digit email OTP for registration | No |
| `POST` | `/api/auth/register/` | Register new user with OTP code | No |
| `POST` | `/api/auth/login/` | Log in and receive JWT token | No |
| `POST` | `/api/auth/forgot-password/send-code/` | Send password reset OTP code | No |
| `POST` | `/api/auth/forgot-password/reset/` | Reset account password with OTP | No |

### 📝 Notes Management (`/api/notes/`)

| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `GET` | `/api/notes/` | List active user notes (cached in Redis) | Required |
| `POST` | `/api/notes/` | Create a new note / checklist | Required |
| `GET` | `/api/notes/<note_id>/` | Retrieve specific note details | Required |
| `PATCH` | `/api/notes/<note_id>/` | Update note content / attributes | Required |
| `DELETE` | `/api/notes/<note_id>/` | Soft-delete note (move to Trash) | Required |

### 🗑️ Trash & Recovery (`/api/notes/`)

| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `GET` | `/api/notes/trash/` | List notes currently in Trash | Required |
| `POST` | `/api/notes/<note_id>/restore/` | Restore note from Trash | Required |
| `DELETE` | `/api/notes/<note_id>/permanent/` | Permanently delete note from database | Required |

### 🔒 Note Locking (`/api/notes/`)

| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `POST` | `/api/notes/<note_id>/lock/` | Password-protect a note | Required |
| `POST` | `/api/notes/<note_id>/unlock/` | Temporarily unlock note content | Required |
| `POST` | `/api/notes/<note_id>/remove-lock/` | Permanently remove lock from note | Required |

### 👑 Admin Portal (`/api/admin/`)

| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `POST` | `/api/admin/login/` | Admin login verification | Admin Token |
| `GET` | `/api/admin/dashboard/` | Aggregated system metrics | Admin Token |
| `GET` | `/api/admin/users/` | Paginated list of registered users | Admin Token |
| `DELETE` | `/api/admin/users/<user_id>/` | Delete user and CASCADE delete notes | Admin Token |
| `GET` | `/api/admin/notes/` | List platform-wide notes | Admin Token |
| `DELETE` | `/api/admin/notes/<note_id>/` | Moderate / delete note | Admin Token |
| `GET` | `/api/admin/stats/` | System telemetry & traffic metrics | Admin Token |

### 🩺 System & Metrics (`/api/`)

| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `GET` | `/api/stats/` | Retrieve and increment visitor counter | No |
| `GET` | `/api/health/` | Server and database health check | No |

---

## 🛡️ Environment Variables

| Variable | Description | Example / Default |
|---|---|---|
| `SECRET_KEY` | Django secret key for crypto & JWT signing | `django-insecure-xyz...` |
| `DEBUG` | Toggle debug mode (`False` in production) | `True` |
| `ALLOWED_HOSTS` | Comma-separated allowed host header domains | `localhost,127.0.0.1,.onrender.com` |
| `MONGO_URI` | MongoDB Atlas connection string | `mongodb+srv://user:pass@cluster.mongodb.net/Notes_2` |
| `CORS_ALLOWED_ORIGINS` | Comma-separated allowed CORS origins | `http://localhost:5173,https://papertrail-notes.vercel.app` |
| `REDIS_URL` | *(Optional)* Redis connection string for cache & Celery | `redis://127.0.0.1:6379/0` |
| `EMAIL_BACKEND` | Django email backend class | `django.core.mail.backends.smtp.EmailBackend` |
| `EMAIL_HOST` | SMTP server hostname | `smtp.gmail.com` |
| `EMAIL_PORT` | SMTP server port | `587` |
| `EMAIL_USE_TLS` | Enable TLS encryption | `True` |
| `EMAIL_HOST_USER` | SMTP username / email address | `your-email@gmail.com` |
| `EMAIL_HOST_PASSWORD` | SMTP app password | `your-app-password` |
| `DEFAULT_FROM_EMAIL` | Default sender header in outgoing emails | `Papertrail <no-reply@papertrail.com>` |

---

## 🚢 Deployment

### Frontend - Vercel
The React frontend is deployed on **Vercel** with continuous deployment from the `notes-frontend/` directory.

### Backend - Render
The Django backend is deployed on **Render** using the provided [`render.yaml`](render.yaml) blueprint and [`build.sh`](build.sh):
- **Runtime:** Python 3.11
- **Build Command:** `./build.sh` (`pip install -r requirements.txt` + `python manage.py collectstatic --no-input`)
- **Start Command:** `celery -A notes worker --loglevel=info --concurrency=2 & gunicorn notes.wsgi:application`

---

## 🖼️ Screenshots

### Register & OTP Verification
![Register](<Project Screenshots/register2.png>)

### Login
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

## 📄 License

This project is open source.

---

<p align="center">Built with ❤️ by <strong>A R Shaikh</strong></p>
