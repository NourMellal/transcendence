# Nginx reverse proxy for Transcendence

This folder contains a small nginx reverse-proxy skeleton used by the project's `docker-compose.yml`.

Key points:

- `entrypoint.sh` will symlink either `modsec_enabled.conf` or `modsec_disabled.conf` to `modsec_includes.conf` depending on the `WAF_ENABLED` environment variable.
- The Dockerfile compiles ModSecurity v3 and the `modsecurity-nginx` connector from source, then installs the OWASP Core Rule Set. Nothing external is required besides setting `WAF_ENABLED=true`.
- TLS certs should be placed in `docker/nginx/certs` as `fullchain.pem` and `privkey.pem` (for local testing you can create a self-signed cert).

How to enable WAF

1. Set `WAF_ENABLED=true` in `.env` (already defaulted for local compose).
2. Run `docker compose up --build nginx api-gateway ...` at least once so the ModSecurity-enabled image is compiled.
3. Tune `docker/nginx/modsec/modsecurity.conf` if you need custom blocking logic (defaults to blocking mode with OWASP CRS enabled).

Local certificates (self-signed) example:

```sh
mkdir -p docker/nginx/certs
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout docker/nginx/certs/privkey.pem \
  -out docker/nginx/certs/fullchain.pem \
  -subj "/C=US/ST=State/L=City/O=Org/CN=localhost"
```
