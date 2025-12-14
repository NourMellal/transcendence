# Enhanced HttpClient - Documentation

## Overview

The HttpClient has been enhanced to support:
- ✅ **JWT Authentication** with automatic token refresh
- ✅ **2FA (TOTP)** challenge detection and handling
- ✅ **OAuth2** redirect flows (42 School login)
- ✅ **Request retry queue** for seamless token refresh
- ✅ **Preemptive token refresh** (reduces 401 errors)
- ✅ **Server-side token revocation** on logout
- ✅ **Event-driven architecture** for UI integration

---

## Quick Start

### 1. Initialize 2FA Handler (once during app startup)

```typescript
import { setup2FAHandler } from './modules/shared/utils/setup2FAHandler';

// In your main.ts or app initialization
setup2FAHandler();
```

### 2. Use HttpClient for API calls

```typescript
import { httpClient } from './modules/shared/services/HttpClient';

// Regular API calls - token injection and refresh happen automatically
const user = await httpClient.get('/users/me');
await httpClient.post('/games', { gameMode: 'CLASSIC' });
```

### 3. Implement 2FA UI Component

```typescript
import { submit2FACode, cancel2FA } from './modules/shared/utils/setup2FAHandler';
import { appState } from './state';

// Listen to UI state
appState.ui.subscribe((state) => {
  if (state.twoFAModalVisible) {
    // Show your 2FA modal
    showTwoFAModal();
  }
});

// When user submits code
function handleSubmit(code: string) {
  submit2FACode(code); // HttpClient will retry with code
}

// When user cancels
function handleCancel() {
  cancel2FA();
}
```

### 4. Add OAuth Login Button

```typescript
import { httpClient } from './modules/shared/services/HttpClient';
import { AuthActions } from './state';

// Initiate OAuth login
async function handleOAuthLogin() {
  AuthActions.startOAuthFlow('42');
  await httpClient.initiateOAuthLogin('42');
  // User will be redirected to 42 OAuth page
}

// Handle OAuth callback (in your callback route/page)
if (httpClient.isOAuthCallback()) {
  const result = httpClient.handleOAuthCallback();

  if (result.success) {
    console.log('Logged in!', result.token);
    AuthActions.completeOAuthFlow(true);
    // Redirect to dashboard
  } else {
    console.error('OAuth failed:', result.error);
    AuthActions.completeOAuthFlow(false);
  }
}
```

### 5. Logout with Token Revocation

```typescript
import { httpClient } from './modules/shared/services/HttpClient';

// This will revoke the token on the server before clearing local storage
await httpClient.logout();
```

---

## Features Explained

### 🔄 Automatic Token Refresh

**Before:**
- Every expired token caused a 401 error
- User had to manually re-login

**After:**
- Token is refreshed **5 minutes before expiry** (preemptive)
- If a 401 occurs, token is refreshed automatically
- All pending requests are **queued and replayed** after refresh
- Zero interruption to user experience

### 🔐 2FA Support

**Flow:**
1. User logs in with email/password
2. Backend returns 401 with "Two-factor authentication required"
3. HttpClient detects this and emits `2fa-required` event
4. Your UI shows a 2FA modal
5. User enters 6-digit code
6. Code is submitted via `submit2FACode(code)`
7. HttpClient retries login with `totpCode` field
8. Login succeeds and tokens are stored

**Key Functions:**
- `authEvents.on('2fa-required', handler)` - Listen for 2FA challenges
- `submit2FACode(code)` - Submit user's 2FA code
- `cancel2FA()` - Cancel 2FA flow

### 🌐 OAuth2 (42 School Login)

**Flow:**
1. User clicks "Login with 42" button
2. `httpClient.initiateOAuthLogin('42')` redirects to 42.fr
3. User authorizes on 42.fr
4. User is redirected back to your app with `?token=...&userId=...`
5. `httpClient.handleOAuthCallback()` extracts and stores tokens
6. User is logged in

**Key Functions:**
- `httpClient.initiateOAuthLogin(provider)` - Start OAuth flow
- `httpClient.isOAuthCallback()` - Check if current URL is a callback
- `httpClient.handleOAuthCallback()` - Extract tokens from URL

### 📡 Request Retry Queue

**Problem:** Multiple requests fail during token refresh, causing errors

**Solution:**
- Requests failing with 401 are **queued**
- When token refresh completes, all queued requests are **replayed** with new token
- No requests are lost

### 🚪 Server-Side Logout

**Before:**
- `logout()` only cleared localStorage
- Tokens remained valid on server

**After:**
- `httpClient.logout()` calls `/auth/logout` with refreshToken
- Server revokes the token in database
- Then clears local storage
- Much more secure!

---

## Event System

The HttpClient emits events for UI integration:

```typescript
import { authEvents } from './modules/shared/utils/AuthEventEmitter';

// 2FA Required
authEvents.on('2fa-required', (event) => {
  // Show 2FA modal
  // When user submits: event.resolve(code)
  // When user cancels: event.reject()
});

// 2FA Completed
authEvents.on('2fa-completed', (event) => {
  if (event.success) {
    // Hide modal, show success
  } else {
    // Show error
  }
});

// Token Refreshed
authEvents.on('token-refreshed', (event) => {
  console.log('New token:', event.newToken);
});

// Token Refresh Failed
authEvents.on('token-refresh-failed', (event) => {
  console.error('Refresh failed:', event.error);
});

// Logout
authEvents.on('logout', (event) => {
  console.log('Logged out, reason:', event.reason);
  // reason: 'user-initiated' | 'token-expired' | 'refresh-failed'
});
```

---

## State Management

The app state has been updated to support 2FA and OAuth:

