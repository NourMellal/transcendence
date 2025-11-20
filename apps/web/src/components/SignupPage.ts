import { Component } from './base/Component';
import { Router } from '../core/Router';
import { authManager } from '../utils/auth';
import { validateEmail, validatePassword, validateUsername, getErrorMessage } from '../utils';

/**
 * Signup Page Component with Clean Gaming Theme
 * Matches HomePage and LoginPage design identity
 */
export class SignupPage extends Component {
  private usernameInput!: HTMLInputElement;
  private emailInput!: HTMLInputElement;
  private passwordInput!: HTMLInputElement;
  private confirmPasswordInput!: HTMLInputElement;
  private submitButton!: HTMLButtonElement;
  private errorDiv!: HTMLElement;
  private loadingDiv!: HTMLElement;
  private router: Router;

  constructor(router: Router) {
    super('div', 'signup-page bg-brand-dark text-white min-h-screen flex items-center justify-center mobile-xs-px-4 px-4 py-4 sm:py-8 landscape-mobile-adjust safe-area-inset');
    this.router = router;
    
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
      <!-- Cyberpunk background -->
      <div class="absolute inset-0 bg-gradient-to-br from-brand-dark via-brand-dark to-brand-dark">
        <div class="absolute inset-0 cyberpunk-radial-bg"></div>
      </div>

      <!-- Main container with centered content -->
      <div class="relative w-full max-w-md mobile-container">
        <!-- Header matching HomePage identity -->
        <div class="text-center mb-6 sm:mb-8">
          <h1 class="text-responsive-title sm:text-4xl font-bold mb-2">
            <span class="text-brand-gradient">
              Join Transcendence
            </span>
          </h1>
          <p class="text-text-secondary text-base sm:text-lg mobile-xs-px-4">Create your account and start your journey</p>
        </div>

        <!-- Clean form container using new glass-panel class -->
        <div class="glass-panel-mobile sm:glass-panel sm:p-8">
          <!-- Error message -->
          <div class="error-message hidden mb-4 sm:mb-6 p-4 bg-error/10 border border-error/30 rounded-lg">
            <div class="flex items-center text-error">
              <svg class="w-5 h-5 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
              </svg>
              <span class="error-text">Error message</span>
            </div>
          </div>

          <!-- Loading message -->
          <div class="loading-message hidden mb-4 sm:mb-6 p-4 bg-brand-primary/20 border border-brand-primary/30 rounded-lg">
            <div class="flex items-center text-brand-primary">
              <div class="animate-spin rounded-full h-5 w-5 border-b-2 border-brand-primary mr-3"></div>
              <span>Creating your account...</span>
            </div>
          </div>

          <!-- Form -->
          <form class="space-y-4 sm:space-y-6">
            <!-- Username field -->
            <div>
              <label for="username" class="block text-sm font-medium text-text-secondary mb-2">
                Username
              </label>
              <input
                type="text"
                id="username"
                name="username"
                class="input-touch glass-input w-full px-4 py-3 rounded-lg transition-all duration-200"
                placeholder="Choose your username"
                required
              />
              <p class="text-xs text-text-muted mt-1">3-20 characters, letters, numbers, underscore and hyphen only</p>
            </div>

            <!-- Email field -->
            <div>
              <label for="email" class="block text-sm font-medium text-text-secondary mb-2">
                Email
              </label>
              <input
                type="email"
                id="email"
                name="email"
                class="input-touch glass-input w-full px-4 py-3 rounded-lg transition-all duration-200"
                placeholder="Enter your email address"
                required
              />
            </div>

            <!-- Password field -->
            <div>
              <label for="password" class="block text-sm font-medium text-text-secondary mb-2">
                Password
              </label>
              <input
                type="password"
                id="password"
                name="password"
                class="input-touch glass-input w-full px-4 py-3 rounded-lg transition-all duration-200"
                placeholder="Create a secure password"
                required
              />
              <p class="text-xs text-text-muted mt-1">At least 8 characters with uppercase, lowercase, and number</p>
            </div>

            <!-- Confirm Password field -->
            <div>
              <label for="confirmPassword" class="block text-sm font-medium text-text-secondary mb-2">
                Confirm Password
              </label>
              <input
                type="password"
                id="confirmPassword"
                name="confirmPassword"
                class="input-touch glass-input w-full px-4 py-3 rounded-lg transition-all duration-200"
                placeholder="Confirm your password"
                required
              />
            </div>

            <!-- Terms checkbox -->
            <div class="flex items-start space-x-3">
              <input
                type="checkbox"
                id="terms"
                name="terms"
                class="mt-1 h-5 w-5 text-brand-primary focus:ring-brand-primary focus:ring-offset-0 bg-input-bg border-input-border rounded"
                required
              />
              <label for="terms" class="text-sm text-text-secondary leading-5">
                I agree to the 
                <a href="#" class="text-brand-primary hover:text-brand-secondary underline transition-colors">Terms of Service</a>
                and 
                <a href="#" class="text-brand-primary hover:text-brand-secondary underline transition-colors">Privacy Policy</a>
              </label>
            </div>

            <!-- Submit button using new btn-primary class -->
            <button
              type="submit"
              class="btn-primary btn-touch w-full disabled:opacity-50 disabled:cursor-not-allowed touch-feedback"
            >
              Create Account
            </button>
          </form>

          <!-- OAuth section -->
          <div class="mt-6 sm:mt-8">
            <div class="relative">
              <div class="absolute inset-0 flex items-center">
                <div class="w-full border-t border-panel-border"></div>
              </div>
              <div class="relative flex justify-center text-sm">
                <span class="px-4 bg-panel-bg text-text-secondary">Or continue with</span>
              </div>
            </div>

            <button
              type="button"
              class="oauth-button btn-touch w-full mt-6 bg-panel-bg border border-panel-border text-text-primary py-3 px-6 rounded-lg hover:bg-panel-bg focus:outline-none focus:ring-2 focus:ring-brand-primary focus:ring-offset-2 focus:ring-offset-brand-dark transition-all duration-200 touch-feedback"
            >
              <div class="flex items-center justify-center">
                <img src="/assets/images/42logo.png" alt="42 School" class="w-5 h-5 mr-3">
                <span class="hidden sm:inline">Continue with 42 School</span>
                <span class="sm:hidden">42 School Signup</span>
              </div>
            </button>
          </div>

          <!-- Sign in link -->
          <div class="mt-6 sm:mt-8 text-center">
            <p class="text-text-secondary">
              Already have an account? 
              <button class="signin-link text-brand-primary hover:text-brand-secondary font-medium transition-colors ml-1 touch-feedback">
                Sign in
              </button>
            </p>
          </div>
        </div>
      </div>
    `;

    this.initializeElements();
    this.attachEventListeners();
  }

  private initializeElements(): void {
    this.usernameInput = this.element.querySelector('#username') as HTMLInputElement;
    this.emailInput = this.element.querySelector('#email') as HTMLInputElement;
    this.passwordInput = this.element.querySelector('#password') as HTMLInputElement;
    this.confirmPasswordInput = this.element.querySelector('#confirmPassword') as HTMLInputElement;
    this.submitButton = this.element.querySelector('button[type="submit"]') as HTMLButtonElement;
    this.errorDiv = this.element.querySelector('.error-message') as HTMLElement;
    this.loadingDiv = this.element.querySelector('.loading-message') as HTMLElement;
  }

  private attachEventListeners(): void {
    // Form submission
    const form = this.element.querySelector('form') as HTMLFormElement;
    this.addEventListener(form, 'submit', this.handleSubmit.bind(this));

    // 42 OAuth button
    const oauthButton = this.element.querySelector('.oauth-button') as HTMLButtonElement;
    this.addEventListener(oauthButton, 'click', this.handle42Login.bind(this));

    // Sign in link
    const signinLink = this.element.querySelector('.signin-link') as HTMLButtonElement;
    this.addEventListener(signinLink, 'click', () => {
      this.router.navigate('/auth/login');
    });

    // Real-time validation
    this.addEventListener(this.usernameInput, 'blur', this.validateUsernameField.bind(this));
    this.addEventListener(this.emailInput, 'blur', this.validateEmailField.bind(this));
    this.addEventListener(this.passwordInput, 'blur', this.validatePasswordField.bind(this));
    this.addEventListener(this.confirmPasswordInput, 'blur', this.validateConfirmPasswordField.bind(this));
  }

  private async handleSubmit(e: Event): Promise<void> {
    e.preventDefault();
    
    const username = this.usernameInput.value.trim();
    const email = this.emailInput.value.trim();
    const password = this.passwordInput.value;
    const confirmPassword = this.confirmPasswordInput.value;

    // Validate all inputs
    const usernameValidation = validateUsername(username);
    const emailValidation = validateEmail(email);
    const passwordValidation = validatePassword(password);

    let confirmPasswordValidation = { isValid: true, errors: [] as string[] };
    if (password !== confirmPassword) {
      confirmPasswordValidation = { isValid: false, errors: ['Passwords do not match'] };
    }

    // Check terms checkbox
    const termsCheckbox = this.element.querySelector('#terms') as HTMLInputElement;
    let termsValidation = { isValid: true, errors: [] as string[] };
    if (!termsCheckbox.checked) {
      termsValidation = { isValid: false, errors: ['You must agree to the Terms of Service'] };
    }

    if (!usernameValidation.isValid || !emailValidation.isValid || 
        !passwordValidation.isValid || !confirmPasswordValidation.isValid || 
        !termsValidation.isValid) {
      const allErrors = [
        ...usernameValidation.errors,
        ...emailValidation.errors, 
        ...passwordValidation.errors,
        ...confirmPasswordValidation.errors,
        ...termsValidation.errors
      ];
      this.showError(allErrors.join(', '));
      return;
    }

    try {
      this.setLoading(true);
      this.hideError();

      await authManager.register(username, email, password);
      
      // Registration successful - navigate to home
      this.router.navigate('/');
      
    } catch (error) {
      this.showError(getErrorMessage(error));
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

  private validateUsernameField(): void {
    const validation = validateUsername(this.usernameInput.value.trim());
    this.setFieldError(this.usernameInput, validation.errors[0]);
  }

  private validateEmailField(): void {
    const validation = validateEmail(this.emailInput.value.trim());
    this.setFieldError(this.emailInput, validation.errors[0]);
  }

  private validatePasswordField(): void {
    const validation = validatePassword(this.passwordInput.value);
    this.setFieldError(this.passwordInput, validation.errors[0]);
  }

  private validateConfirmPasswordField(): void {
    const password = this.passwordInput.value;
    const confirmPassword = this.confirmPasswordInput.value;
    
    if (confirmPassword && password !== confirmPassword) {
      this.setFieldError(this.confirmPasswordInput, 'Passwords do not match');
    } else {
      this.setFieldError(this.confirmPasswordInput);
    }
  }

  private setFieldError(input: HTMLInputElement, error?: string): void {
    if (error) {
      input.classList.add('border-error', 'ring-1', 'ring-error');
      input.classList.remove('border-input-border');
    } else {
      input.classList.remove('border-error', 'ring-1', 'ring-error');
      input.classList.add('border-input-border');
    }
  }

  private showError(message: string): void {
    const errorText = this.errorDiv.querySelector('.error-text') as HTMLElement;
    if (errorText) {
      errorText.textContent = message;
    } else {
      this.errorDiv.textContent = message;
    }
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
}