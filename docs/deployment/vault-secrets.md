# Vault Secrets Inventory & Rotation

This page lists the vault secrets each service consumes, how to load them in development vs. production, and how to rotate credentials safely without leaking anything to Git. Services always prefer Vault, but fall back to the root `.env` during local development when Vault is unavailable.

## Per-service secret map

| Service | Vault path | Keys / meaning | Example values |
| --- | --- | --- | --- |
| API Gateway | `secret/jwt/auth` | `secret_key`, `issuer`, `expiration_hours` | `secret_key: my-super-secret-jwt-key-for-signing-tokens` |
| API Gateway | `secret/api/oauth` | `42_client_id`, `42_client_secret`, `42_callback_url` | `42_client_id: u-s4t2...` |
| API Gateway | `secret/gateway/config` | `cors_origins`, `internalApiKey`, rate-limit fields | `internalApiKey: <shared internal API key>` |
| API Gateway (shared) | `secret/shared/internal-api-key` | `key` (shared gateway↔services auth) | Random 64-hex key |
| User Service | `secret/database/user-service` | `type`, `host` | `type: sqlite`, `host: ./user-service.db` |
| User Service | `secret/jwt/auth` | `secret_key`, `issuer`, `expiration_hours` | `secret_key: ...jwt...` |
| User Service | `secret/api/oauth` | OAuth client credentials | Matches gateway values |
| User Service | `secret/security/config` | `internal_api_key` | Same shared key as above |
| Game Service | `secret/database/game-service` | `host`, `port` (Redis) | `host: localhost`, `port: 6379` |
| Game Service | `secret/jwt/game` | Game JWT signing config (seed manually) | `secret_key: game-websocket-secret-key` |
| Game Service | `secret/game/config` | `websocket_secret`, `match_timeout_minutes` | `websocket_secret: game-websocket-secret-key` |
| Chat Service | `secret/database/chat-service` | `host`, `port` (Redis) | `host: localhost`, `port: 6379` |
| Chat Service | `secret/jwt/auth` | Shared auth token config | `secret_key: ...jwt...` |
| Chat Service | `secret/chat/config` | `websocket_secret`, `message_retention_days` | `websocket_secret: chat-websocket-secret-key` |
| Tournament Service | `secret/database/tournament-service` | `type`, `host` | `type: sqlite`, `host: ./tournament-service.db` |
| Tournament Service | `secret/jwt/auth` | Shared auth token config | `secret_key: ...jwt...` |
| Tournament Service | `secret/game/config` | Match/tournament defaults | `match_timeout_minutes: 30` |
| Shared security | `secret/shared/internal-api-key` | Reused gateway↔services key | Random 64-hex key |

> **Note:** The `simple-setup.sh` bootstrap seeds every path above except `secret/jwt/game`; seed it manually in Vault or rely on the `.env` fallback during development.

## How to set secrets

### Development

1. **Start Vault locally** via Docker Compose, then run `infrastructure/vault/simple-setup.sh` to seed deterministic dev values and generate the shared internal API key and Gateway token.
2. **Optional overrides**: export `INTERNAL_API_KEY` or `JWT_SECRET` before running the script to reuse existing values across reruns.
3. **Vault unavailable?** Services automatically fall back to the root `.env` file because dotenv is loaded at startup; keep this file for local only and never commit it.

### Production

1. Use a real Vault cluster with TLS, audit logging, and per-service policies.
2. Create scoped tokens for each service (no shared dev-root token) that only read their paths from the table above.
3. Store deployment automation credentials (CI/CD) separately and inject Vault tokens at deploy time; never bake secrets into images or Git history.

## Rotation policies and procedures

- **JWT & internal API keys**: rotate every 90 days or immediately on suspicion. Publish new versions in Vault, redeploy gateway/services to pick up the new values, then revoke old versions.
- **OAuth credentials**: rotate when providers require it or when changing callback domains. Update Vault entries, refresh gateway/service configs, and validate OAuth callbacks in staging before production rollout.
- **Database/Redis credentials**: rotate quarterly with a dual-write window when supported; update Vault, restart consumers, then remove the old credentials once connections drain.
- **Automation tokens**: keep short TTLs (hours) with automatic renewal; revoke on pipeline compromise.

### Quick rotation runbook

1. Write the new secret version to the same Vault path (using KV versioning).
2. Trigger rolling restarts for affected services or force config reloads.
3. Verify health checks and authentication flows.
4. Revoke or delete the previous version once traffic is confirmed stable.

## Dev fallback reminder

- Vault helpers log a warning and load secrets from `.env` whenever Vault is unreachable or a path is missing. Keep `.env` checked out only locally and out of Git. For PFE demos, show Vault first, then deliberately stop Vault to highlight the safe fallback behavior.
