import Component from '../../../../core/Component';
import { appState } from '../../../../state';
import type { User } from '../../../../models';

type State = {
  user: User | null;
};

export default class ProfilePage extends Component<Record<string, never>, State> {
  private unsubscribe?: () => void;

  getInitialState(): State {
    return {
      user: appState.auth.get().user,
    };
  }

  onMount(): void {
    this.unsubscribe = appState.auth.subscribe((auth) => {
      this.setState({ user: auth.user });
    });
  }

  onUnmount(): void {
    this.unsubscribe?.();
  }

  render(): string {
    if (!this.state.user) {
      return `
        <div class="page profile-page">
          <p>Please log in to view your profile.</p>
        </div>
      `;
    }

    const user = this.state.user;
    return `
      <div class="page profile-page">
        <section>
          <h1>Welcome, ${user.displayName ?? user.username}</h1>
          <dl>
            <dt>Username</dt>
            <dd>${user.username}</dd>
            <dt>Email</dt>
            <dd>${user.email}</dd>
          </dl>
        </section>
      </div>
    `;
  }
}
