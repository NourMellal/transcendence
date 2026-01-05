import Component from '../../../../core/Component';
import { navigate } from '../../../../routes';
import { appState } from '../../../../state';
import { authService } from '../../../../services/auth/AuthService';
import { guestSessionService } from '../../../../services/guest/GuestSessionService';

type Props = {};
type State = {
  activePlayers: number;
  gamesPlayed: number;
  tournaments: number;
  isAuthenticated: boolean;
  username: string | null;
  guestAlias: string | null;
  isGuestModalOpen: boolean;
  guestAliasInput: string;
  guestError?: string;
};

export default class HomePage extends Component<Props, State> {
  private authUnsubscribe: (() => void) | null = null;
  private guestUnsubscribe: (() => void) | null = null;

  constructor(props: Props = {}) {
    super(props);
  }

  getInitialState(): State {
    const auth = appState.auth.get();
    const guest = appState.guest.get();
    return {
      activePlayers: 1337,
      gamesPlayed: 42069,
      tournaments: 420,
      isAuthenticated: auth.isAuthenticated,
      username: auth.user?.username ?? null,
      guestAlias: guest.alias,
      isGuestModalOpen: false,
      guestAliasInput: guest.alias ?? '',
      guestError: undefined,
    };
  }

  onMount(): void {
    // Subscribe to auth state changes
    this.authUnsubscribe = appState.auth.subscribe(() => {
      const auth = appState.auth.get();
      this.setState({
        isAuthenticated: auth.isAuthenticated,
        username: auth.user?.username ?? null,
      });
    });

    this.guestUnsubscribe = appState.guest.subscribe(() => {
      const guest = appState.guest.get();
      this.setState({
        guestAlias: guest.alias,
      });
    });
  }

  onUnmount(): void {
    if (this.authUnsubscribe) {
      this.authUnsubscribe();
      this.authUnsubscribe = null;
    }
    if (this.guestUnsubscribe) {
      this.guestUnsubscribe();
      this.guestUnsubscribe = null;
    }
  }

  private renderAuthButtons(): string {
    const { isAuthenticated, username } = this.state;

    if (isAuthenticated) {
      return `
        <span class="text-sm text-white/70 hidden sm:inline">Welcome, ${username ?? 'User'}</span>
        <button
          data-action="dashboard"
          class="btn-touch px-3 sm:px-4 py-2 text-sm font-medium transition touch-feedback"
          style="color: rgba(255, 255, 255, 0.8);"
        >
          Dashboard
        </button>
        <button
          data-action="logout"
          class="btn-touch px-4 sm:px-6 py-2 rounded-full text-sm font-medium transition touch-feedback"
          style="background: rgba(255, 255, 255, 0.1); color: white; border: 1px solid rgba(255, 255, 255, 0.2);"
        >
          Sign Out
        </button>
      `;
    }

    return `
      <button
        data-action="login"
        class="btn-touch px-3 sm:px-4 py-2 text-sm font-medium transition touch-feedback"
        style="color: rgba(255, 255, 255, 0.8);"
      >
        Sign In
      </button>
      <button
        data-action="register"
        class="btn-touch px-4 sm:px-6 py-2 rounded-full text-sm font-medium transition touch-feedback"
        style="background: rgba(255, 255, 255, 0.1); color: white; border: 1px solid rgba(255, 255, 255, 0.2);"
      >
        <span class="hidden sm:inline">Create Account</span>
        <span class="sm:hidden">Sign Up</span>
      </button>
    `;
  }

  private renderGuestSessionCard(): string {
    const { guestAlias, isAuthenticated } = this.state;
    if (!guestAlias || isAuthenticated) return '';

    return `
      <div class="glass-panel p-4 rounded-2xl max-w-xl mx-auto mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4" style="border: 1px solid rgba(255, 255, 255, 0.12);">
        <div class="text-left">
          <p class="text-xs uppercase tracking-wide text-white/60">Guest mode</p>
          <p class="text-base font-medium" style="color: var(--color-text-primary);">Playing as <span class="text-white">${guestAlias}</span></p>
          <p class="text-xs text-white/50">Alias lasts for this browser session</p>
        </div>
        <div class="flex items-center gap-3">
          <button
            data-action="guest-switch"
            class="btn-touch px-4 py-2 rounded-full text-sm touch-feedback"
            style="border: 1px solid rgba(255,255,255,0.2); color: white;"
          >Change alias</button>
          <button
            data-action="guest-reset"
            class="btn-touch px-4 py-2 rounded-full text-sm touch-feedback"
            style="background: rgba(255, 255, 255, 0.08); color: white;"
          >Reset</button>
        </div>
      </div>
    `;
  }

