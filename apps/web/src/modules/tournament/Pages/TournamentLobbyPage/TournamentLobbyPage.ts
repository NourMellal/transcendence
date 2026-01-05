import Component from '@/core/Component';
import { navigate } from '@/routes';
import { appState } from '@/state';
import type { TournamentDetail, TournamentMatch, TournamentSummary } from '@/models';
import { tournamentService } from '@/services/api/TournamentService';
import { userService } from '@/services/api/UserService';
import { createTournamentWebSocketClient } from '@/modules/shared/services/WebSocketClient';
import { showError, showSuccess } from '@/utils/errors';

type TournamentLobbyPageProps = {
  id: string;
};

type State = {
  isLoading: boolean;
  isRefreshing: boolean;
  isStarting: boolean;
  isLeaving: boolean;
  playingMatchId?: string | null;
  error?: string;
  tournament?: TournamentDetail;
  participantProfiles: Record<string, { username: string; displayName?: string; avatar?: string }>;
  now: number;
};

export default class TournamentLobbyPage extends Component<TournamentLobbyPageProps, State> {
  private tournamentSocket = createTournamentWebSocketClient();
  private tournamentUnsubscribes: Array<() => void> = [];
  private countdownTimer: number | null = null;
  private bracketRefreshTimer: number | null = null;

  getInitialState(): State {
    return {
      isLoading: true,
      isRefreshing: false,
      isStarting: false,
      isLeaving: false,
      playingMatchId: null,
      error: undefined,
      tournament: undefined,
      participantProfiles: {},
      now: Date.now(),
    };
  }

  onMount(): void {
    void this.loadTournament();
    this.subscribeToTournamentUpdates();
    this.startCountdownTicker();
    this.startBracketRefreshTicker();
  }

  onUnmount(): void {
    this.tournamentUnsubscribes.forEach((unsub) => unsub());
    this.tournamentUnsubscribes = [];
    this.tournamentSocket.disconnect();
    if (this.countdownTimer) {
      window.clearInterval(this.countdownTimer);
      this.countdownTimer = null;
    }
    if (this.bracketRefreshTimer) {
      window.clearInterval(this.bracketRefreshTimer);
      this.bracketRefreshTimer = null;
    }
  }

  private get tournamentId(): string {
    return this.props.id;
  }

  private get currentUserId(): string | undefined {
    const authUser = appState.auth.get().user;
    return authUser?.id || authUser?.userId || authUser?.sub;
  }

  private startCountdownTicker(): void {
    if (this.countdownTimer) return;
    this.countdownTimer = window.setInterval(() => {
      const tournament = this.state.tournament;
      if (!tournament?.startTimeoutAt || tournament.status !== 'recruiting') {
        return;
      }
      this.setState({ now: Date.now() });
    }, 1000);
  }

  private startBracketRefreshTicker(): void {
    if (this.bracketRefreshTimer) return;
    this.bracketRefreshTimer = window.setInterval(() => {
      const tournament = this.state.tournament;
      if (!tournament || tournament.status === 'recruiting') return;
      void this.refreshTournament();
    }, 4000);
  }

  private async loadTournament(): Promise<void> {
    this.setState({ isLoading: true, error: undefined });
    try {
      const tournament = await tournamentService.getTournament(this.tournamentId);
      this.setState({ tournament, isLoading: false, isRefreshing: false });
      void this.hydrateParticipantProfiles(tournament.participants);
    } catch (error) {
      console.warn('[TournamentLobbyPage] Failed to load tournament', error);
      this.setState({
        error: 'Unable to load tournament details.',
        isLoading: false,
        isRefreshing: false,
      });
    }
  }

  private async refreshTournament(): Promise<void> {
    if (this.state.isRefreshing) return;
    this.setState({ isRefreshing: true });
    try {
      const tournament = await tournamentService.getTournament(this.tournamentId);
      this.setState({ tournament, isRefreshing: false, error: undefined });
      void this.hydrateParticipantProfiles(tournament.participants);
    } catch (error) {
      console.warn('[TournamentLobbyPage] Failed to refresh tournament', error);
      this.setState({ isRefreshing: false });
    }
  }

