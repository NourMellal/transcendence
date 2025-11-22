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
    super('div', 'login-form min-h-screen flex items-center justify-center px-4 sm:px-6 safe-area-inset');
    
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
      <div class="absolute inset-0 cyberpunk-radial-bg"></div>

      <div class="relative max-w-md w-full">
        <!-- Header -->
        <div class="text-center mb-6 sm:mb-8">
          <h1 class="text-3xl sm:text-4xl font-light tracking-tight mb-2 neon-text-gradient">Welcome Back</h1>
          <p class="text-base" style="color: var(--color-text-secondary)">Sign in to your Transcendence account</p>
        </div>

        <!-- Login Form -->
        <div class="glass-panel p-6 sm:p-8 rounded-2xl">
          <!-- Error Message -->
          <div class="error-message hidden px-4 py-3 rounded-lg mb-4" style="background: rgba(255, 7, 58, 0.1); border: 1px solid rgba(255, 7, 58, 0.2); color: var(--color-error);"></div>
          
          <!-- Loading Message -->
          <div class="loading-message hidden px-4 py-3 rounded-lg mb-4" style="background: rgba(0, 179, 217, 0.1); border: 1px solid rgba(0, 179, 217, 0.2); color: var(--color-brand-secondary);">
            <div class="flex items-center">
              <div class="animate-spin rounded-full h-4 w-4 border-b-2 mr-3" style="border-color: var(--color-brand-secondary);"></div>
              Signing you in...
            </div>
          </div>

          <form class="space-y-4 sm:space-y-5">
            <!-- Email Field -->
            <div class="space-y-2">
              <label for="email" class="block text-sm font-medium" style="color: var(--color-text-secondary);">Email</label>
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
              <label for="password" class="block text-sm font-medium" style="color: var(--color-text-secondary);">Password</label>
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
              <label for="twofa" class="block text-sm font-medium" style="color: var(--color-text-secondary);">Two-Factor Code</label>
              <input 
                type="text" 
                id="twofa" 
                name="twofa"
                class="input-touch glass-input w-full px-4 py-3 rounded-xl transition-all font-mono text-center tracking-widest"
                placeholder="000000"
                maxlength="6"
              >
              <p class="text-xs text-center" style="color: var(--color-text-muted);">Enter the 6-digit code from your authenticator app</p>
            </div>

            <!-- Submit Button -->
            <button 
              type="submit"
              class="btn-primary btn-touch w-full py-3 px-6 rounded-xl font-medium transition-all duration-200 hover:scale-[1.02] touch-feedback disabled:opacity-50 disabled:cursor-not-allowed"
              style="background: var(--color-brand-secondary); color: var(--color-text-primary); box-shadow: var(--shadow-neon);"
            >
              Sign In
            </button>
          </form>

          <!-- Divider -->
          <div class="relative my-5 sm:my-6">
            <div class="absolute inset-0 flex items-center">
              <div class="w-full border-t" style="border-color: var(--color-panel-border);"></div>
            </div>
            <div class="relative flex justify-center text-xs">
              <span class="px-4" style="background: var(--color-bg-dark); color: var(--color-text-muted);">Or continue with</span>
            </div>
          </div>

          <!-- 42 OAuth Button -->
          <button 
            type="button"
            class="oauth-button btn-touch w-full py-3 px-6 rounded-xl transition-all duration-200 touch-feedback glass-card"
            style="color: var(--color-text-primary);"
          >
            <div class="flex items-center justify-center">
              <svg class="w-5 h-5 mr-3" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0c-6.627 0-12 5.373-12 12 0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 22.954 24 17.99 24 12c0-6.627-5.373-12-12-12z"/>
              </svg>
              <span class="hidden sm:inline">Sign in with 42 School</span>
              <span class="sm:hidden">42 School Login</span>
            </div>
          </button>

          <!-- Register Link -->
          <div class="text-center pt-4">
            <p class="text-sm" style="color: var(--color-text-secondary);">
              New to Transcendence? 
              <a href="#" class="register-link font-medium transition-colors" style="color: var(--color-brand-secondary);">Create Account</a>
            </p>
          </div>
        </div>

        <!-- Back to Home -->
        <div class="text-center mt-4 sm:mt-6">
          <a href="#" class="home-link text-sm transition-colors" style="color: var(--color-text-muted);">
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
      input.classList.add('ring-1');
      input.style.borderColor = 'rgb(255, 7, 58)';
      input.style.setProperty('--tw-ring-color', 'rgb(255, 7, 58)');
    } else {
      input.classList.remove('ring-1');
      input.style.borderColor = '';
      input.style.removeProperty('--tw-ring-color');
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