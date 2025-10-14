@echo off
echo Starting Transcendence Services...
echo.
echo Setting environment variables...
set VAULT_ADDR=http://localhost:8200
set VAULT_TOKEN=dev-root-token
set NODE_ENV=development
echo.
echo Starting services...
powershell -ExecutionPolicy Bypass -Command "pnpm run dev:all"
