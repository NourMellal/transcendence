# Vault setup helpers

Use this folder to run the local Vault dev container and seed demo secrets (`simple-setup.sh`). For the list of required secret paths, keys, and rotation guidance, read [docs/deployment/vault-secrets.md](../../docs/deployment/vault-secrets.md).

Docker Compose loads `infrastructure/vault/.seed.env` (gitignored) to provide OAuth credentials for the bootstrap script. Copy the example file first (you can leave values empty if you are not using OAuth 42 yet) and still run the seed once to generate the internal API key and JWT secret:

```env
OAUTH_42_CLIENT_ID=...
OAUTH_42_CLIENT_SECRET=...
# OAUTH_42_REDIRECT_URI=https://localhost/api/auth/42/callback
```

Tip: you can source a private secrets file (only the 42 client ID/secret) with `SEED_SOURCE=/path/to/secrets.env make seed`.
