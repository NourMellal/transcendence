# Nginx integration notes

This document summarizes the hardened Nginx + ModSecurity reverse-proxy that fronts the API gateway and how to operate it in the compose stack.

Summary of changes in repository
- `docker-compose.yml`: includes an `nginx` service that builds from `docker/nginx` and exposes ports 80/443 with TLS + WAF by default.
- `docker/nginx/`: Dockerfile compiles ModSecurity v3, fetches the OWASP CRS, and toggles enforcement via `entrypoint.sh`.
- `scripts/test-waf.sh`: curl-based test script.
- `apps/web/.env.example`: updated `VITE_API_BASE_URL` to `https://localhost/api` to point frontend at nginx.

What works now (out-of-the-box)
- Nginx proxies every request to `api-gateway:3000` on the compose network.
- TLS certs can be mounted into `docker/nginx/certs` (self-signed generation example included in `WAF_INSTRUCTIONS.md`).
- `docker/nginx/Dockerfile` now produces an image with ModSecurity + OWASP CRS baked in. `modsecurity.conf` defaults to blocking mode with audited logging.
- `entrypoint.sh` toggles ModSecurity on/off via `WAF_ENABLED` (defaults to `true`).

Operating with WAF enabled
1. Ensure `.env` contains `WAF_ENABLED=true` (already default).
2. Run `docker compose up --build nginx` (or the entire stack) the first time so the ModSecurity-enabled image is compiled.
3. Optional tuning:
   - `docker/nginx/modsec/modsecurity.conf` for CRS exclusions / paranoia level.
   - `docker/nginx/conf.d/api-proxy.conf` for rate limits, headers, etc.
4. Use `scripts/test-waf.sh` to confirm TLS + blocking behaviour.

Next hardening ideas (if time permits)
- Tune CSP / seccomp headers for the SPA once deployed through nginx.
- Add caching or circuit breakers for path-specific rules.
- Ship ModSecurity audit logs into ELK via Filebeat for long-term analysis.