  private subscribeToTournamentUpdates(): void {
    this.tournamentUnsubscribes.forEach((unsub) => unsub());
    this.tournamentUnsubscribes = [];

    const unsubscribe = this.tournamentSocket.on<unknown>('tournament:list:updated', (payload) => {
      this.handleTournamentUpdate(payload);
    });
    const unsubscribeRemoved = this.tournamentSocket.on<unknown>('tournament:list:removed', (payload) => {
      this.handleTournamentRemoval(payload);
    });
    this.tournamentUnsubscribes.push(unsubscribe);
    this.tournamentUnsubscribes.push(unsubscribeRemoved);

    this.tournamentSocket.connect().catch((error) => {
      console.warn('[TournamentLobbyPage] Failed to connect tournament socket', error);
    });
  }

  private handleTournamentUpdate(payload: unknown): void {
    const update = this.extractTournamentUpdate(payload);
    if (!update) return;
    if (update.id !== this.tournamentId) return;

    const current = this.state.tournament;
    if (!current) {
      this.setState({ tournament: update as TournamentDetail });
      return;
    }

    const merged: TournamentDetail = {
      ...current,
      ...(update as TournamentSummary),
      participants: (update as TournamentDetail).participants ?? current.participants,
      matches: (update as TournamentDetail).matches ?? current.matches,
    };

    this.setState({ tournament: merged });
    void this.hydrateParticipantProfiles(merged.participants);

    if (update.currentParticipants !== undefined && update.currentParticipants !== current.currentParticipants) {
      void this.refreshTournament();
    }

    if (update.status && update.status !== 'recruiting' && update.status !== current.status) {
      void this.refreshTournament();
    }
  }

  private handleTournamentRemoval(payload: unknown): void {
    if (this.state.isLeaving) return;
    if (!payload || typeof payload !== 'object') return;
    const id = (payload as { id?: string }).id;
    if (!id || id !== this.tournamentId) return;

    showError('Tournament was deleted.');
    navigate('/tournament/list');
  }

  private extractTournamentUpdate(
    payload: unknown
  ): Partial<TournamentSummary> & { id: string } | null {
    if (!payload || typeof payload !== 'object') return null;
    const candidate = payload as {
      tournaments?: Array<Partial<TournamentSummary> & { id: string }>;
      tournament?: Partial<TournamentSummary> & { id: string };
    };

    if (candidate.tournament) {
      return candidate.tournament;
    }

    if (Array.isArray(candidate.tournaments)) {
      return candidate.tournaments.find((item) => item.id === this.tournamentId) ?? null;
    }

    return null;
  }