  private renderGuestModal(): string {
    if (!this.state.isGuestModalOpen) return '';
    const { guestAliasInput, guestError } = this.state;

    return `
      <div class="mobile-modal active" data-role="guest-overlay">
        <div class="mobile-modal-content glass-panel" role="dialog" aria-modal="true" aria-labelledby="guest-modal-title">
          <div class="flex items-center justify-between mb-4">
            <div>
              <p class="text-xs uppercase tracking-wide text-white/60">Guest session</p>
              <h2 id="guest-modal-title" class="text-xl font-semibold">Choose an alias</h2>
            </div>
            <button data-action="guest-modal-close" aria-label="Close" class="text-white/60 hover:text-white">×</button>
          </div>
          <p class="text-sm text-white/60 mb-4">This alias is used for local matches and resets when you close the tab.</p>
          ${guestError ? `<div class="mb-4 text-sm" style="color: var(--color-error);">${guestError}</div>` : ''}
          <form data-action="guest-alias-form" class="space-y-4">
            <div>
              <label class="text-xs uppercase tracking-wide text-white/60">Alias</label>
              <input
                type="text"
                name="alias"
                maxlength="16"
                value="${guestAliasInput ?? ''}"
                class="glass-input w-full rounded-xl mt-2"
                placeholder="e.g. NeonRally"
                autocomplete="off"
                required
              />
            </div>
            <div class="flex flex-col sm:flex-row gap-3">
              <button type="submit" class="btn-touch flex-1 rounded-full py-3 touch-feedback" style="background: white; color: var(--color-bg-dark);">Continue</button>
              <button type="button" data-action="guest-modal-close" class="btn-touch flex-1 rounded-full py-3 touch-feedback" style="border: 1px solid rgba(255, 255, 255, 0.2); color: white;">Cancel</button>
            </div>
          </form>
        </div>
      </div>
    `;
  }

  private openGuestModal(prefill?: string) {
    this.setState({
      isGuestModalOpen: true,
      guestAliasInput: prefill ?? this.state.guestAlias ?? '',
      guestError: undefined,
    });
  }

  private closeGuestModal() {
    this.setState({ isGuestModalOpen: false, guestError: undefined });
  }

  private handleGuestAliasSubmit(aliasInput: string) {
    this.setState({ guestAliasInput: aliasInput });
    try {
      const alias = guestSessionService.startSession(aliasInput);
      this.setState({
        guestAlias: alias,
        guestAliasInput: alias,
        guestError: undefined,
        isGuestModalOpen: false,
      });
      navigate('/game/local');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to save alias.';
      this.setState({ guestError: message });
    }
  }

