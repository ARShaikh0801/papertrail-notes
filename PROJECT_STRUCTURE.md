# 🌳 Papertrail: Complete Project Structure & Database Schema Reference

> This document provides a complete visual tree of the entire project codebase (excluding generated folders like `node_modules`, `venv`, `.git`, and `dist`) along with **exact database variable names**, data types, relationships, and environment configurations.

---

## 📑 Table of Contents
1. [Full Project Directory Tree](#1-full-project-directory-tree)
2. [Database Models & Exact Variable Names (MongoDB / MongoEngine)](#2-database-models--exact-variable-names-mongodb--mongoengine)
3. [Client-Side Offline Storage (IndexedDB Schema)](#3-client-side-offline-storage-indexeddb-schema)
4. [API Routes & Data Payloads](#4-api-routes--data-payloads)
5. [Environment Variables Dictionary](#5-environment-variables-dictionary)

---

## 1. Full Project Directory Tree

```text
notes/                                         # Project Root
├── .env                                       # Backend environment secrets & config
├── .env.example                               # Backend environment sample template
├── .gitignore                                 # Git ignored files & directories
├── build.sh                                   # Render.com automated deployment script
├── db.sqlite3                                 # SQLite database for Django internal sessions/admin
├── manage.py                                  # Django CLI management entrypoint
├── PRODUCTION_TEST_CHECKLIST.md               # Complete production test suite & checklist
├── PROJECT_STRUCTURE.md                       # (This File) Full project tree & DB reference
├── README.md                                  # Project overview, tech stack & setup guide
├── render.yaml                                # Render.com Infrastructure-as-Code Blueprint
├── requirements.txt                           # Python pip backend dependencies
│
├── notes/                                     # Django Project Configuration Core
│   ├── __init__.py                            # Celery app registration on Django startup
│   ├── asgi.py                                # ASGI interface for async web servers
│   ├── celery.py                              # Celery broker, worker & beat configuration
│   ├── settings.py                            # Main Django settings (Mongo, Redis, JWT, CORS, Email)
│   ├── urls.py                                # Top-level URL dispatcher routing to notesApp & admin
│   └── wsgi.py                                # WSGI entrypoint for Gunicorn production server
│
├── notesApp/                                  # Django App (Core Backend API)
│   ├── __init__.py
│   ├── admin.py                               # Django Admin site model registration
│   ├── admin_views.py                         # Admin dashboard APIs (metrics, users, notes CRUD)
│   ├── apps.py                                # Django AppConfig for notesApp
│   ├── authentication.py                      # Custom JWTAuthentication class (token & version validation)
│   ├── models.py                              # MongoEngine Document models (User, Note, VerificationCode, Stats)
│   ├── permissions.py                         # DRF custom permissions (IsAdmin)
│   ├── serializers.py                         # DRF serializers (Register, Login, Note, ChecklistItem)
│   ├── tasks.py                               # Celery async tasks (send_email_async, purge_expired_trash_task)
│   ├── tests.py                               # Unit test entrypoint
│   ├── urls.py                                # App API route definitions (/api/auth, /api/notes, /api/admin)
│   ├── utils.py                               # JWT encode/decode tokens, email HTML generators
│   ├── views.py                               # Main business logic & APIViews for notes & auth
│   │
│   ├── management/                            # Custom Django Management Commands
│   │   ├── __init__.py
│   │   └── commands/
│   │       ├── __init__.py
│   │       ├── make_admin.py                  # CLI command to promote user to admin (python manage.py make_admin)
│   │       ├── migrate_note_users.py          # Data migration utility for user references
│   │       └── purge_expired_trash.py         # CLI command to trigger trash cleanup
│   │
│   ├── migrations/                            # Django ORM Migrations for SQLite models
│   │   ├── 0001_initial.py                    # Initial migration for NoteORM, UserORM, StatsORM
│   │   ├── 0002_noteorm_deleted_at_noteorm_is_deleted.py # Added soft-delete fields to NoteORM
│   │   └── __init__.py
│   │
│   └── templates/                             # Backend HTML Templates
│       └── admin/
│           └── index.html                     # Embedded Admin Web Dashboard SPA
│
└── notes-frontend/                            # Frontend Single Page Application (React + Vite)
    ├── .env                                   # Frontend environment config (VITE_API_BASE_URL)
    ├── .env.example                           # Frontend environment sample template
    ├── .gitignore                             # Frontend git ignore configuration
    ├── eslint.config.js                       # ESLint code quality configuration
    ├── index.html                             # HTML5 root template (SEO meta, fonts, PWA tags)
    ├── package.json                           # NPM dependencies, scripts, and build commands
    ├── package-lock.json                      # Locked npm dependency tree
    ├── vite.config.js                         # Vite build tool & PWA plugin configuration
    │
    ├── public/                                # Static Public Assets
    │   ├── favicon.ico                        # Papertrail browser favicon
    │   ├── favicon.png                        # PNG Favicon
    │   ├── logo.png                           # Main Papertrail logo
    │   ├── manifest.json                      # Progressive Web App (PWA) manifest
    │   └── pwa-icon.png                       # PWA installable application icon
    │
    └── src/                                   # React Source Code
        ├── App.jsx                            # Root component with routing and auth guards
        ├── main.jsx                           # React DOM bootstrap entrypoint
        ├── index.css                          # Global design system, CSS variables & typography
        │
        ├── api/                               # Network API Client
        │   └── axios.js                       # Axios instance with auth interceptors & baseURL
        │
        ├── context/                           # React Context Providers
        │   └── NoteContext.jsx                # Global state provider for notes, search, filters & user
        │
        ├── hooks/                             # Custom React Hooks
        │   ├── useNotes.js                    # Fetching, creating, updating, pinning, locking notes
        │   ├── useOfflineSync.js              # Auto-sync queue when internet reconnects
        │   ├── useToast.js                    # Toast notification dispatcher
        │   └── useTrash.js                    # Trash list, restore, and permanent delete actions
        │
        ├── pages/                             # Top-level Page Views
        │   ├── Login.jsx                      # Login, Forgot Password, and Guest Mode page
        │   ├── login.css                      # Styling for Login & Auth Modals
        │   ├── Notes.jsx                      # Main Notes dashboard (Grid, List, Search, Filter)
        │   ├── notes.css                      # Styling for Notes dashboard
        │   ├── Register.jsx                   # Registration & Email verification page
        │   └── register.css                   # Styling for Register page
        │
        ├── components/                        # UI Components
        │   ├── ChecklistBuilder.jsx           # Interactive checklist creation & drag-to-check
        │   ├── ConfirmModal.jsx               # Universal modal for confirmation actions
        │   ├── CreateNoteModal.jsx            # Rich popup modal to create notes/checklists
        │   ├── EditNoteModal.jsx              # Rich popup modal to edit existing notes
        │   ├── FontSizeExtension.js           # Rich-text editor custom font sizing extension
        │   ├── Footer.jsx                     # Footer with visitor count and copyright
        │   ├── FormattingToolbar.jsx          # Bold, italic, underline, list format buttons
        │   ├── GuestBanner.jsx                # Top banner warning for unauthenticated guest users
        │   ├── LoginLoader.jsx                # Animated smooth loading screen on auth transition
        │   ├── NoteCard.jsx                   # Individual note card with pin, lock, edit, trash actions
        │   ├── NotesGrid.jsx                  # Masonry / responsive grid container for note cards
        │   ├── NotesNav.jsx                   # Top navigation bar (Search, Filter, View toggle, User menu)
        │   ├── PasswordModal.jsx              # Prompt modal to enter password for unlocking locked notes
        │   ├── QuickCreateForm.jsx            # Inline quick note creation card at top of feed
        │   ├── ReloadPrompt.jsx               # PWA service worker update prompt
        │   ├── Sidebar.jsx                    # Navigation sidebar (All Notes, Checklists, Locked, Trash)
        │   ├── Spinner.jsx                    # Lightweight CSS loading spinner
        │   ├── ThemeToggle.jsx                # Dark / Light / System theme switch button
        │   ├── ToastContainer.jsx             # Floating toast messages container
        │   └── TrashBanner.jsx                # Top warning banner inside Trash view
        │
        ├── styles/                            # Component-level Modular CSS
        │   ├── ChecklistBuilder.css
        │   ├── ConfirmModal.css
        │   ├── Create&EditNoteModal.css
        │   ├── Footer.css
        │   ├── FormattingToolbar.css
        │   ├── LoginLoader.css
        │   ├── NoteCard.css
        │   ├── NotesNav.css
        │   ├── QuickCreateForm.css
        │   ├── Sidebar.css
        │   ├── Spinner.css
        │   └── ThemeToggle.css
        │
        └── utils/                             # Client Utilities & Helpers
            ├── dateFormatter.js               # Human-friendly date formatting (e.g. "2 hours ago")
            ├── guestMigration.js              # Migrates local guest notes to cloud on user registration
            ├── indexedDB.js                   # Client-side IndexedDB wrapper for local-first storage
            └── offlineSync.js                 # Offline mutation queue and server synchronization logic
```

---

## 2. Database Models & Exact Variable Names (MongoDB / MongoEngine)

Located in `notesApp/models.py`.

### 👤 1. `User` Model
* **Collection Name:** `users`
* **Purpose:** Stores registered user accounts and authentication state.

| Exact Variable Name | MongoEngine Field Type | Constraints & Defaults | Description |
|---|---|---|---|
| `id` | `ObjectId` (Auto) | Primary Key | Unique MongoDB document identifier |
| `username` | `StringField` | `required=True`, `unique=True` | Unique handle for user |
| `email` | `EmailField` | `required=True`, `unique=True` | Unique email for authentication & verification |
| `password` | `StringField` | `required=True` | Securely hashed password string (PBKDF2/Argon2) |
| `is_admin` | `BooleanField` | `default=False` | Flag granting access to `/admin` dashboard APIs |
| `token_version` | `IntField` | `default=0` | Increments on password change to invalidate old JWTs |

#### Model Methods:
* `set_password(raw_password)`: Hashes raw password, increments `token_version`, saves document.
* `check_password(raw_password)`: Compares raw password with stored hash.
* `is_authenticated`: Property returning `True`.

---

### ☑️ 2. `ChecklistItem` (Embedded Document)
* **Embedded Inside:** `Note.items`
* **Purpose:** Represents an individual item in a checklist note.

| Exact Variable Name | MongoEngine Field Type | Constraints & Defaults | Description |
|---|---|---|---|
| `text` | `StringField` | `required=True`, `max_length=500` | Checklist item label/text content |
| `checked` | `BooleanField` | `default=False` | Completion state checkbox status |

---

### 📝 3. `Note` Model
* **Collection Name:** `notes`
* **Purpose:** Stores rich text notes and checklists belonging to users.

| Exact Variable Name | MongoEngine Field Type | Constraints & Defaults | Description |
|---|---|---|---|
| `id` | `ObjectId` (Auto) | Primary Key | Unique MongoDB document identifier |
| `user` | `ReferenceField(User)` | `required=True`, `reverse_delete_rule=CASCADE` | Foreign key referencing the note's owner |
| `title` | `StringField` | `required=True`, `max_length=200` | Note title |
| `content` | `StringField` | `required=False`, `max_length=50000` | Note text body or HTML formatted rich content |
| `is_pinned` | `BooleanField` | `default=False` | If `True`, pins note to top of list |
| `is_checklist` | `BooleanField` | `default=False` | If `True`, note renders as checklist using `items` |
| `is_locked` | `BooleanField` | `default=False` | If `True`, note requires password to view body |
| `is_deleted` | `BooleanField` | `default=False` | Soft delete flag (moved to Trash) |
| `deleted_at` | `DateTimeField` | `default=None` | UTC timestamp when note was moved to Trash |
| `items` | `ListField(EmbeddedDocumentField(ChecklistItem))` | `max_length=100` | Array of up to 100 embedded checklist items |
| `created_at` | `DateTimeField` | `default=_get_utc_now` | UTC creation timestamp |
| `updated_at` | `DateTimeField` | `default=_get_utc_now` | UTC last updated timestamp |

#### MongoDB Indexes:
* `{'fields': ['user', 'is_deleted', '-is_pinned', '-created_at']}` (Optimizes active notes feed query)
* `{'fields': ['user', 'is_deleted', '-deleted_at']}` (Optimizes trash query and 30-day purge query)

---

### 🔢 4. `VerificationCode` Model
* **Collection Name:** `verification_codes`
* **Purpose:** Stores 6-digit OTP verification codes for registration and password reset.

| Exact Variable Name | MongoEngine Field Type | Constraints & Defaults | Description |
|---|---|---|---|
| `id` | `ObjectId` (Auto) | Primary Key | Unique MongoDB document identifier |
| `email` | `EmailField` | `required=True`, `unique=True` | Recipient email address |
| `code` | `StringField` | `required=True` | 6-digit numeric OTP code |
| `attempts` | `IntField` | `default=0` | Failed verification attempt counter (locked at 10) |
| `created_at` | `DateTimeField` | `default=_get_utc_now` | UTC code creation timestamp (expires in 10 mins) |
| `sent_at` | `DateTimeField` | `default=_get_utc_now` | UTC last sent timestamp (enforces 60s cooldown) |

---

### 📊 5. `Stats` Model
* **Collection Name:** `stats`
* **Purpose:** Stores key-value metric counters (e.g. global page visits).

| Exact Variable Name | MongoEngine Field Type | Constraints & Defaults | Description |
|---|---|---|---|
| `id` | `ObjectId` (Auto) | Primary Key | Unique MongoDB document identifier |
| `name` | `StringField` | `required=True`, `unique=True` | Metric key name (e.g. `"visits"`) |
| `count` | `IntField` | `default=0` | Current counter integer value |

---

## 3. Client-Side Offline Storage (IndexedDB Schema)

Located in `notes-frontend/src/utils/indexedDB.js`.

* **Database Name:** `PapertrailDB`
* **Object Store:** `notes` (KeyPath: `id`)
* **Object Store:** `sync_queue` (KeyPath: `queue_id`)

| Local Field Name | Data Type | Description |
|---|---|---|
| `id` | `String` | Temporary local UUID or MongoDB ObjectId |
| `title` | `String` | Note title |
| `content` | `String` | Note body |
| `is_pinned` | `Boolean` | Pin status |
| `is_checklist` | `Boolean` | Checklist flag |
| `is_locked` | `Boolean` | Lock status |
| `is_deleted` | `Boolean` | Trash status |
| `deleted_at` | `String (ISO)` | Timestamp of deletion |
| `items` | `Array` | Checklist items array |
| `created_at` | `String (ISO)` | Local creation timestamp |
| `updated_at` | `String (ISO)` | Local update timestamp |
| `_sync_status` | `String` | Status: `'synced'` \| `'pending_create'` \| `'pending_update'` \| `'pending_delete'` |

---

## 4. API Routes & Data Payloads

### 🔑 Authentication Routes (`/api/auth/`)
| Endpoint | Method | Input Payload Variables | Output Response Variables |
|---|---|---|---|
| `/api/auth/send-code/` | `POST` | `email` | `message`, `cooldown` |
| `/api/auth/register/` | `POST` | `username`, `email`, `password`, `code` | `token`, `user: {id, username, email, is_admin}` |
| `/api/auth/login/` | `POST` | `email` (or `username`), `password` | `token`, `user: {id, username, email, is_admin}` |
| `/api/auth/forgot-password/send-code/` | `POST` | `email` | `message`, `cooldown` |
| `/api/auth/forgot-password/reset/` | `POST` | `email`, `code`, `new_password` | `message` |

### 📝 Notes Routes (`/api/notes/`)
| Endpoint | Method | Description |
|---|---|---|
| `/api/notes/` | `GET` | List active notes for authenticated user (Cached in Redis) |
| `/api/notes/` | `POST` | Create note (`title`, `content`, `is_checklist`, `items`, `is_pinned`) |
| `/api/notes/<note_id>/` | `GET` | Retrieve single note details |
| `/api/notes/<note_id>/` | `PUT` / `PATCH` | Update note fields |
| `/api/notes/<note_id>/` | `DELETE` | Soft-delete note (moves to trash) |
| `/api/notes/trash/` | `GET` | List trashed notes |
| `/api/notes/<note_id>/restore/` | `POST` | Restore trashed note |
| `/api/notes/<note_id>/permanent/` | `DELETE` | Permanently delete note from MongoDB |
| `/api/notes/<note_id>/lock/` | `POST` | Lock note (`password`) |
| `/api/notes/<note_id>/unlock/` | `POST` | Unlock note body temporarily (`password`) |
| `/api/notes/<note_id>/remove-lock/` | `POST` | Permanently remove lock status (`password`) |

### 👑 Admin Routes (`/api/admin/`)
| Endpoint | Method | Description |
|---|---|---|
| `/api/admin/login/` | `POST` | Admin login (`email`, `password`) - verifies `is_admin=True` |
| `/api/admin/dashboard/` | `GET` | Returns aggregated metrics (`total_users`, `total_notes`, `trashed_notes`) |
| `/api/admin/users/` | `GET` | Paginated list of registered users |
| `/api/admin/users/<user_id>/` | `DELETE` | Delete user and CASCADE delete all their notes |
| `/api/admin/notes/` | `GET` | List notes across the entire platform |
| `/api/admin/notes/<note_id>/` | `DELETE` | Admin wipe of any note |
| `/api/admin/stats/` | `GET` | Returns visitor count and system telemetry |

### 🩺 System & Metrics Routes
| Endpoint | Method | Description |
|---|---|---|
| `/api/stats/` | `GET` | Increment and retrieve global visitor counter (`visits`) |
| `/api/health/` | `GET` | Uptime check returning `{status: "healthy", database: "connected"}` |

---

## 5. Environment Variables Dictionary

### Backend `.env`
```ini
# Django Core
SECRET_KEY=your-django-secret-key-here
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1,.devtunnels.ms,papertrail-notes.onrender.com

# Database (MongoDB Atlas)
MONGO_URI=mongodb+srv://<username>:<password>@cluster0.mongodb.net/Notes_2?retryWrites=true&w=majority

# Caching & Message Broker (Upstash / Redis)
REDIS_URL=redis://default:<password>@<host>:<port>

# CORS & Security
CORS_ALLOWED_ORIGINS=http://localhost:5173,https://papertrail-notes.vercel.app

# Email SMTP (Gmail / SendGrid)
EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_USE_SSL=False
EMAIL_HOST_USER=your-email@gmail.com
EMAIL_HOST_PASSWORD=your-app-password
DEFAULT_FROM_EMAIL=Papertrail <no-reply@papertrail.com>
```

### Frontend `notes-frontend/.env`
```ini
# Backend API Base URL
VITE_API_BASE_URL=http://localhost:8000
```
