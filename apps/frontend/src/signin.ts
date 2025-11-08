import { AuthService } from './services/auth/AuthService';

interface SignInFormData {
  email: string;
  password: string;
  rememberMe: boolean;
}

interface ValidationResult {
  isValid: boolean;
  message?: string;
}

interface FormElements {
  email: HTMLInputElement;
  password: HTMLInputElement;
  rememberMe: HTMLInputElement;
  emailError: HTMLElement;
  passwordError: HTMLElement;
}

class Validator {
  static validateEmail(email: string): ValidationResult {
    if (!email.trim()) {
      return { isValid: false, message: 'Email is required' };
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return { isValid: false, message: 'Please enter a valid email address' };
    }
    
    return { isValid: true };
  }
  static validatePassword(password: string): ValidationResult {
    if (!password || !password.trim()) {
      return { isValid: false, message: 'Password is required' };
    }
    return { isValid: true };
  }
}

class SignInForm {
  private form: HTMLFormElement;
  private elements: FormElements;
  private auth: AuthService;
  private submitButton: HTMLButtonElement | null = null;
  private generalErrorEl: HTMLElement | null = null;

  constructor(formId: string) {
    const form = document.getElementById(formId) as HTMLFormElement;
    if (!form) {
      throw new Error(`Form with id "${formId}" not found`);
    }
    
    this.form = form;
    this.elements = this.getFormElements();
    this.auth = new AuthService((import.meta as any)?.env?.VITE_API_BASE_URL || '/api');
    this.prepareGeneralError();
    this.submitButton = this.form.querySelector('button[type="submit"]');
    this.attachEventListeners();
    this.attach42AuthListener();
  }

  private getFormElements(): FormElements {
    return {
      email: document.getElementById('email') as HTMLInputElement,
      password: document.getElementById('password') as HTMLInputElement,
      rememberMe: document.getElementById('remember-me') as HTMLInputElement,
      emailError: document.getElementById('email-error') as HTMLElement,
      passwordError: document.getElementById('password-error') as HTMLElement,
    };
  }

  private attachEventListeners(): void {
    this.form.addEventListener('submit', (e) => this.handleSubmit(e));

    this.elements.email.addEventListener('blur', () => this.validateField('email'));
    this.elements.password.addEventListener('blur', () => this.validateField('password'));
    
    this.elements.email.addEventListener('input', () => this.clearError('email'));
    this.elements.password.addEventListener('input', () => this.clearError('password'));
  }

  private attach42AuthListener(): void {
    const auth42Btn = document.getElementById('auth42-btn');
    if (auth42Btn) {
      auth42Btn.addEventListener('click', () => this.handle42Auth());
    }
  }

  private handle42Auth(): void {
    console.log('Redirecting to 42 OAuth...');

    const confirmed = confirm('This would redirect you to 42 authentication. Continue to game page?');
    if (confirmed) {
      window.location.href = 'game.html';
    }
  }

  private validateField(field: 'email' | 'password'): boolean {
    if (field === 'email') {
      const result = Validator.validateEmail(this.elements.email.value);
      this.showError('email', result);
      return result.isValid;
    }

    const result = Validator.validatePassword(this.elements.password.value);
    this.showError('password', result);
    return result.isValid;
  }

  private showError(field: 'email' | 'password', result: ValidationResult): void {
    const input = this.elements[field];
    const errorElement = this.elements[`${field}Error` as keyof FormElements] as HTMLElement;

    if (!result.isValid && result.message) {
      input.classList.add('input-error');
      errorElement.textContent = result.message;
      errorElement.classList.remove('hidden');
    } else {
      input.classList.remove('input-error');
      errorElement.classList.add('hidden');
    }
  }

  private clearError(field: 'email' | 'password'): void {
    const input = this.elements[field];
    const errorElement = this.elements[`${field}Error` as keyof FormElements] as HTMLElement;
    
    input.classList.remove('input-error');
    errorElement.classList.add('hidden');
  }

  private getFormData(): SignInFormData {
    return {
      email: this.elements.email.value.trim(),
      password: this.elements.password.value,
      rememberMe: this.elements.rememberMe.checked,
    };
  }

  private async handleSubmit(event: Event): Promise<void> {
    event.preventDefault();
    this.clearGeneralError();

    const isEmailValid = this.validateField('email');
    const isPasswordValid = this.validateField('password');
    if (!isEmailValid || !isPasswordValid) return;

    const formData = this.getFormData();
    if (formData.rememberMe) this.saveRememberMe(formData.email);

    await this.performSignIn(formData);
  }

  private saveRememberMe(email: string): void {
    try {
      const rememberData = { email, timestamp: Date.now() };
      sessionStorage.setItem('pingpong_remember', JSON.stringify(rememberData));
    } catch (error) {
      console.error('Failed to save remember me data:', error);
    }
  }

  private async performSignIn(data: SignInFormData): Promise<void> {
    this.setLoading(true);
    try {
      const response = await this.auth.login({ email: data.email, password: data.password });
      if (!data.rememberMe) {
        try { localStorage.removeItem('authToken'); } catch {}
      }
      console.log('Login success:', response.user);
      window.location.href = 'game.html';
    } catch (err) {
      const anyErr = err as any;
      const message = anyErr?.body?.message || anyErr.message || 'Failed to sign in';
      this.showGeneralError(message);
      const fieldErrors = anyErr?.body?.errors;
      if (fieldErrors) {
        if (fieldErrors.email) this.showError('email', { isValid: false, message: fieldErrors.email });
        if (fieldErrors.password) this.showError('password', { isValid: false, message: fieldErrors.password });
      }
    } finally {
      this.setLoading(false);
    }
  }

  private prepareGeneralError() {
    let existing = document.getElementById('form-error');
    if (!existing) {
      existing = document.createElement('div');
      existing.id = 'form-error';
      existing.className = 'mt-2 text-sm text-red-500 hidden';
      this.form.prepend(existing);
    }
    this.generalErrorEl = existing;
  }

  private showGeneralError(message: string) {
    if (!this.generalErrorEl) return;
    this.generalErrorEl.textContent = message;
    this.generalErrorEl.classList.remove('hidden');
  }

  private clearGeneralError() {
    if (!this.generalErrorEl) return;
    this.generalErrorEl.classList.add('hidden');
    this.generalErrorEl.textContent = '';
  }

  private setLoading(isLoading: boolean) {
    if (!this.submitButton) return;
    if (isLoading) {
      this.submitButton.disabled = true;
      this.submitButton.dataset.originalText = this.submitButton.textContent || '';
      this.submitButton.textContent = 'Signing in...';
    } else {
      this.submitButton.disabled = false;
      if (this.submitButton.dataset.originalText) {
        this.submitButton.textContent = this.submitButton.dataset.originalText;
      }
    }
  }

  public loadRememberedEmail(): void {
    try {
      const rememberData = sessionStorage.getItem('pingpong_remember');
      if (rememberData) {
        const parsed = JSON.parse(rememberData);
        this.elements.email.value = parsed.email;
        this.elements.rememberMe.checked = true;
      }
    } catch (error) {
      console.error('Failed to load remember me data:', error);
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  try {
    const signInForm = new SignInForm('signin-form');
    signInForm.loadRememberedEmail();
  } catch (error) {
    console.error('Failed to initialize sign in form:', error);
  }
}); 