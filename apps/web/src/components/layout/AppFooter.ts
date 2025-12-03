import Component from '@/core/Component';
import type { User } from '@/models';
import { appState } from '@/state';

type State = {
  user: User | null;
};

export default class AppFooter extends Component<Record<string, never>, State> {
  private unsubscribe?: () => void;

  getInitialState(): State {
    const auth = appState.auth.get();
    return {
      user: auth.user ?? null,
    };
  }

  onMount(): void {
    this.unsubscribe = appState.auth.subscribe((auth) => {
      this.setState({ user: auth.user ?? null });
    });
  }

  onUnmount(): void {
    this.unsubscribe?.();
  }

  private getDisplayName(user: User | null): string {
    if (!user) return 'Guest';
    return user.displayName || user.username || 'Player';
  }

  render(): string {
    const { user } = this.state;
    const year = new Date().getFullYear();
    const status = user?.status || 'OFFLINE';

    return `
      <div class="app-footer glass-panel">
        <div>
          <p class="app-footer__brand">© ${year} Ft_Transcendence</p>
          <p class="app-footer__tagline">Crafted with clean architecture principles.</p>
        </div>
        <div class="app-footer__session">
          <span>Signed in as <strong>${this.getDisplayName(user)}</strong></span>
          <span class="app-footer__status app-footer__status--${status.toLowerCase()}">
            ${status}
          </span>
        </div>
      </div>
    `;
  }

  protected attachEventListeners(): void {
    // No interactive elements in footer yet
  }
}
