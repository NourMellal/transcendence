# Nginx Reverse Proxy with ModSecurity WAF

This folder contains the Nginx reverse proxy with integrated Web Application Firewall (ModSecurity + OWASP CRS) for the Transcendence project.

## Quick Start

### 1. Setup SSL Certificates
```bash
./scripts/setup-ssl-certs.sh
```

### 2. Enable WAF (Optional)
```bash
# Edit .env and set:
WAF_ENABLED=true
```

### 3. Build and Start
```bash
docker-compose build nginx
docker-compose up -d nginx
```

### 4. Test Integration
```bash
./scripts/test-waf.sh
```

## Architecture

- **ModSecurity v3.0.10** compiled from source with OWASP CRS v3.3.0
- **Dynamic toggling** via `WAF_ENABLED` environment variable
- **Entrypoint script** (`entrypoint.sh`) manages configuration based on WAF state
- **SSL/TLS** termination with HTTP → HTTPS redirect
- **Security headers** and rate limiting included

## Files

- `Dockerfile` - Builds Nginx + ModSecurity from source
- `nginx.conf` - Main Nginx config (loads ModSecurity module)
- `conf.d/api-proxy.conf` - Reverse proxy configuration
- `entrypoint.sh` - Dynamic WAF configuration script
- `modsec/modsecurity.conf` - Main ModSecurity rules + OWASP CRS
- `modsec/modsec_enabled.conf` - Active when WAF is enabled
- `modsec/modsec_disabled.conf` - Active when WAF is disabled
- `WAF_INSTRUCTIONS.md` - Detailed WAF documentation

## Configuration

### Enable/Disable WAF
Set in `.env` file:
```bash
WAF_ENABLED=true   # Enable blocking
WAF_ENABLED=false  # Disable (default)
```

### Tune ModSecurity
Edit `modsec/modsecurity.conf`:
- Change `SecRuleEngine On` to `DetectionOnly` for testing
- Adjust body limits, audit logging, and default actions
- Add custom rules or exclusions

## Testing

Run comprehensive tests:
```bash
./scripts/test-waf.sh
```

Tests include:
- SSL/TLS verification
- Security headers check
- SQL injection blocking
- XSS attack detection
- Path traversal prevention
- Audit log validation

## Viewing Logs

```bash
# Nginx logs
docker-compose logs nginx

# ModSecurity audit log
docker-compose exec nginx cat /var/log/modsec_audit.log

# Real-time monitoring
docker-compose exec nginx tail -f /var/log/modsec_audit.log
```

## Troubleshooting

See [WAF_INSTRUCTIONS.md](WAF_INSTRUCTIONS.md) for:
- Detailed setup instructions
- Troubleshooting common issues
- Production recommendations
- Rule tuning guidance

---

**Status**: ✅ Fully integrated and ready to use!
