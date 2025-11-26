import Signal from '../core/signal';

// Auth state interface
export interface AuthState {
  user: any | null;
  isLoading: boolean;
  token?: string;
  refreshToken?: string;
  // 2FA state
  requires2FA?: boolean;
  twoFAPromptVisible?: boolean;
  // OAuth state
  oauthProvider?: '42' | 'google' | 'github' | null;
  oauthInProgress?: boolean;
}

// UI state interface
export interface UIState {
  twoFAModalVisible: boolean;
  twoFAError?: string;
  loginError?: string;
}

export const appState = {
  auth: new Signal<AuthState>({
    user: null,
    isLoading: false,
    token: '',
    refreshToken: undefined,
    requires2FA: false,
    twoFAPromptVisible: false,
    oauthProvider: null,
    oauthInProgress: false,
  }),
  ui: new Signal<UIState>({
    twoFAModalVisible: false,
    twoFAError: undefined,
    loginError: undefined,
  }),
  notifications: new Signal<string[]>([]),
};

export class AuthActions {
  static async login(email: string, password: string) {
    appState.auth.set({
      ...appState.auth.get(),
      isLoading: true,
      requires2FA: false,
      twoFAPromptVisible: false,
    });
  }

  static show2FAPrompt() {
    const current = appState.auth.get();
    appState.auth.set({
      ...current,
      requires2FA: true,
      twoFAPromptVisible: true,
      isLoading: false,
    });
    appState.ui.set({
      ...appState.ui.get(),
      twoFAModalVisible: true,
      twoFAError: undefined,
    });
  }

  static hide2FAPrompt() {
    const current = appState.auth.get();
    appState.auth.set({
      ...current,
      requires2FA: false,
      twoFAPromptVisible: false,
    });
    appState.ui.set({
      ...appState.ui.get(),
      twoFAModalVisible: false,
      twoFAError: undefined,
    });
  }

  static set2FAError(error: string) {
    appState.ui.set({
      ...appState.ui.get(),
      twoFAError: error,
    });
  }

  static startOAuthFlow(provider: '42' | 'google' | 'github') {
    appState.auth.set({
      ...appState.auth.get(),
      oauthProvider: provider,
      oauthInProgress: true,
      isLoading: true,
    });
  }

  static completeOAuthFlow(success: boolean) {
    const current = appState.auth.get();
    appState.auth.set({
      ...current,
      oauthProvider: null,
      oauthInProgress: false,
      isLoading: false,
    });
  }
}
