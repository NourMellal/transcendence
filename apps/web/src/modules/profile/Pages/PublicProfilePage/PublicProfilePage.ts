import Component from '../../../../core/Component';
import { navigate } from '../../../../routes';
import { userService } from '../../../../services/api/UserService';
import { appState } from '../../../../state';
import type { User, UserStats } from '../../../../models';

interface Props {
  userId: string;
}

interface State {
  user: User | null;
  stats: UserStats | null;
  friendshipStatus: 'none' | 'pending' | 'accepted' | 'sent' | null;
  friendshipId: string | null;
  isLoading: boolean;
  error: string | null;
  actionLoading: boolean;
}

/**
 * PublicProfilePage - View another user's public profile
 * Displays their stats, avatar, and allows sending friend requests
 */
export default class PublicProfilePage extends Component<Props, State> {
  getInitialState(): State {
    return {
      user: null,
      stats: null,
      friendshipStatus: null,
      friendshipId: null,
      isLoading: true,
      error: null,
      actionLoading: false,
    };
  }

  async onMount(): Promise<void> {
    await this.loadProfile();
  }

  private async loadProfile(): Promise<void> {
    try {
      this.setState({ isLoading: true, error: null });

      // Fetch user data
      const fullUser = await userService.getProfile(this.props.userId);
      
      // Check friendship status
      const friends = await userService.getFriends();
      const friendship = friends.find(f => f.id === this.props.userId);
      let friendshipStatus: State['friendshipStatus'] = 'none';
      let friendshipId: string | null = null;
      
      if (friendship) {
        friendshipId = friendship.friendshipId;
        if (friendship.friendshipStatus === 'accepted') {
          friendshipStatus = 'accepted';
        } else if (friendship.friendshipStatus === 'pending') {
          friendshipStatus = friendship.isRequester ? 'sent' : 'pending';
        }
      }

      this.setState({
        user: fullUser,
        stats: fullUser.stats,
        friendshipStatus,
        friendshipId,
        isLoading: false,
      });
    } catch (error) {
      console.error('[PublicProfilePage] Failed to load profile:', error);
      this.setState({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to load profile',
      });
    }
  }

  render(): string {
    const { user, stats, friendshipStatus, isLoading, error, actionLoading } = this.state;
    const currentUser = appState.auth.get().user;
    const isOwnProfile = currentUser?.id === this.props.userId;

    if (isOwnProfile) {
      // Redirect to own profile page
      setTimeout(() => navigate('/profile'), 0);
      return '<div>Redirecting...</div>';
    }

    return `
      <div class="relative min-h-screen" style="background: var(--color-bg-dark);">
        <div class="absolute inset-0 bg-gradient-to-br from-[var(--color-bg-dark)] via-[var(--color-bg-darker)] to-[#0b0b1e]">
          <div class="absolute inset-0 opacity-50 cyberpunk-radial-bg"></div>
        </div>
        
        <div class="relative max-w-4xl mx-auto px-4 lg:px-0 py-10 space-y-6">
          <!-- Header -->
          <header class="flex items-center justify-between">
            <button
              data-action="go-back"
              class="btn-touch px-4 py-2 rounded-xl touch-feedback text-sm"
              style="background: rgba(255,255,255,0.08); color: white;"
            >
              ← Back
            </button>
          </header>

          ${isLoading ? this.renderLoading() : ''}
          ${error ? this.renderError(error) : ''}
          ${!isLoading && !error && user ? this.renderProfile(user, stats, friendshipStatus, actionLoading) : ''}
        </div>
      </div>
    `;
  }

  private renderLoading(): string {
    return `
      <div class="glass-panel p-8 text-center">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto mb-4" 
             style="border-color: var(--color-brand-primary);"></div>
        <p class="text-white/60">Loading profile...</p>
      </div>
    `;
  }

  private renderError(error: string): string {
    return `
      <div class="glass-panel p-8 text-center">
        <div class="text-4xl mb-4">😕</div>
        <p class="text-white/80 mb-4">${error}</p>
        <button
          data-action="retry"
          class="btn-touch px-6 py-3 rounded-xl touch-feedback"
          style="background: linear-gradient(135deg, var(--color-brand-primary), var(--color-brand-secondary)); color: white;"
        >
          Try Again
        </button>
      </div>
    `;
  }