  private async handleStartTournament(): Promise<void> {
    if (this.state.isStarting) return;
    this.setState({ isStarting: true });
    try {
      await tournamentService.startTournament(this.tournamentId);
      await this.refreshTournament();
      this.setState({ isStarting: false });
      showSuccess('Tournament started.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to start tournament.';
      this.setState({ isStarting: false });
      showError(message);
    }
  }

  private async handleLeaveTournament(): Promise<void> {
    if (this.state.isLeaving) return;
    const tournament = this.state.tournament;
    const isCreator = tournament?.creatorId === this.currentUserId;

    if (isCreator) {
      const confirmed = window.confirm('Delete this tournament for everyone?');
      if (!confirmed) return;
    }

    this.setState({ isLeaving: true });
    try {
      await tournamentService.leaveTournament(this.tournamentId);
      showSuccess(isCreator ? 'Tournament deleted.' : 'Left tournament.');
      navigate('/tournament/list');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to leave tournament.';
      this.setState({ isLeaving: false });
      showError(message);
    }
  }

  private async handlePlayMatch(matchId: string): Promise<void> {
    if (!matchId || this.state.playingMatchId) return;
    this.setState({ playingMatchId: matchId });
    try {
      const response = await tournamentService.playMatch(this.tournamentId, matchId);
      showSuccess('Match starting.');
      const target = response.redirectUrl || `/game/play/${response.gameId}`;
      navigate(this.withTournamentReturn(target));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to start match.';
      showError(message);
    } finally {
      this.setState({ playingMatchId: null });
    }
  }

  private async hydrateParticipantProfiles(participants: TournamentDetail['participants'] | undefined): Promise<void> {
    if (!participants || participants.length === 0) return;

    const existing = this.state.participantProfiles;
    const uniqueIds = Array.from(new Set(participants.map((participant) => participant.userId).filter(Boolean)));
    const missing = uniqueIds.filter((userId) => !existing[userId]);
    if (!missing.length) return;

    try {
      const profiles = await Promise.all(
        missing.map(async (userId) => ({ userId, info: await userService.getUserInfo(userId) }))
      );
      const nextProfiles = { ...existing };
      profiles.forEach(({ userId, info }) => {
        if (info) {
          nextProfiles[userId] = info;
        }
      });
      this.setState({ participantProfiles: nextProfiles });
    } catch (error) {
      console.warn('[TournamentLobbyPage] Failed to hydrate participant profiles', error);
    }
  }

  private formatTimeAgo(dateStr?: string): string {
    if (!dateStr) return 'recently';
    const now = Date.now();
    const date = new Date(dateStr).getTime();
    if (Number.isNaN(date)) return 'recently';
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  }

  private formatCountdown(timestamp?: string | null): string | null {
    if (!timestamp) return null;
    const target = new Date(timestamp).getTime();
    if (Number.isNaN(target)) return null;
    const diffMs = target - this.state.now;
    if (diffMs <= 0) {
      return 'Auto-starting now';
    }
    const minutes = Math.floor(diffMs / 60000);
    const seconds = Math.floor((diffMs % 60000) / 1000);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }

  private renderStatusPanel(tournament: TournamentDetail): string {
    const isRecruiting = tournament.status === 'recruiting';
    const isFull = tournament.currentParticipants >= tournament.maxParticipants;
    const readyToStart = tournament.readyToStart;
    const isCreator = tournament.creatorId === this.currentUserId;
    const progress = Math.min(100, Math.round((tournament.currentParticipants / tournament.maxParticipants) * 100));

    if (!isRecruiting) {
      return `
        <div class="glass-panel p-6 rounded-2xl" style="border: 1px solid rgba(255,255,255,0.1);">
          <p class="text-sm text-white/60">Tournament status</p>
          <h2 class="text-2xl font-semibold mt-2">${tournament.status.replace('_', ' ')}</h2>
          <p class="text-sm text-white/50 mt-2">Bracket is active. Head to your match when it appears.</p>
        </div>
      `;
    }

    const countdown = readyToStart ? this.formatCountdown(tournament.startTimeoutAt) : null;
    const waitingLabel = readyToStart ? 'Ready to start' : 'Waiting for players';
    const waitingMessage = readyToStart
      ? 'Tournament will auto-start when the timer hits zero.'
      : `${Math.max(tournament.minParticipants - tournament.currentParticipants, 0)} more players needed.`;
    const borderColor = isFull
      ? 'rgba(236,72,153,0.35)'
      : readyToStart
        ? 'rgba(124,242,200,0.35)'
        : 'rgba(75,225,236,0.3)';

    return `
      <div class="glass-panel p-6 rounded-2xl" style="border: 1px solid ${borderColor};">
        <p class="text-sm text-white/60">Tournament status</p>
        <h2 class="text-2xl font-semibold mt-2">${isFull ? 'Tournament full' : waitingLabel}</h2>
        <p class="text-sm text-white/50 mt-2">${isFull ? 'Bracket is being generated...' : waitingMessage}</p>
        <div class="mt-4">
          <div class="flex items-center justify-between text-xs text-white/50">
            <span>Players</span>
            <span class="font-mono">${tournament.currentParticipants}/${tournament.maxParticipants}</span>
          </div>
          <div class="h-2 rounded-full mt-2" style="background: rgba(255,255,255,0.08);">
            <div
              class="h-2 rounded-full"
              style="width: ${progress}%; background: ${readyToStart ? 'var(--color-brand-secondary)' : 'rgba(124,93,255,0.7)'};"
            ></div>
          </div>
        </div>
        ${readyToStart ? `
          <div class="mt-5 rounded-xl px-4 py-3 flex items-center justify-between" style="border: 1px solid rgba(75,225,236,0.25); background: rgba(75,225,236,0.08);">
            <span class="text-xs text-white/60">Auto-starting in</span>
            <span class="font-mono text-lg" style="color: var(--color-brand-secondary);">${countdown ?? '--:--'}</span>
          </div>
        ` : ''}
        ${readyToStart && isCreator ? `
          <button
            data-action="start-tournament"
            class="btn-touch w-full mt-5 py-3 rounded-xl text-sm font-semibold touch-feedback"
            style="background: linear-gradient(135deg, var(--color-brand-primary), var(--color-brand-secondary)); color: white;"
            ${this.state.isStarting ? 'disabled' : ''}
          >
            ${this.state.isStarting ? 'Starting...' : 'Start tournament now'}
          </button>
        ` : ''}
      </div>
    `;
  }

  private renderParticipants(tournament: TournamentDetail): string {
    const participants = [...(tournament.participants ?? [])];
    const slots = Array.from({ length: tournament.maxParticipants }, (_, index) => {
      return participants[index] ?? null;
    });

    return `
      <div class="glass-panel p-6 rounded-2xl" style="border: 1px solid rgba(255,255,255,0.08);">
        <div class="flex items-center justify-between">
          <h3 class="text-lg font-semibold">Participants</h3>
          <span class="text-xs text-white/50">${participants.length}/${tournament.maxParticipants}</span>
        </div>
        <div class="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
          ${slots
            .map((participant, index) => {
              if (!participant) {
                return `
                  <div class="flex items-center gap-3 px-3 py-3 rounded-xl" style="border: 1px dashed rgba(255,255,255,0.12); color: rgba(255,255,255,0.45);">
                    <div class="w-8 h-8 rounded-full flex items-center justify-center text-xs" style="border: 1px dashed rgba(255,255,255,0.2);">?</div>
                    <div>
                      <p class="text-xs uppercase tracking-widest">Open slot</p>
                    </div>
                  </div>
                `;
              }

              const isCreator = participant.userId === tournament.creatorId;
              const isCurrentUser = participant.userId === this.currentUserId;
              const profile = this.state.participantProfiles[participant.userId];
              const displayName =
                profile?.displayName ||
                profile?.username ||
                participant.username ||
                (isCurrentUser ? 'You' : `Player ${index + 1}`);
              const showHandle =
                profile?.username && profile.username !== displayName ? `@${profile.username}` : null;
              const badge = isCreator
                ? 'Creator'
                : isCurrentUser
                  ? 'You'
                  : `Joined ${this.formatTimeAgo(participant.joinedAt)}`;
              const avatar = profile?.avatar || '/assets/images/ape.png';

              return `
                <div class="flex items-center justify-between px-3 py-3 rounded-xl" style="background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08);">
                  <div class="flex items-center gap-3">
                    <div class="w-9 h-9 rounded-full overflow-hidden border border-white/10" style="background: rgba(255,255,255,0.08);">
                      <img
                        src="${avatar}"
                        alt="${displayName}"
                        class="w-full h-full object-cover"
                        onerror="this.src='/assets/images/ape.png';"
                      />
                    </div>
                    <div>
                      <p class="text-sm font-semibold">${displayName}</p>
                      <p class="text-xs text-white/50">${showHandle ? `${showHandle} · ${badge}` : badge}</p>
                    </div>
                  </div>
                </div>
              `;
            })
            .join('')}
        </div>
      </div>
    `;
  }

  private renderInfoCard(tournament: TournamentDetail): string {
    const isPublic = tournament.isPublic;
    return `
      <div class="glass-panel p-6 rounded-2xl" style="border: 1px solid rgba(255,255,255,0.08);">
        <p class="text-xs text-white/50 uppercase tracking-widest">Tournament Info</p>
        <h2 class="text-xl font-semibold mt-2">${tournament.name}</h2>
        <p class="text-xs text-white/50 mt-1">Created ${this.formatTimeAgo(tournament.createdAt)}</p>
        <div class="mt-4 space-y-3 text-sm text-white/60">
          <div class="flex items-center justify-between">
            <span>Status</span>
            <span class="text-white/80">${tournament.status.replace('_', ' ')}</span>
          </div>
          <div class="flex items-center justify-between">
            <span>Visibility</span>
            <span class="text-white/80">${isPublic ? 'Public' : 'Private'}</span>
          </div>
          ${isPublic && tournament.accessCode ? `
            <div>
              <p class="text-xs text-white/50">Access code</p>
              <div class="flex items-center gap-2 mt-2">
                <span class="px-3 py-2 rounded-lg font-mono text-sm" style="background: rgba(255,255,255,0.08); color: white;">
                  ${tournament.accessCode}
                </span>
                <button
                  data-action="copy-access-code"
                  data-access-code="${tournament.accessCode}"
                  class="btn-touch px-3 py-2 rounded-lg text-xs"
                  style="background: rgba(255,255,255,0.08); color: white;"
                >
                  Copy code
                </button>
              </div>
            </div>
          ` : `
            <p class="text-xs text-white/50">Private tournament. Share the passcode separately.</p>
          `}
        </div>
        ${isPublic && tournament.accessCode ? `
          <button
            data-action="copy-access-link"
            data-access-code="${tournament.accessCode}"
            class="btn-touch w-full mt-5 py-3 rounded-xl text-sm"
            style="background: rgba(255,255,255,0.08); color: white;"
          >
            Copy invite link
          </button>
        ` : ''}
      </div>
    `;
  }

  private resolveParticipantName(userId?: string | null, fallback?: string): string {
    if (!userId) return fallback ?? 'TBD';
    const profile = this.state.participantProfiles[userId];
    if (profile?.displayName) return profile.displayName;
    if (profile?.username) return profile.username;
    const participant = this.state.tournament?.participants?.find((item) => item.userId === userId);
    if (participant?.username) return participant.username;
    return fallback ?? 'Player';
  }

  private renderMatchCard(match: TournamentMatch): string {
    const player1Id = match.player1?.userId ?? null;
    const player2Id = match.player2?.userId ?? null;
    const isPending = match.status === 'pending';
    const isInProgress = match.status === 'in_progress';
    const isFinished = match.status === 'finished';
    const borderColor = isPending
      ? 'rgba(75,225,236,0.35)'
      : isInProgress
        ? 'rgba(236,72,153,0.5)'
        : 'rgba(124,242,200,0.35)';
    const background = isPending
      ? 'rgba(255,255,255,0.03)'
      : isInProgress
        ? 'rgba(236,72,153,0.08)'
        : 'rgba(124,242,200,0.08)';
    const currentUserId = this.currentUserId;
    const isParticipant = Boolean(
      currentUserId && (currentUserId === player1Id || currentUserId === player2Id)
    );
    const canPlay = isPending && player1Id && player2Id && isParticipant;
    const canJoin = isInProgress && Boolean(match.gameId) && isParticipant;
    const isStarting = this.state.playingMatchId === match.id;

    const renderRow = (userId: string | null, fallback: string) => {
      const name = this.resolveParticipantName(userId, fallback);
      const isWinner = match.winnerId && userId && match.winnerId === userId;
      const isLoser = match.winnerId && userId && match.winnerId !== userId;
      const isYou = currentUserId && userId === currentUserId;
      const rowStyle = isWinner
        ? 'background: rgba(124,242,200,0.16);'
        : isLoser
          ? 'opacity: 0.6;'
          : '';
      const label = userId ? name : 'TBD';
      const meta = isWinner ? 'WIN' : isYou ? 'YOU' : '';
      return `
        <div class="flex items-center justify-between px-3 py-2 text-sm" style="${rowStyle}">
          <span class="${userId ? 'text-white' : 'text-white/50'}">${label}</span>
          ${meta ? `<span class="text-[10px] uppercase tracking-widest text-white/60">${meta}</span>` : ''}
        </div>
      `;
    };

    return `
      <div class="rounded-xl overflow-hidden" style="border: 1px solid ${borderColor}; background: ${background};">
        <div class="flex items-center justify-between px-3 py-2 text-[10px] uppercase tracking-widest text-white/50">
          <span>Round ${match.round} - Match ${match.matchPosition}</span>
          <span>${match.status.replace('_', ' ')}</span>
        </div>
        ${renderRow(player1Id, 'Player 1')}
        <div style="border-top: 1px solid rgba(255,255,255,0.08);"></div>
        ${renderRow(player2Id, 'Player 2')}
        ${canPlay ? `
          <div class="px-3 py-2">
            <button
              data-action="play-match"
              data-match-id="${match.id}"
              class="btn-touch w-full py-2 rounded-lg text-xs touch-feedback"
              style="border: 1px solid rgba(75,225,236,0.45); color: white; background: rgba(75,225,236,0.08);"
              ${isStarting ? 'disabled' : ''}
            >
              ${isStarting ? 'Starting...' : 'Play match'}
            </button>
          </div>
        ` : ''}
        ${canJoin ? `
          <div class="px-3 py-2">
            <button
              data-action="join-match"
              data-game-id="${match.gameId}"
              class="btn-touch w-full py-2 rounded-lg text-xs touch-feedback"
              style="border: 1px solid rgba(236,72,153,0.45); color: white; background: rgba(236,72,153,0.12);"
            >
              Join match
            </button>
          </div>
        ` : ''}
      </div>
    `;
  }

  private renderRoundColumn(round: number, matches: TournamentMatch[], totalRounds: number): string {
    const title = round === totalRounds ? 'Final' : `Round ${round}`;
    const ordered = [...matches].sort((a, b) => a.matchPosition - b.matchPosition);
    return `
      <div class="min-w-[220px] flex-1 space-y-4">
        <p class="text-xs uppercase tracking-widest text-white/40">${title}</p>
        <div class="space-y-4">
          ${ordered.map((match) => this.renderMatchCard(match)).join('')}
        </div>
      </div>
    `;
  }

  private renderBracket(tournament: TournamentDetail): string {
    const matches = tournament.matches ?? [];
    if (!matches.length) {
      return `
        <div class="glass-panel p-6 rounded-2xl" style="border: 1px solid rgba(255,255,255,0.08);">
          <p class="text-white/60">Bracket is being generated...</p>
        </div>
      `;
    }

    const rounds = matches.reduce<Record<number, TournamentMatch[]>>((acc, match) => {
      acc[match.round] = acc[match.round] ?? [];
      acc[match.round].push(match);
      return acc;
    }, {});
    const roundNumbers = Object.keys(rounds).map((value) => Number(value)).sort((a, b) => a - b);
    const totalRounds = roundNumbers[roundNumbers.length - 1] ?? 1;

    return `
      <section class="glass-panel p-6 rounded-2xl" style="border: 1px solid rgba(255,255,255,0.08);">
        <div class="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <p class="text-xs uppercase tracking-widest text-white/50">Tournament bracket</p>
            <h2 class="text-2xl font-semibold mt-2">${tournament.name}</h2>
            <p class="text-sm text-white/50 mt-1">Status: ${tournament.status.replace('_', ' ')}</p>
          </div>
          <div class="text-xs text-white/50">
            Matches: <span class="font-mono text-white">${matches.length}</span>
          </div>
        </div>
        <div class="mt-6 overflow-x-auto">
          <div class="min-w-[720px] flex flex-col lg:flex-row gap-6">
            ${roundNumbers.map((round) => this.renderRoundColumn(round, rounds[round], totalRounds)).join('')}
          </div>
        </div>
        <div class="mt-6 flex flex-wrap gap-3 text-xs text-white/60">
          <span class="flex items-center gap-2">
            <span class="w-2 h-2 rounded-full" style="background: rgba(75,225,236,0.8);"></span>
            Pending
          </span>
          <span class="flex items-center gap-2">
            <span class="w-2 h-2 rounded-full" style="background: rgba(236,72,153,0.9);"></span>
            In progress
          </span>
          <span class="flex items-center gap-2">
            <span class="w-2 h-2 rounded-full" style="background: rgba(124,242,200,0.9);"></span>
            Finished
          </span>
          <span class="flex items-center gap-2">
            <span class="px-2 py-0.5 rounded-full" style="border: 1px solid rgba(255,255,255,0.2);">YOU</span>
            Your match
          </span>
        </div>
      </section>
    `;
  }

  private withTournamentReturn(path: string): string {
    const url = new URL(path, window.location.origin);
    url.searchParams.set('tournamentId', this.tournamentId);
    return `${url.pathname}${url.search}`;
  }

  render(): string {
    const { isLoading, error, tournament } = this.state;

    if (isLoading) {
      return `
        <div class="relative min-h-screen flex items-center justify-center" style="background: var(--color-bg-dark);">
          <p class="text-white/60">Loading tournament...</p>
        </div>
      `;
    }

    if (error || !tournament) {
      return `
        <div class="relative min-h-screen flex items-center justify-center" style="background: var(--color-bg-dark);">
          <div class="glass-panel p-6 text-center space-y-4">
            <p class="text-white/70">${error ?? 'Tournament not found.'}</p>
            <button
              data-action="back-to-list"
              class="btn-touch px-4 py-2 rounded-xl touch-feedback"
              style="background: rgba(255,255,255,0.08); color: white;"
            >
              Back to list
            </button>
          </div>
        </div>
      `;
    }

    const isCreator = tournament.creatorId === this.currentUserId;
    const isParticipant = tournament.participants?.some((participant) => participant.userId === this.currentUserId);
    const canLeave = tournament.status === 'recruiting' && isParticipant;
    const leaveLabel = isCreator ? 'Delete tournament' : 'Leave tournament';
    const isRecruiting = tournament.status === 'recruiting';

    return `
      <div class="relative min-h-screen" style="background: var(--color-bg-dark);">
        <div class="absolute inset-0 bg-gradient-to-br from-[var(--color-bg-dark)] via-[var(--color-bg-darker)] to-[#0b0d26]">
          <div class="absolute inset-0 opacity-50 cyberpunk-radial-bg"></div>
        </div>
        <div class="relative max-w-5xl mx-auto px-4 lg:px-0 py-10 space-y-6">
          <header class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <button
                data-action="back-to-list"
                class="btn-touch px-4 py-2 rounded-xl text-sm touch-feedback"
                style="background: rgba(255,255,255,0.08); color: white;"
              >
                ← Back to tournaments
              </button>
              <h1 class="text-3xl font-semibold mt-4">${tournament.name}</h1>
              <p class="text-sm text-white/50 mt-2">${isRecruiting ? 'Tournament waiting room' : 'Tournament bracket'}</p>
            </div>
            <div class="flex items-center gap-3">
              <div class="text-xs text-white/50 text-right">
                <div>Players</div>
                <div class="font-mono text-lg text-white">${tournament.currentParticipants}/${tournament.maxParticipants}</div>
              </div>
              ${canLeave ? `
                <button
                  data-action="leave-tournament"
                  class="btn-touch px-4 py-2 rounded-xl text-sm touch-feedback"
                  style="background: rgba(248,113,113,0.16); color: #fecaca; border: 1px solid rgba(248,113,113,0.35);"
                  ${this.state.isLeaving ? 'disabled' : ''}
                >
                  ${this.state.isLeaving ? 'Leaving...' : leaveLabel}
                </button>
              ` : ''}
            </div>
          </header>
          ${isRecruiting ? `
            <div class="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-6">
              <div class="space-y-6">
                ${this.renderStatusPanel(tournament)}
                ${this.renderParticipants(tournament)}
              </div>
              <div class="space-y-6">
                ${this.renderInfoCard(tournament)}
              </div>
            </div>
          ` : `
            <div class="grid grid-cols-1 xl:grid-cols-[3fr_1fr] gap-6">
              <div class="space-y-6">
                ${this.renderBracket(tournament)}
              </div>
              <div class="space-y-6">
                ${this.renderInfoCard(tournament)}
              </div>
            </div>
          `}
        </div>
      </div>
    `;
  }

  protected attachEventListeners(): void {
    this.subscriptions.forEach((unsub) => unsub());
    this.subscriptions = [];
    if (!this.element) return;

    const backButton = this.element.querySelector<HTMLButtonElement>('[data-action="back-to-list"]');
    if (backButton) {
      const handler = () => navigate('/tournament/list');
      backButton.addEventListener('click', handler);
      this.subscriptions.push(() => backButton.removeEventListener('click', handler));
    }

    const startButton = this.element.querySelector<HTMLButtonElement>('[data-action="start-tournament"]');
    if (startButton) {
      const handler = () => void this.handleStartTournament();
      startButton.addEventListener('click', handler);
      this.subscriptions.push(() => startButton.removeEventListener('click', handler));
    }

    const copyCode = this.element.querySelectorAll<HTMLButtonElement>('[data-action="copy-access-code"]');
    copyCode.forEach((button) => {
      const handler = async () => {
        const code = button.getAttribute('data-access-code');
        if (!code) return;
        try {
          await navigator.clipboard.writeText(code);
          showSuccess('Access code copied.');
        } catch {
          showError('Unable to copy access code.');
        }
      };
      button.addEventListener('click', handler);
      this.subscriptions.push(() => button.removeEventListener('click', handler));
    });

    const copyLink = this.element.querySelectorAll<HTMLButtonElement>('[data-action="copy-access-link"]');
    copyLink.forEach((button) => {
      const handler = async () => {
        const code = button.getAttribute('data-access-code');
        if (!code) return;
        const link = `${window.location.origin}/tournament/list?code=${encodeURIComponent(code)}`;
        try {
          await navigator.clipboard.writeText(link);
          showSuccess('Invite link copied.');
        } catch {
          showError('Unable to copy invite link.');
        }
      };
      button.addEventListener('click', handler);
      this.subscriptions.push(() => button.removeEventListener('click', handler));
    });

    const leaveButton = this.element.querySelector<HTMLButtonElement>('[data-action="leave-tournament"]');
    if (leaveButton) {
      const handler = () => void this.handleLeaveTournament();
      leaveButton.addEventListener('click', handler);
      this.subscriptions.push(() => leaveButton.removeEventListener('click', handler));
    }

    const playButtons = this.element.querySelectorAll<HTMLButtonElement>('[data-action="play-match"]');
    playButtons.forEach((button) => {
      const matchId = button.getAttribute('data-match-id');
      if (!matchId) return;
      const handler = () => void this.handlePlayMatch(matchId);
      button.addEventListener('click', handler);
      this.subscriptions.push(() => button.removeEventListener('click', handler));
    });

    const joinButtons = this.element.querySelectorAll<HTMLButtonElement>('[data-action="join-match"]');
    joinButtons.forEach((button) => {
      const gameId = button.getAttribute('data-game-id');
      if (!gameId) return;
      const handler = () => navigate(this.withTournamentReturn(`/game/play/${gameId}`));
      button.addEventListener('click', handler);
      this.subscriptions.push(() => button.removeEventListener('click', handler));
    });
  }
}
