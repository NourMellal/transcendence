# Transcendence Web App

Frontend SPA for Transcendence with Mock Service Worker (MSW) integration.

## Features

- ✅ Mock API for auth and user endpoints
- ✅ TypeScript type safety matching OpenAPI spec
- ✅ Interactive test interface

## Mock API Endpoints

The following endpoints are mocked using MSW and return data matching the OpenAPI specification:

### Auth Endpoints

- `POST /auth/signup` - Register a new user
  - Returns: `User` object with status 201
- `POST /auth/login` - Login with email and password
  - Returns: `LoginResponse` with user and message
- `GET /auth/status` - Get current authentication status
  - Returns: `User` object if authenticated, 401 if not
- `POST /auth/logout` - Logout current user
  - Returns: 204 No Content

### User Endpoints

- `GET /users/me` - Get current user profile
  - Returns: `User` object if authenticated, 401 if not
- `PATCH /users/me` - Update current user profile
  - Accepts: JSON with `username` field or multipart form-data with `username` and `avatar`
  - Returns: Updated `User` object

## Development

```bash
# Install dependencies (from root)
pnpm install

# Start dev server
cd apps/web
pnpm dev

# Build for production
pnpm build

# Preview production build
pnpm preview
```

## Testing the Mock API

When you run `pnpm dev`, the application will start with MSW enabled. Open your browser to `http://localhost:5173` to see an interactive test interface where you can:

1. Test each endpoint individually
2. View request/response data
3. Verify that all endpoints work correctly

The mock API is configured to:
- Return proper status codes (200, 201, 204, 401)
- Match the `User` model structure from the OpenAPI spec
- Handle authentication state
- Support JSON and multipart form-data

## User Model

All mock responses match this TypeScript interface from the OpenAPI spec:

```typescript
interface User {
  id: string;           // UUID format
  username: string;
  email: string;
  avatar: string | null;
  is2FAEnabled: boolean;
  status: 'ONLINE' | 'OFFLINE' | 'INGAME';
}
```

## Architecture

- `src/types.ts` - TypeScript types matching OpenAPI spec
- `src/mocks/data.ts` - Mock user data and state management
- `src/mocks/handlers.ts` - MSW request handlers for all endpoints
- `src/mocks/browser.ts` - MSW browser worker setup
- `src/main.ts` - Application entry point with test interface

## Notes

- The mock API runs entirely in the browser using MSW service workers
- No backend server is required for frontend development
- State is maintained in memory and resets on page reload
- OAuth login flow (`/auth/42/login`) is intentionally not mocked as it's a redirect to external SSO
