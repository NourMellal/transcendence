import { Component } from '../base/Component';
import { LoginForm } from './LoginForm';
import { RegisterForm } from './RegisterForm';
import { authManager } from '../../utils/auth';

/**
 * Authentication Manager Component
 * Handles switching between login and registration forms
 */
export class AuthManager extends Component {
  private currentForm: 'login' | 'register' = 'login';
  private loginForm!: LoginForm;
  private registerForm!: RegisterForm;

  constructor(initialForm: 'login' | 'register' = 'login') {
    super('div', 'auth-manager min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8');
    this.currentForm = initialForm;
  }

  protected render(): void {
    this.element.innerHTML = `
      <div class="max-w-md w-full space-y-8">
        <div class="text-center">
          <h1 class="text-4xl font-bold text-gray-900 mb-2">🏓 Transcendence</h1>
          <p class="text-gray-600">The ultimate Pong experience</p>
        </div>
        
        <div id="form-container" class="mt-8">
          <!-- Dynamic form content will be inserted here -->
        </div>
      </div>
    `;

    this.initializeForms();
    this.showCurrentForm();
  }

  private initializeForms(): void {
    // Initialize login form
    this.loginForm = new LoginForm();
    this.loginForm.onLoginSuccess = () => {
      this.onAuthSuccess?.();
    };
    this.loginForm.onRegisterClick = () => {
      this.showRegisterForm();
    };

    // Initialize register form
    this.registerForm = new RegisterForm();
    this.registerForm.onRegistrationSuccess = () => {
      this.onAuthSuccess?.();
    };
    this.registerForm.onLoginClick = () => {
      this.showLoginForm();
    };
  }

  private showCurrentForm(): void {
    const container = this.element.querySelector('#form-container') as HTMLElement;
    
    // Clear container
    container.innerHTML = '';
    
    // Mount appropriate form
    if (this.currentForm === 'login') {
      this.loginForm.mount(container);
    } else {
      this.registerForm.mount(container);
    }
  }

  private showLoginForm(): void {
    if (this.currentForm !== 'login') {
      this.currentForm = 'login';
      this.showCurrentForm();
    }
  }

  private showRegisterForm(): void {
    if (this.currentForm !== 'register') {
      this.currentForm = 'register';
      this.showCurrentForm();
    }
  }

  /**
   * Handle 42 OAuth callback
   */
  public async handle42Callback(code: string, state: string): Promise<void> {
    try {
      await authManager.handle42Callback(code, state);
      this.onAuthSuccess?.();
    } catch (error) {
      console.error('42 OAuth callback failed:', error);
      // Show error on current form
      if (this.currentForm === 'login') {
        this.loginForm['showError']('OAuth authentication failed. Please try again.');
      } else {
        this.registerForm['showError']('OAuth authentication failed. Please try again.');
      }
    }
  }

  /**
   * Check if current URL contains OAuth callback parameters
   */
  public static hasOAuthCallback(): boolean {
    const params = new URLSearchParams(window.location.search);
    return params.has('code') && params.has('state');
  }

  /**
   * Get OAuth callback parameters from URL
   */
  public static getOAuthParams(): { code: string; state: string } | null {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const state = params.get('state');
    
    if (code && state) {
      return { code, state };
    }
    
    return null;
  }

  /**
   * Clear OAuth parameters from URL
   */
  public static clearOAuthParams(): void {
    const url = new URL(window.location.href);
    url.searchParams.delete('code');
    url.searchParams.delete('state');
    window.history.replaceState({}, document.title, url.toString());
  }

  // Event callback
  public onAuthSuccess?: () => void;
}
