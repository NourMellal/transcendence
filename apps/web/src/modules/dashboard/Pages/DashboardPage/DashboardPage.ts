import Component from '@/core/Component';
import { navigate } from '@/routes';
import { appState } from '@/state';
import {
  DashboardLeaderboardEntry,
  DashboardMatchSummary,
  DashboardProfile,
  Friend,
} from '@/models';
import { userService } from '@/services/api/UserService';
import { authManager } from '@/utils/auth';
import { showSuccess, showError } from '@/utils/errors';
import { gameService } from '@/modules/game/services/GameService';
import type { PublicGameSummary, GameLobbyUpdatedEvent, GameStateOutput } from '@/modules/game/types/game.types';
import { createGameWebSocketClient } from '@/modules/shared/services/WebSocketClient';
import type { SuggestedFriend } from '../../data/suggestions';

type InviteStatus = 'idle' | 'loading' | 'success' | 'error';

type State = {
  isLoading: boolean;
  isRefreshing: boolean;
  profile: DashboardProfile | null;
  friends: Friend[];
  matches: DashboardMatchSummary[];
  leaderboard: DashboardLeaderboardEntry[];
  error?: string;
  inviteStatus: Record<string, InviteStatus>;
  inviteFeedback?: {
    type: 'success' | 'error';
    message: string;
  };
  friendRequestStatus: Record<string, InviteStatus>;
  friendRequestFeedback?: {
    type: 'success' | 'error';
    message: string;
  };
  // User search state
  userSearchQuery: string;
  userSearchResult: SuggestedFriend | null;
  userSearchStatus: 'idle' | 'loading' | 'error' | 'not-found';
  publicGames: PublicGameSummary[];
  publicGamesLoading: boolean;
  publicGamesError?: string;
  joiningGameId?: string;
};

export default class DashboardPage extends Component<Record<string, never>, State> {
  private leaderboardInterval?: number;
  private authUnsubscribe?: () => void;
  private feedbackTimeout?: number;
  private friendRequestFeedbackTimeout?: number;
  private lobbySocket = createGameWebSocketClient();
  private lobbyUnsubscribes: Array<() => void> = [];

  constructor(props: Record<string, never> = {}) {
    super(props);
  }

  getInitialState(): State {
    return {
      isLoading: true,
      isRefreshing: false,
      profile: null,
      friends: [],
      matches: [],
      leaderboard: [],
      inviteStatus: {},
      inviteFeedback: undefined,
      friendRequestStatus: {},
      friendRequestFeedback: undefined,
      error: undefined,
      userSearchQuery: '',
      userSearchResult: null,
      userSearchStatus: 'idle',
      publicGames: [],
      publicGamesLoading: false,
      publicGamesError: undefined,
      joiningGameId: undefined,
    };
  }

  onMount(): void {
    const auth = appState.auth.get();
    if (!auth.isAuthenticated) {
      navigate('/auth/login');
      return;
    }

    this.authUnsubscribe = appState.auth.subscribe((next) => {
      if (!next.isAuthenticated) {
        navigate('/auth/login');
      }
    });

    void this.loadDashboardData();
    this.startLeaderboardPolling();
    void this.initializePublicGamesFeed();
  }

  onUnmount(): void {
    this.authUnsubscribe?.();
    if (this.leaderboardInterval) {
      clearInterval(this.leaderboardInterval);
      this.leaderboardInterval = undefined;
    }
    if (this.feedbackTimeout) {
      clearTimeout(this.feedbackTimeout);
      this.feedbackTimeout = undefined;
    }
    if (this.friendRequestFeedbackTimeout) {
      clearTimeout(this.friendRequestFeedbackTimeout);
      this.friendRequestFeedbackTimeout = undefined;
    }
    this.lobbyUnsubscribes.forEach((unsub) => unsub());
    this.lobbyUnsubscribes = [];
    this.lobbySocket.disconnect();
  }

  private startLeaderboardPolling(): void {
    if (this.leaderboardInterval) {
      clearInterval(this.leaderboardInterval);
    }
    this.leaderboardInterval = window.setInterval(() => {
      void this.refreshLeaderboard();
    }, 30_000);
  }

  private async initializePublicGamesFeed(): Promise<void> {
    this.setState({ publicGamesLoading: true, publicGamesError: undefined });

    try {
      const games = await gameService.listGames({ status: 'WAITING', limit: 10 });
      const summaries = await this.mapGamesToSummaries(games);
      this.setState({ publicGames: summaries, publicGamesLoading: false });
    } catch (error) {
      console.warn('[DashboardPage] Failed to load public games snapshot', error);
      this.setState({ publicGamesLoading: false, publicGamesError: 'Unable to load public games.' });
    }

    this.subscribeToLobbyUpdates();
  }

  private async mapGamesToSummaries(games: GameStateOutput[]): Promise<PublicGameSummary[]> {
    const waitingGames = games.filter((game) => (game.players?.length ?? 0) < 2);
    return Promise.all(waitingGames.map(async (game) => {
      const creatorId = game.players?.[0]?.id;
      const creatorProfile = creatorId ? await userService.getUserInfo(creatorId).catch(() => null) : null;

      return {
        gameId: game.id,
        creatorId,
        creatorUsername: creatorProfile?.username ?? 'Unknown',
        gameType: game.mode ?? 'CLASSIC',
        createdAt: typeof game.createdAt === 'string' ? game.createdAt : game.createdAt.toString(),
        playersWaiting: game.players?.length ?? 0,
      } satisfies PublicGameSummary;
    }));
  }

  private subscribeToLobbyUpdates(): void {
    this.lobbyUnsubscribes.forEach((unsub) => unsub());
    this.lobbyUnsubscribes = [];

    const unsubscribe = this.lobbySocket.on<GameLobbyUpdatedEvent>('game:lobby:updated', (payload) => {
      this.handleLobbyUpdate(payload);
    });

    this.lobbyUnsubscribes.push(unsubscribe);

    this.lobbySocket.connect().catch((error) => {
      console.warn('[DashboardPage] Failed to connect lobby socket', error);
    });
  }

  private handleLobbyUpdate(event: GameLobbyUpdatedEvent | unknown): void {
    if (!event || typeof event !== 'object' || !Array.isArray((event as GameLobbyUpdatedEvent).games)) {
      return;
    }

    const games = [...(event as GameLobbyUpdatedEvent).games];
    games.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    this.state.publicGames = games;
    this.state.publicGamesLoading = false;
    this.state.publicGamesError = undefined;
    this.update({});
  }

  private async refreshLeaderboard(): Promise<void> {
    try {
      const leaderboard = await userService.getLeaderboard(3);
      this.setState({ leaderboard });
    } catch (error) {
      console.warn('[DashboardPage] Failed to refresh leaderboard', error);
    }
  }

