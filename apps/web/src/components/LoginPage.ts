import { Component } from './base/Component';
import { LoginForm } from './auth/LoginForm';
import { Router } from '../core/Router';

export class LoginPage extends Component {
    private loginForm: LoginForm;

    constructor(private router: Router) {
        super('div', 'login-page bg-brand-dark text-white min-h-screen');
        
        // Create the themed login form
        this.loginForm = new LoginForm();
        
        // Setup navigation callbacks using the router
        this.loginForm.onLoginSuccess = () => {
            // Navigate to home after successful login
            this.router.navigate('/');
        };
        
        this.loginForm.onRegisterClick = () => {
            // Navigate to register page
            this.router.navigate('/auth/signup');
        };
        
        this.loginForm.onHomeClick = () => {
            // Navigate back to home page
            this.router.navigate('/');
        };
    }

    protected render(): void {
        this.element.innerHTML = '';
        this.loginForm.mount(this.element);
    }
}