  render() {
    const { activePlayers, gamesPlayed, tournaments } = this.state;
    
    return `
      <nav class="mobile-nav fixed top-0 left-0 right-0 z-50 glass-panel safe-area-top" style="border-bottom: 1px solid rgba(255, 255, 255, 0.05);">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
          <div class="text-lg sm:text-xl font-semibold tracking-tight">Transcendence</div>
          <div class="flex items-center gap-2 sm:gap-3">
            ${this.renderAuthButtons()}
          </div>
        </div>
      </nav>

      <section class="relative min-h-screen flex items-center justify-center px-4 sm:px-6 pt-20 sm:pt-24 pb-12 landscape-mobile-adjust safe-area-inset">
        <div class="absolute inset-0 bg-gradient-to-br from-[var(--color-bg-dark)] via-[var(--color-bg-dark)] to-[var(--color-bg-darker)]">
          <div class="absolute inset-0 cyberpunk-radial-bg"></div>
        </div>

        <div class="relative max-w-4xl mx-auto text-center space-y-8 sm:space-y-12 mobile-section-spacing">
          <div class="space-y-4 sm:space-y-6">
            <h1 class="text-responsive-hero sm:text-6xl lg:text-7xl font-light tracking-tight" style="color: var(--color-text-primary);">
              <span class="block">The</span>
              <span class="block font-semibold" style="background: linear-gradient(to right, white, var(--color-brand-secondary), white); background-clip: text; -webkit-background-clip: text; -webkit-text-fill-color: transparent;">
                Bouncy
              </span>
              <span class="block">Pong Arena</span>
            </h1>
            <p class="text-responsive-subtitle sm:text-xl max-w-2xl mx-auto leading-relaxed mobile-xs-px-4 text-white/60">
              Low-key the best Pong experience, high-key addictive.
            </p>
          </div>

          <div class="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-8 max-w-2xl mx-auto mb-8 sm:mb-12">
            <div class="text-center space-y-1 sm:space-y-2">
              <div class="text-lg sm:text-2xl font-mono font-semibold">${activePlayers.toLocaleString()}</div>
              <div class="text-xs sm:text-sm text-white/50">Online</div>
            </div>
            <div class="text-center space-y-1 sm:space-y-2">
              <div class="text-lg sm:text-2xl font-mono font-semibold">${gamesPlayed.toLocaleString()}</div>
              <div class="text-xs sm:text-sm text-white/50">Games</div>
            </div>
            <div class="text-center space-y-1 sm:space-y-2">
              <div class="text-lg sm:text-2xl font-mono font-semibold">${tournaments}</div>
              <div class="text-xs sm:text-sm text-white/50">Brackets</div>
            </div>
            <div class="text-center space-y-1 sm:space-y-2">
              <div class="text-lg sm:text-2xl font-mono font-semibold">~2s</div>
              <div class="text-xs sm:text-sm text-white/50">Queue</div>
            </div>
          </div>

          ${this.renderGuestSessionCard()}

          <div class="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 px-4">
            <button
              data-action="play-now"
              class="btn-touch w-full sm:w-auto px-8 py-4 rounded-full font-semibold text-base sm:text-lg transition-all duration-300 touch-feedback hover:scale-105"
              style="background: white; color: var(--color-bg-dark);"
              onmouseover="this.style.background='var(--color-brand-secondary)'; this.style.color='white';"
              onmouseout="this.style.background='white'; this.style.color='var(--color-bg-dark)';"
            >
              Play Now
            </button>
            <button
              data-action="watch-live"
              class="btn-touch w-full sm:w-auto px-8 py-4 rounded-full font-semibold text-base sm:text-lg transition-all duration-300 touch-feedback"
              style="border: 2px solid rgba(255, 255, 255, 0.2); color: white; background: transparent;"
            >
              Watch Live
            </button>
            ${this.state.isAuthenticated ? '' : `
              <button
                data-action="guest-cta"
                class="btn-touch w-full sm:w-auto px-8 py-4 rounded-full font-semibold text-base sm:text-lg transition-all duration-300 touch-feedback"
                style="background: rgba(255, 255, 255, 0.08); color: white; border: 1px solid rgba(255, 255, 255, 0.2);"
              >
                Play as Guest
              </button>
            `}
          </div>

          <!-- Minimal game preview - Mobile Adapted -->
          <div class="relative max-w-sm sm:max-w-md mx-auto mb-8 sm:mb-12">
            <div class="glass-panel-mobile sm:glass-panel sm:p-8" style="border: 1px solid rgba(255, 255, 255, 0.1);">
              <div class="relative aspect-[3/2] rounded-xl sm:rounded-2xl overflow-hidden" style="background: var(--color-bg-dark); border: 1px solid rgba(255, 255, 255, 0.1);">
                <!-- Center line -->
                <div class="absolute inset-y-4 sm:inset-y-8 left-1/2 w-px" style="background: rgba(255, 255, 255, 0.2);"></div>
                
                <!-- Paddles -->
                <div class="absolute left-2 sm:left-4 top-1/2 h-8 sm:h-12 w-1 rounded-full animate-pong-paddle-left" style="background: var(--color-brand-secondary);"></div>
                <div class="absolute right-2 sm:right-4 top-1/2 h-8 sm:h-12 w-1 rounded-full animate-pong-paddle-right" style="background: var(--color-brand-accent);"></div>
                
                <!-- Ball -->
                <div class="absolute left-1/2 top-1/2 h-1.5 w-1.5 sm:h-2 sm:w-2 bg-white rounded-full animate-pong-ball glow-primary"></div>
                
                <!-- Score -->
                <div class="absolute top-2 sm:top-4 left-0 right-0 text-center text-xs font-mono" style="color: rgba(255, 255, 255, 0.6);">
                  Live Preview
                </div>
              </div>
              <div class="mt-3 sm:mt-4 text-center text-xs" style="color: rgba(255, 255, 255, 0.4);">
                Real-time gameplay powered by WebSockets
              </div>
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 mt-12 sm:mt-16 px-4">
            <div class="text-center p-6 rounded-xl transition-all touch-feedback" style="border: 1px solid rgba(255, 255, 255, 0.1);">
              <div class="text-3xl sm:text-4xl mb-3">⚡</div>
              <h3 class="font-semibold mb-2 text-sm sm:text-base" style="color: var(--color-text-primary);">Real-time Multiplayer</h3>
              <p class="text-xs sm:text-sm" style="color: var(--color-text-muted);">Play against friends or matchmake with players worldwide</p>
            </div>
            <div class="text-center p-6 rounded-xl transition-all touch-feedback" style="border: 1px solid rgba(255, 255, 255, 0.1);">
              <div class="text-3xl sm:text-4xl mb-3">
                <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" width="48" height="48" fill="currentColor" style="display: inline-block;"><path d="M96 1.2H32v9.9h64V1.2zm31.7 12.3h-34l-93.4.2S-1.4 31.4 3 43.5c3.7 10.1 15 16.3 15 16.3l-4.1 5.4 5.4 2.7 5.4-9.5S10.4 49.8 7 42.1C3.7 34.5 4.3 19 4.3 19h30.4c.2 5.2 0 13.5-1.7 21.7-1.9 9.1-6.6 19.6-10.1 21.1 7.7 10.7 22.3 19.9 29 19.7 0 6.2.3 18-6.7 23.6-7 5.6-10.8 13.6-10.8 13.6h-6.7v8.1h72.9v-8.1h-6.7s-3.8-8-10.8-13.6c-7-5.6-6.7-17.4-6.7-23.6 6.8.2 21.4-8.8 29.1-19.5-3.6-1.4-8.3-12.2-10.2-21.2-1.7-8.2-1.8-16.5-1.7-21.7h29.1s1.4 15.4-1.9 23-17.4 16.3-17.4 16.3l5.5 9.5L114 65l-4.1-5.4s11.3-6.2 15-16.3c4.5-12.1 2.8-29.8 2.8-29.8z"/></svg>
              </div>
              <h3 class="font-semibold mb-2 text-sm sm:text-base" style="color: var(--color-text-primary);">Tournaments</h3>
              <p class="text-xs sm:text-sm" style="color: var(--color-text-muted);">Compete in tournaments and climb the leaderboard</p>
            </div>
            <div class="text-center p-6 rounded-xl transition-all touch-feedback" style="border: 1px solid rgba(255, 255, 255, 0.1);">
              <div class="text-3xl sm:text-4xl mb-3">📊</div>
              <h3 class="font-semibold mb-2 text-sm sm:text-base" style="color: var(--color-text-primary);">Stats & Analytics</h3>
              <p class="text-xs sm:text-sm" style="color: var(--color-text-muted);">Track your progress with detailed statistics</p>
            </div>
          </div>
        </div>
      </section>

      <!-- Footer - Mobile Optimized -->
      <footer class="relative px-4 sm:px-6 py-8 sm:py-16 safe-area-bottom">
        <div class="max-w-4xl mx-auto text-center">
          <div class="space-y-3 sm:space-y-4 mb-6 sm:mb-8">
            <h2 class="text-2xl sm:text-3xl font-light" style="color: var(--color-text-primary);">Ready to compete?</h2>
            <p class="px-4" style="color: var(--color-text-secondary);">Join the most precise Pong experience ever created.</p>
          </div>
          <div class="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              data-action="register-footer"
              class="btn-touch w-full sm:w-auto px-8 py-3 rounded-full font-medium transition touch-feedback"
              style="background: var(--color-brand-primary); color: white;"
            >
              Create Free Account
            </button>
            <button
              data-action="login-footer"
              class="btn-touch w-full sm:w-auto px-8 py-3 rounded-full font-medium transition touch-feedback"
              style="border: 1px solid rgba(255, 255, 255, 0.2); color: white;"
            >
              Sign In
            </button>
          </div>
        </div>
      </footer>
      ${this.renderGuestModal()}
    `;
  }

