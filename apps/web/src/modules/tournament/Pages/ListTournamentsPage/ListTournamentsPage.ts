import Component from '@/core/Component';
import { navigate } from '@/routes';
import type { TournamentDTOs, TournamentSummary } from '@/models';
import { tournamentService } from '@/services/api/TournamentService';
import { createTournamentWebSocketClient } from '@/modules/shared/services/WebSocketClient';
import { showError, showSuccess } from '@/utils/errors';

type State = {
  tournaments: TournamentSummary[];
  isLoading: boolean;
  error?: string;
  joiningTournamentId?: string;
  passcodePromptId?: string;
  passcodeValue: string;
  passcodeError?: string;
  searchQuery: string;
};

export default class ListTournamentsPage extends Component<Record<string, never>, State> {
  private tournamentSocket = createTournamentWebSocketClient();
  private tournamentUnsubscribes: Array<() => void> = [];

  constructor(props: Record<string, never> = {}) {
    super(props);
  }

  getInitialState(): State {
    return {
      tournaments: [],
      isLoading: true,
      error: undefined,
      joiningTournamentId: undefined,
      passcodePromptId: undefined,
      passcodeValue: '',
      passcodeError: undefined,
      searchQuery: '',
    };
  }

  onMount(): void {
    const initialSearch = this.getSearchFromUrl();
    if (initialSearch) {
      this.setState({ searchQuery: initialSearch });
    }
    void this.loadTournaments({ search: initialSearch });
    this.subscribeToTournamentUpdates();
  }

  onUnmount(): void {
    this.tournamentUnsubscribes.forEach((unsub) => unsub());
    this.tournamentUnsubscribes = [];
    this.tournamentSocket.disconnect();
  }

  private getSearchFromUrl(): string {
    if (typeof window === 'undefined') {
      return '';
    }
    const params = new URL(window.location.href).searchParams;
    return (params.get('code') || params.get('search') || '').trim();
  }

