# 📚 Stacks --- Library Management System

A full-stack library management system built for a school or college
library: book catalog, member accounts, borrowing with due dates,
automatic overdue fines, a reservation queue, multi-admin access
control, and email notifications.

-   **Backend:** Node.js + Express + SQLite (uses Node's built-in
    `node:sqlite` --- nothing to compile, no external database service
    required)
-   **Frontend:** React + Vite

------------------------------------------------------------------------

## Table of contents

1.  [Features](#features)
2.  [Tech stack](#tech-stack)
3.  [Folder structure](#folder-structure)
4.  [Getting started](#getting-started)
5.  [Demo logins](#demo-logins)
6.  [Environment variables](#environment-variables)
7.  [Business rules](#business-rules)
8.  [Multiple admins](#multiple-admins)
9.  [Email notifications](#email-notifications)
10. [API overview](#api-overview)
11. [Deploying](#deploying)
12. [Pushing to GitHub](#pushing-to-github)
13. [Future Enhancements](#future-enhancements)

------------------------------------------------------------------------

## ✨ Features

**Librarian (admin) view** - 📊 Dashboard --- live stats (titles/copies,
books issued, overdue count, outstanding fines), most-borrowed titles,
recent activity - 📖 Catalog --- add/edit/delete books, search & filter
by category, export to CSV - 👥 Members --- add/remove student & faculty
accounts, export to CSV - 🔁 Issue & Return --- issue a book, mark
returns, renew loans, delete a record, automatic fine calculation,
export to CSV - 🔖 Reservations --- full waitlist queue for every book -
🧾 Fines --- view unpaid balances, mark as paid, export to CSV - 🛡️
Admins --- add or remove other librarian accounts, with built-in
safeguards - ✉️ Trigger due-soon / overdue reminder emails on demand

**Member (student / faculty) view** - 📝 Self-registration --- create an
account without waiting for a librarian - 🔍 Browse and search the
catalog - 📌 Reserve a book that's fully checked out (joins a queue,
notified by email when ready) - 📚 My Loans --- borrowing history, due
dates, renew a loan, view fines - 🔖 My Reservations --- track queue
position, cancel a reservation

**Interface** - Icon-based navigation (lucide-react), skeleton loading
states, contextual empty states - Custom "card catalog" visual identity
--- index-card panels, a rotated due-date stamp for loans - Fully
responsive --- sidebar collapses into a horizontal top bar on mobile

------------------------------------------------------------------------

## 🛠️ Tech stack

  -----------------------------------------------------------------------
  Layer                   Choice                  Why
  ----------------------- ----------------------- -----------------------
  Backend runtime         Node.js 22.5+           Needed for the built-in
                                                  `node:sqlite` module

  Backend framework       Express                 Simple, well-understood
                                                  REST routing

  Database                SQLite (`node:sqlite`)  Zero-setup, file-based,
                                                  no cloud account
                                                  needed; relational data
                                                  (books ↔ members ↔
                                                  loans) is a natural fit

  Auth                    JWT + bcrypt            Stateless auth,
                                                  industry-standard
                                                  password hashing

  Frontend                React + Vite            Fast dev server, simple
                                                  build output

  Routing                 react-router-dom        Standard client-side
                                                  routing

  Icons                   lucide-react            Consistent, lightweight
                                                  icon set

  Email                   Nodemailer              Falls back to console
                                                  logging if SMTP isn't
                                                  configured --- the app
                                                  works with zero email
                                                  setup
  -----------------------------------------------------------------------

------------------------------------------------------------------------

## 📁 Folder structure

    library-management/
    ├── backend/
    │   ├── .env.example              # Copy to .env to configure JWT secret / SMTP
    │   ├── .gitignore
    │   ├── package.json
    │   ├── server.js                 # Express app entry point, starts daily reminder job
    │   │
    │   ├── db/
    │   │   └── database.js           # Schema definition, migrations, seed data (admin + demo books/members)
    │   │                              # (library.db / library.db-shm / library.db-wal are created here at runtime — git-ignored)
    │   │
    │   ├── middleware/
    │   │   └── auth.js               # requireAuth / requireAdmin JWT guards
    │   │
    │   ├── routes/
    │   │   ├── auth.js               # Login, self-register, admin-managed members, admin management
    │   │   ├── books.js              # Catalog CRUD, search/filter, CSV export
    │   │   ├── members.js            # Member listing, detail, delete, CSV export
    │   │   ├── borrow.js             # Issue, return, renew, delete record, CSV export
    │   │   ├── reservations.js       # Create/list/cancel reservations, queue position
    │   │   ├── fines.js              # List unpaid fines, mark as paid, CSV export
    │   │   └── dashboard.js          # Aggregate stats, manual reminder trigger
    │   │
    │   └── utils/
    │       ├── csv.js                # Minimal CSV writer (no external dependency)
    │       ├── mailer.js             # Nodemailer wrapper with console-log fallback
    │       └── notifications.js      # Reservation-ready / due-soon / overdue email logic
    │
    ├── frontend/
    │   ├── .gitignore
    │   ├── index.html
    │   ├── package.json
    │   ├── vite.config.js            # Dev server + /api proxy to backend on :4000
    │   │
    │   └── src/
    │       ├── main.jsx              # React root, router + auth provider setup
    │       ├── App.jsx               # Route definitions, admin vs member routing
    │       ├── api.js                # Fetch wrapper for every backend endpoint
    │       ├── styles.css            # Design tokens, all component styles
    │       │
    │       ├── context/
    │       │   └── AuthContext.jsx   # Login/register/logout, current user state
    │       │
    │       ├── components/
    │       │   ├── Sidebar.jsx       # Role-aware navigation (admin vs member)
    │       │   ├── Modal.jsx         # Reusable modal dialog
    │       │   ├── Toast.jsx         # Success/error toast notifications
    │       │   ├── DueStamp.jsx      # Rotated due-date stamp visual
    │       │   ├── EmptyState.jsx    # Reusable "Nothing here" state with icon
    │       │   └── Skeleton.jsx      # Loading placeholders (card / table / stat)
    │       │
    │       └── pages/
    │           ├── Login.jsx
    │           ├── Register.jsx      # Member self-registration
    │           ├── Dashboard.jsx     # Admin home
    │           ├── Books.jsx         # Catalog (admin CRUD / member browse & reserve)
    │           ├── Members.jsx       # Admin: manage student/faculty accounts
    │           ├── Admins.jsx        # Admin: manage librarian accounts
    │           ├── Borrow.jsx        # Admin: issue & return desk
    │           ├── MyLoans.jsx       # Member: own borrowing history
    │           ├── Reservations.jsx  # Shared: waitlist (admin sees all, member sees own)
    │           └── Fines.jsx         # Admin: outstanding fines ledger
    │
    ├── .gitignore
    └── README.md

------------------------------------------------------------------------

## 🚀 Getting started

### Requirements

-   **Node.js 22.5 or newer** (required for the built-in `node:sqlite`
    module)

    ``` bash
    node -v
    ```

    If you're using an older version, install Node.js 22.5 or later from
    [nodejs.org](https://nodejs.org).

### 1. Clone and enter the project

``` bash
git clone https://github.com/<karanmaurya-git>/<Library-Management-System>.git
cd <your-repo>
```

### 2. Start the backend

``` bash
cd backend
npm install
npm run dev
```

Runs on **http://localhost:4000**. On first run, it creates
`backend/db/library.db` and seeds it with an admin account, two demo
members, and eight sample books.

### 3. Start the frontend

In a **second terminal**:

``` bash
cd frontend
npm install
npm run dev
```

Open **http://localhost:5173**. The dev server proxies `/api` calls to
the backend automatically --- no extra config needed.

------------------------------------------------------------------------

## 🔑 Demo logins

  Role                Email                  Password
  ------------------- ---------------------- -------------
  Librarian (admin)   `admin@library.edu`    `admin123`
  Member (student)    `asha@student.edu`     `member123`
  Member (faculty)    `rakesh@faculty.edu`   `member123`

New members can also self-register from the login screen. New admins can
be added by an existing admin from the **Admins** tab.

------------------------------------------------------------------------

## ⚙️ Environment variables

Copy `backend/.env.example` to `backend/.env` to customize:

``` env
PORT=4000
JWT_SECRET= Your_jwt_secret_here

# Optional — email notifications. Leave blank to log emails to the console instead.
SMTP_HOST=
SMTP_PORT=
SMTP_USER=
SMTP_PASS=
SMTP_FROM=
```

**Important for GitHub:** `.env` is already git-ignored --- never commit
real secrets. Only `.env.example` (with placeholder values) should be
tracked.

------------------------------------------------------------------------

## 📚 Business rules

Defined in `backend/routes/borrow.js` --- easy to tweak:

  -----------------------------------------------------------------------
  Rule                                Default
  ----------------------------------- -----------------------------------
  Loan period                         14 days

  Fine                                ₹5/day overdue

  Fine block threshold                ₹50+ unpaid blocks new borrowing

  Max books per member                5 at once

  Max renewals per loan               2 (blocked if overdue or another
                                      member is waiting)

  On return                           Auto-fulfills the oldest pending
                                      reservation for that title, and
                                      emails that member

  On record delete                    Restores book availability if still
                                      issued; reverses any unpaid fine
                                      tied to it
  -----------------------------------------------------------------------

------------------------------------------------------------------------

## 👥 Multiple admins

Any admin can add another from the **Admins** tab. Two rules are
enforced server-side (not just hidden in the UI): - An admin **cannot
remove their own account** while signed in as it - The system **never
allows the last remaining admin to be deleted**

So a *different* admin always has to remove someone, and admin access
can never be accidentally lost entirely.

------------------------------------------------------------------------

## 📧 Email notifications

Three kinds, all backend-triggered:

  -----------------------------------------------------------------------
  Trigger                             When
  ----------------------------------- -----------------------------------
  Reservation ready                   Instantly, when a returned book is
                                      auto-assigned to the next person in
                                      the waitlist

  Due-soon reminder                   Loans due within 2 days --- checked
                                      once every 24h, plus on-demand via
                                      the Dashboard button

  Overdue notice                      Loans already past due --- same
                                      daily check
  -----------------------------------------------------------------------

**No SMTP setup required to run the app.** If
`SMTP_HOST`/`SMTP_USER`/`SMTP_PASS` aren't set in `.env`, emails are
printed to the backend terminal instead of failing, so you can see
exactly what would have been sent. To send real emails, fill in the SMTP
variables (Gmail App Password works for testing) and restart the
backend.

------------------------------------------------------------------------

## 🔌 API overview

All routes are prefixed `/api`. Protected routes require
`Authorization: Bearer <token>`.

  -----------------------------------------------------------------------------------------
  Method                Route                         Access            Purpose
  --------------------- ----------------------------- ----------------- -------------------
  POST                  `/auth/login`                 Public            Log in

  POST                  `/auth/register`              Public            Member
                                                                        self-registration

  POST                  `/auth/members`               Admin             Admin creates a
                                                                        member account

  GET/POST/DELETE       `/auth/admins`                Admin             Manage librarian
                                                                        accounts

  GET                   `/auth/me`                    Auth              Current user
                                                                        profile

  GET/POST/PUT/DELETE   `/books`                      Auth / Admin      Catalog CRUD

  GET                   `/books/export/csv`           Admin             Export catalog

  GET/DELETE            `/members`                    Admin             Member
                                                                        listing/removal

  GET                   `/members/export/csv`         Admin             Export members

  POST                  `/borrow`                     Admin             Issue a book

  POST                  `/borrow/:id/return`          Admin             Return a book

  POST                  `/borrow/:id/renew`           Auth              Renew a loan

  DELETE                `/borrow/:id`                 Admin             Delete a borrow
                                                                        record

  GET                   `/borrow/export/csv`          Admin             Export loan records

  GET/POST/DELETE       `/reservations`               Auth              Manage reservations

  GET                   `/fines`                      Admin             Unpaid fines list

  POST                  `/fines/:userId/pay`          Admin             Mark a fine paid

  GET                   `/dashboard/stats`            Admin             Aggregate stats

  POST                  `/dashboard/send-reminders`   Admin             Trigger reminder
                                                                        emails now
  -----------------------------------------------------------------------------------------

------------------------------------------------------------------------

## ☁️ Deploying

**Backend:** deploy `backend/` anywhere running Node 22+ (Render,
Railway, Fly.io, a VPS). Set `JWT_SECRET` and, optionally, SMTP
variables as environment variables in your host's dashboard. SQLite is
file-based --- make sure your host has a **persistent disk**, or data
will be wiped on redeploy/restart.

**Frontend:** run `npm run build` in `frontend/` to produce a static
`dist/` folder --- deployable to Vercel, Netlify, GitHub Pages, or any
static host. Update the API base URL to point at your deployed backend
(the Vite dev proxy only works in local development).

------------------------------------------------------------------------

## 🚀 Future Enhancements

-   Book cover images and rich metadata
-   Barcode/ISBN scanning
-   Multi-branch library support
-   Online fine payment integration
-   Automated testing
-   Pagination for large datasets

## 📄 License

This project is licensed under the **MIT License**.

## 👨‍💻 Author

** Karan Maurya**

-   GitHub: https://github.com/karanmaurya-git
