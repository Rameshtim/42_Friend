# Decisions

## Technical decisions
- OAuth 2.0 via passport-oauth2 against 42 API (authorizationURL/tokenURL).
- Sessions stored in Redis with 4h TTL and rolling expiry.
- Redis started inside app container (start.sh) rather than separate compose service (compose redis service commented out).
- EJS server-side rendering.
- MongoDB Atlas for persistence (credentials via env).

## Architectural choices and reasoning
- Containerized single-service app for 42 cluster deployment (Docker).
- Callback URL switches by NODE_ENV (localhost vs production domain).

## Known limitations / technical debt
- No automated tests.
- Mongoose models/collections not visible in repo snapshot; DB schema undocumented — confirm.
- passport logs access/refresh tokens to console (security concern).
- Default session secret fallback in code if SESSION_SECRET missing.
- ADMIN_PASSWORD-based bookmark deletion endpoints exposed (see .env comments) — confirm authorization. [Requires confirmation]
- Redis not separately managed in compose; data ephemeral.