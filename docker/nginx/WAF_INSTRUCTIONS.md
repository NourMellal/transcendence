# WAF / Nginx integration instructions

This document explains how to enable/disable the ModSecurity WAF and how to verify it is routing and blocking requests.

Important prerequisite
- The `docker/nginx/Dockerfile` in this repo now builds Nginx together with `libmodsecurity` and the `modsecurity-nginx` connector from source so no prebuilt image is required. Building the image takes longer than pulling a prebuilt image but gives full control and avoids using community images.

To get actual blocking you must ensure the image is rebuilt (the build process compiles ModSecurity and downloads OWASP CRS during image build):
  - Build the image with `docker-compose build --no-cache nginx` or `docker compose build --no-cache nginx`.
  - Make sure `WAF_ENABLED=true` is set in your `.env` (and that `SecRuleEngine` is set to `On` in `docker/nginx/modsec/modsecurity.conf`).

Files
- `docker/nginx/Dockerfile` - builds Nginx + ModSecurity from source (no prebuilt images).
- `docker/nginx/entrypoint.sh` - toggles which modsec include is symlinked based on `WAF_ENABLED` env var.
- `docker/nginx/modsec/modsecurity.conf` - hardened config (blocking mode + OWASP CRS).
- `docker/nginx/modsec/modsec_enabled.conf` - include used when WAF is enabled.
- `docker/nginx/modsec/modsec_disabled.conf` - empty include used when WAF is disabled.

Enable / disable WAF

- To enable blocking (if your image supports ModSecurity): set environment variable `WAF_ENABLED=true` in your `.env` or your `docker-compose` runtime environment. Example `.env`:

```env
WAF_ENABLED=true
```

- To disable WAF: `WAF_ENABLED=false` (or unset).

Notes about blocking vs detection
- `docker/nginx/modsec/modsecurity.conf` ships with `SecRuleEngine On` so requests matching the CRS are blocked. For smoke testing you can flip it back to `DetectionOnly`.

Local self-signed TLS (for development)

Generate certs for localhost:

```bash
mkdir -p docker/nginx/certs
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout docker/nginx/certs/privkey.pem \
  -out docker/nginx/certs/fullchain.pem \
  -subj "/C=US/ST=State/L=City/O=Org/CN=localhost"
```

Testing and verification

1) Start the stack (rebuild nginx if you changed the Dockerfile):

```bash
docker-compose up -d --build nginx api-gateway
```

2) Basic routing test (TLS + headers):

```bash
# check health (API should respond through nginx)
curl -v -k https://localhost/

# check secure headers are present
curl -s -D - -o /dev/null https://localhost/ | grep -i "strict-transport-security\|x-frame-options\|x-content-type-options"
```

3) WAF detection/block test (example):

```bash
# benign request -> should return 200
curl -i -k https://localhost/api/health

# SQLi-like payload -> if ModSecurity & CRS are active and blocking, expect 403/406 (or other block code)
curl -i -k "https://localhost/?id=1' OR '1'='1"

# If ModSecurity is detection-only, check the modsec audit log inside the container:
docker-compose exec nginx sh -c "cat /var/log/modsec_audit.log || true"
```

Automated quick test script
- See `scripts/test-waf.sh` in the repo — it runs the above checks and prints results.

How to get a ModSecurity-enabled image
- Quick: find a maintained community image that bundles Nginx + ModSecurity + OWASP CRS, then set `image:` in `docker-compose.yml` (or change `Dockerfile` base image) to that image.
- Full: build `libmodsecurity` + `modsecurity-nginx` and compile Nginx with the connector (this takes longer but gives you full control). If you want, I can add a full `Dockerfile.modsec` that builds everything from source.

Gateway configuration note
- Ensure your API gateway reads `X-Forwarded-For`, `X-Forwarded-Proto`, and `X-Forwarded-Port` headers to determine client IP and protocol. Trust only internal networks or the nginx container IP when interpreting these headers.

If you want me to add a prebuilt ModSecurity-enabled Dockerfile (fast) or a full build-from-source Dockerfile (complete), tell me which and I'll add it and validate the test script against it.
