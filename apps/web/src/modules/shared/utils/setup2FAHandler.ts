// apps/web/src/modules/shared/utils/setup2FAHandler.ts
// Example integration: Setup 2FA event listener for UI components
// Call this once during app initialization

import { authEvents } from './AuthEventEmitter';
import { appState, AuthActions } from '../../../state';

/**
 * Setup 2FA event handler
 * This function should be called once during app initialization
 * to handle 2FA prompts triggered by the HttpClient
 */
export function setup2FAHandler(): void {
  // Listen for 2FA required events
  authEvents.on('2fa-required', async (event) => {
    console.log('[2FA Handler] 2FA code required');

    // Show 2FA prompt in UI
    AuthActions.show2FAPrompt();

    // In a real app, you would:
    // 1. Show a modal/dialog asking for the 6-digit code
    // 2. User enters the code
    // 3. Call event.resolve(code) with the code
    // 4. Or call event.reject() if user cancels

    // Example: Wait for user to submit 2FA code via UI
    // This is a simplified example - in reality, you'd use a modal component
    const unsubscribe = appState.ui.subscribe((state) => {
      // Check if 2FA modal was closed/cancelled
      if (!state.twoFAModalVisible && appState.auth.get().requires2FA) {
        event.reject('User cancelled 2FA');
        AuthActions.hide2FAPrompt();
        unsubscribe();
      }
    });

    // Note: The actual code submission should happen in your UI component
    // by calling event.resolve(code) when the user submits the form
    // See example below in comments
  });

  // Listen for 2FA completion events
  authEvents.on('2fa-completed', (event) => {
    console.log('[2FA Handler] 2FA flow completed, success:', event.success);

    if (event.success) {
      AuthActions.hide2FAPrompt();
    } else {
      AuthActions.set2FAError('Invalid 2FA code, please try again');
    }
  });

  // Listen for token refresh events
  authEvents.on('token-refreshed', (event) => {
    console.log('[2FA Handler] Token refreshed successfully');
  });

  // Listen for logout events
  authEvents.on('logout', (event) => {
    console.log('[2FA Handler] User logged out, reason:', event.reason);
  });
}

/**
 * Example function to submit 2FA code from UI component
 * Call this from your 2FA modal component when user submits the code
 *
 * Usage in your 2FA modal component:
 *
 * import { submit2FACode } from './setup2FAHandler';
 *
 * function handleSubmit(code: string) {
 *   submit2FACode(code);
 * }
 */
let current2FAResolve: ((code: string) => void) | null = null;
let current2FAReject: ((reason?: string) => void) | null = null;

// Store the resolve/reject functions when 2FA is required
authEvents.on('2fa-required', (event) => {
  current2FAResolve = event.resolve;
  current2FAReject = event.reject;
});

export function submit2FACode(code: string): void {
  if (current2FAResolve) {
    current2FAResolve(code);
    current2FAResolve = null;
    current2FAReject = null;
  }
}

export function cancel2FA(): void {
  if (current2FAReject) {
    current2FAReject('User cancelled');
    current2FAResolve = null;
    current2FAReject = null;
  }
  AuthActions.hide2FAPrompt();
}
