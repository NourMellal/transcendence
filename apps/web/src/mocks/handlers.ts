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

// Mock friends data (using Friends model types) - mutable arrays
let mockFriends = [
  {
    id: '1',
    username: 'alice_doe',
    email: 'alice@example.com',
    status: 'ONLINE' as const,
    is2FAEnabled: false
  },
  {
    id: '2', 
    username: 'bob_smith',
    email: 'bob@example.com',
    status: 'OFFLINE' as const,
    is2FAEnabled: true
  }
];

let mockPendingRequests = [
  {
    id: '1',
    requesterId: '3',
    addresseeId: mockUser.id,
    status: 'PENDING' as const,
    createdAt: '2024-01-15T10:00:00Z',
    updatedAt: '2024-01-15T10:00:00Z'
  }
];

let mockSentRequests: any[] = [];

let mockSearchUsers = [
  {
    id: '4',
    username: 'diana_jones',
    email: 'diana@example.com',
    status: 'ONLINE' as const,
    is2FAEnabled: false
  },
  {
    id: '5',
    username: 'eve_brown',
    email: 'eve@example.com',
    status: 'OFFLINE' as const,
    is2FAEnabled: true
  }
];

export const handlers = [
  // POST /auth/signup - Register a new user
  http.post(`${API_BASE}/auth/signup`, async ({ request }) => {
    try {
      const body = (await request.json()) as SignUpRequest;

      // Create new user based on signup data
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

      // Set as current user
      setCurrentUser(newUser);

      return HttpResponse.json(newUser, { status: 201 });
    } catch (error) {
      return HttpResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }
  }),

  // POST /auth/login - Login with email and password
  http.post(`${API_BASE}/auth/login`, async ({ request }) => {
    try {
      // Parse login credentials (mock accepts any credentials)
      await request.json() as LoginRequest;

      // Mock login validation (accept any credentials)
      // In real implementation, would validate against stored credentials
      const user = mockUser;
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

  // GET /auth/status - Get current authentication status
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
        const body = (await request.json()) as Partial<User>;
        if (body.username) {
          updates.username = body.username;
        }
      } else if (contentType?.includes('multipart/form-data')) {
        // Handle form data (for avatar upload)
        const formData = await request.formData();
        const username = formData.get('username');
        const avatar = formData.get('avatar');

        if (username && typeof username === 'string') {
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

  // Friends API endpoints
  
  // GET /friends - Get user's friends list
  http.get(`${API_BASE}/friends`, () => {
    if (!getIsAuthenticated()) {
      return new HttpResponse(null, { status: 401 });
    }

    return HttpResponse.json(mockFriends, { status: 200 });
  }),

  // GET /friends/requests/pending - Get pending friend requests
  http.get(`${API_BASE}/friends/requests/pending`, () => {
    if (!getIsAuthenticated()) {
      return new HttpResponse(null, { status: 401 });
    }

    return HttpResponse.json(mockPendingRequests, { status: 200 });
  }),

  // GET /friends/requests/sent - Get sent friend requests  
  http.get(`${API_BASE}/friends/requests/sent`, () => {
    if (!getIsAuthenticated()) {
      return new HttpResponse(null, { status: 401 });
    }

    return HttpResponse.json(mockSentRequests, { status: 200 });
  }),

  // POST /friends/requests - Send friend request
  http.post(`${API_BASE}/friends/requests`, async ({ request }) => {
    if (!getIsAuthenticated()) {
      return new HttpResponse(null, { status: 401 });
    }

    try {
      const body = await request.json() as { toUserId: string; message?: string };
      
      // Mock successful friend request
      const newRequest = {
        id: crypto.randomUUID(),
        requesterId: getCurrentUser()!.id,
        addresseeId: body.toUserId,
        status: 'PENDING' as const,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      mockSentRequests.push(newRequest);
      
      return HttpResponse.json(newRequest, { status: 201 });
    } catch (error) {
      return HttpResponse.json({ error: 'Invalid request' }, { status: 400 });
    }
  }),

  // POST /friends/requests/:id/accept - Accept friend request
  http.post(`${API_BASE}/friends/requests/:id/accept`, ({ params }) => {
    if (!getIsAuthenticated()) {
      return new HttpResponse(null, { status: 401 });
    }

    const requestId = params.id;
    const requestIndex = mockPendingRequests.findIndex(req => req.id === requestId);
    
    if (requestIndex === -1) {
      return HttpResponse.json({ error: 'Friend request not found' }, { status: 404 });
    }

    // Move to friends list and remove from pending
    const request = mockPendingRequests[requestIndex];
    // Add a mock friend based on the requester ID
    mockFriends.push({
      id: request.requesterId,
      username: `user_${request.requesterId}`,
      email: `user_${request.requesterId}@example.com`,
      status: 'ONLINE' as const,
      is2FAEnabled: false
    });
    mockPendingRequests.splice(requestIndex, 1);

    return HttpResponse.json({ message: 'Friend request accepted' }, { status: 200 });
  }),

  // POST /friends/requests/:id/decline - Decline friend request
  http.post(`${API_BASE}/friends/requests/:id/decline`, ({ params }) => {
    if (!getIsAuthenticated()) {
      return new HttpResponse(null, { status: 401 });
    }

    const requestId = params.id;
    const requestIndex = mockPendingRequests.findIndex(req => req.id === requestId);
    
    if (requestIndex === -1) {
      return HttpResponse.json({ error: 'Friend request not found' }, { status: 404 });
    }

    // Remove from pending requests
    mockPendingRequests.splice(requestIndex, 1);

    return HttpResponse.json({ message: 'Friend request declined' }, { status: 200 });
  }),

  // DELETE /friends/:id - Remove friend
  http.delete(`${API_BASE}/friends/:id`, ({ params }) => {
    if (!getIsAuthenticated()) {
      return new HttpResponse(null, { status: 401 });
    }

    const friendId = params.id;
    const friendIndex = mockFriends.findIndex(friend => friend.id === friendId);
    
    if (friendIndex === -1) {
      return HttpResponse.json({ error: 'Friend not found' }, { status: 404 });
    }

    // Remove from friends list
    mockFriends.splice(friendIndex, 1);

    return HttpResponse.json({ message: 'Friend removed' }, { status: 200 });
  }),

  // GET /users/search - Search users
  http.get(`${API_BASE}/users/search`, ({ request }) => {
    if (!getIsAuthenticated()) {
      return new HttpResponse(null, { status: 401 });
    }

    const url = new URL(request.url);
    const query = url.searchParams.get('q') || '';
    
    // Filter mock users by query
    const filteredUsers = mockSearchUsers.filter(user => 
      user.username.toLowerCase().includes(query.toLowerCase()) ||
      user.email.toLowerCase().includes(query.toLowerCase())
    );

    return HttpResponse.json(filteredUsers, { status: 200 });
  }),
];
