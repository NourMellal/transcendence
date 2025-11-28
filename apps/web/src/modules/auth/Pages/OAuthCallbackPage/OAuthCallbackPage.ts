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
    const code = params.get('code');
    const stateParam = params.get('state') ?? '';

    if (token) {
      await this.handleTokenLogin(token);
      return;
    }

    if (!code) {
      const errorMessage = params.get('error') || 'Missing OAuth parameters.';
      this.setState({ status: 'error', message: errorMessage });
      return;
    }

    try {
      const response = await authService.handle42Callback(code, stateParam);
      appState.auth.set({
        ...appState.auth.get(),
        user: response.user ?? null,
        isAuthenticated: Boolean(response.user),
        isLoading: false,
      });
      this.setState({ status: 'success' });
      navigate('/profile');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'OAuth callback failed.';
      this.setState({ status: 'error', message });
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

  private async handleTokenLogin(token: string): Promise<void> {
    try {
      httpClient.setAuthToken(token);
      const user = await userService.getMe();
      appState.auth.set({
        ...appState.auth.get(),
        user,
        token,
        isAuthenticated: Boolean(user),
        isLoading: false,
      });
      this.setState({ status: 'success' });
      navigate('/profile');
    } catch (error) {
      httpClient.clearAuthToken();
      const message = error instanceof Error ? error.message : 'Failed to finalize OAuth login.';
      this.setState({ status: 'error', message });
    }
  }
}