  private async loadDashboardData(options: { silent?: boolean } = {}): Promise<void> {
    const { silent = false } = options;
    this.setState({
      error: undefined,
      ...(silent ? { isRefreshing: true } : { isLoading: true }),
    });

    const results = await Promise.allSettled([
      userService.getProfile(),
      userService.getFriends(),
      userService.getRecentMatches(3),
      userService.getLeaderboard(3),
    ]);

    const errors: string[] = [];
    const [profileResult, friendsResult, matchesResult, leaderboardResult] = results;

    const profile =
      profileResult.status === 'fulfilled'
        ? profileResult.value
        : ((errors.push('profile'), this.state.profile));

    const friends =
      friendsResult.status === 'fulfilled'
        ? friendsResult.value
        : ((errors.push('friends'), this.state.friends));

    const matches =
      matchesResult.status === 'fulfilled'
        ? matchesResult.value
        : ((errors.push('matches'), this.state.matches));

    const leaderboard =
      leaderboardResult.status === 'fulfilled'
        ? leaderboardResult.value
        : ((errors.push('leaderboard'), this.state.leaderboard));

    this.setState({
      profile,
      friends,
      matches,
      leaderboard,
      isLoading: false,
      isRefreshing: false,
      error: errors.length && errors.length === results.length
        ? 'Failed to load dashboard data. Please try again.'
        : errors.length
          ? `Some widgets failed to load (${errors.join(', ')}).`
          : undefined,
    });
  }

  private async handleInvite(friendId: string): Promise<void> {
    if (this.state.inviteStatus[friendId] === 'loading') return;

    const friends = this.state.friends;
    const friend = friends.find((f) => f.id === friendId);

    this.setState({
      inviteStatus: { ...this.state.inviteStatus, [friendId]: 'loading' },
      inviteFeedback: undefined,
    });

    try {
      await userService.sendGameInvite(friendId, '1v1');
      this.setState({
        inviteStatus: { ...this.state.inviteStatus, [friendId]: 'success' },
        inviteFeedback: {
          type: 'success',
          message: `Invite sent to ${friend?.username ?? 'friend'}.`,
        },
      });
      this.scheduleFeedbackReset();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unable to send invite.';
      this.setState({
        inviteStatus: { ...this.state.inviteStatus, [friendId]: 'error' },
        inviteFeedback: {
          type: 'error',
          message,
        },
      });
      this.scheduleFeedbackReset();
    } finally {
      window.setTimeout(() => {
        this.setState({
          inviteStatus: { ...this.state.inviteStatus, [friendId]: 'idle' },
        });
      }, 2500);
    }
  }

  private scheduleFeedbackReset(): void {
    if (this.feedbackTimeout) {
      clearTimeout(this.feedbackTimeout);
    }
    this.feedbackTimeout = window.setTimeout(() => {
      this.setState({ inviteFeedback: undefined });
      this.feedbackTimeout = undefined;
    }, 4000);
  }

  private scheduleFriendRequestFeedbackReset(): void {
    if (this.friendRequestFeedbackTimeout) {
      clearTimeout(this.friendRequestFeedbackTimeout);
    }
    this.friendRequestFeedbackTimeout = window.setTimeout(() => {
      this.setState({ friendRequestFeedback: undefined });
      this.friendRequestFeedbackTimeout = undefined;
    }, 4000);
  }

