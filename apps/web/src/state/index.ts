import Signal from '../core/signal';
import type { GameStateOutput } from '../modules/game/types/game.types';

// Export chat state
export { chatState, chatStateHelpers } from './chat.state';
export type { ChatState } from './chat.state';

// Auth state data interface (used by the Signal)
export interface AuthStateData {
  user: any | null;
  isLoading: boolean;
  token?: string;
  refreshToken?: string;
  isAuthenticated: boolean;
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

// Game state interface
export interface GameState {
  current: GameStateOutput | null;
  isLoading: boolean;
  error: string | null;
}

const createInitialAuthState = (): AuthStateData => ({
  user: null,
  isLoading: false,
  token: '',
  isAuthenticated: false,
  refreshToken: undefined,
  requires2FA: false,
  twoFAPromptVisible: false,
  oauthProvider: null,
  oauthInProgress: false,
});

export const appState = {
  auth: new Signal<AuthStateData>(createInitialAuthState()),
  ui: new Signal<UIState>({
    twoFAModalVisible: false,
    twoFAError: undefined,
    loginError: undefined,
  }),
  notifications: new Signal<string[]>([]),
  game: new Signal<GameState>({
    current: null,
    isLoading: false,
    error: null,
  }),
};

export class AuthActions {
  static async login(_email: string, _password: string) {
    appState.auth.set({
      ...appState.auth.get(),
      isLoading: true,
      requires2FA: false,
      twoFAPromptVisible: false,
    });
  }

  static resetAuth() {
    appState.auth.set(createInitialAuthState());
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

  static completeOAuthFlow(_success: boolean) {
    const current = appState.auth.get();
    appState.auth.set({
      ...current,
      oauthProvider: null,
      oauthInProgress: false,
      isLoading: false,
    });
  }
}
