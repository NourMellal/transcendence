# Nginx integration notes

This document summarizes the changes made to integrate an Nginx reverse-proxy in front of the API gateway and what remains to be done for a full ModSecurity WAF deployment.

Summary of changes in repository
- `docker-compose.yml`: added `nginx` service that builds from `docker/nginx` and exposes ports 80/443.
- `docker/nginx/`: contains `Dockerfile`, `entrypoint.sh`, `nginx.conf`, `conf.d/api-proxy.conf`, `modsec/` stubs, `WAF_INSTRUCTIONS.md`.
- `scripts/test-waf.sh`: curl-based test script.
- `apps/web/.env.example`: updated `VITE_API_BASE_URL` to `https://localhost/api` to point frontend at nginx.

What works now (out-of-the-box)
- Nginx will run as configured and proxy requests to `api-gateway:3000` on the compose network.
- TLS certs can be mounted into `docker/nginx/certs` (self-signed generation example included in `WAF_INSTRUCTIONS.md`).
- The `entrypoint.sh` will toggle `modsec_includes.conf` based on `WAF_ENABLED` env var. The default `modsec` config in the repo is `DetectionOnly` to avoid accidental blocking.

What you still need to enable real WAF blocking
- The supplied `docker/nginx/Dockerfile` uses the stock `nginx:stable` base image which does NOT include ModSecurity. To get actual detection/blocking you must either:
  - Use a community/prebuilt image that bundles Nginx + ModSecurity + OWASP CRS (fast), or
  - Build Nginx with the ModSecurity v3 library and the `modsecurity-nginx` connector (longer, but reproducible).

If you'd like, I can add a `Dockerfile.modsec` that builds `libmodsecurity` and Nginx with the connector from source and includes OWASP CRS. This will fully enable blocking and I can test the sample rules included in `docker/nginx/modsec`.

Next recommended actions
1. Decide whether to use a prebuilt image or build from source. Reply `prebuilt` or `build` and I'll add the corresponding Dockerfile changes and verify.
2. Populate `docker/nginx/modsec` with the OWASP CRS rules (I can fetch and add them during image build or as a separate step).
3. Optionally harden Nginx further (CSP headers, rate-limit tuning, IP whitelists, client certs) — I can add these once you confirm.
