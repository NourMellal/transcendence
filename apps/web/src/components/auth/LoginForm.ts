import { Component } from '../base/Component';
import { authManager } from '../../utils/auth';
import { validateEmail, validatePassword, validate2FACode, getErrorMessage } from '../../utils';

/**
 * Login Form Component
 */
export class LoginForm extends Component {
  private emailInput!: HTMLInputElement;
  private passwordInput!: HTMLInputElement;
  private twoFAInput!: HTMLInputElement;
  private submitButton!: HTMLButtonElement;
  private errorDiv!: HTMLElement;
  private loadingDiv!: HTMLElement;
  private twoFASection!: HTMLElement;
  private show2FA = false;

  constructor() {
    super('div', 'login-form bg-brand-dark text-white min-h-screen flex items-center justify-center mobile-xs-px-4 px-6 landscape-mobile-adjust safe-area-inset');
    
    // Add touch device detection
    this.detectTouchDevice();
  }

  private detectTouchDevice(): void {
    // Add touch device class for CSS targeting
    if ('ontouchstart' in window || navigator.maxTouchPoints > 0) {
      document.body.classList.add('touch-device');
    }
  }

  protected render(): void {
    this.element.innerHTML = `
      <!-- Background with cyberpunk gradient -->
      <div class="absolute inset-0 bg-gradient-to-br from-brand-dark via-brand-dark to-brand-dark">
        <div class="absolute inset-0 cyberpunk-radial-bg"></div>
      </div>

      <div class="relative max-w-md w-full mobile-container">
        <!-- Header -->
        <div class="text-center mb-6 sm:mb-8">
          <h1 class="text-responsive-title sm:text-3xl font-light tracking-tight mb-2 text-text-primary">Welcome Back</h1>
          <p class="text-text-secondary mobile-xs-px-4">Sign in to your Transcendence account</p>
        </div>

        <!-- Login Form -->
        <div class="glass-panel-mobile sm:glass-panel sm:p-8 border border-panel-border mobile-card-spacing">
          <!-- Error Message -->
          <div class="error-message hidden bg-error/10 border border-error/20 text-error px-4 py-3 rounded-lg mb-4"></div>
          
          <!-- Loading Message -->
          <div class="loading-message hidden bg-brand-primary/10 border border-brand-primary/20 text-brand-secondary px-4 py-3 rounded-lg mb-4">
            <div class="flex items-center">
              <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-brand-secondary mr-3"></div>
              Signing you in...
            </div>
          </div>

          <form class="space-y-4 sm:space-y-5">
            <!-- Email Field -->
            <div class="space-y-2">
              <label for="email" class="block text-sm font-medium text-text-secondary">Email</label>
              <input 
                type="email" 
                id="email" 
                name="email"
                class="input-touch glass-input w-full px-4 py-3 rounded-xl transition-all"
                placeholder="your.email@example.com"
                required
              >
            </div>

            <!-- Password Field -->
            <div class="space-y-2">
              <label for="password" class="block text-sm font-medium text-text-secondary">Password</label>
              <input 
                type="password" 
                id="password" 
                name="password"
                class="input-touch glass-input w-full px-4 py-3 rounded-xl transition-all"
                placeholder="Enter your password"
                required
              >
            </div>

            <!-- 2FA Section -->
            <div class="two-fa-section hidden space-y-2">
              <label for="twofa" class="block text-sm font-medium text-text-secondary">Two-Factor Code</label>
              <input 
                type="text" 
                id="twofa" 
                name="twofa"
                class="input-touch glass-input w-full px-4 py-3 rounded-xl transition-all font-mono text-center tracking-widest"
                placeholder="000000"
                maxlength="6"
              >
              <p class="text-xs text-text-muted text-center">Enter the 6-digit code from your authenticator app</p>
            </div>

            <!-- Submit Button -->
            <button 
              type="submit"
              class="btn-primary btn-touch w-full py-3 px-6 rounded-xl font-medium focus:outline-none focus:ring-2 focus:ring-brand-secondary/50 focus:ring-offset-2 focus:ring-offset-brand-dark disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 hover:scale-[1.02] touch-feedback"
            >
              Sign In
            </button>
          </form>

          <!-- Divider -->
          <div class="relative my-5 sm:my-6">
            <div class="absolute inset-0 flex items-center">
              <div class="w-full border-t border-panel-border"></div>
            </div>
            <div class="relative flex justify-center text-xs">
              <span class="px-4 bg-brand-dark text-text-muted">Or continue with</span>
            </div>
          </div>

          <!-- 42 OAuth Button -->
          <button 
            type="button"
            class="oauth-button btn-touch w-full bg-panel-bg text-text-primary py-3 px-6 rounded-xl border border-panel-border hover:bg-panel-bg hover:border-panel-border focus:outline-none focus:ring-2 focus:ring-brand-secondary/50 focus:ring-offset-2 focus:ring-offset-brand-dark transition-all duration-200 touch-feedback"
          >
            <div class="flex items-center justify-center">
              <img src="/assets/images/42logo.png" alt="42 School" class="w-5 h-5 mr-3">
              <span class="hidden sm:inline">Sign in with 42 School</span>
              <span class="sm:hidden">42 School Login</span>
            </div>
          </button>

          <!-- Register Link -->
          <div class="text-center pt-4">
            <p class="text-sm text-text-secondary">
              New to Transcendence? 
              <a href="#" class="register-link text-brand-secondary hover:text-text-primary font-medium transition-colors">Create Account</a>
            </p>
          </div>
        </div>

        <!-- Back to Home -->
        <div class="text-center mt-4 sm:mt-6">
          <a href="#" class="home-link text-sm text-text-muted hover:text-text-secondary transition-colors">
            ← Back to Home
          </a>
        </div>
      </div>
    `;

    this.initializeElements();
    this.attachEventListeners();
  }

