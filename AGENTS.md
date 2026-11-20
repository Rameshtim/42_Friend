# AGENTS.md — 42 Friend Notifier

## Project context and purpose
Node.js/Express web app ("42 Friend" / "Stalker") that helps 42 campus students track peers' campus presence, projects, and level-peers; sends notifications (email/normal) when tracked users log in/out. Integrates with the 42 (Intra) API via OAuth 2.0.

## Technology stack
- Runtime: Node.js (Dockerfile uses node:23-alpine)
- Web: Express 4, EJS views, body-parser, cors, multer
- Auth: passport + passport-oauth2 (42 API OAuth)
- Sessions: express-session backed by Redis (ioredis + connect-redis)
- DB: MongoDB via Mongoose (connection details from env)
- Email: nodemailer + @sendgrid/mail
- Slack: @slack/web-api
- Scheduling: node-cron
- Dates: luxon
- HTTP: axios, node-fetch
- Config: dotenv
- Container: Docker + docker-compose, Makefile targets

## Architecture rules
- Entry point is server.js; routes live in routes/.
- Auth via 42 OAuth; session stored in Redis; user profile fetched from https://api.intra.42.fr/v2/me.
- Keep secrets in .env only; never commit .env.
- Redis runs locally inside container via start.sh (not separate service in compose).
- App listens on port 3000.

## Coding conventions
- CommonJS require/module.exports.
- Async/await and callbacks mixed; preserve existing style in touched files.
- Environment via process.env with dotenv.
- EJS templates in views/.

## Before modifying code
- Read server.js and relevant route files first.
- Check .env variable names (never values) and package.json deps.
- Do not change application source unless requested.
- Run `npm run test` (currently no tests) and `make build` to verify.

## Testing requirements
- No automated tests defined (npm test exits 1). Manual verification via docker compose / make build.
- Verify OAuth callback URL matches deployment environment.

## Things to avoid
- Committing .env or secrets.
- Hardcoding credentials.
- Assuming Redis is a separate compose service (it is started in start.sh).
- Changing callback URLs without updating 42 API app settings.
- Inventing DB collections; MongoDB removed; no DB in use.
- Monitoring/stalking and bookmark features removed; do not re-add without discussion.

## Documentation maintenance
- AGENTS.md and docs/ARCHITECTURE.md, DEVELOPMENT.md, DECISIONS.md are the project's persistent docs.
- Update them whenever code, structure, or decisions change so future sessions stay in sync.
- Mark uncertain items as [Requires confirmation].