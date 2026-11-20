# Development

## Installation
```
git clone https://github.com/Rameshtim/42_Friend
cd 42_Friend
make build   # creates .env if missing
```

## Environment configuration
Create `.env` (see Makefile check_env for required keys). Variable names:
- FT_CLIENT_ID, FT_CLIENT_SECRET (42 API)
- EMAIL_USER, EMAIL_PASS (Gmail app password) — optional
- ADMIN_PASSWORD
- MONGO_USER, MONGO_PASS, MONGO_CLUSTER
- SESSION_SECRET (optional; default fallback in code)
- NODE_ENV (production/development)

Never commit .env.

## Run the application
- Docker: `make build` then `make down` to stop; or `docker compose up --build`.
- Local (requires Redis): `npm install`, `redis-server`, `node server.js` (port 3000).

## Tests
- `npm run test` currently prints "Error: no test specified" and exits 1. No automated tests. Manual verification required.

## Build/dev commands
- make all / make run / make build / make down / make clean / make fclean / make re
- npm start -> node server.js