  private async handleFriendRequest(friendId: string): Promise<void> {
    if (this.state.friendRequestStatus[friendId] === 'loading') return;

    this.setState({
      friendRequestStatus: { ...this.state.friendRequestStatus, [friendId]: 'loading' },
      friendRequestFeedback: undefined,
    });

    try {
      await userService.sendFriendRequest(friendId);
      this.setState({
        friendRequestStatus: { ...this.state.friendRequestStatus, [friendId]: 'success' },
        friendRequestFeedback: {
          type: 'success',
          message: 'Friend request sent successfully.',
        },
      });
      this.scheduleFriendRequestFeedbackReset();
      showSuccess('Friend request sent');
      await this.loadDashboardData({ silent: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to send friend request.';
      this.setState({
        friendRequestStatus: { ...this.state.friendRequestStatus, [friendId]: 'error' },
        friendRequestFeedback: {
          type: 'error',
          message,
        },
      });
      this.scheduleFriendRequestFeedbackReset();
    } finally {
      window.setTimeout(() => {
        const nextStatus: Record<string, InviteStatus> = { ...this.state.friendRequestStatus, [friendId]: 'idle' };
        this.setState({ friendRequestStatus: nextStatus });
      }, 2500);
    }
  }

  private async performFriendRequestAction(options: {
    key: string;
    action: () => Promise<void>;
    successMessage: string;
  }): Promise<void> {
    const { key, action, successMessage } = options;
    if (this.state.friendRequestStatus[key] === 'loading') return;

    this.setState({
      friendRequestStatus: { ...this.state.friendRequestStatus, [key]: 'loading' },
      friendRequestFeedback: undefined,
    });

    try {
      await action();
      showSuccess(successMessage);
      await this.loadDashboardData({ silent: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to update friend request.';
      showError(message);
      this.setState({
        friendRequestFeedback: { type: 'error', message },
      });
      this.scheduleFriendRequestFeedbackReset();
    } finally {
      this.setState({
        friendRequestStatus: { ...this.state.friendRequestStatus, [key]: 'idle' },
      });
    }
  }

  private async handleRespondToRequest(friendshipId: string, status: 'accepted' | 'rejected'): Promise<void> {
    const key = this.getFriendshipKey(friendshipId);
    await this.performFriendRequestAction({
      key,
      action: () => userService.respondFriendRequest(friendshipId, status),
      successMessage: status === 'accepted' ? 'Friend request accepted.' : 'Friend request rejected.',
    });
  }

  private async handleCancelRequest(friendshipId: string): Promise<void> {
    const key = this.getFriendshipKey(friendshipId);
    await this.performFriendRequestAction({
      key,
      action: () => userService.cancelFriendRequest(friendshipId),
      successMessage: 'Friend request cancelled.',
    });
  }

  private async handleBlockFriend(friendId: string, friendshipId?: string | null): Promise<void> {
    const key = friendshipId ? this.getFriendshipKey(friendshipId) : friendId;
    await this.performFriendRequestAction({
      key,
      action: () => userService.blockUser(friendId),
      successMessage: 'User blocked.',
    });
  }

  private handleChat(friendId: string): void {
    navigate(`/chat?friendId=${friendId}`);
  }

  private async handleLogout(): Promise<void> {
    try {
      await authManager.logout();
    } finally {
      navigate('/auth/login');
    }
  }

  private formatWinRate(winRate?: number): string {
    if (typeof winRate !== 'number' || Number.isNaN(winRate)) return '0%';
    const value = winRate <= 1 ? winRate * 100 : winRate;
    return `${Math.round(value)}%`;
  }

  private formatTimeAgo(dateStr?: string): string {
    if (!dateStr) return 'Just now';
    const timestamp = Date.parse(dateStr);
    if (Number.isNaN(timestamp)) return 'Just now';

    const diff = Date.now() - timestamp;
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  }

  private renderInviteFeedback(): string {
    if (!this.state.inviteFeedback) return '';
    const { type, message } = this.state.inviteFeedback;
    const colors =
      type === 'success'
        ? { bg: 'rgba(0, 255, 136, 0.1)', border: 'rgba(0, 255, 136, 0.3)' }
        : { bg: 'rgba(255, 7, 58, 0.1)', border: 'rgba(255, 7, 58, 0.3)' };

    return `
      <div class="p-4 rounded-2xl" style="background:${colors.bg}; border:1px solid ${colors.border};">
        ${message}
      </div>
    `;
  }

  private renderFriendRequestFeedback(): string {
    if (!this.state.friendRequestFeedback) return '';
    const { type, message } = this.state.friendRequestFeedback;
    const colors =
      type === 'success'
        ? { bg: 'rgba(0, 255, 136, 0.1)', border: 'rgba(0, 255, 136, 0.3)' }
        : { bg: 'rgba(255, 7, 58, 0.1)', border: 'rgba(255, 7, 58, 0.3)' };

    return `
      <div class="p-4 rounded-2xl" style="background:${colors.bg}; border:1px solid ${colors.border};">
        ${message}
      </div>
    `;
  }


  private getFriendshipKey(friendshipId: string): string {
    return `friendship-${friendshipId}`;
  }

  private getAcceptedFriends(): Friend[] {
    return this.state.friends.filter((friend) => friend.friendshipStatus === 'accepted');
  }

  private getIncomingRequests(): Friend[] {
    return this.state.friends.filter(
      (friend) => friend.friendshipStatus === 'pending' && !friend.isRequester
    );
  }

  private getOutgoingRequests(): Friend[] {
    return this.state.friends.filter(
      (friend) => friend.friendshipStatus === 'pending' && friend.isRequester
    );
  }

  private async handleUserSearch(username: string): Promise<void> {
    const trimmedUsername = username.trim();

    if (!trimmedUsername) {
      this.setState({
        userSearchQuery: '',
        userSearchResult: null,
        userSearchStatus: 'idle',
      });
      return;
    }

    this.setState({
      userSearchQuery: trimmedUsername,
      userSearchStatus: 'loading',
      userSearchResult: null,
    });

    try {
      const user = await userService.searchUserByUsername(trimmedUsername);

      if (!user) {
        this.setState({ userSearchStatus: 'not-found' });
        return;
      }

      // Check if user is already a friend or is the current user
      const currentUserId = appState.auth.get().user?.id;
      const friendIds = new Set(this.state.friends.map((f) => f.id));

      if (user.id === currentUserId) {
        this.setState({ userSearchStatus: 'not-found' });
        return;
      }

      if (friendIds.has(user.id)) {
        this.setState({ userSearchStatus: 'not-found' });
        return;
      }

      this.setState({
        userSearchResult: {
          id: user.id,
          username: user.username,
          displayName: user.displayName || user.username,
          avatar: user.avatar,
        },
        userSearchStatus: 'idle',
      });
    } catch (error) {
      console.error('[DashboardPage] User search failed:', error);
      this.setState({ userSearchStatus: 'error' });
    }
  }

  private renderSidebar(): string {
    const acceptedFriends = this.getAcceptedFriends();
    const onlineFriends = acceptedFriends.filter((friend) => friend.status === 'ONLINE' || friend.status === 'INGAME').length;
    const pendingCount = this.getIncomingRequests().length;
    const navItems = [
      { label: 'Dashboard', icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><g data-name="31.Home"><path d="M12 24a12 12 0 1 1 12-12 12.013 12.013 0 0 1-12 12zm0-22a10 10 0 1 0 10 10A10.011 10.011 0 0 0 12 2z"/><path d="M18.293 13.707 12 7.414l-6.293 6.293-1.414-1.414L12 4.586l7.707 7.707-1.414 1.414z"/><path d="M17 18H7v-8h2v6h6v-6h2v8z"/></g></svg>', path: '/dashboard' },
      { label: 'Games', icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M9 21a1 1 0 0 0 1-1v-1a2 2 0 0 1 4 0v.78A1.223 1.223 0 0 0 15.228 21 7.7 7.7 0 0 0 23 13.73 7.5 7.5 0 0 0 15.5 6H13V4a1 1 0 0 0-2 0v2H8.772A7.7 7.7 0 0 0 1 13.27a7.447 7.447 0 0 0 2.114 5.453A7.81 7.81 0 0 0 9 21zM8.772 8H15.5a5.5 5.5 0 0 1 5.5 5.67 5.643 5.643 0 0 1-5 5.279 4 4 0 0 0-8 .029 5.5 5.5 0 0 1-5-5.648A5.684 5.684 0 0 1 8.772 8zM5 12.5a1 1 0 0 1 1-1h1v-1a1 1 0 0 1 2 0v1h1a1 1 0 0 1 0 2H9v1a1 1 0 0 1-2 0v-1H6a1 1 0 0 1-1-1zM17 11a1 1 0 1 1 1 1 1 1 0 0 1-1-1zm-2 3a1 1 0 1 1 1 1 1 1 0 0 1-1-1z"/></svg>', path: '/game' },
      { label: 'Friends', icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 90 90" width="20" height="20" fill="currentColor"><path d="M 45 49.519 L 45 49.519 c -7.68 0 -13.964 -6.284 -13.964 -13.964 v -5.008 c 0 -7.68 6.284 -13.964 13.964 -13.964 h 0 c 7.68 0 13.964 6.284 13.964 13.964 v 5.008 C 58.964 43.236 52.68 49.519 45 49.519 z"/><path d="M 52.863 51.438 c -2.362 1.223 -5.032 1.927 -7.863 1.927 s -5.501 -0.704 -7.863 -1.927 C 26.58 53.014 18.414 62.175 18.414 73.152 v 14.444 c 0 1.322 1.082 2.403 2.403 2.403 h 48.364 c 1.322 0 2.403 -1.082 2.403 -2.403 V 73.152 C 71.586 62.175 63.42 53.014 52.863 51.438 z"/><path d="M 71.277 34.854 c -2.362 1.223 -5.032 1.927 -7.863 1.927 c -0.004 0 -0.007 0 -0.011 0 c -0.294 4.412 -2.134 8.401 -4.995 11.43 c 10.355 3.681 17.678 13.649 17.678 24.941 v 0.263 h 11.511 c 1.322 0 2.404 -1.082 2.404 -2.404 V 56.568 C 90 45.59 81.834 36.429 71.277 34.854 z"/><path d="M 63.414 0 c -7.242 0 -13.237 5.589 -13.898 12.667 c 8 2.023 13.947 9.261 13.947 17.881 v 2.385 c 7.657 -0.027 13.914 -6.298 13.914 -13.961 v -5.008 C 77.378 6.284 71.094 0 63.414 0 z"/><path d="M 13.915 73.152 c 0 -11.292 7.322 -21.261 17.677 -24.941 c -2.861 -3.029 -4.702 -7.019 -4.995 -11.43 c -0.004 0 -0.007 0 -0.011 0 c -2.831 0 -5.5 -0.704 -7.863 -1.927 C 8.166 36.429 0 45.59 0 56.568 v 14.444 c 0 1.322 1.082 2.404 2.404 2.404 h 11.511 V 73.152 z"/><path d="M 26.536 32.932 v -2.385 c 0 -8.62 5.946 -15.858 13.947 -17.881 C 39.823 5.589 33.828 0 26.586 0 c -7.68 0 -13.964 6.284 -13.964 13.964 v 5.008 C 12.622 26.635 18.879 32.905 26.536 32.932 z"/></svg>', path: '/friends/manage' },
      { label: 'Settings', icon: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 19.904 19.905" fill="currentColor"><circle cx="9.952" cy="9.953" r="3"/><path d="M9.952 0A9.953 9.953 0 1 0 19.9 9.953 9.953 9.953 0 0 0 9.952 0zm7 10.953h-2.1a4.98 4.98 0 0 1-.731 1.755l1.487 1.492-1.414 1.41-1.488-1.488a4.955 4.955 0 0 1-1.754.73v2.1h-2v-2.1a5 5 0 0 1-1.752-.731L5.709 15.61 4.3 14.2l1.488-1.489a4.94 4.94 0 0 1-.73-1.754h-2.1v-2h2.1A5 5 0 0 1 5.783 7.2L4.3 5.711 5.71 4.3 7.2 5.785a4.919 4.919 0 0 1 1.754-.73v-2.1h2v2.1a4.963 4.963 0 0 1 1.754.73L14.194 4.3l1.414 1.414L14.12 7.2a4.936 4.936 0 0 1 .731 1.755h2.1z"/></svg>', path: '/profile' },
    ];

    return `
      <aside class="glass-panel w-full lg:w-64 flex-shrink-0 p-6 space-y-6">
        <div>
          <p class="text-sm font-semibold text-white/60">Status</p>
          <h2 class="text-2xl font-bold tracking-tight">Connected</h2>
          <p class="text-xs text-white/50 mt-1">Stay synced with your crew.</p>
        </div>
        <nav class="space-y-2">
          ${navItems
            .map((item) => {
              const isActive = item.path === '/dashboard';
              return `
                <button
                  data-nav="${item.path}"
                  class="w-full flex items-center gap-3 px-4 py-3 rounded-xl touch-feedback text-left ${isActive ? 'bg-white/10 border border-white/20' : 'bg-white/5 border border-white/5'}"
                  style="color: ${isActive ? 'white' : 'rgba(255,255,255,0.8)'};"
                >
                  <span>${item.icon}</span>
                  <span class="font-medium">${item.label}</span>
                </button>
              `;
            })
            .join('')}
        </nav>
        ${
          pendingCount
            ? `<div class="text-xs text-white/70 rounded-xl px-3 py-2" style="background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1);">
                Pending requests: ${pendingCount}
              </div>`
            : ''
        }
        <div class="rounded-2xl p-4" style="background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.07);">
          <div class="flex items-center justify-between text-sm" style="color: rgba(255,255,255,0.7);">
            <span>Players Online</span>
            <span class="font-semibold" style="color: white;">${onlineFriends}</span>
          </div>
          <div class="text-xs mt-2" style="color: rgba(255,255,255,0.5);">
            Friends ready to challenge you.
          </div>
        </div>
        <button
          data-nav="/profile"
          class="btn-touch w-full py-3 rounded-xl touch-feedback flex items-center justify-center gap-2"
          style="border: 1px solid rgba(255, 255, 255, 0.2); color: white;"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 19.904 19.905" fill="currentColor"><circle cx="9.952" cy="9.953" r="3"/><path d="M9.952 0A9.953 9.953 0 1 0 19.9 9.953 9.953 9.953 0 0 0 9.952 0zm7 10.953h-2.1a4.98 4.98 0 0 1-.731 1.755l1.487 1.492-1.414 1.41-1.488-1.488a4.955 4.955 0 0 1-1.754.73v2.1h-2v-2.1a5 5 0 0 1-1.752-.731L5.709 15.61 4.3 14.2l1.488-1.489a4.94 4.94 0 0 1-.73-1.754h-2.1v-2h2.1A5 5 0 0 1 5.783 7.2L4.3 5.711 5.71 4.3 7.2 5.785a4.919 4.919 0 0 1 1.754-.73v-2.1h2v2.1a4.963 4.963 0 0 1 1.754.73L14.194 4.3l1.414 1.414L14.12 7.2a4.936 4.936 0 0 1 .731 1.755h2.1z"/></svg>
          Settings
        </button>
        <button
          data-action="logout"
          class="btn-touch w-full py-3 rounded-xl touch-feedback flex items-center justify-center gap-2"
          style="background: rgba(255,0,110,0.1); border: 1px solid rgba(255,0,110,0.3); color: white;"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="18" height="18" fill="currentColor"><path d="M256 73.825a182.18 182.18 0 0 0-182.18 182.18c0 100.617 81.567 182.17 182.18 182.17a182.175 182.175 0 1 0 0-364.35zm-18.096 86.22a18.099 18.099 0 0 1 36.197 0v53.975a18.099 18.099 0 0 1-36.197 0zM256 348.589a92.413 92.413 0 0 1-32.963-178.751v33.38a62.453 62.453 0 1 0 65.93 0v-33.38A92.415 92.415 0 0 1 256 348.588z" data-name="Logout"/></svg>
          Logout
        </button>
      </aside>
    `;
  }

  private renderHero(profile: DashboardProfile | null): string {
    if (!profile) {
      return `
        <section class="glass-panel p-6 md:p-8">
          <p class="text-sm text-white/60">${this.state.isLoading ? 'Loading your profile...' : 'Profile data unavailable.'}</p>
        </section>
      `;
    }

    const stats = profile.stats;
    const winRate = this.formatWinRate(stats?.winRate);
    const totalGames = stats?.totalGames ?? 0;
    const tournamentWins = stats?.tournaments?.won ?? 0;
    const avatar = profile.avatar || '/assets/images/ape.png';

    return `
      <section class="glass-panel p-6 md:p-8 overflow-hidden">
        <div class="flex flex-col lg:flex-row items-start lg:items-center gap-6">
          <div class="flex items-center gap-4">
            <div class="relative">
              <img src="${avatar}" alt="${profile.username}" class="h-20 w-20 rounded-2xl object-cover border border-white/20" />
              <span class="absolute bottom-0 right-0 h-4 w-4 rounded-full border-2 border-black" style="background: var(--color-brand-neon);"></span>
            </div>
            <div>
              <p class="text-sm text-white/60">Welcome back</p>
              <h1 class="text-3xl font-semibold tracking-tight">${profile.username}</h1>
              <p class="text-sm text-white/50 mt-1">Level up your next match.</p>
            </div>
          </div>
          <div class="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-4 w-full">
            <div class="rounded-2xl p-4" style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06);">
              <p class="text-xs text-white/50">Finished Games</p>
              <p class="text-2xl font-bold mt-1">${totalGames}</p>
            </div>
            <div class="rounded-2xl p-4" style="background: rgba(0,217,255,0.08); border: 1px solid rgba(0,217,255,0.2);">
              <p class="text-xs text-white/60">Win Rate</p>
              <p class="text-2xl font-bold mt-1">${winRate}</p>
            </div>
            <div class="rounded-2xl p-4" style="background: rgba(255,0,110,0.08); border: 1px solid rgba(255,0,110,0.2);">
              <p class="text-xs text-white/60">Tournament Wins</p>
              <p class="text-2xl font-bold mt-1">${tournamentWins}</p>
            </div>
          </div>
        </div>
      </section>
    `;
  }

  private renderQuickActions(): string {
    const actions = [
      {
        title: 'Create 1v1 Game',
        description: 'Jump into a quick duel.',
        icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="32" height="32" fill="currentColor"><path d="M9 21a1 1 0 0 0 1-1v-1a2 2 0 0 1 4 0v.78A1.223 1.223 0 0 0 15.228 21 7.7 7.7 0 0 0 23 13.73 7.5 7.5 0 0 0 15.5 6H13V4a1 1 0 0 0-2 0v2H8.772A7.7 7.7 0 0 0 1 13.27a7.447 7.447 0 0 0 2.114 5.453A7.81 7.81 0 0 0 9 21zM8.772 8H15.5a5.5 5.5 0 0 1 5.5 5.67 5.643 5.643 0 0 1-5 5.279 4 4 0 0 0-8 .029 5.5 5.5 0 0 1-5-5.648A5.684 5.684 0 0 1 8.772 8zM5 12.5a1 1 0 0 1 1-1h1v-1a1 1 0 0 1 2 0v1h1a1 1 0 0 1 0 2H9v1a1 1 0 0 1-2 0v-1H6a1 1 0 0 1-1-1zM17 11a1 1 0 1 1 1 1 1 1 0 0 1-1-1zm-2 3a1 1 0 1 1 1 1 1 1 0 0 1-1-1z"/></svg>',
        path: '/game/create',
      },
      {
        title: 'Create Tournament',
        description: 'Host a bracket for friends.',
        icon: '<svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" width="32" height="32" fill="currentColor"><path d="M96 1.2H32v9.9h64V1.2zm31.7 12.3h-34l-93.4.2S-1.4 31.4 3 43.5c3.7 10.1 15 16.3 15 16.3l-4.1 5.4 5.4 2.7 5.4-9.5S10.4 49.8 7 42.1C3.7 34.5 4.3 19 4.3 19h30.4c.2 5.2 0 13.5-1.7 21.7-1.9 9.1-6.6 19.6-10.1 21.1 7.7 10.7 22.3 19.9 29 19.7 0 6.2.3 18-6.7 23.6-7 5.6-10.8 13.6-10.8 13.6h-6.7v8.1h72.9v-8.1h-6.7s-3.8-8-10.8-13.6c-7-5.6-6.7-17.4-6.7-23.6 6.8.2 21.4-8.8 29.1-19.5-3.6-1.4-8.3-12.2-10.2-21.2-1.7-8.2-1.8-16.5-1.7-21.7h29.1s1.4 15.4-1.9 23-17.4 16.3-17.4 16.3l5.5 9.5L114 65l-4.1-5.4s11.3-6.2 15-16.3c4.5-12.1 2.8-29.8 2.8-29.8z"/></svg>',
        path: '/tournament/create',
      },
      {
        title: 'Local Match',
        description: 'Two-player keyboard battle.',
        icon: '⌨️',
        path: '/game/local',
      },
    ];

    return `
      <section class="grid grid-cols-1 md:grid-cols-3 gap-4">
        ${actions
          .map(
            (action) => `
              <article class="glass-card rounded-2xl p-5 flex flex-col gap-3">
                <div class="text-3xl">${action.icon}</div>
                <div>
                  <h3 class="text-lg font-semibold">${action.title}</h3>
                  <p class="text-sm text-white/60">${action.description}</p>
                </div>
                <button
                  data-action="quick-action"
                  data-target="${action.path}"
                  class="btn-touch mt-auto px-4 py-2 rounded-xl touch-feedback text-sm"
                  style="background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.15); color: white;"
                >
                  Go
                </button>
              </article>
            `
          )
          .join('')}
      </section>
    `;
  }

  private async handleJoinPublicGame(gameId: string): Promise<void> {
    if (!gameId || this.state.joiningGameId === gameId) {
      return;
    }

    this.setState({ joiningGameId: gameId });

    try {
      const game = await gameService.joinGame(gameId);
      showSuccess('Joined lobby!');
      navigate(`/game/lobby/${game.id}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to join game.';
      showError(message);
      this.setState({ joiningGameId: undefined });
    }
  }

  private renderPublicGamesWidget(): string {
    const { publicGames, publicGamesLoading, publicGamesError, joiningGameId } = this.state;

    let body = '';

    if (publicGamesError) {
      body = `<p class="text-sm" style="color: var(--color-error);">${publicGamesError}</p>`;
    } else if (publicGamesLoading && publicGames.length === 0) {
      body = '<p class="text-sm text-white/60">Loading public games...</p>';
    } else if (!publicGamesLoading && publicGames.length === 0) {
      body = '<p class="text-sm text-white/60">No public games are waiting right now.</p>';
    } else {
      body = `
        <div class="space-y-3">
          ${publicGames
            .slice(0, 5)
            .map((game) => `
              <div class="rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center gap-4"
                style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06);">
                <div class="flex-1">
                  <p class="text-xs font-mono text-white/40">
                    ${game.gameId}
                  </p>
                  <p class="text-lg font-semibold">${game.creatorUsername ?? 'Unknown player'}</p>
                  <p class="text-xs text-white/50 mt-1">
                    ${game.gameType} • Created ${this.formatGameTime(game.createdAt)}
                  </p>
                </div>
                <button
                  data-action="join-public-game"
                  data-game-id="${game.gameId}"
                  class="btn-touch px-4 py-2 rounded-xl text-sm touch-feedback"
                  style="background: linear-gradient(135deg, var(--color-brand-primary), var(--color-brand-secondary)); color: white; ${joiningGameId === game.gameId ? 'opacity: 0.7;' : ''}"
                  ${joiningGameId === game.gameId ? 'disabled' : ''}
                >
                  ${joiningGameId === game.gameId ? 'Joining…' : 'Join'}
                </button>
              </div>
            `)
            .join('')}
        </div>
      `;
    }

    return `
      <section class="glass-panel rounded-2xl p-5 flex flex-col gap-3">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-xs uppercase tracking-widest text-white/50">Public Games</p>
            <h3 class="text-xl font-semibold">Waiting Lobby</h3>
          </div>
          <span class="text-xs text-white/60">${publicGamesLoading ? 'Syncing…' : 'Live'}</span>
        </div>
        ${body}
      </section>
    `;
  }

  private formatGameTime(timestamp: string): string {
    const date = new Date(timestamp);
    if (Number.isNaN(date.getTime())) {
      return 'just now';
    }
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  private renderPendingRequestsWidget(): string {
    const incoming = this.getIncomingRequests();
    const outgoing = this.getOutgoingRequests();

    if (!incoming.length && !outgoing.length) {
      return '';
    }

    const renderIncoming = incoming
      .map((friend) => {
        const key = this.getFriendshipKey(friend.friendshipId);
        const status = this.state.friendRequestStatus[key] ?? 'idle';
        return `
          <article class="rounded-2xl p-4 flex items-center justify-between gap-3" style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06);">
            <div>
              <p class="font-semibold">${friend.displayName ?? friend.username}</p>
              <p class="text-xs text-white/60">@${friend.username}</p>
            </div>
            <div class="flex gap-2">
              <button
                data-action="accept-request"
                data-friendship-id="${friend.friendshipId}"
                class="btn-touch px-3 py-2 rounded-xl text-xs touch-feedback"
                style="background: rgba(0,255,136,0.1); color: var(--color-success); border: 1px solid rgba(0,255,136,0.3);"
                ${status === 'loading' ? 'disabled' : ''}
              >
                Accept
              </button>
              <button
                data-action="reject-request"
                data-friendship-id="${friend.friendshipId}"
                class="btn-touch px-3 py-2 rounded-xl text-xs touch-feedback"
                style="background: rgba(255,255,255,0.08); color: white;"
                ${status === 'loading' ? 'disabled' : ''}
              >
                Reject
              </button>
              <button
                data-action="block-request"
                data-friend-id="${friend.id}"
                data-friendship-id="${friend.friendshipId}"
                class="btn-touch px-3 py-2 rounded-xl text-xs touch-feedback"
                style="background: rgba(255,0,110,0.15); color: var(--color-error); border: 1px solid rgba(255,0,110,0.3);"
                ${status === 'loading' ? 'disabled' : ''}
              >
                Block
              </button>
            </div>
          </article>
        `;
      })
      .join('');

    const renderOutgoing = outgoing
      .map((friend) => {
        const key = this.getFriendshipKey(friend.friendshipId);
        const status = this.state.friendRequestStatus[key] ?? 'idle';
        return `
          <article class="rounded-2xl p-4 flex items-center justify-between gap-3" style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06);">
            <div>
              <p class="font-semibold">${friend.displayName ?? friend.username}</p>
              <p class="text-xs text-white/60">@${friend.username}</p>
            </div>
            <button
              data-action="cancel-request"
              data-friendship-id="${friend.friendshipId}"
              class="btn-touch px-3 py-2 rounded-xl text-xs touch-feedback"
              style="background: rgba(255,255,255,0.08); color: white;"
              ${status === 'loading' ? 'disabled' : ''}
            >
              Cancel
            </button>
          </article>
        `;
      })
      .join('');

    return `
      <section class="glass-panel p-6 flex flex-col gap-4">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-white/60">Friend Requests</p>
            <h3 class="text-xl font-semibold">Manage invitations</h3>
          </div>
        </div>
        ${
          incoming.length
            ? `<div>
                <h4 class="text-sm text-white/50 mb-2">Incoming</h4>
                <div class="space-y-3">${renderIncoming}</div>
              </div>`
            : ''
        }
        ${
          outgoing.length
            ? `<div>
                <h4 class="text-sm text-white/50 mb-2">Outgoing</h4>
                <div class="space-y-3">${renderOutgoing}</div>
              </div>`
            : ''
        }
      </section>
    `;
  }

  private renderSuggestedFriend(): string {
    const { userSearchQuery, userSearchResult, userSearchStatus } = this.state;
    const suggestion = userSearchResult;

    let resultContent = '';

    if (userSearchStatus === 'loading') {
      resultContent = `
        <div class="text-sm text-white/50 py-4 text-center">
          Searching...
        </div>
      `;
    } else if (userSearchStatus === 'not-found' && userSearchQuery) {
      resultContent = `
        <div class="text-sm text-white/50 py-4 text-center">
          No user found with username "${userSearchQuery}"
        </div>
      `;
    } else if (userSearchStatus === 'error') {
      resultContent = `
        <div class="text-sm text-red-400 py-4 text-center">
          Search failed. Please try again.
        </div>
      `;
    } else if (suggestion) {
      const status = this.state.friendRequestStatus[suggestion.id] ?? 'idle';
      const buttonLabel =
        status === 'loading' ? 'Sending...' : status === 'success' ? 'Request Sent' : 'Send Friend Request';

      resultContent = `
        <div class="flex items-center justify-between mt-4 p-3 rounded-xl" style="background: rgba(255,255,255,0.05);">
          <div class="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity"
               data-action="view-profile" data-user-id="${suggestion.id}">
            <img
              src="${suggestion.avatar ?? '/assets/images/ape.png'}"
              alt="${suggestion.displayName}"
              class="h-12 w-12 rounded-xl object-cover border border-white/20"
            />
            <div>
              <p class="font-semibold hover:underline">${suggestion.displayName}</p>
              <p class="text-xs text-white/50">@${suggestion.username}</p>
            </div>
          </div>
          <button
            data-action="send-friend-request"
            data-suggested-id="${suggestion.id}"
            class="btn-touch px-4 py-2 rounded-xl touch-feedback text-sm"
            style="background: linear-gradient(135deg, var(--color-brand-primary), var(--color-brand-secondary)); color: white;"
            ${status === 'loading' || status === 'success' ? 'disabled' : ''}
          >
            ${buttonLabel}
          </button>
        </div>
      `;
    } else {
      resultContent = `
        <div class="text-sm text-white/40 py-4 text-center">
          Enter a username to find new friends
        </div>
      `;
    }

    return `
      <section class="glass-panel p-6">
        <div class="mb-4">
          <p class="text-sm text-white/60">Find Friends</p>
          <h3 class="text-xl font-semibold">Search by Username</h3>
        </div>
        <div class="flex gap-2">
          <input
            type="text"
            id="user-search-input"
            placeholder="Enter username..."
            value="${userSearchQuery}"
            class="flex-1 px-4 py-2 rounded-xl text-sm"
            style="background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.1); color: white;"
          />
          <button
            data-action="search-user"
            class="btn-touch px-4 py-2 rounded-xl touch-feedback text-sm"
            style="background: linear-gradient(135deg, var(--color-brand-primary), var(--color-brand-secondary)); color: white;"
            ${userSearchStatus === 'loading' ? 'disabled' : ''}
          >
            ${userSearchStatus === 'loading' ? 'Searching...' : 'Search'}
          </button>
        </div>
        ${resultContent}
      </section>
    `;
  }

  private renderFriendsWidget(): string {
    const friends = this.state.friends;

    return `
      <section class="glass-panel p-6 flex flex-col">
        <div class="flex items-center justify-between mb-4">
          <div>
            <p class="text-sm text-white/60">Friends</p>
            <h3 class="text-xl font-semibold">Online (${friends.filter((f) => f.status === 'ONLINE' || f.status === 'INGAME').length})</h3>
          </div>
          <button
            data-nav="/friends/manage"
            class="text-sm hover:underline touch-feedback"
            style="color: var(--color-brand-primary);"
          >
            Manage
          </button>
        </div>
        <div class="space-y-3 overflow-y-auto max-h-96 pr-1">
          ${
            friends.length
              ? friends
                  .map((friend) => this.renderFriendRow(friend))
                  .join('')
              : `<div class="text-sm text-white/50 rounded-xl p-4" style="background: rgba(255,255,255,0.03); border: 1px dashed rgba(255,255,255,0.2);">
                  No friends yet. Start adding friends!
                </div>`
          }
        </div>
      </section>
    `;
  }

  private renderFriendRow(friend: Friend): string {
    const presenceStatus = friend.status ?? 'OFFLINE';
    const isAccepted = friend.friendshipStatus === 'accepted';
    const inviteState = this.state.inviteStatus[friend.id] ?? 'idle';
    const inviteLabel =
      inviteState === 'loading'
        ? 'Sending...'
        : inviteState === 'success'
          ? 'Sent!'
          : inviteState === 'error'
            ? 'Retry'
            : 'Invite';

    const statusColor = presenceStatus === 'ONLINE'
      ? 'var(--color-brand-neon)'
      : presenceStatus === 'INGAME'
        ? 'rgba(250, 204, 21, 0.9)'
        : 'rgba(255,255,255,0.3)';

    const statusText = isAccepted
      ? presenceStatus === 'ONLINE'
        ? 'Ready to play'
        : presenceStatus === 'INGAME'
          ? 'In a match'
          : 'Offline'
      : `Status: ${friend.friendshipStatus}`;

    const actions = isAccepted
      ? presenceStatus === 'ONLINE'
        ? `
            <div class="flex gap-2">
              <button
                class="btn-touch px-3 py-2 rounded-xl text-xs touch-feedback"
                data-action="chat-friend"
                data-friend-id="${friend.id}"
                style="background: rgba(255,255,255,0.08); color: white;"
              >
                💬 Chat
              </button>
              <button
                class="btn-touch px-3 py-2 rounded-xl text-xs touch-feedback flex items-center gap-1.5"
                data-action="invite-friend"
                data-friend-id="${friend.id}"
                ${inviteState === 'loading' ? 'disabled' : ''}
                style="background: rgba(0,217,255,0.15); color: white; border: 1px solid rgba(0,217,255,0.3);"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M9 21a1 1 0 0 0 1-1v-1a2 2 0 0 1 4 0v.78A1.223 1.223 0 0 0 15.228 21 7.7 7.7 0 0 0 23 13.73 7.5 7.5 0 0 0 15.5 6H13V4a1 1 0 0 0-2 0v2H8.772A7.7 7.7 0 0 0 1 13.27a7.447 7.447 0 0 0 2.114 5.453A7.81 7.81 0 0 0 9 21zM8.772 8H15.5a5.5 5.5 0 0 1 5.5 5.67 5.643 5.643 0 0 1-5 5.279 4 4 0 0 0-8 .029 5.5 5.5 0 0 1-5-5.648A5.684 5.684 0 0 1 8.772 8zM5 12.5a1 1 0 0 1 1-1h1v-1a1 1 0 0 1 2 0v1h1a1 1 0 0 1 0 2H9v1a1 1 0 0 1-2 0v-1H6a1 1 0 0 1-1-1zM17 11a1 1 0 1 1 1 1 1 1 0 0 1-1-1zm-2 3a1 1 0 1 1 1 1 1 1 0 0 1-1-1z"/></svg>
                ${inviteLabel}
              </button>
            </div>
          `
        : presenceStatus === 'INGAME'
          ? `<span class="text-xs text-white/50">In a match</span>`
          : `<span class="text-xs text-white/40">Offline</span>`
      : `<span class="text-xs text-white/60">${friend.friendshipStatus === 'pending' ? 'Awaiting response' : 'Not available'}</span>`;

    return `
      <article class="flex items-center justify-between gap-3 rounded-2xl p-3" style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06);">
        <div class="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity"
             data-action="view-profile" data-user-id="${friend.id}">
          <div class="relative">
            <img src="${friend.avatar || '/assets/images/ape.png'}" alt="${friend.username}" class="h-12 w-12 rounded-xl object-cover" />
            <span class="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-black" style="background:${statusColor};"></span>
          </div>
          <div>
            <p class="font-semibold hover:underline">${friend.displayName ?? friend.username}</p>
            <p class="text-xs" style="color: rgba(255,255,255,0.6);">${statusText}</p>
            <button
              class="text-[11px] text-white/60 hover:text-white hover:underline mt-1"
              data-action="view-profile"
              data-user-id="${friend.id}"
            >
              View profile
            </button>
          </div>
        </div>
        ${actions}
      </article>
    `;
  }

  private renderMatchesWidget(): string {
    const { matches, isLoading } = this.state;
    const content = matches.length
      ? matches
          .map(
            (match) => `
              <article class="rounded-2xl p-4 flex items-center justify-between gap-4" style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06);">
                <div>
                  <p class="text-sm text-white/60">${match.gameType ?? '1v1'}</p>
                  <h4 class="text-lg font-semibold">${match.opponentUsername}</h4>
                  <p class="text-xs text-white/50">${this.formatTimeAgo(match.playedAt)}</p>
                </div>
                <div class="text-right">
                  <span class="text-xs px-2 py-1 rounded-full" style="background: ${
                    match.result === 'WON' ? 'rgba(0,255,136,0.15)' : 'rgba(255,7,58,0.15)'
                  }; color: ${match.result === 'WON' ? 'var(--color-success)' : 'var(--color-error)'};">
                    ${match.result === 'WON' ? 'Won' : 'Lost'}
                  </span>
                  <p class="text-xl font-bold mt-2">${match.finalScore ?? '—'}</p>
                </div>
              </article>
            `
          )
          .join('')
      : `<div class="text-sm text-white/50 rounded-xl p-4" style="background: rgba(255,255,255,0.03); border: 1px dashed rgba(255,255,255,0.2);">
          ${isLoading ? 'Loading recent matches...' : 'No matches played yet.'}
        </div>`;

    return `
      <section class="glass-panel p-6 flex flex-col">
        <div class="flex items-center justify-between mb-4">
          <div>
            <p class="text-sm text-white/60">Recent</p>
            <h3 class="text-xl font-semibold">Matches</h3>
          </div>
          <button
            data-action="view-matches"
            class="text-sm hover:underline touch-feedback"
            style="color: var(--color-brand-primary);"
          >
            View All
          </button>
        </div>
        <div class="space-y-3">
          ${content}
        </div>
      </section>
    `;
  }

  private renderLeaderboardWidget(): string {
    const { leaderboard } = this.state;
    const entries = leaderboard.length
      ? leaderboard
          .map(
            (entry) => `
              <article class="flex items-center justify-between p-4 rounded-2xl" style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06);">
                <div class="flex items-center gap-3">
                  <div class="h-10 w-10 rounded-full flex items-center justify-center font-semibold" style="background: rgba(255,255,255,0.08);">
                    ${entry.rank}
                  </div>
                  <div>
                    <p class="font-semibold">${entry.username}</p>
                    <p class="text-xs text-white/50">Top contender</p>
                  </div>
                </div>
                <div class="text-right">
                  <p class="text-lg font-bold">${this.formatWinRate(entry.winRate)}</p>
                  <p class="text-xs text-white/50">Win Rate</p>
                </div>
              </article>
            `
          )
          .join('')
      : `<div class="text-sm text-white/50 rounded-xl p-4" style="background: rgba(255,255,255,0.03); border: 1px dashed rgba(255,255,255,0.2);">
          ${this.state.isLoading ? 'Loading leaderboard...' : 'Leaderboard unavailable.'}
        </div>`;

    return `
      <section class="glass-panel p-6">
        <div class="flex items-center justify-between mb-4">
          <div>
            <p class="text-sm text-white/60">Top Players</p>
            <h3 class="text-xl font-semibold">Leaderboard</h3>
          </div>
          <div class="flex items-center gap-3 text-xs text-white/60">
            <span>Auto-refreshing every 30s</span>
            <button
              data-action="view-leaderboard"
              class="hover:underline touch-feedback"
              style="color: var(--color-brand-primary);"
            >
              View Full Leaderboard
            </button>
          </div>
        </div>
        <div class="space-y-3">
          ${entries}
        </div>
      </section>
    `;
  }

  render(): string {
    const { profile, isLoading, isRefreshing, error } = this.state;

    return `
      <div class="relative min-h-screen" style="background: var(--color-bg-dark);">
        <div class="absolute inset-0 bg-gradient-to-br from-[var(--color-bg-dark)] via-[var(--color-bg-darker)] to-[#0a091a]">
          <div class="absolute inset-0 opacity-60 cyberpunk-radial-bg"></div>
        </div>
        <div class="relative flex flex-col lg:flex-row gap-6 px-4 lg:px-8 py-6">
          ${this.renderSidebar()}
          <div class="flex-1 flex flex-col gap-6">
            <header class="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <p class="text-sm text-white/50">Dashboard</p>
                <h2 class="text-2xl md:text-3xl font-semibold tracking-tight">Your command center</h2>
              </div>
              <div class="flex items-center gap-3">
                <button
                  data-action="refresh-dashboard"
                  class="btn-touch px-5 py-2 rounded-xl touch-feedback text-sm"
                  style="background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.15); color: white;"
                >
                  ${isRefreshing ? 'Refreshing...' : 'Refresh'}
                </button>
                <button
                  data-nav="/profile"
                  class="btn-touch px-5 py-2 rounded-xl touch-feedback text-sm flex items-center gap-2"
                  style="background: linear-gradient(135deg, var(--color-brand-primary), var(--color-brand-secondary)); color: white;"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 19.904 19.905" fill="currentColor"><circle cx="9.952" cy="9.953" r="3"/><path d="M9.952 0A9.953 9.953 0 1 0 19.9 9.953 9.953 9.953 0 0 0 9.952 0zm7 10.953h-2.1a4.98 4.98 0 0 1-.731 1.755l1.487 1.492-1.414 1.41-1.488-1.488a4.955 4.955 0 0 1-1.754.73v2.1h-2v-2.1a5 5 0 0 1-1.752-.731L5.709 15.61 4.3 14.2l1.488-1.489a4.94 4.94 0 0 1-.73-1.754h-2.1v-2h2.1A5 5 0 0 1 5.783 7.2L4.3 5.711 5.71 4.3 7.2 5.785a4.919 4.919 0 0 1 1.754-.73v-2.1h2v2.1a4.963 4.963 0 0 1 1.754.73L14.194 4.3l1.414 1.414L14.12 7.2a4.936 4.936 0 0 1 .731 1.755h2.1z"/></svg>
                  Settings
                </button>
              </div>
            </header>
            ${error ? `
              <div class="rounded-2xl p-4" style="background: rgba(255, 7, 58, 0.12); border: 1px solid rgba(255, 7, 58, 0.3);">
                <div class="flex items-center justify-between gap-4">
                  <div>
                    <p class="font-semibold" style="color: var(--color-error);">Something went wrong</p>
                    <p class="text-sm text-white/70 mt-1">${error}</p>
                  </div>
                  <button
                    data-action="refresh-dashboard"
                    class="btn-touch px-4 py-2 rounded-xl touch-feedback text-sm"
                    style="background: rgba(255,255,255,0.08); color: white;"
                  >
                    Try Again
                  </button>
                </div>
              </div>
            ` : ''}
            ${this.renderInviteFeedback()}
            ${this.renderFriendRequestFeedback()}
            ${this.renderHero(profile)}
            ${isLoading && !profile ? `
              <div class="glass-panel p-6 text-sm text-white/60">Loading dashboard data...</div>
            ` : ''}
            ${this.renderQuickActions()}
            ${this.renderPublicGamesWidget()}
            ${this.renderPendingRequestsWidget()}
            ${this.renderSuggestedFriend()}
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
              ${this.renderFriendsWidget()}
              ${this.renderMatchesWidget()}
            </div>
            ${this.renderLeaderboardWidget()}
          </div>
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

    bindClick('[data-action="refresh-dashboard"]', () => {
      void this.loadDashboardData({ silent: true });
    });

    bindClick('[data-action="quick-action"]', (el) => {
      const path = el.getAttribute('data-target');
      if (path) navigate(path);
    });

    bindClick('[data-action="join-public-game"]', (el) => {
      const gameId = el.getAttribute('data-game-id');
      if (gameId) {
        void this.handleJoinPublicGame(gameId);
      }
    });

    bindClick('[data-action="view-matches"]', () => {
      navigate('/matches/history');
    });

    bindClick('[data-action="view-leaderboard"]', () => {
      navigate('/leaderboard');
    });

    bindClick('[data-action="view-profile"]', (el) => {
      const userId = el.getAttribute('data-user-id');
      if (userId) navigate(`/profile/${userId}`);
    });

    bindClick('[data-action="chat-friend"]', (el) => {
      const friendId = el.getAttribute('data-friend-id');
      if (friendId) this.handleChat(friendId);
    });

    const inviteButtons = this.element.querySelectorAll<HTMLElement>('[data-action="invite-friend"]');
    inviteButtons.forEach((button) => {
      const handler = (event: Event) => {
        event.preventDefault();
        const friendId = button.getAttribute('data-friend-id');
        if (friendId) {
          void this.handleInvite(friendId);
        }
      };
      button.addEventListener('click', handler);
      this.subscriptions.push(() => button.removeEventListener('click', handler));
    });

    const suggestionButtons = this.element.querySelectorAll<HTMLElement>('[data-action="send-friend-request"]');
    suggestionButtons.forEach((button) => {
      const handler = (event: Event) => {
        event.preventDefault();
        const friendId = button.getAttribute('data-suggested-id');
        if (friendId) {
          void this.handleFriendRequest(friendId);
        }
      };
      button.addEventListener('click', handler);
      this.subscriptions.push(() => button.removeEventListener('click', handler));
    });

    // User search functionality
    const searchButton = this.element.querySelector<HTMLElement>('[data-action="search-user"]');
    const searchInput = this.element.querySelector<HTMLInputElement>('#user-search-input');

    if (searchButton && searchInput) {
      const searchHandler = (event: Event) => {
        event.preventDefault();
        const username = searchInput.value;
        void this.handleUserSearch(username);
      };
      searchButton.addEventListener('click', searchHandler);
      this.subscriptions.push(() => searchButton.removeEventListener('click', searchHandler));

      // Also search on Enter key
      const enterHandler = (event: KeyboardEvent) => {
        if (event.key === 'Enter') {
          event.preventDefault();
          void this.handleUserSearch(searchInput.value);
        }
      };
      searchInput.addEventListener('keydown', enterHandler);
      this.subscriptions.push(() => searchInput.removeEventListener('keydown', enterHandler));
    }

    bindClick('[data-action="accept-request"]', (el) => {
      const friendshipId = el.getAttribute('data-friendship-id');
      if (friendshipId) {
        void this.handleRespondToRequest(friendshipId, 'accepted');
      }
    });

    bindClick('[data-action="reject-request"]', (el) => {
      const friendshipId = el.getAttribute('data-friendship-id');
      if (friendshipId) {
        void this.handleRespondToRequest(friendshipId, 'rejected');
      }
    });

    bindClick('[data-action="cancel-request"]', (el) => {
      const friendshipId = el.getAttribute('data-friendship-id');
      if (friendshipId) {
        void this.handleCancelRequest(friendshipId);
      }
    });

    bindClick('[data-action="block-request"]', (el) => {
      const friendId = el.getAttribute('data-friend-id');
      const friendshipId = el.getAttribute('data-friendship-id');
      if (friendId) {
        void this.handleBlockFriend(friendId, friendshipId);
      }
    });

    bindClick('[data-action="logout"]', () => {
      void this.handleLogout();
    });
  }
}