  private renderProfile(user: User, stats: UserStats | null, friendshipStatus: State['friendshipStatus'], actionLoading: boolean): string {
    const avatar = user.avatar || '/assets/images/ape.png';
    const displayName = user.displayName || user.username;
    const status = user.status || 'OFFLINE';
    const statusColor = status === 'ONLINE' ? 'var(--color-success)' : 'rgba(255,255,255,0.3)';

    return `
      <div class="space-y-6">
        <!-- Profile Card -->
        <div class="glass-panel p-6">
          <div class="flex flex-col md:flex-row items-center md:items-start gap-6">
            <!-- Avatar -->
            <div class="relative">
              <div class="w-32 h-32 rounded-2xl overflow-hidden" 
                   style="border: 3px solid ${statusColor}; box-shadow: 0 0 20px ${statusColor}40;">
                <img src="${avatar}" alt="${displayName}" class="w-full h-full object-cover" 
                     onerror="this.src='/assets/images/ape.png'" />
              </div>
              <div class="absolute -bottom-2 -right-2 px-3 py-1 rounded-full text-xs font-semibold"
                   style="background: ${statusColor}; color: ${status === 'ONLINE' ? 'black' : 'white'};">
                ${status}
              </div>
            </div>

            <!-- Info -->
            <div class="flex-1 text-center md:text-left">
              <h1 class="text-2xl md:text-3xl font-bold mb-1">${displayName}</h1>
              <p class="text-white/60 mb-4">@${user.username}</p>
              
              <!-- Action Buttons -->
              <div class="flex flex-wrap gap-3 justify-center md:justify-start">
                ${this.renderActionButton(friendshipStatus, actionLoading)}
                <button
                  data-action="send-message"
                  class="btn-touch px-4 py-2 rounded-xl touch-feedback text-sm"
                  style="background: rgba(255,255,255,0.08); color: white;"
                >
                  💬 Message
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Stats Card -->
        ${stats ? this.renderStats(stats) : ''}
      </div>
    `;
  }

  private renderActionButton(friendshipStatus: State['friendshipStatus'], loading: boolean): string {
    if (loading) {
      return `
        <button class="btn-touch px-4 py-2 rounded-xl text-sm opacity-50" disabled
                style="background: linear-gradient(135deg, var(--color-brand-primary), var(--color-brand-secondary)); color: white;">
          <span class="animate-pulse">Loading...</span>
        </button>
      `;
    }

    switch (friendshipStatus) {
      case 'accepted':
        return `
          <button
            data-action="remove-friend"
            class="btn-touch px-4 py-2 rounded-xl touch-feedback text-sm"
            style="background: rgba(255,7,58,0.2); border: 1px solid var(--color-error); color: var(--color-error);"
          >
            ✓ Friends
          </button>
        `;
      case 'sent':
        return `
          <button
            data-action="cancel-request"
            class="btn-touch px-4 py-2 rounded-xl touch-feedback text-sm"
            style="background: rgba(255,255,255,0.08); color: white;"
          >
            ⏳ Request Sent
          </button>
        `;
      case 'pending':
        return `
          <div class="flex gap-2">
            <button
              data-action="accept-request"
              class="btn-touch px-4 py-2 rounded-xl touch-feedback text-sm"
              style="background: linear-gradient(135deg, var(--color-brand-primary), var(--color-brand-secondary)); color: white;"
            >
              ✓ Accept
            </button>
            <button
              data-action="reject-request"
              class="btn-touch px-4 py-2 rounded-xl touch-feedback text-sm"
              style="background: rgba(255,7,58,0.2); color: var(--color-error);"
            >
              ✗ Decline
            </button>
          </div>
        `;
      default:
        return `
          <button
            data-action="add-friend"
            class="btn-touch px-4 py-2 rounded-xl touch-feedback text-sm"
            style="background: linear-gradient(135deg, var(--color-brand-primary), var(--color-brand-secondary)); color: white;"
          >
            + Add Friend
          </button>
        `;
    }
  }

  private renderStats(stats: UserStats): string {
    const winRate = stats.winRate ? `${stats.winRate.toFixed(1)}%` : '0%';

    return `
      <div class="glass-panel p-6">
        <h2 class="text-lg font-semibold mb-4">Stats</h2>
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div class="text-center p-4 rounded-lg" style="background: rgba(0,0,0,0.3);">
            <p class="text-2xl font-bold" style="color: var(--color-brand-primary);">${stats.totalGames}</p>
            <p class="text-xs text-white/60 uppercase">Games</p>
          </div>
          <div class="text-center p-4 rounded-lg" style="background: rgba(0,0,0,0.3);">
            <p class="text-2xl font-bold" style="color: var(--color-success);">${stats.wins}</p>
            <p class="text-xs text-white/60 uppercase">Wins</p>
          </div>
          <div class="text-center p-4 rounded-lg" style="background: rgba(0,0,0,0.3);">
            <p class="text-2xl font-bold" style="color: var(--color-error);">${stats.losses}</p>
            <p class="text-xs text-white/60 uppercase">Losses</p>
          </div>
          <div class="text-center p-4 rounded-lg" style="background: rgba(0,0,0,0.3);">
            <p class="text-2xl font-bold" style="color: var(--color-brand-secondary);">${winRate}</p>
            <p class="text-xs text-white/60 uppercase">Win Rate</p>
          </div>
        </div>
        
        ${stats.tournaments ? `
        <div class="mt-4 pt-4" style="border-top: 1px solid rgba(255,255,255,0.1);">
          <h3 class="text-sm font-medium mb-3 text-white/80">Tournaments</h3>
          <div class="grid grid-cols-2 gap-4">
            <div class="text-center p-3 rounded-lg" style="background: rgba(0,0,0,0.3);">
              <p class="text-xl font-bold">${stats.tournaments.participated}</p>
              <p class="text-xs text-white/60">Participated</p>
            </div>
            <div class="text-center p-3 rounded-lg" style="background: rgba(0,0,0,0.3);">
              <p class="text-xl font-bold flex items-center gap-2" style="color: var(--color-brand-accent);">
                <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" width="20" height="20" fill="currentColor"><path d="M96 1.2H32v9.9h64V1.2zm31.7 12.3h-34l-93.4.2S-1.4 31.4 3 43.5c3.7 10.1 15 16.3 15 16.3l-4.1 5.4 5.4 2.7 5.4-9.5S10.4 49.8 7 42.1C3.7 34.5 4.3 19 4.3 19h30.4c.2 5.2 0 13.5-1.7 21.7-1.9 9.1-6.6 19.6-10.1 21.1 7.7 10.7 22.3 19.9 29 19.7 0 6.2.3 18-6.7 23.6-7 5.6-10.8 13.6-10.8 13.6h-6.7v8.1h72.9v-8.1h-6.7s-3.8-8-10.8-13.6c-7-5.6-6.7-17.4-6.7-23.6 6.8.2 21.4-8.8 29.1-19.5-3.6-1.4-8.3-12.2-10.2-21.2-1.7-8.2-1.8-16.5-1.7-21.7h29.1s1.4 15.4-1.9 23-17.4 16.3-17.4 16.3l5.5 9.5L114 65l-4.1-5.4s11.3-6.2 15-16.3c4.5-12.1 2.8-29.8 2.8-29.8z"/></svg>
                ${stats.tournaments.won}
              </p>
              <p class="text-xs text-white/60">Won</p>
            </div>
          </div>
        </div>
        ` : ''}
      </div>
    `;
  }

