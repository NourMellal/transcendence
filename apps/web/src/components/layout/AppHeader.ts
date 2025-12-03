import Component from '@/core/Component';
import type { User } from '@/models';
import { appState } from '@/state';
import { navigate } from '@/routes';
import { authService } from '@/services/auth/AuthService';

type State = {
  user: User | null;
  isAuthenticated: boolean;
  isLoggingOut: boolean;
};

export default class AppHeader extends Component<Record<string, never>, State> {
  private unsubscribe?: () => void;

  getInitialState(): State {
    const auth = appState.auth.get();
    return {
      user: auth.user ?? null,
      isAuthenticated: auth.isAuthenticated,
      isLoggingOut: false,
    };
  }

  onMount(): void {
    this.unsubscribe = appState.auth.subscribe((auth) => {
      this.setState({
        user: auth.user ?? null,
        isAuthenticated: auth.isAuthenticated,
      });
    });
  }

  onUnmount(): void {
    this.unsubscribe?.();
  }

  private getAvatar(user: User | null): string {
    return user?.avatar || '/assets/images/ape.png';
  }

  private getDisplayName(user: User | null): string {
    if (!user) return 'Guest';
    return user.displayName || user.username || 'Player';
  }

  private getEmail(user: User | null): string {
    return user?.email || 'Not signed in';
  }

  render(): string {
    const { user, isLoggingOut } = this.state;
    const provider =
      user?.oauthProvider === '42' ? '42 Single Sign-On' : 'Email & Password';

    return `
      <div class="app-header glass-panel">
        <div class="app-header__brand" data-action="goto-home">
          <span class="app-header__logo">FT</span>
          <div>
            <p class="app-header__title">Ft_Transcendence</p>
            <p class="app-header__subtitle">Play. Compete. Connect.</p>
          </div>
        </div>

        <div class="app-header__actions">
          <div class="app-header__user-card">
            <img
              class="app-header__avatar"
              src="${this.getAvatar(user)}"
              alt="${this.getDisplayName(user)}"
              onerror="this.src='/assets/images/ape.png';"
            />
            <div>
              <p class="app-header__user-name">${this.getDisplayName(user)}</p>
              <p class="app-header__user-meta">${this.getEmail(user)}</p>
              <p class="app-header__user-provider">${provider}</p>
            </div>
          </div>

          <div class="app-header__buttons">
            <button
              type="button"
              class="btn-secondary"
              data-action="goto-profile"
            >
              Profile
            </button>
            <button
              type="button"
              class="btn-primary"
              data-action="logout"
              ${isLoggingOut ? 'disabled' : ''}
            >
              ${isLoggingOut ? 'Signing out…' : 'Logout'}
            </button>
          </div>
        </div>
      </div>
    `;
  }

  protected attachEventListeners(): void {
    this.subscriptions.forEach((unsub) => unsub());
    this.subscriptions = [];

    if (!this.element) return;

    const profileBtn = this.element.querySelector('[data-action="goto-profile"]');
    if (profileBtn) {
      const handler = (event: Event) => {
        event.preventDefault();
        navigate('/profile');
      };
      profileBtn.addEventListener('click', handler);
      this.subscriptions.push(() =>
        profileBtn.removeEventListener('click', handler)
      );
    }

    const homeBtn = this.element.querySelector('[data-action="goto-home"]');
    if (homeBtn) {
      const handler = (event: Event) => {
        event.preventDefault();
        navigate('/profile');
      };
      homeBtn.addEventListener('click', handler);
      this.subscriptions.push(() =>
        homeBtn.removeEventListener('click', handler)
      );
    }

    const logoutBtn = this.element.querySelector('[data-action="logout"]');
    if (logoutBtn) {
      const handler = (event: Event) => this.handleLogout(event);
      logoutBtn.addEventListener('click', handler);
      this.subscriptions.push(() =>
        logoutBtn.removeEventListener('click', handler)
      );
    }
  }

  private async handleLogout(event: Event): Promise<void> {
    event.preventDefault();
    if (this.state.isLoggingOut) return;
    this.setState({ isLoggingOut: true });

    try {
      await authService.logout();
    } catch (error) {
      console.warn('Logout failed', error);
    } finally {
      this.setState({ isLoggingOut: false });
    }
  }
}
