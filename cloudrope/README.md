# Cloudrope — Frontend

A personal file-sharing web app frontend built with React 18, Redux Toolkit, Tailwind CSS, and React Router v6.

## Stack

| Tool | Purpose |
|---|---|
| React 18 + Vite | UI framework & dev server |
| Redux Toolkit | Global state for files, trash, and shares |
| React Router v6 | Client-side routing |
| Axios | HTTP client with JWT auth interceptors |
| React Hook Form | Form state & validation |
| Tailwind CSS v3 | Styling |
| React Hot Toast | Toast notifications |
| Lucide React | Icons |

## Quick start

```bash
# 1. Install dependencies
npm install

# 2. Start dev server (proxies /auth and /files → http://localhost:8000)
npm run dev
```

The dev server runs at **http://localhost:5173**.  
The backend is expected at **http://localhost:8000**.

## Environment

```bash
cp .env.example .env
```

In development the Vite proxy handles CORS — no env var needed.  
For production set `VITE_API_BASE=https://your-backend.example.com`.

## Project structure

```
src/
├── api/
│   ├── axios.js        # Axios instance + JWT interceptors (auto-refresh on 401)
│   ├── auth.js         # Auth API calls
│   └── files.js        # Files / shares API calls
├── context/
│   └── AuthContext.jsx # Global auth state (user, tokens, login, logout…)
├── store/
│   ├── index.js        # Redux store
│   ├── filesSlice.js   # Active files state
│   ├── trashSlice.js   # Trash state
│   └── sharesSlice.js  # Shares state
├── components/
│   ├── layout/
│   │   ├── DashboardLayout.jsx   # Sidebar (desktop) + drawer (mobile)
│   │   ├── ProtectedRoute.jsx
│   │   └── PublicRoute.jsx
│   └── ui/
│       ├── Modal.jsx
│       ├── ConfirmDialog.jsx
│       ├── ShareModal.jsx
│       ├── Badge.jsx
│       ├── CopyButton.jsx
│       ├── FileIcon.jsx
│       └── Skeleton.jsx
├── pages/
│   ├── Landing.jsx
│   ├── SharedFile.jsx          # Public share access page
│   ├── auth/
│   │   ├── AuthLayout.jsx
│   │   ├── Login.jsx
│   │   ├── Register.jsx
│   │   ├── VerifyEmail.jsx
│   │   └── AuthForms.jsx       # ResendVerification, ForgotPassword, ResetPassword
│   └── dashboard/
│       ├── MyFiles.jsx
│       ├── Trash.jsx
│       ├── Shares.jsx
│       └── Settings.jsx
└── utils/
    ├── errors.js       # extractErrorMessage, extractFieldErrors
    └── formatters.js   # formatFileSize, formatDate, etc.
```

## Auth flow

- Tokens stored in `localStorage` as `cr_tokens` (`{ access, refresh }`)
- Every request gets `Authorization: Bearer <access>` via Axios request interceptor
- On 401: silently calls `POST /auth/token/refresh/`, retries the original request
- On refresh failure: clears tokens and redirects to `/auth/login`
- Refresh tokens rotate — latest token is always persisted
