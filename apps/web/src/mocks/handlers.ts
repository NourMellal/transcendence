import { http, HttpResponse } from 'msw';
import type { User } from '../models/User';
import type { SignUpRequest, LoginRequest, LoginResponse } from '../models/Auth';
import {
  mockUser,
  getCurrentUser,
  setCurrentUser,
  getIsAuthenticated,
} from './data';

const API_BASE = '/api';

// Validation helpers
function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function validatePassword(password: string): boolean {
  return !!(password && password.length >= 6);
}

function validateUsername(username: string): boolean {
  return !!(username && username.length >= 3);
}

export const handlers = [
  http.post(`${API_BASE}/auth/signup`, async ({ request }) => {
    try {
      const body = (await request.json()) as SignUpRequest;

      // Validation
      if (!body.username || !validateUsername(body.username)) {
        return HttpResponse.json(
          { error: 'Username must be at least 3 characters long' },
          { status: 400 }
        );
      }

      if (!body.email || !validateEmail(body.email)) {
        return HttpResponse.json(
          { error: 'Invalid email format' },
          { status: 400 }
        );
      }

      if (!body.password || !validatePassword(body.password)) {
        return HttpResponse.json(
          { error: 'Password must be at least 6 characters long' },
          { status: 400 }
        );
      }

      const newUser: User = {
        id: crypto.randomUUID(),
        username: body.username,
        email: body.email,
        avatar: undefined,
        isTwoFAEnabled: false,
        status: 'ONLINE',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      setCurrentUser(newUser);
      return HttpResponse.json(newUser, { status: 201 });
    } catch (error) {
      return HttpResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }
  }),

  http.post(`${API_BASE}/auth/login`, async ({ request }) => {
    try {
      const body = (await request.json()) as LoginRequest;

      // Validation
      if (!body.email || !validateEmail(body.email)) {
        return HttpResponse.json(
          { error: 'Invalid email format' },
          { status: 400 }
        );
      }

      if (!body.password) {
        return HttpResponse.json(
          { error: 'Password is required' },
          { status: 400 }
        );
      }

      // Mock successful login
      const user = {
        ...mockUser,
        email: body.email, // Use the email from request
      };
      setCurrentUser(user);

      const response: LoginResponse = {
        user,
        message: 'Login successful',
      };

      return HttpResponse.json(response, { status: 200 });
    } catch (error) {
      return HttpResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }
  }),

  http.get(`${API_BASE}/auth/status`, () => {
    if (!getIsAuthenticated() || !getCurrentUser()) {
      return new HttpResponse(null, { status: 401 });
    }

    return HttpResponse.json(getCurrentUser(), { status: 200 });
  }),

  // POST /auth/logout - Log out current user
  http.post(`${API_BASE}/auth/logout`, () => {
    setCurrentUser(null);
    return new HttpResponse(null, { status: 204 });
  }),

  // GET /users/me - Get current user profile
  http.get(`${API_BASE}/users/me`, () => {
    if (!getIsAuthenticated() || !getCurrentUser()) {
      return new HttpResponse(null, { status: 401 });
    }

    return HttpResponse.json(getCurrentUser(), { status: 200 });
  }),

  // PATCH /users/me - Update current user profile
  http.patch(`${API_BASE}/users/me`, async ({ request }) => {
    if (!getIsAuthenticated() || !getCurrentUser()) {
      return new HttpResponse(null, { status: 401 });
    }

    try {
      const contentType = request.headers.get('content-type');

      let updates: Partial<User> = {};

      if (contentType?.includes('application/json')) {
        // Handle JSON updates
        const body = (await request.json()) as Partial<Pick<User, 'username'>>;
        if (body.username) {
          if (!validateUsername(body.username)) {
            return HttpResponse.json(
              { error: 'Username must be at least 3 characters long' },
              { status: 400 }
            );
          }
          updates.username = body.username;
        }
      } else if (contentType?.includes('multipart/form-data')) {
        // Handle form data (for avatar upload)
        const formData = await request.formData();
        const username = formData.get('username');
        const avatar = formData.get('avatar');

        if (username && typeof username === 'string') {
          if (!validateUsername(username)) {
            return HttpResponse.json(
              { error: 'Username must be at least 3 characters long' },
              { status: 400 }
            );
          }
          updates.username = username;
        }
        if (avatar) {
          // Mock avatar URL
          updates.avatar = 'https://example.com/avatars/updated-avatar.png';
        }
      }

      // Update current user
      const updatedUser = {
        ...getCurrentUser()!,
        ...updates,
      };

      setCurrentUser(updatedUser);

      return HttpResponse.json(updatedUser, { status: 200 });
    } catch (error) {
      return HttpResponse.json(
        { error: 'Invalid request data' },
        { status: 400 }
      );
    }
  }),

  // GET /auth/42/login - return authorization URL
  http.get(`${API_BASE}/auth/42/login`, () => {
    const origin = globalThis.location?.origin ?? 'http://localhost:3000';
    const authorizationUrl = new URL('https://profile.intra.42.fr/oauth/authorize');
    authorizationUrl.searchParams.set('client_id', 'mock-client-id');
    authorizationUrl.searchParams.set('redirect_uri', `${origin}/auth/42/callback`);
    authorizationUrl.searchParams.set('response_type', 'code');
    authorizationUrl.searchParams.set('state', crypto.randomUUID());

    return HttpResponse.json(
      { authorizationUrl: authorizationUrl.toString() },
      { status: 200 }
    );
  }),

  // GET /auth/42/callback - simulate oauth success
  http.get(`${API_BASE}/auth/42/callback`, ({ request }) => {
    const url = new URL(request.url);
    const code = url.searchParams.get('code');
    if (!code) {
      return HttpResponse.json({ error: 'Missing authorization code' }, { status: 400 });
    }

    setCurrentUser(mockUser);

    const response: LoginResponse = {
      user: mockUser,
      message: 'OAuth login successful',
    };

    return HttpResponse.json(response, { status: 200 });
  }),
];
