import Component from '@/core/Component';
import type { Friend } from '@/models';
import { appState } from '@/state';
import { userService } from '@/services/api/UserService';
import { navigate } from '@/routes';
import { showError, showSuccess } from '@/utils/errors';

type State = {
  friends: Friend[];
  isLoading: boolean;
  error?: string;
  actionStatus: Record<string, 'idle' | 'loading'>;
};

export default class ManageFriendsPage extends Component<Record<string, never>, State> {
  constructor(props: Record<string, never> = {}) {
    super(props);
  }

  getInitialState(): State {
    return {
      friends: [],
      isLoading: true,
      error: undefined,
      actionStatus: {},
    };
  }

  onMount(): void {
    const auth = appState.auth.get();
    if (!auth.isAuthenticated) {
      navigate('/auth/login');
      return;
    }

    void this.loadFriends();
  }

  private async loadFriends(): Promise<void> {
    this.setState({ isLoading: true, error: undefined });
    try {
      const friends = await userService.getFriends();
      this.setState({ friends, isLoading: false });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to load friends.';
      this.setState({ error: message, isLoading: false });
    }
  }

  private isActionLoading(friendId: string): boolean {
    return this.state.actionStatus[friendId] === 'loading';
  }

  private async handleUnblock(friendId: string): Promise<void> {
    if (this.isActionLoading(friendId)) return;

    this.setState({
      actionStatus: { ...this.state.actionStatus, [friendId]: 'loading' },
      error: undefined,
    });

    try {
      await userService.unblockUser(friendId);
      showSuccess('User unblocked.');
      await this.loadFriends();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to unblock user.';
      showError(message);
      this.setState({ error: message });
    } finally {
      this.setState({
        actionStatus: { ...this.state.actionStatus, [friendId]: 'idle' },
      });
    }
  }

  private renderFriendRow(friend: Friend): string {
    const isBlocked = friend.friendshipStatus === 'blocked';
    const isLoading = this.isActionLoading(friend.id);
    return `
      <article class="glass-card p-4 rounded-2xl flex flex-col gap-3">
        <div class="flex items-center gap-3">
          <img src="${friend.avatar || '/assets/images/ape.png'}" alt="${friend.username}" class="h-12 w-12 rounded-xl object-cover border border-white/10" />
          <div class="flex-1">
            <p class="font-semibold">${friend.displayName ?? friend.username}</p>
            <p class="text-xs text-white/60">@${friend.username}</p>
            <p class="text-xs text-white/40">Status: ${friend.friendshipStatus}</p>
          </div>
        </div>
        <div class="flex gap-2">
          ${
            !isBlocked && friend.friendshipStatus === 'accepted'
              ? `
                  <a
                    href="/chat?friendId=${friend.id}"
                    class="btn-touch px-4 py-2 rounded-xl touch-feedback text-sm flex-1 text-center"
                    style="background: rgba(0,255,136,0.1); border: 1px solid rgba(0,255,136,0.3); color: var(--color-success);"
                  >
                    💬 Chat
                  </a>
                `
              : ''
          }
          ${
            isBlocked
              ? `
                  <button
                    data-action="unblock-friend"
                    data-friend-id="${friend.id}"
                    class="btn-touch px-4 py-2 rounded-xl touch-feedback text-sm flex-1"
                    style="background: rgba(0,255,136,0.1); border: 1px solid rgba(0,255,136,0.3); color: var(--color-success);"
                    ${isLoading ? 'disabled' : ''}
                  >
                    Unblock
                  </button>
                `
              : ''
          }
        </div>
      </article>
    `;
  }

  private renderContent(): string {
    const { isLoading, error, friends } = this.state;

    if (isLoading) {
      return `<div class="glass-panel p-6 text-white/60">Loading friends...</div>`;
    }

    if (error) {
      return `
        <div class="glass-panel p-6 space-y-3">
          <p class="text-white/70">${error}</p>
          <button
            data-action="reload-friends"
            class="btn-touch px-4 py-2 rounded-xl touch-feedback text-sm"
            style="background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.2); color: white;"
          >
            Try Again
          </button>
        </div>
      `;
    }

    if (!friends.length) {
      return `
        <section class="glass-panel p-6">
          <p class="text-sm text-white/60">No friends yet. Add some from your dashboard.</p>
        </section>
      `;
    }

    return `
      <section class="glass-panel p-6 space-y-4">
        <div>
          <p class="text-sm text-white/60">Connections</p>
          <h3 class="text-xl font-semibold">Friends Overview</h3>
          <p class="text-xs text-white/50 mt-1">Only blocked friends can be unblocked here.</p>
        </div>
        ${friends.map((friend) => this.renderFriendRow(friend)).join('')}
      </section>
    `;
  }

  render(): string {
    return `
      <div class="relative min-h-screen" style="background: var(--color-bg-dark);">
        <div class="absolute inset-0 bg-gradient-to-br from-[var(--color-bg-dark)] via-[var(--color-bg-darker)] to-[#090818]">
          <div class="absolute inset-0 opacity-50 cyberpunk-radial-bg"></div>
        </div>
        <div class="relative max-w-5xl mx-auto px-4 lg:px-0 py-10 space-y-6">
          <header class="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <p class="text-sm text-white/60">Friends</p>
              <h1 class="text-3xl font-semibold">Manage Connections</h1>
              <p class="text-sm text-white/50 mt-2">Review your list; only blocked users have actions.</p>
            </div>
            <div class="flex items-center gap-3">
              <button
                data-nav="/dashboard"
                class="btn-touch px-4 py-2 rounded-xl touch-feedback text-sm"
                style="background: rgba(255,255,255,0.08); color: white;"
              >
                ← Dashboard
              </button>
              <button
                data-action="reload-friends"
                class="btn-touch px-4 py-2 rounded-xl touch-feedback text-sm"
                style="background: linear-gradient(135deg, var(--color-brand-primary), var(--color-brand-secondary)); color: white;"
              >
                Refresh
              </button>
            </div>
          </header>
          ${this.renderContent()}
        </div>
      </div>
    `;
  }

  protected attachEventListeners(): void {
    this.subscriptions.forEach((unsub) => unsub());
    this.subscriptions = [];

    if (!this.element) return;

    const bindClick = (selector: string, handler: (el: HTMLElement) => void) => {
      const elements = this.element!.querySelectorAll<HTMLElement>(selector);
      elements.forEach((element) => {
        const wrapped = (event: Event) => {
          event.preventDefault();
          handler(element);
        };
        element.addEventListener('click', wrapped);
        this.subscriptions.push(() => element.removeEventListener('click', wrapped));
      });
    };

    bindClick('[data-nav]', (el) => {
      const path = el.getAttribute('data-nav');
      if (path) navigate(path);
    });

    bindClick('[data-action="reload-friends"]', () => {
      void this.loadFriends();
    });

    bindClick('[data-action="unblock-friend"]', (el) => {
      const friendId = el.getAttribute('data-friend-id');
      if (friendId) {
        void this.handleUnblock(friendId);
      }
    });
  }
}
