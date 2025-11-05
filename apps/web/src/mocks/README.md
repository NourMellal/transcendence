# Mock API with MSW

This directory contains Mock Service Worker (MSW) setup for mocking API endpoints during development.

## Overview

The mock API enables frontend development without requiring a running backend server. It intercepts HTTP requests and returns mock data that matches the OpenAPI specification.

## Files

- **`browser.ts`**: Initializes the MSW service worker for the browser
- **`handlers.ts`**: Defines mock request handlers for API endpoints
- **`data.ts`**: Contains mock data structures matching the User model from OpenAPI spec
- **`index.ts`**: Exports all mock-related utilities

## Mocked Endpoints

Based on the OpenAPI specification at `docs/api/`:

- **`GET /auth/status`**: Returns the current logged-in user
- **`POST /auth/logout`**: Returns 204 success status
- **`GET /users/me`**: Returns the full authenticated user object
- **`PATCH /users/me`**: Accepts username/avatar updates and returns updated user

## Usage

MSW is automatically enabled in development mode. The service worker is initialized in `src/main.tsx` before the React app renders.

### Testing API Calls

```typescript
// Example: Fetch user profile
const response = await fetch('http://localhost:3000/api/users/me');
const user = await response.json();

// Example: Update username
const response = await fetch('http://localhost:3000/api/users/me', {
  method: 'PATCH',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ username: 'new_username' }),
});
const updatedUser = await response.json();
```

## Mock Data

The mock user data matches the User model from the OpenAPI spec:

```typescript
interface User {
  id: string;              // UUID
  username: string;
  email: string;
  avatar: string | null;
  is2FAEnabled: boolean;
  status: 'ONLINE' | 'OFFLINE' | 'INGAME';
}
```

## Customization

To modify mock data or add new endpoints:

1. Edit `data.ts` to change mock user data
2. Edit `handlers.ts` to add/modify endpoint handlers
3. Ensure changes match the OpenAPI specification

## References

- [MSW Documentation](https://mswjs.io/docs/)
- [OpenAPI Specification](../../../docs/api/openapi.yaml)