  private initializeElements(): void {
    this.emailInput = this.element.querySelector('#email') as HTMLInputElement;
    this.passwordInput = this.element.querySelector('#password') as HTMLInputElement;
    this.twoFAInput = this.element.querySelector('#twofa') as HTMLInputElement;
    this.submitButton = this.element.querySelector('button[type="submit"]') as HTMLButtonElement;
    this.errorDiv = this.element.querySelector('.error-message') as HTMLElement;
    this.loadingDiv = this.element.querySelector('.loading-message') as HTMLElement;
    this.twoFASection = this.element.querySelector('.two-fa-section') as HTMLElement;
  }

  private attachEventListeners(): void {
    // Form submission
    const form = this.element.querySelector('form') as HTMLFormElement;
    this.addEventListener(form, 'submit', this.handleSubmit.bind(this));

    // 42 OAuth login
    const oauthButton = this.element.querySelector('.oauth-button') as HTMLButtonElement;
    this.addEventListener(oauthButton, 'click', this.handle42Login.bind(this));

    // Register link
    const registerLink = this.element.querySelector('.register-link') as HTMLAnchorElement;
    this.addEventListener(registerLink, 'click', (e) => {
      e.preventDefault();
      this.onRegisterClick?.();
    });

    // Back to home link
    const homeLink = this.element.querySelector('.home-link') as HTMLAnchorElement;
    this.addEventListener(homeLink, 'click', (e) => {
      e.preventDefault();
      this.onHomeClick?.();
    });

    // Real-time validation
    this.addEventListener(this.emailInput, 'blur', this.validateEmailField.bind(this));
    this.addEventListener(this.passwordInput, 'blur', this.validatePasswordField.bind(this));
    this.addEventListener(this.twoFAInput, 'input', this.validate2FAField.bind(this));
  }

  private async handleSubmit(e: Event): Promise<void> {
    e.preventDefault();
    
    const email = this.emailInput.value.trim();
    const password = this.passwordInput.value;
    const twoFACode = this.show2FA ? this.twoFAInput.value.trim() : undefined;

    // Validate inputs
    const emailValidation = validateEmail(email);
    const passwordValidation = validatePassword(password);
    let twoFAValidation = { isValid: true, errors: [] as string[] };
    
    if (this.show2FA && twoFACode) {
      twoFAValidation = validate2FACode(twoFACode);
    }

    if (!emailValidation.isValid || !passwordValidation.isValid || !twoFAValidation.isValid) {
      const allErrors = [...emailValidation.errors, ...passwordValidation.errors, ...twoFAValidation.errors];
      this.showError(allErrors.join(', '));
      return;
    }

    try {
      this.setLoading(true);
      this.hideError();

      await authManager.login(email, password, twoFACode);
      
      // Login successful
      this.onLoginSuccess?.();
      
    } catch (error) {
      const errorMessage = getErrorMessage(error);
      
      // Check if it's a 2FA required error
      if (errorMessage.toLowerCase().includes('2fa') || errorMessage.toLowerCase().includes('two-factor')) {
        this.show2FA = true;
        this.twoFASection.classList.remove('hidden');
        this.twoFAInput.focus();
        this.showError('Please enter your 2FA code');
      } else {
        this.showError(errorMessage);
      }
    } finally {
      this.setLoading(false);
    }
  }

  private async handle42Login(): Promise<void> {
    try {
      await authManager.start42Login();
    } catch (error) {
      this.showError(getErrorMessage(error));
    }
  }

  private validateEmailField(): void {
    const validation = validateEmail(this.emailInput.value.trim());
    this.setFieldError(this.emailInput, validation.errors[0]);
  }

  private validatePasswordField(): void {
    const validation = validatePassword(this.passwordInput.value);
    this.setFieldError(this.passwordInput, validation.errors[0]);
  }

  private validate2FAField(): void {
    if (this.show2FA && this.twoFAInput.value) {
      const validation = validate2FACode(this.twoFAInput.value.trim());
      this.setFieldError(this.twoFAInput, validation.errors[0]);
    }
  }

  private setFieldError(input: HTMLInputElement, error?: string): void {
    if (error) {
      input.classList.add('border-error', 'ring-1', 'ring-error');
      input.classList.remove('border-white/20');
    } else {
      input.classList.remove('border-error', 'ring-1', 'ring-error');
      input.classList.add('border-white/20');
    }
  }

  private showError(message: string): void {
    this.errorDiv.textContent = message;
    this.errorDiv.classList.remove('hidden');
  }

  private hideError(): void {
    this.errorDiv.classList.add('hidden');
  }

  private setLoading(loading: boolean): void {
    if (loading) {
      this.loadingDiv.classList.remove('hidden');
      this.submitButton.disabled = true;
    } else {
      this.loadingDiv.classList.add('hidden');
      this.submitButton.disabled = false;
    }
  }

  // Event callbacks
  public onLoginSuccess?: () => void;
  public onRegisterClick?: () => void;
  public onHomeClick?: () => void;
}