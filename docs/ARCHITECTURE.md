# Architecture

## Overview
Express web app with server-rendered EJS pages. Authenticates users via 42 (Intra) OAuth 2.0, stores sessions in Redis, and queries the 42 API for campus users, projects, peers. Optional email/Slack notifications. Containerized; Redis co-located in container via start.sh.

## Directory structure
- server.js — Express app entry, middleware, Redis session, routes mounting
- config/passport.js — 42 OAuth strategy
- routes/ — auth, bookmarks, email, emailService, statusMonitor, tokenManager
- views/ — EJS templates (home, campus, peers, profile, bookmarks, feedback, kidTube, rtimsina)
- images/ — static assets + locally.md/setup.md docs
- Makefile, Dockerfile, docker-compose.yml, start.sh

## Main modules and responsibilities
- server.js: app bootstrap, Redis client/store, session, CORS, route registration
- config/passport.js: OAuth2 with 42; fetches /v2/me; serializes user
- routes/auth.js: login/callback/logout
- routes/bookmarks.js: bookmark CRUD (331 lines) — needs inspection for details
- routes/email.js / emailService.js: email notifications
- routes/statusMonitor.js: campus presence monitoring
- routes/tokenManager.js: token handling

## Database structure
- MongoDB referenced via env (MONGO_USER, MONGO_PASS, MONGO_CLUSTER). Exact collections/models not present in repo snapshot — confirm by inspecting route files. [Requires confirmation]
- Redis: sessions (prefix sess:, TTL 14400s) and likely cached data.

## API architecture
- 42 Intra API: OAuth authorize/token, /v2/me, campus/users etc.
- Express routes under / (views) and /auth/42/callback.
- Bookmark admin endpoints referenced in .env comments (bookmarks/delete-all, delete-one) — confirm exact routes. [Requires confirmation]

## Important dependencies and integrations
- 42 API (OAuth + data)
- MongoDB (Atlas cluster name in env)
- Redis (local)
- Gmail/SMTP via nodemailer; SendGrid
- Slack Web API
- node-cron for scheduled checks