  protected attachEventListeners(): void {
    this.subscriptions.forEach((unsub) => unsub());
    this.subscriptions = [];
    if (!this.element) return;

    const bind = (selector: string, handler: () => void) => {
      const elements = this.element!.querySelectorAll<HTMLElement>(selector);
      elements.forEach((element) => {
        const wrapped = (event: Event) => {
          event.preventDefault();
          handler();
        };
        element.addEventListener('click', wrapped);
        this.subscriptions.push(() => element.removeEventListener('click', wrapped));
      });
    };

    bind('[data-action="go-back"]', () => window.history.back());
    bind('[data-action="retry"]', () => this.loadProfile());
    bind('[data-action="add-friend"]', () => this.handleAddFriend());
    bind('[data-action="remove-friend"]', () => this.handleRemoveFriend());
    bind('[data-action="accept-request"]', () => this.handleAcceptRequest());
    bind('[data-action="reject-request"]', () => this.handleRejectRequest());
    bind('[data-action="cancel-request"]', () => this.handleCancelRequest());
    bind('[data-action="send-message"]', () => this.handleSendMessage());
  }

  private async handleAddFriend(): Promise<void> {
    try {
      this.setState({ actionLoading: true });
      await userService.sendFriendRequest(this.props.userId);
      this.setState({ friendshipStatus: 'sent', actionLoading: false });
    } catch (error) {
      console.error('[PublicProfilePage] Failed to send friend request:', error);
      this.setState({ actionLoading: false });
    }
  }

  private async handleRemoveFriend(): Promise<void> {
    try {
      this.setState({ actionLoading: true });
      await userService.removeFriend(this.props.userId);
      this.setState({ friendshipStatus: 'none', actionLoading: false });
    } catch (error) {
      console.error('[PublicProfilePage] Failed to remove friend:', error);
      this.setState({ actionLoading: false });
    }
  }

  private async handleAcceptRequest(): Promise<void> {
    const { friendshipId } = this.state;
    if (!friendshipId) return;
    
    try {
      this.setState({ actionLoading: true });
      await userService.respondFriendRequest(friendshipId, 'accepted');
      this.setState({ friendshipStatus: 'accepted', actionLoading: false });
    } catch (error) {
      console.error('[PublicProfilePage] Failed to accept request:', error);
      this.setState({ actionLoading: false });
    }
  }

  private async handleRejectRequest(): Promise<void> {
    const { friendshipId } = this.state;
    if (!friendshipId) return;
    
    try {
      this.setState({ actionLoading: true });
      await userService.respondFriendRequest(friendshipId, 'rejected');
      this.setState({ friendshipStatus: 'none', friendshipId: null, actionLoading: false });
    } catch (error) {
      console.error('[PublicProfilePage] Failed to reject request:', error);
      this.setState({ actionLoading: false });
    }
  }

  private async handleCancelRequest(): Promise<void> {
    try {
      this.setState({ actionLoading: true });
      // Cancel pending request (remove friend works for pending too)
      await userService.removeFriend(this.props.userId);
      this.setState({ friendshipStatus: 'none', friendshipId: null, actionLoading: false });
    } catch (error) {
      console.error('[PublicProfilePage] Failed to cancel request:', error);
      this.setState({ actionLoading: false });
    }
  }

  private handleSendMessage(): void {
    // Navigate to chat with this user
    navigate(`/chat?user=${this.props.userId}`);
  }
}
