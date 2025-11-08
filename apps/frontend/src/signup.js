var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { AuthService } from './services/auth/AuthService';
var PasswordStrength;
(function (PasswordStrength) {
    PasswordStrength["WEAK"] = "weak";
    PasswordStrength["MEDIUM"] = "medium";
    PasswordStrength["STRONG"] = "strong";
})(PasswordStrength || (PasswordStrength = {}));
class SignUpValidator {
    static validateUsername(username) {
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
    static validateEmail(email) {
        if (!email.trim()) {
            return { isValid: false, message: 'Email is required' };
        }
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return { isValid: false, message: 'Please enter a valid email address' };
        }
        return { isValid: true };
    }
    static validatePassword(password) {
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
    static validateConfirmPassword(password, confirmPassword) {
        if (!confirmPassword) {
            return { isValid: false, message: 'Please confirm your password' };
        }
        if (password !== confirmPassword) {
            return { isValid: false, message: 'Passwords do not match' };
        }
        return { isValid: true };
    }
    static getPasswordStrength(password) {
        let strength = 0;
        if (password.length >= 8)
            strength++;
        if (password.length >= 12)
            strength++;
        if (/[a-z]/.test(password))
            strength++;
        if (/[A-Z]/.test(password))
            strength++;
        if (/[0-9]/.test(password))
            strength++;
        if (/[!@#$%^&*(),.?":{}|<>]/.test(password))
            strength++;
        if (strength <= 2)
            return PasswordStrength.WEAK;
        if (strength <= 4)
            return PasswordStrength.MEDIUM;
        return PasswordStrength.STRONG;
    }
}
class SignUpForm {
    constructor(formId) {
        var _a, _b;
        this.submitButton = null;
        this.generalErrorEl = null;
        const form = document.getElementById(formId);
        if (!form) {
            throw new Error(`Form with id "${formId}" not found`);
        }
        this.form = form;
        this.elements = this.getFormElements();
        this.auth = new AuthService(((_b = (_a = import.meta) === null || _a === void 0 ? void 0 : _a.env) === null || _b === void 0 ? void 0 : _b.VITE_API_BASE_URL) || '/api');
        this.prepareGeneralError();
        this.submitButton = this.form.querySelector('button[type="submit"]');
        this.attachEventListeners();
        this.attach42AuthListener();
    }
    getFormElements() {
        return {
            username: document.getElementById('username'),
            email: document.getElementById('email'),
            password: document.getElementById('password'),
            confirmPassword: document.getElementById('confirm-password'),
            usernameError: document.getElementById('username-error'),
            emailError: document.getElementById('email-error'),
            passwordError: document.getElementById('password-error'),
            confirmPasswordError: document.getElementById('confirm-password-error'),
            passwordStrength: document.getElementById('password-strength'),
        };
    }
    attachEventListeners() {
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
    attach42AuthListener() {
        const auth42Btn = document.getElementById('auth42-btn');
        if (auth42Btn) {
            auth42Btn.addEventListener('click', () => this.handle42Auth());
        }
    }
    handle42Auth() {
        console.log('Redirecting to 42 OAuth...');
        const confirmed = confirm('This would redirect you to 42 authentication. Continue to game page?');
        if (confirmed) {
            window.location.href = 'game.html';
        }
    }
    validateField(field) {
        let result;
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
                result = SignUpValidator.validateConfirmPassword(this.elements.password.value, this.elements.confirmPassword.value);
                this.showError('confirmPassword', result);
                return result.isValid;
            default:
                return false;
        }
    }
    showError(field, result) {
        const input = this.elements[field];
        const errorElement = this.elements[`${field}Error`];
        if (!result.isValid && result.message) {
            input.classList.add('input-error');
            errorElement.textContent = result.message;
            errorElement.classList.remove('hidden');
        }
        else {
            input.classList.remove('input-error');
            errorElement.classList.add('hidden');
        }
    }
    clearError(field) {
        const input = this.elements[field];
        const errorElement = this.elements[`${field}Error`];
        input.classList.remove('input-error');
        errorElement.classList.add('hidden');
    }
    updatePasswordStrength() {
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
    getFormData() {
        return {
            username: this.elements.username.value.trim(),
            email: this.elements.email.value.trim(),
            password: this.elements.password.value,
            confirmPassword: this.elements.confirmPassword.value,
        };
    }
    handleSubmit(event) {
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
    performSignUp(data) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            this.setLoading(true);
            this.clearGeneralError();
            try {
                const response = yield this.auth.register({ username: data.username, email: data.email, password: data.password });
                console.log('Registration success:', response);
                alert('Account created successfully! Redirecting to sign in...');
                setTimeout(() => { window.location.href = 'index.html'; }, 800);
            }
            catch (err) {
                const anyErr = err;
                const message = ((_a = anyErr === null || anyErr === void 0 ? void 0 : anyErr.body) === null || _a === void 0 ? void 0 : _a.message) || anyErr.message || 'Failed to sign up';
                this.showGeneralError(message);
                const fieldErrors = (_b = anyErr === null || anyErr === void 0 ? void 0 : anyErr.body) === null || _b === void 0 ? void 0 : _b.errors;
                if (fieldErrors) {
                    if (fieldErrors.username)
                        this.showError('username', { isValid: false, message: fieldErrors.username });
                    if (fieldErrors.email)
                        this.showError('email', { isValid: false, message: fieldErrors.email });
                    if (fieldErrors.password)
                        this.showError('password', { isValid: false, message: fieldErrors.password });
                    if (fieldErrors.confirmPassword)
                        this.showError('confirmPassword', { isValid: false, message: fieldErrors.confirmPassword });
                }
            }
            finally {
                this.setLoading(false);
            }
        });
    }
    prepareGeneralError() {
        let existing = document.getElementById('form-error');
        if (!existing) {
            existing = document.createElement('div');
            existing.id = 'form-error';
            existing.className = 'mt-2 text-sm text-red-500 hidden';
            this.form.prepend(existing);
        }
        this.generalErrorEl = existing;
    }
    showGeneralError(message) {
        if (!this.generalErrorEl)
            return;
        this.generalErrorEl.textContent = message;
        this.generalErrorEl.classList.remove('hidden');
    }
    clearGeneralError() {
        if (!this.generalErrorEl)
            return;
        this.generalErrorEl.classList.add('hidden');
        this.generalErrorEl.textContent = '';
    }
    setLoading(isLoading) {
        if (!this.submitButton)
            return;
        if (isLoading) {
            this.submitButton.disabled = true;
            this.submitButton.dataset.originalText = this.submitButton.textContent || '';
            this.submitButton.textContent = 'Signing up...';
        }
        else {
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
    }
    catch (error) {
        console.error('Failed to initialize sign up form:', error);
    }
});
