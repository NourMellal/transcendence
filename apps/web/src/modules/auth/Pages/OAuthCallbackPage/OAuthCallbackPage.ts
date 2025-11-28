import Component from '../../../../core/Component';
import { navigate } from '../../../../routes';
import { authService } from '../../../../services/auth/AuthService';
import { appState } from '../../../../state';

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
    const code = params.get('code');
    const stateParam = params.get('state') ?? '';

    if (!code) {
      this.setState({ status: 'error', message: 'Missing OAuth code in callback.' });
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
}
