/**
 * MSW handlers for auth and user endpoints
 * Based on OpenAPI specification at docs/api/
 */

import { http, HttpResponse } from 'msw';
import { currentUser, updateCurrentUser } from './data';

const API_BASE_URL = 'http://localhost:3000/api';

export const handlers = [
  /**
   * GET /auth/status
   * Returns the current user session
   * @see docs/api/paths/auth.yaml#/auth/status
   */
  http.get(`${API_BASE_URL}/auth/status`, () => {
    return HttpResponse.json(currentUser);
  }),

  /**
   * POST /auth/logout
   * Logs out the current user
   * @see docs/api/paths/auth.yaml#/auth/logout
   */
  http.post(`${API_BASE_URL}/auth/logout`, () => {
    return new HttpResponse(null, { status: 204 });
  }),

  /**
   * GET /users/me
   * Returns the full authenticated user object
   * @see docs/api/paths/users.yaml#/users/me
   */
  http.get(`${API_BASE_URL}/users/me`, () => {
    return HttpResponse.json(currentUser);
  }),

  /**
   * PATCH /users/me
   * Updates the current user profile (username/avatar)
   * @see docs/api/paths/users.yaml#/users/me
   */
  http.patch(`${API_BASE_URL}/users/me`, async ({ request }) => {
    try {
      // Handle multipart/form-data
      const contentType = request.headers.get('content-type');
      
      if (contentType?.includes('multipart/form-data')) {
        const formData = await request.formData();
        const username = formData.get('username');
        const avatar = formData.get('avatar');

        const updates: Partial<typeof currentUser> = {};
        if (username && typeof username === 'string') {
          updates.username = username;
        }
        if (avatar) {
          // In a real scenario, this would be a file upload
          // For mocking, we'll just update with a placeholder URL
          updates.avatar = `https://example.com/avatars/${username || 'user'}.png`;
        }

        updateCurrentUser(updates);
      } else {
        // Handle JSON payload
        const updates = await request.json() as Partial<typeof currentUser>;
        updateCurrentUser(updates);
      }

      return HttpResponse.json(currentUser);
    } catch {
      return HttpResponse.json(
        { error: 'Invalid input' },
        { status: 400 }
      );
    }
  }),
];
