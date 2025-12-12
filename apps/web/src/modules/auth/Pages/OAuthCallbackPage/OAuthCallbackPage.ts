import Component from '../../../../core/Component';
import { navigate } from '../../../../routes';
import { authService } from '../../../../services/auth/AuthService';
import { appState } from '../../../../state';
import { userService, httpClient } from '../../../../services/api';

type State = {
  status: 'processing' | 'success' | 'error';
  message?: string;
};

export default class OAuthCallbackPage extends Component<Record<string, never>, State> {
  getInitialState(): State {
    return {
      status: 'processing',
    };
  }

  async onMount(): Promise<void> {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    const refreshToken = params.get('refreshToken');
    const code = params.get('code');
    const stateParam = params.get('state') ?? '';
    const errorCode = params.get('error');

    if (token) {
      await this.handleTokenLogin(token, refreshToken ?? undefined);
      return;
    }

    if (!code) {
      this.setState({ status: 'error', message: this.getErrorMessage(errorCode) });
      return;
    }

    try {
      const response = await authService.handle42Callback(code, stateParam);
      const currentAuth = appState.auth.get();
      appState.auth.set({
        ...currentAuth,
        user: response.user ?? currentAuth.user ?? null,
        isAuthenticated: true,
        isLoading: false,
      });
      this.setState({ status: 'success' });
      navigate('/dashboard');
    } catch (error) {
      const message = error instanceof Error ? error.message : undefined;
      this.setState({ status: 'error', message: this.getErrorMessage(message) });
    }
  }

  render(): string {
    if (this.state.status === 'processing') {
      return `
        <div class="page oauth-callback">
          <p>Finishing authentication with 42…</p>
        </div>
      `;
    }

    if (this.state.status === 'error') {
      return `
        <div class="page oauth-callback">
          <p>OAuth error: ${this.state.message ?? 'Unknown error'}</p>
          <button data-action="back-to-login">Return to login</button>
        </div>
      `;
    }

    return '<div class="page oauth-callback"><p>Redirecting…</p></div>';
  }

  protected attachEventListeners(): void {
    const button = this.element?.querySelector('[data-action="back-to-login"]') as HTMLButtonElement | null;
    if (button) {
      const handler = (event: Event) => {
        event.preventDefault();
        navigate('/auth/login');
      };
      button.addEventListener('click', handler);
      this.subscriptions.push(() => button.removeEventListener('click', handler));
    }
  }

  private async handleTokenLogin(token: string, refreshToken?: string): Promise<void> {
    try {
      httpClient.setAuthToken(token);
      if (refreshToken) {
        localStorage.setItem('refreshToken', refreshToken);
      }
      const user = await userService.getMe();
      const currentAuth = appState.auth.get();
      appState.auth.set({
        ...currentAuth,
        user: user ?? currentAuth.user ?? null,
        token,
        isAuthenticated: true,
        isLoading: false,
      });
      this.setState({ status: 'success' });
      navigate('/dashboard');
    } catch (error) {
      httpClient.clearAuthToken();
      const message = this.getErrorMessage(error instanceof Error ? error.message : undefined);
      this.setState({ status: 'error', message });
    }
  }

  private getErrorMessage(code?: string | null): string {
    if (!code) {
      return 'OAuth callback failed.';
    }

    const normalized = code.toLowerCase();
    if (normalized.includes('already_logged')) {
      return 'This account is already active on another device. Please logout there before signing in again.';
    }
    if (normalized === 'missing_code') {
      return 'Missing OAuth parameters.';
    }
    if (normalized === 'oauth_error') {
      return 'OAuth login failed. Please try again.';
    }

    return code;
  }
}
