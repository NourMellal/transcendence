import { AuthService } from './services/auth/AuthService';

interface SignUpFormData {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
}

interface ValidationResult {
  isValid: boolean;
  message?: string;
}

interface FormElements {
  username: HTMLInputElement;
  email: HTMLInputElement;
  password: HTMLInputElement;
  confirmPassword: HTMLInputElement;
  usernameError: HTMLElement;
  emailError: HTMLElement;
  passwordError: HTMLElement;
  confirmPasswordError: HTMLElement;
  passwordStrength: HTMLElement;
}

enum PasswordStrength {
  WEAK = 'weak',
  MEDIUM = 'medium',
  STRONG = 'strong',
}

class SignUpValidator {
  static validateUsername(username: string): ValidationResult {
    if (!username.trim()) {
      return { isValid: false, message: 'Username is required' };
    }
    
    if (username.length < 3) {
      return { isValid: false, message: 'Username must be at least 3 characters' };
    }
    
    if (username.length > 20) {
      return { isValid: false, message: 'Username must be less than 20 characters' };
    }
    
    const usernameRegex = /^[a-zA-Z0-9_]+$/;
    if (!usernameRegex.test(username)) {
      return { isValid: false, message: 'Username can only contain letters, numbers, and underscores' };
    }
    
    return { isValid: true };
  }

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
    if (!password) {
      return { isValid: false, message: 'Password is required' };
    }
    
    if (password.length < 8) {
      return { isValid: false, message: 'Password must be at least 8 characters' };
    }

    if (!/[A-Z]/.test(password)) {
      return { isValid: false, message: 'Password must contain at least one uppercase letter' };
    }

    if (!/[a-z]/.test(password)) {
      return { isValid: false, message: 'Password must contain at least one lowercase letter' };
    }

    if (!/\d/.test(password)) {
      return { isValid: false, message: 'Password must contain at least one number' };
    }

    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      return { isValid: false, message: 'Password must contain at least one special character' };
    }
    
    return { isValid: true };
  }

  static validateConfirmPassword(password: string, confirmPassword: string): ValidationResult {
    if (!confirmPassword) {
      return { isValid: false, message: 'Please confirm your password' };
    }
    
    if (password !== confirmPassword) {
      return { isValid: false, message: 'Passwords do not match' };
    }
    
    return { isValid: true };
  }

  static getPasswordStrength(password: string): PasswordStrength {
    let strength = 0;
    
    if (password.length >= 8) strength++;
    if (password.length >= 12) strength++;
    if (/[a-z]/.test(password)) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) strength++;
    
    if (strength <= 2) return PasswordStrength.WEAK;
    if (strength <= 4) return PasswordStrength.MEDIUM;
    return PasswordStrength.STRONG;
  }
}

