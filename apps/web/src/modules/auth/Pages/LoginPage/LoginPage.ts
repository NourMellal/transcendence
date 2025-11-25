import Component from '../../../../core/Component';
import { navigate } from '../../../../routes';

type Props = {};
type State = {
  email: string;
  password: string;
  twoFACode: string;
  show2FA: boolean;
  isLoading: boolean;
  error: string | null;
};

export default class LoginPage extends Component<Props, State> {
  constructor(props: Props = {}) {
    super(props);
  }

  getInitialState(): State {
    return {
      email: '',
      password: '',
      twoFACode: '',
      show2FA: false,
      isLoading: false,
      error: null,
    };
  }

  render() {
    const { show2FA, isLoading, error } = this.state;
    
    return `
      <div class="relative min-h-screen flex items-center justify-center mobile-xs-px-4 px-4 sm:px-6 landscape-mobile-adjust safe-area-inset">
        <div class="absolute inset-0 bg-gradient-to-br from-[var(--color-bg-dark)] via-[var(--color-bg-dark)] to-[var(--color-bg-darker)]">
          <div class="absolute inset-0 cyberpunk-radial-bg"></div>
        </div>

        <div class="relative max-w-md w-full mobile-container">
          <div class="text-center mb-6 sm:mb-8">
            <h1 class="text-responsive-title sm:text-4xl font-light tracking-tight mb-2" style="color: var(--color-text-primary);">Welcome Back</h1>
            <p class="text-base sm:text-lg mobile-xs-px-4" style="color: var(--color-text-secondary)">Sign in to your Transcendence account</p>
          </div>

          <div class="glass-panel mobile-card-spacing sm:p-8">
            ${error ? `
            <div class="px-4 py-3 rounded-lg mb-4" style="background: rgba(255, 7, 58, 0.1); border: 1px solid rgba(255, 7, 58, 0.2); color: var(--color-error)">
              ${error}
            </div>
            ` : ''}
            
            ${isLoading ? `
            <div class="border px-4 py-3 rounded-lg mb-4" style="background: rgba(0, 217, 255, 0.1); border-color: rgba(0, 217, 255, 0.2); color: var(--color-primary)">
              <div class="flex items-center gap-3">
                <div class="animate-spin rounded-full h-4 w-4 border-b-2" style="border-color: var(--color-primary)"></div>
                <span>Signing you in...</span>
              </div>
            </div>
            ` : ''}

            <form class="space-y-4 sm:space-y-5" data-form="login">
              <!-- Email Field -->
              <div class="space-y-2">
                <label for="email" class="block text-sm font-medium" style="color: var(--color-text-secondary)">Email</label>
                <input 
                  type="email" 
                  id="email" 
                  name="email"
                  class="input-touch glass-input w-full px-4 py-3 rounded-xl"
                  placeholder="your.email@example.com"
                  required
                >
              </div>

              <!-- Password Field -->
              <div class="space-y-2">
                <label for="password" class="block text-sm font-medium" style="color: var(--color-text-secondary)">Password</label>
                <input 
                  type="password" 
                  id="password" 
                  name="password"
                  class="input-touch glass-input w-full px-4 py-3 rounded-xl"
                  placeholder="Enter your password"
                  required
                >
              </div>

              <!-- 2FA Section -->
              ${show2FA ? `
              <div class="space-y-2">
                <label for="twofa" class="block text-sm font-medium" style="color: var(--color-text-secondary)">Two-Factor Code</label>
                <input 
                  type="text" 
                  id="twofa" 
                  name="twofa"
                  class="input-touch glass-input w-full px-4 py-3 rounded-xl font-mono text-center tracking-widest"
                  placeholder="000000"
                  maxlength="6"
                >
                <p class="text-xs text-center" style="color: var(--color-text-muted)">Enter the 6-digit code from your authenticator app</p>
              </div>
              ` : ''}

              <!-- Submit Button -->
              <button 
                type="submit"
                class="btn-touch w-full py-3 sm:py-4 rounded-xl font-semibold text-base sm:text-lg transition-all duration-300 touch-feedback"
                style="background: white; color: var(--color-bg-dark);"
                onmouseover="this.style.background='var(--color-brand-secondary)'; this.style.color='white';"
                onmouseout="this.style.background='white'; this.style.color='var(--color-bg-dark)';"
                ${isLoading ? 'disabled' : ''}
              >
                ${isLoading ? 'Signing In...' : 'Sign In'}
              </button>

              <!-- 42 OAuth Button -->
              <button 
                type="button"
                data-action="oauth42"
                class="btn-touch w-full py-3 sm:py-4 rounded-xl font-semibold text-base sm:text-lg transition-all duration-300 touch-feedback"
                style="border: 2px solid rgba(255, 255, 255, 0.2); color: white; background: rgba(255, 255, 255, 0.05);"
              >
                <div class="flex items-center justify-center gap-3">
                  <img src="/assets/images/42logo.png" alt="42 Logo" style="width: 24px; height: 24px; object-fit: contain;" />
                  <span>Sign in with 42</span>
                </div>
              </button>
            </form>

            <!-- Footer Links -->
            <div class="mt-6 text-center space-y-2">
              <p class="text-sm" style="color: var(--color-text-secondary)">
                Don't have an account? 
                <button data-action="go-signup" class="font-semibold hover:underline transition" style="color: var(--color-primary)">Sign up</button>
              </p>
              <button data-action="forgot-password" class="text-sm hover:underline transition" style="color: var(--color-text-muted)">
                Forgot your password?
              </button>
            </div>
          </div>

          <!-- Back to Home -->
          <div class="mt-6 text-center">
            <button data-action="go-home" class="text-sm hover:underline transition touch-feedback" style="color: var(--color-text-muted)">
              ← Back to Home
            </button>
          </div>

          <div class="demo-game-cta text-center mt-8">
            <p class="demo-game-text text-sm text-white mb-4">👾 Want to preview the live Pong experience?</p>
            <button id="demoGameButton" type="button" class="demo-game-button inline-flex items-center justify-center px-4 py-2 rounded-xl font-medium touch-feedback"
              style="background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); color: white;">
              Launch realtime demo
            </button>
          </div>
        </div>
      </div>
    `;
  }