```typescript
import { appState, AuthActions } from './state';

// Auth state
appState.auth.get(); // { user, token, requires2FA, oauthProvider, ... }

// UI state
appState.ui.get(); // { twoFAModalVisible, twoFAError, loginError }

// Actions
AuthActions.show2FAPrompt();
AuthActions.hide2FAPrompt();
AuthActions.set2FAError('Invalid code');
AuthActions.startOAuthFlow('42');
AuthActions.completeOAuthFlow(true);
```

---

## Architecture

### Token Refresh Flow

```
User Request → Check Token Expiry → Preemptive Refresh?
                                    ↓
                              No - Proceed with request
                                    ↓
                              401 Response?
                                    ↓
                              Yes - Queue Request
                                    ↓
                              Refresh Token
                                    ↓
                              Replay Queued Requests
```

### 2FA Flow

```
Login Request → 401 "2FA Required" → Emit Event
                                    ↓
                              UI Shows Modal
                                    ↓
                              User Enters Code
                                    ↓
                              Retry Login with totpCode
                                    ↓
                              Success → Store Tokens
```

### OAuth Flow

```
Click "Login with 42" → Redirect to 42.fr
                                    ↓
                              User Authorizes
                                    ↓
                              Redirect to /oauth/callback?token=...
                                    ↓
                              Extract & Store Tokens
                                    ↓
                              Redirect to Dashboard
```

---

## Backend Compatibility

✅ **No backend changes needed** - Your API already supports:
- `POST /auth/login` with optional `totpCode` field
- `POST /auth/refresh` with `refreshToken`
- `POST /auth/logout` with `refreshToken`
- `GET /auth/42/login` for OAuth initiation
- `GET /auth/42/callback` for OAuth callback

---

## Security Features

1. **Preemptive Token Refresh** - Reduces exposure window
2. **Server-Side Token Revocation** - Tokens invalidated on logout
3. **Request Queue** - No failed requests during refresh
4. **JWT Decode** (no verification) - Client-side expiry checks
5. **Infinite Loop Prevention** - Requests marked as `_retry`

---

## Example: Complete 2FA Modal Component

```typescript
// TwoFAModal.ts
import { Component } from '../../core';
import { appState } from '../../state';
import { submit2FACode, cancel2FA } from '../shared/utils/setup2FAHandler';

export class TwoFAModal extends Component {
  render() {
    const { twoFAModalVisible, twoFAError } = appState.ui.get();

    if (!twoFAModalVisible) {
      return '';
    }

    return `
      <div class="modal-overlay">
        <div class="modal">
          <h2>Two-Factor Authentication</h2>
          <p>Enter your 6-digit code from authenticator app</p>

          ${twoFAError ? `<p class="error">${twoFAError}</p>` : ''}

          <input
            type="text"
            id="totp-code"
            maxlength="6"
            pattern="[0-9]{6}"
            placeholder="000000"
          />

          <button id="submit-2fa">Verify</button>
          <button id="cancel-2fa">Cancel</button>
        </div>
      </div>
    `;
  }

  attachEventListeners() {
    const submitBtn = document.getElementById('submit-2fa');
    const cancelBtn = document.getElementById('cancel-2fa');
    const input = document.getElementById('totp-code') as HTMLInputElement;

    submitBtn?.addEventListener('click', () => {
      const code = input.value.trim();
      if (code.length === 6) {
        submit2FACode(code);
      }
    });

    cancelBtn?.addEventListener('click', () => {
      cancel2FA();
    });
  }
}
```

---

## Testing

### Test 2FA Flow

1. Enable 2FA for your test user in the backend
2. Try logging in - you should see the 2FA modal
3. Enter a valid TOTP code
4. Login should complete successfully

### Test Token Refresh

1. Decode your JWT and check expiry time
2. Wait until 5 minutes before expiry
3. Make an API call - token should refresh automatically
4. Check console logs for "Token expiring soon, preemptively refreshing..."

### Test OAuth

1. Click "Login with 42" button
2. You'll be redirected to 42.fr
3. After authorization, you'll be back with tokens in URL
4. Tokens should be extracted and stored automatically

---

## Troubleshooting

### 2FA modal doesn't appear
- Check if `setup2FAHandler()` was called in app initialization
- Check browser console for "[2FA Handler] 2FA code required"
- Verify UI state: `appState.ui.get().twoFAModalVisible`

### Token not refreshing
- Check if refreshToken exists: `localStorage.getItem('refreshToken')`
- Check console for refresh errors
- Verify backend `/auth/refresh` endpoint is working

### OAuth redirect not working
- Check backend OAuth callback URL is set to your frontend URL
- Verify URL params contain `token` and `userId`
- Check console for "[HttpClient] OAuth callback" logs

---

## Migration Guide

If you have existing auth code:

**Before:**
```typescript
// Manual token injection
fetch('/api/users/me', {
  headers: { Authorization: `Bearer ${token}` }
});
```

**After:**
```typescript
// Automatic token injection + refresh
await httpClient.get('/users/me');
```

**Before:**
```typescript
// Manual logout
localStorage.removeItem('token');
navigate('/auth/login');
```

**After:**
```typescript
// Server-side revocation + local cleanup
await httpClient.logout();
```

---

## Future Enhancements (Optional)

- [ ] Move tokens to httpOnly cookies (requires backend changes)
- [ ] CSRF token support
- [ ] Refresh token rotation
- [ ] Remember device for 2FA
- [ ] Biometric authentication support
- [ ] Multiple OAuth providers simultaneously

---

For questions or issues, check the console logs - HttpClient provides detailed logging with emojis for easy debugging! 🚀
