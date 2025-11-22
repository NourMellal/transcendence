import Component from '../../../../core/Component';
import { navigate } from '../../../../routes';

type Props = {};
type State = {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
  isLoading: boolean;
  error: string | null;
  success: boolean;
};

export default class SignupPage extends Component<Props, State> {
  constructor(props: Props = {}) {
    super(props);
  }

  getInitialState(): State {
    return {
      username: '',
      email: '',
      password: '',
      confirmPassword: '',
      isLoading: false,
      error: null,
      success: false,
    };
  }

  render() {
    const { isLoading, error, success } = this.state;
    
    return `
      <div class="relative min-h-screen flex items-center justify-center mobile-xs-px-4 px-4 sm:px-6 py-8 landscape-mobile-adjust safe-area-inset">
        <!-- Cyberpunk background -->
        <div class="absolute inset-0 bg-gradient-to-br from-[var(--color-bg-dark)] via-[var(--color-bg-dark)] to-[var(--color-bg-darker)]">
          <div class="absolute inset-0 cyberpunk-radial-bg"></div>
        </div>

        <div class="relative w-full max-w-md mobile-container">
          <!-- Header -->
          <div class="text-center mb-6 sm:mb-8">
            <h1 class="text-responsive-title sm:text-4xl font-bold mb-2" style="color: var(--color-text-primary);">
              Join Transcendence
            </h1>
            <p class="text-base sm:text-lg mobile-xs-px-4" style="color: var(--color-text-secondary)">Create your account and start your journey</p>
          </div>

          <!-- Form container -->
          <div class="glass-panel mobile-card-spacing sm:p-8">
            ${error ? `
            <div class="mb-4 p-4 rounded-lg" style="background: rgba(255, 0, 58, 0.1); border: 1px solid rgba(255, 0, 58, 0.3); color: var(--color-error)">
              <div class="flex items-center gap-2">
                <span>⚠</span>
                <span>${error}</span>
              </div>
            </div>
            ` : ''}

            ${success ? `
            <div class="mb-4 p-4 rounded-lg" style="background: rgba(0, 255, 136, 0.1); border: 1px solid rgba(0, 255, 136, 0.3); color: var(--color-success)">
              <div class="flex items-center gap-2">
                <span>✓</span>
                <span>Account created successfully!</span>
              </div>
            </div>
            ` : ''}

            ${isLoading ? `
            <div class="mb-4 p-4 rounded-lg" style="background: rgba(0, 217, 255, 0.1); border: 1px solid rgba(0, 217, 255, 0.2); color: var(--color-primary)">
              <div class="flex items-center gap-3">
                <div class="animate-spin rounded-full h-5 w-5 border-b-2" style="border-color: var(--color-primary)"></div>
                <span>Creating your account...</span>
              </div>
            </div>
            ` : ''}

            <form class="space-y-4 sm:space-y-5" data-form="signup">
              <!-- Username -->
              <div>
                <label for="username" class="block text-sm font-medium mb-2" style="color: var(--color-text-secondary)">
                  Username
                </label>
                <input
                  type="text"
                  id="username"
                  name="username"
                  class="input-touch glass-input w-full px-4 py-3 rounded-xl"
                  placeholder="Choose a username"
                  required
                  minlength="3"
                  maxlength="20"
                >
              </div>

              <!-- Email -->
              <div>
                <label for="email" class="block text-sm font-medium mb-2" style="color: var(--color-text-secondary)">
                  Email
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  class="input-touch glass-input w-full px-4 py-3 rounded-xl"
                  placeholder="your.email@example.com"
                  required
                >
              </div>

              <!-- Password -->
              <div>
                <label for="password" class="block text-sm font-medium mb-2" style="color: var(--color-text-secondary)">
                  Password
                </label>
                <input
                  type="password"
                  id="password"
                  name="password"
                  class="input-touch glass-input w-full px-4 py-3 rounded-xl"
                  placeholder="Create a strong password"
                  required
                  minlength="8"
                >
                <p class="text-xs mt-1" style="color: var(--color-text-muted)">At least 8 characters</p>
              </div>

              <!-- Confirm Password -->
              <div>
                <label for="confirmPassword" class="block text-sm font-medium mb-2" style="color: var(--color-text-secondary)">
                  Confirm Password
                </label>
                <input
                  type="password"
                  id="confirmPassword"
                  name="confirmPassword"
                  class="input-touch glass-input w-full px-4 py-3 rounded-xl"
                  placeholder="Confirm your password"
                  required
                >
              </div>

              <!-- Submit Button -->
              <button
                type="submit"
                class="btn-touch w-full py-3 sm:py-4 rounded-xl font-semibold text-base sm:text-lg transition-all duration-300 touch-feedback"
                style="background: white; color: var(--color-bg-dark);"
                onmouseover="this.style.background='var(--color-brand-secondary)'; this.style.color='white';"
                onmouseout="this.style.background='white'; this.style.color='var(--color-bg-dark)';"
                ${isLoading ? 'disabled' : ''}
              >
                ${isLoading ? 'Creating Account...' : 'Create Account'}
              </button>

              <!-- OAuth Button -->
              <button
                type="button"
                data-action="oauth42"
                class="btn-touch w-full py-3 sm:py-4 rounded-xl font-semibold text-base sm:text-lg transition-all duration-300 touch-feedback"
                style="border: 2px solid rgba(255, 255, 255, 0.2); color: white; background: rgba(255, 255, 255, 0.05);"
              >
                <div class="flex items-center justify-center gap-3">
                  <img src="/assets/images/42logo.png" alt="42 Logo" style="width: 24px; height: 24px; object-fit: contain;" />
                  <span>Sign up with 42</span>
                </div>
              </button>
            </form>

            <!-- Footer -->
            <div class="mt-6 text-center">
              <p class="text-sm" style="color: var(--color-text-secondary)">
                Already have an account?
                <button data-action="go-login" class="font-semibold hover:underline transition" style="color: var(--color-primary)">Sign in</button>
              </p>
            </div>
          </div>

          <!-- Back to Home -->
          <div class="mt-6 text-center">
            <button data-action="go-home" class="text-sm hover:underline transition touch-feedback" style="color: var(--color-text-muted)">
              ← Back to Home
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
    const form = this.element.querySelector('[data-form="signup"]') as HTMLFormElement | null;
    if (form) {
      const handler = (e: Event) => {
        e.preventDefault();
        this.handleSignup();
      };
      form.addEventListener('submit', handler);
      this.subscriptions.push(() => form.removeEventListener('submit', handler));
    }

    // OAuth 42
    const oauth42Btn = this.element.querySelector('[data-action="oauth42"]') as HTMLButtonElement | null;
    if (oauth42Btn) {
      const handler = () => {
        // TODO: Implement OAuth flow
        console.log('OAuth 42 signup - TODO: implement');
      };
      oauth42Btn.addEventListener('click', handler);
      this.subscriptions.push(() => oauth42Btn.removeEventListener('click', handler));
    }

    // Go to login
    const loginBtn = this.element.querySelector('[data-action="go-login"]') as HTMLButtonElement | null;
    if (loginBtn) {
      const handler = (e: Event) => {
        e.preventDefault();
        navigate('/auth/login');
      };
      loginBtn.addEventListener('click', handler);
      this.subscriptions.push(() => loginBtn.removeEventListener('click', handler));
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

  private handleSignup(): void {
    const usernameInput = this.element?.querySelector('#username') as HTMLInputElement;
    const emailInput = this.element?.querySelector('#email') as HTMLInputElement;
    const passwordInput = this.element?.querySelector('#password') as HTMLInputElement;
    const confirmPasswordInput = this.element?.querySelector('#confirmPassword') as HTMLInputElement;

    if (!usernameInput || !emailInput || !passwordInput || !confirmPasswordInput) return;

    const username = usernameInput.value.trim();
    const email = emailInput.value.trim();
    const password = passwordInput.value;
    const confirmPassword = confirmPasswordInput.value;

    // Validation
    if (!username || !email || !password || !confirmPassword) {
      this.setState({ error: 'Please fill in all fields' });
      return;
    }

    if (username.length < 3) {
      this.setState({ error: 'Username must be at least 3 characters' });
      return;
    }

    if (password.length < 8) {
      this.setState({ error: 'Password must be at least 8 characters' });
      return;
    }

    if (password !== confirmPassword) {
      this.setState({ error: 'Passwords do not match' });
      return;
    }

    // TODO: Implement actual signup logic
    console.log('Signup attempt:', { username, email, password: '***' });
    
    this.setState({ 
      isLoading: true,
      error: null 
    });

    // Simulate API call
    setTimeout(() => {
      this.setState({ 
        isLoading: false,
        success: true,
        error: null
      });
    }, 1500);
  }
}