class SignUpForm {
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
      username: document.getElementById('username') as HTMLInputElement,
      email: document.getElementById('email') as HTMLInputElement,
      password: document.getElementById('password') as HTMLInputElement,
      confirmPassword: document.getElementById('confirm-password') as HTMLInputElement,
      usernameError: document.getElementById('username-error') as HTMLElement,
      emailError: document.getElementById('email-error') as HTMLElement,
      passwordError: document.getElementById('password-error') as HTMLElement,
      confirmPasswordError: document.getElementById('confirm-password-error') as HTMLElement,
      passwordStrength: document.getElementById('password-strength') as HTMLElement,
    };
  }

  private attachEventListeners(): void {
    this.form.addEventListener('submit', (e) => this.handleSubmit(e));
  
    this.elements.username.addEventListener('blur', () => this.validateField('username'));
    this.elements.email.addEventListener('blur', () => this.validateField('email'));
    this.elements.password.addEventListener('blur', () => this.validateField('password'));
    this.elements.confirmPassword.addEventListener('blur', () => this.validateField('confirmPassword'));

    this.elements.password.addEventListener('input', () => {
      this.clearError('password');
      this.updatePasswordStrength();
    });
  
    this.elements.username.addEventListener('input', () => this.clearError('username'));
    this.elements.email.addEventListener('input', () => this.clearError('email'));
    this.elements.confirmPassword.addEventListener('input', () => this.clearError('confirmPassword'));
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

  private validateField(field: keyof Omit<FormElements, 'usernameError' | 'emailError' | 'passwordError' | 'confirmPasswordError' | 'passwordStrength'>): boolean {
    let result: ValidationResult;
    
    switch (field) {
      case 'username':
        result = SignUpValidator.validateUsername(this.elements.username.value);
        this.showError('username', result);
        return result.isValid;
      
      case 'email':
        result = SignUpValidator.validateEmail(this.elements.email.value);
        this.showError('email', result);
        return result.isValid;
      
      case 'password':
        result = SignUpValidator.validatePassword(this.elements.password.value);
        this.showError('password', result);
        return result.isValid;
      
      case 'confirmPassword':
        result = SignUpValidator.validateConfirmPassword(
          this.elements.password.value,
          this.elements.confirmPassword.value
        );
        this.showError('confirmPassword', result);
        return result.isValid;
      
      default:
        return false;
    }
  }

  private showError(field: 'username' | 'email' | 'password' | 'confirmPassword', result: ValidationResult): void {
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

  private clearError(field: 'username' | 'email' | 'password' | 'confirmPassword'): void {
    const input = this.elements[field];
    const errorElement = this.elements[`${field}Error` as keyof FormElements] as HTMLElement;
    
    input.classList.remove('input-error');
    errorElement.classList.add('hidden');
  }

  private updatePasswordStrength(): void {
    const password = this.elements.password.value;
    
    if (!password) {
      this.elements.passwordStrength.classList.add('hidden');
      return;
    }
    
    const strength = SignUpValidator.getPasswordStrength(password);
    const strengthElement = this.elements.passwordStrength;
    
    strengthElement.classList.remove('hidden');
    
    switch (strength) {
      case PasswordStrength.WEAK:
        strengthElement.textContent = 'Password strength: Weak';
        strengthElement.style.color = '#ef4444';
        break;
      case PasswordStrength.MEDIUM:
        strengthElement.textContent = 'Password strength: Medium';
        strengthElement.style.color = '#f59e0b';
        break;
      case PasswordStrength.STRONG:
        strengthElement.textContent = 'Password strength: Strong';
        strengthElement.style.color = '#10b981';
        break;
    }
  }

  private getFormData(): SignUpFormData {
    return {
      username: this.elements.username.value.trim(),
      email: this.elements.email.value.trim(),
      password: this.elements.password.value,
      confirmPassword: this.elements.confirmPassword.value,
    };
  }

  private handleSubmit(event: Event): void {
    event.preventDefault();

    const isUsernameValid = this.validateField('username');
    const isEmailValid = this.validateField('email');
    const isPasswordValid = this.validateField('password');
    const isConfirmPasswordValid = this.validateField('confirmPassword');

    if (!isUsernameValid || !isEmailValid || !isPasswordValid || !isConfirmPasswordValid) {
      return;
    }

    const formData = this.getFormData();
  
    this.performSignUp(formData);
  }

  private async performSignUp(data: SignUpFormData): Promise<void> {
    this.setLoading(true);
    this.clearGeneralError();
    try {
      const response = await this.auth.register({ username: data.username, email: data.email, password: data.password });
      console.log('Registration success:', response);
      alert('Account created successfully! Redirecting to sign in...');
      setTimeout(() => { window.location.href = 'index.html'; }, 800);
    } catch (err) {
      const anyErr = err as any;
      const message = anyErr?.body?.message || anyErr.message || 'Failed to sign up';
      this.showGeneralError(message);
      const fieldErrors = anyErr?.body?.errors;
      if (fieldErrors) {
        if (fieldErrors.username) this.showError('username', { isValid: false, message: fieldErrors.username });
        if (fieldErrors.email) this.showError('email', { isValid: false, message: fieldErrors.email });
        if (fieldErrors.password) this.showError('password', { isValid: false, message: fieldErrors.password });
        if (fieldErrors.confirmPassword) this.showError('confirmPassword', { isValid: false, message: fieldErrors.confirmPassword });
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
      this.submitButton.textContent = 'Signing up...';
    } else {
      this.submitButton.disabled = false;
      if (this.submitButton.dataset.originalText) {
        this.submitButton.textContent = this.submitButton.dataset.originalText;
      }
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  try {
    new SignUpForm('signup-form');
  } catch (error) {
    console.error('Failed to initialize sign up form:', error);
  }
});