  protected attachEventListeners(): void {
    this.subscriptions.forEach(unsub => unsub());
    this.subscriptions = [];

    if (!this.element) return;

    // Form submission
    const form = this.element.querySelector('[data-form="login"]') as HTMLFormElement | null;
    if (form) {
      const handler = (e: Event) => {
        e.preventDefault();
        this.handleLogin();
      };
      form.addEventListener('submit', handler);
      this.subscriptions.push(() => form.removeEventListener('submit', handler));
    }

    // OAuth 42 button
    const oauth42Btn = this.element.querySelector('[data-action="oauth42"]') as HTMLButtonElement | null;
    if (oauth42Btn) {
      const handler = () => {
        console.log('OAuth 42 login');
        // TODO: Implement OAuth flow
      };
      oauth42Btn.addEventListener('click', handler);
      this.subscriptions.push(() => oauth42Btn.removeEventListener('click', handler));
    }

    // Go to signup
    const signupBtn = this.element.querySelector('[data-action="go-signup"]') as HTMLButtonElement | null;
    if (signupBtn) {
      const handler = (e: Event) => {
        e.preventDefault();
        navigate('/auth/signup');
      };
      signupBtn.addEventListener('click', handler);
      this.subscriptions.push(() => signupBtn.removeEventListener('click', handler));
    }

    // Forgot password
    const forgotBtn = this.element.querySelector('[data-action="forgot-password"]') as HTMLButtonElement | null;
    if (forgotBtn) {
      const handler = (e: Event) => {
        e.preventDefault();
        // TODO: Implement forgot password page
        console.log('Navigate to forgot password - TODO: implement');
      };
      forgotBtn.addEventListener('click', handler);
      this.subscriptions.push(() => forgotBtn.removeEventListener('click', handler));
    }

    const demoButton = this.element.querySelector('#demoGameButton') as HTMLButtonElement | null;
    if (demoButton) {
      const handler = () => {
        const demoGameId = 'demo-match';
        window.location.href = `/game?gameId=${encodeURIComponent(demoGameId)}`;
      };
      demoButton.addEventListener('click', handler);
      this.subscriptions.push(() => demoButton.removeEventListener('click', handler));
    }

    // Go to home
    const homeBtn = this.element.querySelector('[data-action="go-home"]') as HTMLButtonElement | null;
    if (homeBtn) {
      const handler = (e: Event) => {
        e.preventDefault();
        navigate('/');
      };
      homeBtn.addEventListener('click', handler);
      this.subscriptions.push(() => homeBtn.removeEventListener('click', handler));
    }

    // Touch device detection
    if ('ontouchstart' in window || navigator.maxTouchPoints > 0) {
      document.body.classList.add('touch-device');
    }
  }

  private handleLogin(): void {
    const emailInput = this.element?.querySelector('#email') as HTMLInputElement;
    const passwordInput = this.element?.querySelector('#password') as HTMLInputElement;
    const twoFAInput = this.element?.querySelector('#twofa') as HTMLInputElement;

    if (!emailInput || !passwordInput) return;

    const email = emailInput.value.trim();
    const password = passwordInput.value;
    const twoFA = twoFAInput?.value || '';

    // Basic validation
    if (!email || !password) {
      this.setState({ error: 'Please fill in all fields' });
      return;
    }

    // TODO: Implement actual login logic
    console.log('Login attempt:', { email, password: '***', twoFA });
    
    this.setState({ 
      isLoading: true,
      error: null 
    });

    // Simulate API call
    setTimeout(() => {
      this.setState({ 
        isLoading: false,
        error: 'Login not yet implemented - TODO: Connect to backend'
      });
    }, 1500);
  }
}
