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
class Validator {
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
        if (!password || !password.trim()) {
            return { isValid: false, message: 'Password is required' };
        }
        return { isValid: true };
    }
}
class SignInForm {
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
            email: document.getElementById('email'),
            password: document.getElementById('password'),
            rememberMe: document.getElementById('remember-me'),
            emailError: document.getElementById('email-error'),
            passwordError: document.getElementById('password-error'),
        };
    }
    attachEventListeners() {
        this.form.addEventListener('submit', (e) => this.handleSubmit(e));
        this.elements.email.addEventListener('blur', () => this.validateField('email'));
        this.elements.password.addEventListener('blur', () => this.validateField('password'));
        this.elements.email.addEventListener('input', () => this.clearError('email'));
        this.elements.password.addEventListener('input', () => this.clearError('password'));
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
        if (field === 'email') {
            const result = Validator.validateEmail(this.elements.email.value);
            this.showError('email', result);
            return result.isValid;
        }
        const result = Validator.validatePassword(this.elements.password.value);
        this.showError('password', result);
        return result.isValid;
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
    getFormData() {
        return {
            email: this.elements.email.value.trim(),
            password: this.elements.password.value,
            rememberMe: this.elements.rememberMe.checked,
        };
    }
    handleSubmit(event) {
        return __awaiter(this, void 0, void 0, function* () {
            event.preventDefault();
            this.clearGeneralError();
            const isEmailValid = this.validateField('email');
            const isPasswordValid = this.validateField('password');
            if (!isEmailValid || !isPasswordValid)
                return;
            const formData = this.getFormData();
            if (formData.rememberMe)
                this.saveRememberMe(formData.email);
            yield this.performSignIn(formData);
        });
    }
    saveRememberMe(email) {
        try {
            const rememberData = { email, timestamp: Date.now() };
            sessionStorage.setItem('pingpong_remember', JSON.stringify(rememberData));
        }
        catch (error) {
            console.error('Failed to save remember me data:', error);
        }
    }
    performSignIn(data) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            this.setLoading(true);
            try {
                const response = yield this.auth.login({ email: data.email, password: data.password });
                if (!data.rememberMe) {
                    try {
                        localStorage.removeItem('authToken');
                    }
                    catch (_c) { }
                }
                console.log('Login success:', response.user);
                window.location.href = 'game.html';
            }
            catch (err) {
                const anyErr = err;
                const message = ((_a = anyErr === null || anyErr === void 0 ? void 0 : anyErr.body) === null || _a === void 0 ? void 0 : _a.message) || anyErr.message || 'Failed to sign in';
                this.showGeneralError(message);
                const fieldErrors = (_b = anyErr === null || anyErr === void 0 ? void 0 : anyErr.body) === null || _b === void 0 ? void 0 : _b.errors;
                if (fieldErrors) {
                    if (fieldErrors.email)
                        this.showError('email', { isValid: false, message: fieldErrors.email });
                    if (fieldErrors.password)
                        this.showError('password', { isValid: false, message: fieldErrors.password });
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
            this.submitButton.textContent = 'Signing in...';
        }
        else {
            this.submitButton.disabled = false;
            if (this.submitButton.dataset.originalText) {
                this.submitButton.textContent = this.submitButton.dataset.originalText;
            }
        }
    }
    loadRememberedEmail() {
        try {
            const rememberData = sessionStorage.getItem('pingpong_remember');
            if (rememberData) {
                const parsed = JSON.parse(rememberData);
                this.elements.email.value = parsed.email;
                this.elements.rememberMe.checked = true;
            }
        }
        catch (error) {
            console.error('Failed to load remember me data:', error);
        }
    }
}
document.addEventListener('DOMContentLoaded', () => {
    try {
        const signInForm = new SignInForm('signin-form');
        signInForm.loadRememberedEmail();
    }
    catch (error) {
        console.error('Failed to initialize sign in form:', error);
    }
});