  private async loadTournaments(options: { silent?: boolean; search?: string } = {}): Promise<void> {
    const { silent = false } = options;
    const search = options.search ?? this.state.searchQuery;

    this.setState({
      error: undefined,
      ...(silent ? {} : { isLoading: true }),
    });

    try {
      const tournaments = await tournamentService.listTournaments({ search: search || undefined });
      tournaments.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      this.setState({ tournaments, isLoading: false });
    } catch (error) {
      console.warn('[ListTournamentsPage] Failed to load tournaments', error);
      this.setState({
        error: 'Unable to load tournaments.',
        isLoading: false,
      });
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
      console.warn('[ListTournamentsPage] Failed to connect tournament socket', error);
    });
  }

  private handleTournamentUpdate(event: unknown): void {
    if (!event || typeof event !== 'object') {
      return;
    }

    const payload = event as {
      tournaments?: Array<Partial<TournamentSummary> & { id: string }>;
      tournament?: Partial<TournamentSummary> & { id: string };
    };

    if (Array.isArray(payload.tournaments)) {
      const existingById = new Map(this.state.tournaments.map((tournament) => [tournament.id, tournament]));
      const tournaments = payload.tournaments.map((item) => {
        const existing = existingById.get(item.id);
        return {
          ...(existing ?? { myRole: 'none' as const }),
          ...item,
          myRole: existing?.myRole ?? item.myRole ?? 'none',
        } as TournamentSummary;
      });
      tournaments.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      this.setState({ tournaments, isLoading: false, error: undefined });
      return;
    }

    if (payload.tournament) {
      const updated = payload.tournament;
      const tournaments = [...this.state.tournaments];
      const index = tournaments.findIndex((item) => item.id === updated.id);
      if (index === -1) {
        tournaments.unshift({
          ...(updated as TournamentSummary),
          myRole: updated.myRole ?? 'none',
        });
      } else {
        const existing = tournaments[index];
        const merged = { ...existing, ...updated } as TournamentSummary;
        if (updated.myRole === undefined || (updated.myRole === 'none' && existing.myRole !== 'none')) {
          merged.myRole = existing.myRole;
        }
        tournaments[index] = merged;
      }
      tournaments.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      this.setState({ tournaments, isLoading: false, error: undefined });
    }
  }

  private handleTournamentRemoval(payload: unknown): void {
    if (!payload || typeof payload !== 'object') {
      return;
    }
    const id = (payload as { id?: string }).id;
    if (!id) return;

    const tournaments = this.state.tournaments.filter((tournament) => tournament.id !== id);
    const nextState: Partial<State> = { tournaments };

    if (this.state.passcodePromptId === id) {
      nextState.passcodePromptId = undefined;
      nextState.passcodeValue = '';
      nextState.passcodeError = undefined;
    }

    if (this.state.joiningTournamentId === id) {
      nextState.joiningTournamentId = undefined;
    }

    this.setState(nextState);
  }

  private async handleJoinTournament(tournamentId: string, requiresPasscode: boolean): Promise<void> {
    if (!tournamentId || this.state.joiningTournamentId === tournamentId) {
      return;
    }

    if (requiresPasscode && this.state.passcodePromptId !== tournamentId) {
      this.setState({ passcodePromptId: tournamentId, passcodeError: undefined, passcodeValue: '' });
      return;
    }

    const passcode = requiresPasscode ? this.getPasscodeInput(tournamentId) : undefined;
    if (requiresPasscode && !passcode) {
      this.setState({ passcodeError: 'Passcode is required.' });
      return;
    }

    this.setState({ joiningTournamentId: tournamentId, passcodeError: undefined, passcodeValue: passcode ?? '' });

    try {
      const response = await tournamentService.joinTournament(tournamentId, passcode);
      this.applyJoinUpdate(tournamentId, response);
      showSuccess('Joined tournament!');
      this.setState({ joiningTournamentId: undefined, passcodePromptId: undefined, passcodeValue: '' });
      navigate(`/tournament/${tournamentId}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to join tournament.';
      if (requiresPasscode) {
        this.setState({ joiningTournamentId: undefined, passcodeError: message, passcodeValue: passcode ?? '' });
      } else {
        this.setState({ joiningTournamentId: undefined });
      }
      showError(message);
    }
  }

  private applyJoinUpdate(tournamentId: string, response: TournamentDTOs.JoinTournamentResponse): void {
    const startTimeoutAt = response.startTimeoutSeconds
      ? new Date(Date.now() + response.startTimeoutSeconds * 1000).toISOString()
      : undefined;

    const tournaments = this.state.tournaments.map((tournament) => {
      if (tournament.id !== tournamentId) return tournament;
      return {
        ...tournament,
        currentParticipants: response.participantCount,
        status: response.status,
        readyToStart: response.readyToStart ?? tournament.readyToStart,
        startTimeoutAt: startTimeoutAt ?? tournament.startTimeoutAt,
        myRole: tournament.myRole === 'none' ? 'participant' : tournament.myRole,
      };
    });

    this.setState({ tournaments });
  }

  private getPasscodeInput(tournamentId: string): string {
    if (!this.element) return '';
    const input = this.element.querySelector<HTMLInputElement>(`[data-passcode-input="${tournamentId}"]`);
    return input?.value?.trim() ?? '';
  }

  private getTournamentStatusBadge(status: TournamentSummary['status'], readyToStart?: boolean): string {
    const label = status === 'recruiting' ? (readyToStart ? 'Ready' : 'Recruiting')
      : status === 'in_progress' ? 'In Progress'
        : 'Finished';
    const style = status === 'recruiting'
      ? 'background: rgba(76,201,240,0.2); color: var(--color-brand-secondary);'
      : status === 'in_progress'
        ? 'background: rgba(124,93,255,0.2); color: var(--color-brand-primary);'
        : 'background: rgba(0,255,136,0.2); color: var(--color-success);';

    return `<span class="text-xs px-3 py-1 rounded-full" style="${style}">${label}</span>`;
  }

  private formatStartCountdown(timestamp?: string | null): string | null {
    if (!timestamp) {
      return null;
    }
    const target = new Date(timestamp).getTime();
    if (Number.isNaN(target)) {
      return null;
    }
    const diffMs = target - Date.now();
    if (diffMs <= 0) {
      return 'Auto-starting now';
    }
    const minutes = Math.floor(diffMs / 60000);
    const seconds = Math.floor((diffMs % 60000) / 1000);
    return `Auto-start in ${minutes}:${seconds.toString().padStart(2, '0')}`;
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

  private renderTournamentList(): string {
    const {
      tournaments,
      isLoading,
      error,
      joiningTournamentId,
      passcodePromptId,
      passcodeError,
      passcodeValue,
    } = this.state;

    if (error) {
      return `
        <div class="glass-panel p-6 space-y-3">
          <p class="text-white/70">${error}</p>
        </div>
      `;
    }

    if (isLoading) {
      return `<div class="glass-panel p-6 text-white/60">Loading tournaments...</div>`;
    }

    if (!tournaments.length) {
      return `<div class="glass-panel p-6 text-white/60">No tournaments found right now.</div>`;
    }

    return `
      <div class="space-y-4">
        ${tournaments
          .map((tournament) => {
            const isRecruiting = tournament.status === 'recruiting';
            const isFull = tournament.currentParticipants >= tournament.maxParticipants;
            const isCreator = tournament.myRole === 'creator';
            const isParticipant = tournament.myRole === 'participant';
            const canJoin = isRecruiting && !isFull && !isCreator && !isParticipant;
            const showPasscode = tournament.requiresPasscode && passcodePromptId === tournament.id;
            const isJoining = joiningTournamentId === tournament.id;
            const statusBadge = this.getTournamentStatusBadge(tournament.status, tournament.readyToStart);
            const accessLabel = tournament.requiresPasscode ? 'Passcode required' : tournament.accessCode ?? 'Public';
            const readinessText = tournament.readyToStart
              ? this.formatStartCountdown(tournament.startTimeoutAt) ?? 'Ready to start'
              : `${Math.max(tournament.minParticipants - tournament.currentParticipants, 0)} more to start`;
            const visibilityIcon = tournament.requiresPasscode
              ? '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M17 9h-1V7a4 4 0 0 0-8 0v2H7a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-9a2 2 0 0 0-2-2zm-6 0V7a2 2 0 1 1 4 0v2h-4z"/></svg>'
              : '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M17 9h-1V7a4 4 0 1 0-8 0h2a2 2 0 1 1 4 0v2H7a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-9a2 2 0 0 0-2-2zm0 11H7v-9h10v9z"/></svg>';
            const visibilityLabel = tournament.requiresPasscode ? 'Private' : 'Public';

            return `
              <article class="glass-card p-5 rounded-2xl flex flex-col gap-4">
                <div class="flex items-start justify-between gap-4">
                  <div>
                    <div class="flex items-center gap-2 text-xs text-white/50">
                      <span class="inline-flex items-center gap-1">${visibilityIcon}<span>${visibilityLabel}</span></span>
                      <span>- ${accessLabel}</span>
                    </div>
                    <h3 class="text-xl font-semibold mt-1">${tournament.name}</h3>
                    <p class="text-xs text-white/50 mt-1">Hosted by ${tournament.creatorName ?? 'Unknown'}</p>
                  </div>
                  ${statusBadge}
                </div>
                <div class="flex flex-wrap items-center justify-between gap-3 text-sm text-white/60">
                  <span class="font-mono">${tournament.currentParticipants}/${tournament.maxParticipants} players</span>
                  <span>${readinessText}</span>
                  <span class="text-xs text-white/40">Created ${this.formatTimeAgo(tournament.createdAt)}</span>
                </div>
                ${tournament.isPublic && tournament.accessCode ? `
                  <div class="flex flex-wrap items-center gap-2 text-xs">
                    <span class="px-2 py-1 rounded-lg font-mono" style="background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.12); color: white;">
                      ${tournament.accessCode}
                    </span>
                    <button
                      data-action="copy-access-code"
                      data-access-code="${tournament.accessCode}"
                      class="btn-touch px-3 py-1 rounded-lg text-xs"
                      style="background: rgba(255,255,255,0.08); color: white;"
                    >
                      Copy code
                    </button>
                    <button
                      data-action="copy-access-link"
                      data-access-code="${tournament.accessCode}"
                      class="btn-touch px-3 py-1 rounded-lg text-xs"
                      style="background: rgba(255,255,255,0.08); color: white;"
                    >
                      Copy link
                    </button>
                  </div>
                ` : ''}
                <div class="flex flex-col sm:flex-row sm:items-center gap-3">
                  ${isCreator || isParticipant ? `
                    <div class="flex items-center gap-2 flex-wrap">
                      <span class="text-xs px-3 py-1 rounded-full" style="background: ${isCreator ? 'rgba(124,93,255,0.2)' : 'rgba(76,201,240,0.2)'}; color: ${isCreator ? 'var(--color-brand-primary)' : 'var(--color-brand-secondary)'};">
                        ${isCreator ? 'Your tournament' : 'Joined'}
                      </span>
                      <button
                        data-action="view-tournament"
                        data-tournament-id="${tournament.id}"
                        class="btn-touch px-3 py-1 rounded-lg text-xs"
                        style="background: rgba(255,255,255,0.08); color: white;"
                      >
                        View details
                      </button>
                    </div>
                  ` : !isRecruiting ? `
                    <span class="text-xs px-3 py-1 rounded-full" style="background: rgba(255,255,255,0.1); color: white;">${tournament.status.replace('_', ' ')}</span>
                  ` : isFull ? `
                    <span class="text-xs px-3 py-1 rounded-full" style="background: rgba(255,7,58,0.15); color: var(--color-error);">Tournament full</span>
                  ` : showPasscode ? `
                    <span class="text-xs text-white/60">Enter passcode below</span>
                  ` : `
                    <button
                      data-action="join-tournament"
                      data-tournament-id="${tournament.id}"
                      data-requires-passcode="${tournament.requiresPasscode ? 'true' : 'false'}"
                      class="btn-touch px-4 py-2 rounded-xl text-sm touch-feedback"
                      style="background: linear-gradient(135deg, var(--color-brand-primary), var(--color-brand-secondary)); color: white; ${isJoining ? 'opacity: 0.7;' : ''}"
                      ${isJoining || !canJoin ? 'disabled' : ''}
                    >
                      ${isJoining ? 'Joining...' : 'Join'}
                    </button>
                  `}
                </div>
                ${showPasscode ? `
                  <div class="flex flex-col gap-2">
                    <input
                      type="password"
                      data-passcode-input="${tournament.id}"
                      value="${passcodeValue}"
                      class="glass-input w-full rounded-xl px-4 py-3 text-sm"
                      style="background: var(--color-input-bg); border: 1px solid var(--color-input-border); color: var(--color-text-primary);"
                      placeholder="Enter passcode to join"
                    />
                    ${passcodeError ? `<p class="text-xs" style="color: var(--color-error);">${passcodeError}</p>` : ''}
                    <div class="flex items-center gap-2">
                      <button
                        data-action="join-tournament"
                        data-tournament-id="${tournament.id}"
                        data-requires-passcode="true"
                        class="btn-touch px-4 py-2 rounded-xl text-sm touch-feedback"
                        style="background: linear-gradient(135deg, var(--color-brand-primary), var(--color-brand-secondary)); color: white; ${isJoining ? 'opacity: 0.7;' : ''}"
                        ${isJoining ? 'disabled' : ''}
                      >
                        ${isJoining ? 'Joining...' : 'Confirm Join'}
                      </button>
                      <button
                        data-action="cancel-passcode"
                        data-tournament-id="${tournament.id}"
                        class="btn-touch px-4 py-2 rounded-xl text-sm"
                        style="background: rgba(255,255,255,0.08); color: white;"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ` : ''}
              </article>
            `;
          })
          .join('')}
      </div>
    `;
  }

  render(): string {
    return `
      <div class="relative min-h-screen" style="background: var(--color-bg-dark);">
        <div class="absolute inset-0 bg-gradient-to-br from-[var(--color-bg-dark)] via-[var(--color-bg-darker)] to-[#0b0b1e]">
          <div class="absolute inset-0 opacity-50 cyberpunk-radial-bg"></div>
        </div>
        <div class="relative max-w-5xl mx-auto px-4 lg:px-0 py-10 space-y-6">
          <header class="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <p class="text-sm text-white/60">Tournaments</p>
              <h1 class="text-3xl font-semibold">Browse & Join</h1>
              <p class="text-sm text-white/50 mt-2">
                Join a bracket directly or use a shared code to find the right tournament.
              </p>
            </div>
            <div class="flex gap-3">
              <button
                data-action="go-dashboard"
                class="btn-touch px-4 py-2 rounded-xl touch-feedback text-sm"
                style="background: rgba(255,255,255,0.08); color: white;"
              >
                <- Dashboard
              </button>
              <button
                data-action="create-tournament"
                class="btn-touch px-4 py-2 rounded-xl touch-feedback text-sm"
                style="background: linear-gradient(135deg, var(--color-brand-primary), var(--color-brand-secondary)); color: white;"
              >
                + Create
              </button>
            </div>
          </header>
          <section class="glass-panel rounded-2xl p-5 space-y-4">
            <div class="flex flex-col lg:flex-row lg:items-center gap-3">
              <div class="flex-1">
                <label class="text-xs text-white/60" for="tournament-search-input">Search by name or access code</label>
                <div class="mt-2 flex flex-col sm:flex-row sm:items-center gap-2">
                  <input
                    id="tournament-search-input"
                    type="text"
                    class="glass-input w-full rounded-xl px-4 py-3 text-sm sm:flex-1"
                    style="background: var(--color-input-bg); border: 1px solid var(--color-input-border); color: var(--color-text-primary);"
                    placeholder="Try Neon Cup or A1B2C3"
                    value="${this.state.searchQuery}"
                  />
                  <div class="flex gap-2">
                    <button
                      data-action="search-tournaments"
                      class="btn-touch px-4 py-3 rounded-xl text-sm"
                      style="background: rgba(255,255,255,0.08); color: white;"
                    >
                      Search
                    </button>
                    <button
                      data-action="clear-search"
                      class="btn-touch px-4 py-3 rounded-xl text-sm"
                      style="background: rgba(255,255,255,0.08); color: white;"
                    >
                      Clear
                    </button>
                  </div>
                </div>
              </div>
            </div>
            ${this.renderTournamentList()}
          </section>
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
        const clickHandler = () => handler(element);
        element.addEventListener('click', clickHandler);
        this.subscriptions.push(() => element.removeEventListener('click', clickHandler));
      });
    };

    bindClick('[data-action="go-dashboard"]', () => {
      navigate('/dashboard');
    });

    bindClick('[data-action="create-tournament"]', () => {
      navigate('/tournament/create');
    });

    bindClick('[data-action="search-tournaments"]', () => {
      const input = this.element!.querySelector<HTMLInputElement>('#tournament-search-input');
      const query = input?.value.trim() ?? '';
      this.setState({ searchQuery: query });
      void this.loadTournaments({ search: query });
    });

    bindClick('[data-action="clear-search"]', () => {
      const input = this.element!.querySelector<HTMLInputElement>('#tournament-search-input');
      if (input) {
        input.value = '';
      }
      this.setState({ searchQuery: '' });
      void this.loadTournaments({ search: '' });
    });

    const searchInput = this.element.querySelector<HTMLInputElement>('#tournament-search-input');
    if (searchInput) {
      const enterHandler = (event: KeyboardEvent) => {
        if (event.key === 'Enter') {
          event.preventDefault();
          const query = searchInput.value.trim();
          this.setState({ searchQuery: query });
          void this.loadTournaments({ search: query });
        }
      };
      searchInput.addEventListener('keydown', enterHandler);
      this.subscriptions.push(() => searchInput.removeEventListener('keydown', enterHandler));
    }

    bindClick('[data-action="join-tournament"]', (el) => {
      const tournamentId = el.getAttribute('data-tournament-id');
      const requiresPasscode = el.getAttribute('data-requires-passcode') === 'true';
      if (tournamentId) {
        void this.handleJoinTournament(tournamentId, requiresPasscode);
      }
    });

    bindClick('[data-action="view-tournament"]', (el) => {
      const tournamentId = el.getAttribute('data-tournament-id');
      if (tournamentId) {
        navigate(`/tournament/${tournamentId}`);
      }
    });

    bindClick('[data-action="cancel-passcode"]', (el) => {
      const tournamentId = el.getAttribute('data-tournament-id');
      if (tournamentId) {
        this.setState({ passcodePromptId: undefined, passcodeValue: '', passcodeError: undefined });
      }
    });

    bindClick('[data-action="copy-access-code"]', (el) => {
      const code = el.getAttribute('data-access-code');
      if (code && navigator.clipboard) {
        navigator.clipboard.writeText(code).then(() => {
          showSuccess('Access code copied.');
        }).catch(() => {
          showError('Unable to copy access code.');
        });
      }
    });

    bindClick('[data-action="copy-access-link"]', (el) => {
      const code = el.getAttribute('data-access-code');
      if (code && typeof window !== 'undefined') {
        const link = `${window.location.origin}/tournament/list?code=${encodeURIComponent(code)}`;
        if (navigator.clipboard) {
          navigator.clipboard.writeText(link).then(() => {
            showSuccess('Share link copied.');
          }).catch(() => {
            showError('Unable to copy share link.');
          });
        }
      }
    });
  }
}
