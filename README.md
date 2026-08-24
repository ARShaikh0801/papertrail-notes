# 📝 Papertrail - Full-Stack Notes Application

A modern, full-stack notes app built with **Django REST Framework** and **React 19**. Create, edit, pin, and organize your notes with a beautiful dark-mode UI - backed by MongoDB Atlas.

🔗 **Live Demo:** [papertrail-notes.vercel.app](https://papertrail-notes.vercel.app)

![Python](https://img.shields.io/badge/Python-3.x-blue?logo=python)
![Django](https://img.shields.io/badge/Django-4.2-green?logo=django)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)
![Vite](https://img.shields.io/badge/Vite-7-646CFF?logo=vite)
![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-47A248?logo=mongodb)

---

## ✨ Features

- **JWT Authentication** - Secure register & login with token-based auth
- **CRUD Notes** - Create, read, update, and delete notes
- **Pin Notes** - Keep important notes at the top
- **Checklists** - Convert notes into interactive checklists with checkable items
- **Dark Mode** - Elegant theme toggle with localStorage persistence
- **Responsive Design** - Fully responsive across mobile, tablet, and desktop
- **Quick Create** - Rapidly add notes from an inline form
- **Beautiful UI** - Modern glassmorphism, smooth animations, and polished design

---

## 🏗️ Tech Stack

| Layer        | Technology                                |
|--------------|-------------------------------------------|
| **Frontend** | React 19, Vite 7, React Router 7, Axios  |
| **Backend**  | Django 4.2, Django REST Framework         |
| **Database** | MongoDB Atlas (via MongoEngine)           |
| **Auth**     | JWT (PyJWT) - custom token implementation |
| **Styling**  | Vanilla CSS with CSS variables & themes   |

---

## 📂 Project Structure

```
notes/
├── .env.example          # Environment variable template
├── .gitignore
├── manage.py
│
├── notes/                # Django project config
│   ├── settings.py
│   ├── urls.py
│   ├── wsgi.py
│   └── asgi.py
│
├── notesApp/             # Django app (API)
│   ├── models.py         # User & Note models (MongoEngine)
│   ├── views.py          # API views (Register, Login, Notes CRUD)
│   ├── serializers.py    # DRF serializers
│   ├── urls.py           # API routes
│   └── utils.py          # JWT token utilities
│
└── notes-frontend/       # React + Vite frontend
    ├── src/
    │   ├── components/   # Reusable UI components
    │   │   ├── ChecklistBuilder.jsx
    │   │   ├── CreateNoteModal.jsx
    │   │   ├── EditNoteModal.jsx
    │   │   ├── NoteCard.jsx
    │   │   ├── NotesNav.jsx
    │   │   ├── QuickCreateForm.jsx
    │   │   ├── ThemeToggle.jsx
    │   │   └── Spinner.jsx
    │   ├── pages/        # Route pages
    │   │   ├── Login.jsx
    │   │   ├── Register.jsx
    │   │   └── Notes.jsx
    │   ├── api/          # Axios instance with JWT interceptor
    │   ├── utils/        # Date formatting helpers
    │   └── styles/       # Component-level CSS files
    └── package.json
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

# Install dependencies from requirements.txt
pip install -r requirements.txt

# Create your .env file from the template
cp .env.example .env
# Edit .env with your MongoDB URI, SECRET_KEY, and other configuration variables

# Run the Django server
python manage.py runserver
```

The API will be available at **http://127.0.0.1:8000/api/**

### 3. Frontend Setup

```bash
cd notes-frontend

# Install dependencies
npm install

# Start the dev server
npm run dev
```

The app will be available at **http://localhost:5173**

---

## 🔌 API Endpoints

| Method   | Endpoint                   | Description           | Auth     |
|----------|----------------------------|-----------------------|----------|
| `POST`   | `/api/auth/register/`      | Register a new user   | No       |
| `POST`   | `/api/auth/login/`         | Login & get JWT token | No       |
| `GET`    | `/api/notes/`              | List all user notes   | Required |
| `POST`   | `/api/notes/`              | Create a new note     | Required |
| `PATCH`  | `/api/notes/<note_id>/`    | Update a note         | Required |
| `DELETE` | `/api/notes/<note_id>/`    | Delete a note         | Required |

---

## Screenshot

# Register Form
![Register](<Project Screenshots/register2.png>)

# Login Form
![Login](<Project Screenshots/login2.png>)

# First Page Look
![Home](<Project Screenshots/login22.png>)

# Quick Note Add Form
![QuickForm](<Project Screenshots/quickform2.png>)

# Add Note Form
![AddNoteForm](<Project Screenshots/addnoteform2.png>)

# Edit Note Form
![EditNoteForm](<Project Screenshots/editnoteform2.png>)

# Note Pinning Feature
![NotePinning](<Project Screenshots/notepinning2.png>)

# Dark Theme
![DarkTheme](<Project Screenshots/darktheme2.png>)

---

## 🛡️ Environment Variables

| Variable                 | Description                                                 | Default / Example                                                |
|--------------------------|-------------------------------------------------------------|------------------------------------------------------------------|
| `MONGO_URI`              | MongoDB Atlas connection string                             | `mongodb+srv://...`                                              |
| `SECRET_KEY`             | Django secret key (used for hashing & JWT signing)          | `django-insecure-...`                                            |
| `DEBUG`                  | Enable/disable debug mode (use `False` in production)        | `True`                                                           |
| `CORS_ALLOWED_ORIGINS`   | Comma-separated list of backend CORS allowed origins        | `http://localhost:5173,http://localhost:4173`                    |
| `ALLOWED_HOSTS`          | Comma-separated list of allowed host header domains         | `localhost,127.0.0.1`                                            |

See [`.env.example`](.env.example) for a template.

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

This project is open source.

---

<p align="center">Built with ❤️ by <strong>A R Shaikh</strong></p>
