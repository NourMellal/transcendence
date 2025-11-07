# Update Profile Implementation

## ✅ COMPLETED - User Profile Update Feature

### Overview
Implemented complete user profile update functionality with proper authentication and authorization through the API Gateway.

---

## Architecture

### 🔐 Security Flow

```
Client → API Gateway → User Service
         ↓
    [requireAuth]    → Validates JWT token
         ↓
    [Extract user]   → Gets userId from JWT
         ↓
    [Forward req]    → Adds x-user-id header
                      ↓
                   User Service validates user owns resource
```

---

## Implementation Details

### 1. **API Gateway** (`infrastructure/api-gateway`)
- ✅ **Authentication**: `requireAuth` middleware validates JWT tokens
- ✅ **User Extraction**: Extracts `userId` from JWT payload
- ✅ **Header Forwarding**: Passes `x-user-id` to downstream services
- ✅ **Routes**: 
  - `GET /api/users/me` → Protected, returns current user
  - `PATCH /api/users/me` → Protected, updates current user

### 2. **User Service** (`services/user-service`)

#### New Endpoints:
```typescript
GET  /users/me     → Get authenticated user (reads x-user-id header)
PATCH /users/me    → Update authenticated user (reads x-user-id header)
PUT   /users/me    → Alias for PATCH

GET  /users/:id    → Get any user by ID (public profile)
PATCH /users/:id   → Update user by ID (with authorization check)
PUT   /users/:id   → Alias for PATCH
```

#### Authorization Logic:
```typescript
// In updateProfile(/:id)
const authenticatedUserId = request.headers['x-user-id'];
if (authenticatedUserId && id !== authenticatedUserId) {
    return 403 Forbidden
}
```

#### Use Cases:
- ✅ `UpdateProfileUseCase` - Business logic for profile updates
- ✅ `GetUserUseCase` - Fetch user by ID

#### Controller Methods:
- ✅ `getUser()` - Get user by ID
- ✅ `getMe()` - Get current authenticated user (from header)
- ✅ `updateProfile()` - Update user with authorization check
- ✅ `updateMe()` - Update current authenticated user (from header)

---

## Supported Update Fields

| Field | Validation | Notes |
|-------|-----------|-------|
| `displayName` | 1-50 chars | - |
| `avatar` | URL string | Future: file upload |
| `email` | Valid email format, unique | Checks for duplicates |
| `username` | 3-20 chars, alphanumeric + `-_` | Checks for duplicates |
| `password` | 8+ chars, uppercase, lowercase, number, special char | Only for local auth users, not OAuth |

---

## Security Features

### ✅ 1. **Authentication** (API Gateway)
- JWT token required in `Authorization: Bearer <token>` header
- Token validated using Vault-stored secrets
- Invalid/expired tokens return 401 Unauthorized

### ✅ 2. **Authorization** (User Service)
- Users can only update their own profiles
- Attempts to update others' profiles return 403 Forbidden
- Admin routes would need separate implementation

### ✅ 3. **Validation**
- Input validation for all fields
- Email format and uniqueness
- Username format and uniqueness
- Password strength requirements
- OAuth users cannot change passwords

### ✅ 4. **Error Handling**
- 400 Bad Request - Invalid input
- 401 Unauthorized - Missing/invalid token or user ID
- 403 Forbidden - Trying to update another user's profile
- 404 Not Found - User doesn't exist
- 409 Conflict - Email/username already exists
- 500 Internal Server Error - Server issues

---

## API Examples

### Via API Gateway (Recommended)

```bash
# Login to get JWT token
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "password": "Pass123!"}'
# Returns: { "accessToken": "eyJ..." }

# Get current user profile
curl -X GET http://localhost:3000/api/users/me \
  -H "Authorization: Bearer <token>"

# Update current user profile
curl -X PATCH http://localhost:3000/api/users/me \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"displayName": "New Name", "avatar": "https://example.com/avatar.png"}'
```

### Direct to Service (Internal/Testing)

```bash
# Get user by ID (with auth header)
curl -X GET http://localhost:3001/users/me \
  -H "x-internal-api-key: your-key" \
  -H "x-user-id: <user-uuid>"

# Update profile
curl -X PATCH http://localhost:3001/users/me \
  -H "Content-Type: application/json" \
  -H "x-internal-api-key: your-key" \
  -H "x-user-id: <user-uuid>" \
  -d '{"displayName": "Updated Name"}'
```

---

## Testing

### Test Results ✅
```
✅ GET /users/me - Returns current user data
✅ PATCH /users/me - Updates display name
✅ PATCH /users/me - Updates avatar
✅ PATCH /users/me - Updates email (checks uniqueness)
✅ PATCH /users/me - Updates password (validates strength)
✅ PATCH /users/:id - Rejects unauthorized updates (403 Forbidden)
✅ Validation - Rejects invalid email format
✅ Validation - Rejects weak passwords
✅ Validation - Rejects short usernames
✅ Login with updated credentials works
```

### Run Tests
```bash
# Integration test
bash test/integration/test-update-profile.sh
```

---

## Database Schema

```sql
CREATE TABLE users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT,
    display_name TEXT,           -- ← Updated
    avatar TEXT,                  -- ← Updated
    two_fa_secret TEXT,
    is_2fa_enabled INTEGER DEFAULT 0,
    oauth_provider TEXT DEFAULT 'local',
    oauth_id TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL      -- ← Auto-updated on changes
);
```

---

## Files Modified/Created

### User Service
- ✅ `src/application/use-cases/update-profile.usecase.ts` - Implemented full logic
- ✅ `src/application/use-cases/get-user.usecase.ts` - Implemented
- ✅ `src/infrastructure/http/controllers/user.controller.ts` - New controller
- ✅ `src/infrastructure/http/routes/user.routes.ts` - New routes
- ✅ `src/infrastructure/database/repositories/sqlite-user.repository.ts` - Added email field to update
- ✅ `src/server.ts` - Registered user routes

### Tests
- ✅ `test/integration/test-update-profile.sh` - Comprehensive test script

---

## Next Steps

### Phase 2: Friends System
- [ ] Create friends table
- [ ] Add/remove friend endpoints
- [ ] List friends endpoint
- [ ] Friend request system

### Phase 3: User Stats
- [ ] Create user_stats table
- [ ] Track wins/losses
- [ ] Display on profile

### Phase 4: Match History
- [ ] Create matches table
- [ ] Store game results
- [ ] Match history endpoint

---

## Subject Requirements

✅ **"Users can update their information"** - COMPLETED

This implements the mandatory requirement from the **Standard User Management major module**.

---

## Notes

- The TODO in the controller has been resolved with proper authorization
- API Gateway handles authentication (JWT validation)
- User Service handles authorization (user owns resource)
- All sensitive operations require authentication
- Password updates only allowed for local auth users (not OAuth)
