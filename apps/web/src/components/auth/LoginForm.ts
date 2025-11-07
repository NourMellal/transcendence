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
    super('div', 'login-form bg-white p-8 rounded-lg shadow-md max-w-md mx-auto');
  }

  protected render(): void {
    this.element.innerHTML = `
      <div class="text-center mb-6">
        <h2 class="text-2xl font-bold text-gray-900">Sign In</h2>
        <p class="text-gray-600 mt-2">Welcome back to Transcendence</p>
      </div>

      <div class="error-message hidden bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4"></div>
      
      <div class="loading-message hidden bg-blue-100 border border-blue-400 text-blue-700 px-4 py-3 rounded mb-4">
        <div class="flex items-center">
          <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-700 mr-2"></div>
          Signing in...
        </div>
      </div>

      <form class="space-y-4">
        <div>
          <label for="email" class="block text-sm font-medium text-gray-700 mb-1">Email</label>
          <input 
            type="email" 
            id="email" 
            name="email"
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Enter your email"
            required
          >
        </div>

        <div>
          <label for="password" class="block text-sm font-medium text-gray-700 mb-1">Password</label>
          <input 
            type="password" 
            id="password" 
            name="password"
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Enter your password"
            required
          >
        </div>

        <div class="two-fa-section hidden">
          <label for="twofa" class="block text-sm font-medium text-gray-700 mb-1">2FA Code</label>
          <input 
            type="text" 
            id="twofa" 
            name="twofa"
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Enter 6-digit code"
            maxlength="6"
          >
          <p class="text-sm text-gray-500 mt-1">Enter the 6-digit code from your authenticator app</p>
        </div>

        <button 
          type="submit"
          class="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Sign In
        </button>
      </form>

      <div class="mt-6">
        <div class="relative">
          <div class="absolute inset-0 flex items-center">
            <div class="w-full border-t border-gray-300"></div>
          </div>
          <div class="relative flex justify-center text-sm">
            <span class="px-2 bg-white text-gray-500">Or continue with</span>
          </div>
        </div>

        <button 
          type="button"
          class="oauth-button w-full mt-4 bg-gray-900 text-white py-2 px-4 rounded-md hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
        >
          <div class="flex items-center justify-center">
            <svg class="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0c-6.627 0-12 5.373-12 12 0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 22.954 24 17.99 24 12c0-6.627-5.373-12-12-12z"/>
            </svg>
            Sign in with 42 School
          </div>
        </button>
      </div>

      <div class="mt-6 text-center">
        <p class="text-sm text-gray-600">
          Don't have an account? 
          <a href="#" class="register-link text-blue-600 hover:text-blue-500 font-medium">Sign up</a>
        </p>
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
      input.classList.add('border-red-500');
      input.classList.remove('border-gray-300');
    } else {
      input.classList.remove('border-red-500');
      input.classList.add('border-gray-300');
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
}