  protected attachEventListeners(): void {
    this.subscriptions.forEach(unsub => unsub());
    this.subscriptions = [];

    if (!this.element) return;

    // Navigation to login
    const loginBtns = this.element.querySelectorAll('[data-action="login"], [data-action="login-footer"]');
    loginBtns.forEach(btn => {
      const handler = (e: Event) => {
        e.preventDefault();
        navigate('/auth/login');
      };
      btn.addEventListener('click', handler);
      this.subscriptions.push(() => btn.removeEventListener('click', handler));
    });

    // Navigation to signup
    const registerBtns = this.element.querySelectorAll('[data-action="register"], [data-action="register-footer"]');
    registerBtns.forEach(btn => {
      const handler = (e: Event) => {
        e.preventDefault();
        navigate('/auth/signup');
      };
      btn.addEventListener('click', handler);
      this.subscriptions.push(() => btn.removeEventListener('click', handler));
    });

    // Dashboard button (authenticated users)
    const dashboardBtn = this.element.querySelector('[data-action="dashboard"]');
    if (dashboardBtn) {
      const handler = (e: Event) => {
        e.preventDefault();
        navigate('/dashboard');
      };
      dashboardBtn.addEventListener('click', handler);
      this.subscriptions.push(() => dashboardBtn.removeEventListener('click', handler));
    }

    // Logout button (authenticated users)
    const logoutBtn = this.element.querySelector('[data-action="logout"]');
    if (logoutBtn) {
      const handler = async (e: Event) => {
        e.preventDefault();
        await authService.logout();
        // Page will re-render automatically via appState.auth subscription
      };
      logoutBtn.addEventListener('click', handler);
      this.subscriptions.push(() => logoutBtn.removeEventListener('click', handler));
    }

    // Play button
    const playBtn = this.element.querySelector('[data-action="play-now"]');
    if (playBtn) {
      const handler = () => {
        if (this.state.isAuthenticated) {
          navigate('/game/create');
        } else if (this.state.guestAlias) {
          navigate('/game/local');
        } else {
          this.openGuestModal();
        }
      };
      playBtn.addEventListener('click', handler);
      this.subscriptions.push(() => playBtn.removeEventListener('click', handler));
    }

    // Watch live button
    const watchBtn = this.element.querySelector('[data-action="watch-live"]');
    if (watchBtn) {
      const handler = () => {
        // TODO: Navigate to live matches when ready
        console.log('Watch live matches - TODO: implement matches route');
      };
      watchBtn.addEventListener('click', handler);
      this.subscriptions.push(() => watchBtn.removeEventListener('click', handler));
    }

    // Guest CTA buttons
    const guestCtas = this.element.querySelectorAll('[data-action="guest-cta"]');
    guestCtas.forEach(btn => {
      const handler = (e: Event) => {
        e.preventDefault();
        this.openGuestModal();
      };
      btn.addEventListener('click', handler);
      this.subscriptions.push(() => btn.removeEventListener('click', handler));
    });

    // Guest alias form
    const guestForm = this.element.querySelector('[data-action="guest-alias-form"]') as HTMLFormElement | null;
    if (guestForm) {
      const handler = (event: Event) => {
        event.preventDefault();
        const formData = new FormData(guestForm);
        const alias = (formData.get('alias') as string) ?? '';
        this.handleGuestAliasSubmit(alias);
      };
      guestForm.addEventListener('submit', handler);
      this.subscriptions.push(() => guestForm.removeEventListener('submit', handler));
    }

    // Guest modal close buttons
    const guestCloseButtons = this.element.querySelectorAll('[data-action="guest-modal-close"]');
    guestCloseButtons.forEach(btn => {
      const handler = (event: Event) => {
        event.preventDefault();
        this.closeGuestModal();
      };
      btn.addEventListener('click', handler);
      this.subscriptions.push(() => btn.removeEventListener('click', handler));
    });

    // Guest overlay click closes modal when hitting backdrop
    const guestOverlay = this.element.querySelector('[data-role="guest-overlay"]');
    if (guestOverlay) {
      const handler = (event: Event) => {
        if (event.target === guestOverlay) {
          this.closeGuestModal();
        }
      };
      guestOverlay.addEventListener('click', handler);
      this.subscriptions.push(() => guestOverlay.removeEventListener('click', handler));
    }

    // Guest switch/reset actions
    const guestSwitchBtn = this.element.querySelector('[data-action="guest-switch"]');
    if (guestSwitchBtn) {
      const handler = (event: Event) => {
        event.preventDefault();
        this.openGuestModal(this.state.guestAlias ?? undefined);
      };
      guestSwitchBtn.addEventListener('click', handler);
      this.subscriptions.push(() => guestSwitchBtn.removeEventListener('click', handler));
    }

    const guestResetBtn = this.element.querySelector('[data-action="guest-reset"]');
    if (guestResetBtn) {
      const handler = (event: Event) => {
        event.preventDefault();
        guestSessionService.clearSession();
        this.setState({ guestAlias: null });
      };
      guestResetBtn.addEventListener('click', handler);
      this.subscriptions.push(() => guestResetBtn.removeEventListener('click', handler));
    }

    // Touch device detection
    if ('ontouchstart' in window || navigator.maxTouchPoints > 0) {
      document.body.classList.add('touch-device');
    }
  }
}
