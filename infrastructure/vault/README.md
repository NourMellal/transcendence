# Vault setup helpers

Use this folder to run the local Vault dev container and seed demo secrets (`simple-setup.sh`). For the list of required secret paths, keys, and rotation guidance, read [docs/deployment/vault-secrets.md](../../docs/deployment/vault-secrets.md).

Optional: create `infrastructure/vault/.seed.env` (gitignored) to provide OAuth credentials for the bootstrap script:

```env
OAUTH_42_CLIENT_ID=...
OAUTH_42_CLIENT_SECRET=...
OAUTH_42_REDIRECT_URI=https://localhost/api/auth/42/callback
```
