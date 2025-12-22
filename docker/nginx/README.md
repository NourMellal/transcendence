# Nginx reverse proxy for Transcendence

This folder contains a small nginx reverse-proxy skeleton used by the project's `docker-compose.yml`.

Key points:

- `entrypoint.sh` will symlink either `modsec_enabled.conf` or `modsec_disabled.conf` to `modsec_includes.conf` depending on the `WAF_ENABLED` environment variable.
- The provided `modsec` files are stubs. To get actual blocking behavior you must use an Nginx build with ModSecurity (or a community image that bundles ModSecurity + OWASP CRS) and populate `modsec/` with the CRS rules.
- TLS certs should be placed in `docker/nginx/certs` as `fullchain.pem` and `privkey.pem` (for local testing you can create a self-signed cert).

How to enable WAF

1. If using `docker-compose`, set `WAF_ENABLED=true` in your environment or `.env`.
2. Ensure the image you build includes ModSecurity. The base `nginx:stable` image in the Dockerfile does not include ModSecurity — build a custom image that installs ModSecurity (I can add that Dockerfile if you want).
3. Populate `modsec/modsecurity.conf` and add OWASP CRS rules under `modsec/crs`.

Local certificates (self-signed) example:

```sh
mkdir -p docker/nginx/certs
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout docker/nginx/certs/privkey.pem \
  -out docker/nginx/certs/fullchain.pem \
  -subj "/C=US/ST=State/L=City/O=Org/CN=localhost"
```
