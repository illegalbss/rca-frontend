# Royal Crystal Academy — School Website & Management System

**Live site:** [royalcrystalacademy.com.ng](https://royalcrystalacademy.com.ng)

The public website and school management system for Royal Crystal Academy, a nursery and primary school in Enugu, Nigeria. I built it and maintain it as the school's ICT Administrator.

**Status:** live and used every day by the school's staff and parents.

---

## What it does

**Public website.** Home, About, Admissions, News & Events, Gallery, ICT Department, Academic Calendar and Contact pages, with links to the Parent Login and Staff Portal.

**Staff portal** (access depends on role: ICT Admin, Head Teacher, Class Teacher, Accountant):
- Students, admission form and admission register
- Classes, teachers, attendance, discipline and promotion
- **Score entry**: test, assessment, project and mid-term (CA /40) plus exam (/60), automatic grades, then *Submit for Review* → class review and approvals → report cards
- Fees, payments, receipts and finance reports
- Announcements, school calendar, user management and activity logs

**Parent portal.** Parents sign in to see each of their children's results, attendance, payments, newsletters and announcements.

## How it is built

| Layer | Technology |
|---|---|
| Frontend (this repo) | HTML, CSS, vanilla JavaScript. Hosted on Vercel |
| Backend API (private repo) | Node.js, Express, `pg`, JWT authentication, bcrypt password hashing, Helmet, rate limiting. Hosted on Vercel |
| Database | PostgreSQL on Supabase, through the Supabase connection pooler |

The frontend talks to the REST API through `assets/js/api.js`. Settings such as `API_URL`, the school name and the current session live in `assets/js/config.js`.

## Work I'm proud of

- **Moved a live system without a rebuild:** frontend from Netlify to Vercel, backend from Render to Vercel, and the database from Render PostgreSQL to Supabase. Afterwards I fixed the schema mismatches and Row Level Security problems the move exposed.
- **From demo to real data:** the first version stored sample data in the browser (localStorage). I replaced it across the admin and parent pages with live API calls backed by the database.
- **Role-based access** for five user types (ICT Admin, Head Teacher, Class Teacher, Accountant, Parent).

## Run the frontend locally

1. Clone the repo and open the folder in VS Code.
2. Start the backend on port 3000. When the site is opened on `localhost`, `assets/js/config.js` switches `API_URL` to `http://localhost:3000/api` automatically. Otherwise it uses the hosted API.
3. Start a static server (for example the **Live Server** extension) and open `index.html`.

## Status

In production and in daily use. Planned next: online fee payment through Paystack, which is waiting on the school's business verification.

---

Built by **Chukwuma Geoffrey Izuchukwu**, Full-Stack Developer & ICT Administrator, Enugu, Nigeria · [GitHub](https://github.com/illegalbss)
