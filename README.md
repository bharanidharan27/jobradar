# JobRadar 📡

[![CI](https://github.com/bharanidharan27/jobradar/actions/workflows/ci.yml/badge.svg)](https://github.com/bharanidharan27/jobradar/actions/workflows/ci.yml)

A full-stack job search and auto-polling web app powered by the [Adzuna API](https://developer.adzuna.com). Search millions of real job listings, bookmark roles, and set up background monitors that alert you when new jobs appear.

---

## Features

- **Live Job Search** — Search by keyword, location, country, job type, salary, and recency
- **Smart Filters** — Filter by full-time / part-time / permanent / contract, sort by relevance, date, or salary
- **Bookmark Jobs** — Save roles to a persistent local database with one click
- **Auto-Poll Monitors** — Background watchers that poll for new jobs on a configurable schedule (every 15 min, 1 hour, etc.)
- **Real-time Updates** — Poll results pushed to the UI instantly via Server-Sent Events (SSE)
- **Dark Mode** — Full light/dark theme support
- **Mobile Friendly** — Fully responsive across all screen sizes

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React, Vite, Tailwind CSS, shadcn/ui |
| Backend | Express (Node.js) |
| Database | SQLite via Drizzle ORM |
| API | [Adzuna Jobs API](https://developer.adzuna.com) |
| Routing | Wouter (hash-based) |
| Data Fetching | TanStack Query v5 |
| Real-time | Server-Sent Events (SSE) |

---

## Getting Started

### 1. Clone the repo

```bash
git clone https://github.com/bharanidharan27/jobradar.git
cd jobradar
```

### 2. Install dependencies

```bash
npm install
```

### 3. Get free Adzuna API credentials

1. Sign up at [developer.adzuna.com/signup](https://developer.adzuna.com/signup)
2. Create a new application
3. Copy your **App ID** and **App Key**

> Free tier: 250 API hits/day, 25/minute — enough for active searching and several hourly monitors.

### 4. Run the dev server

```bash
npm run dev
```

Open [http://localhost:5000](http://localhost:5000) and go to the **Setup** tab to enter your Adzuna credentials.

---

## Project Structure

```
jobradar/
├── client/                  # React frontend
│   ├── src/
│   │   ├── components/      # Layout, JobCard, ThemeProvider
│   │   ├── pages/           # Search, Saved, Pollers, Setup
│   │   └── index.css        # Tailwind + custom tokens
├── server/
│   ├── routes.ts            # Express API routes
│   ├── storage.ts           # SQLite / Drizzle storage layer
│   ├── adzuna.ts            # Adzuna API client
│   └── poller.ts            # Background poll scheduler + SSE
├── shared/
│   └── schema.ts            # Drizzle schema + Zod types
└── README.md
```

---

## Architecture

### Smart Polling Strategy

Rather than hitting LinkedIn directly (no public API), JobRadar uses **Adzuna**, which aggregates listings from LinkedIn, Indeed, and hundreds of other job boards — giving you broader coverage from a single reliable API.

- **Backend proxy** — API credentials never touch the frontend
- **Interval-aware scheduler** — checks every 60 seconds whether each monitor's configured interval has elapsed before firing a request, staying well within rate limits
- **SSE push** — poll results are streamed to connected clients in real time, no frontend polling needed
- **SQLite persistence** — saved jobs and poll configs survive server restarts

### API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/status` | Check if credentials are configured |
| `POST` | `/api/credentials` | Save Adzuna App ID + Key |
| `GET` | `/api/jobs/search` | Search jobs via Adzuna |
| `GET` | `/api/saved-jobs` | List bookmarked jobs |
| `POST` | `/api/saved-jobs` | Save a job |
| `DELETE` | `/api/saved-jobs/:id` | Remove a saved job |
| `GET` | `/api/poll-configs` | List auto-poll monitors |
| `POST` | `/api/poll-configs` | Create a monitor |
| `PATCH` | `/api/poll-configs/:id` | Update a monitor |
| `DELETE` | `/api/poll-configs/:id` | Delete a monitor |
| `GET` | `/api/poll-events` | SSE stream for live poll events |

---

## Build for Production

```bash
npm run build
NODE_ENV=production node dist/index.cjs
```

---

## Author

**bharanidharan27** — [github.com/bharanidharan27](https://github.com/bharanidharan27)
