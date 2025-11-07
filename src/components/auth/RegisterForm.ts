import { Component } from '../base/Component';
import { authManager } from '../../utils/auth';
import { validateEmail, validatePassword, validateUsername, getErrorMessage } from '../../utils';

/**
 * Registration Form Component
 */
export class RegisterForm extends Component {
  private usernameInput!: HTMLInputElement;
  private emailInput!: HTMLInputElement;
  private passwordInput!: HTMLInputElement;
  private confirmPasswordInput!: HTMLInputElement;
  private submitButton!: HTMLButtonElement;
  private errorDiv!: HTMLElement;
  private loadingDiv!: HTMLElement;

  constructor() {
    super('div', 'register-form bg-white p-8 rounded-lg shadow-md max-w-md mx-auto');
  }

  protected render(): void {
    this.element.innerHTML = `
      <div class="text-center mb-6">
        <h2 class="text-2xl font-bold text-gray-900">Create Account</h2>
        <p class="text-gray-600 mt-2">Join the Transcendence community</p>
      </div>

      <div class="error-message hidden bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4"></div>
      
      <div class="loading-message hidden bg-blue-100 border border-blue-400 text-blue-700 px-4 py-3 rounded mb-4">
        <div class="flex items-center">
          <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-700 mr-2"></div>
          Creating account...
        </div>
      </div>

      <form class="space-y-4">
        <div>
          <label for="username" class="block text-sm font-medium text-gray-700 mb-1">Username</label>
          <input 
            type="text" 
            id="username" 
            name="username"
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Choose a username"
            required
          >
          <p class="text-xs text-gray-500 mt-1">3-20 characters, letters, numbers, underscore and hyphen only</p>
        </div>

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
            placeholder="Create a password"
            required
          >
          <p class="text-xs text-gray-500 mt-1">At least 8 characters with uppercase, lowercase, and number</p>
        </div>

        <div>
          <label for="confirmPassword" class="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
          <input 
            type="password" 
            id="confirmPassword" 
            name="confirmPassword"
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Confirm your password"
            required
          >
        </div>

        <div class="flex items-start">
          <input 
            type="checkbox" 
            id="terms" 
            name="terms"
            class="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            required
          >
          <label for="terms" class="ml-2 text-sm text-gray-700">
            I agree to the 
            <a href="#" class="text-blue-600 hover:text-blue-500 underline">Terms of Service</a>
            and 
            <a href="#" class="text-blue-600 hover:text-blue-500 underline">Privacy Policy</a>
          </label>
        </div>

        <button 
          type="submit"
          class="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Create Account
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
            Sign up with 42 School
          </div>
        </button>
      </div>

      <div class="mt-6 text-center">
        <p class="text-sm text-gray-600">
          Already have an account? 
          <a href="#" class="login-link text-blue-600 hover:text-blue-500 font-medium">Sign in</a>
        </p>
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

    // 42 OAuth registration
    const oauthButton = this.element.querySelector('.oauth-button') as HTMLButtonElement;
    this.addEventListener(oauthButton, 'click', this.handle42Login.bind(this));

    // Login link
    const loginLink = this.element.querySelector('.login-link') as HTMLAnchorElement;
    this.addEventListener(loginLink, 'click', (e) => {
      e.preventDefault();
      this.onLoginClick?.();
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

    // Validate inputs
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
      
      // Registration successful
      this.onRegistrationSuccess?.();
      
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
  public onRegistrationSuccess?: () => void;
  public onLoginClick?: () => void;
}