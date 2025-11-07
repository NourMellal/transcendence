import { Component } from './base/Component';
import { authManager } from '../utils/auth';
import { validateEmail, validatePassword } from '../utils/validation';
import { showError, showSuccess } from '../utils/errors';

export class LoginPage extends Component {
    private isPasswordVisible = false;

    constructor() {
        super('div', 'login-page');
    }

    protected render(): void {
        this.element.innerHTML = `
            <div class="login-page">
                <!-- Main Container - Elevated Card -->
                <div class="login-container">
                    <!-- Left Panel - Botanical Illustration -->
                    <div class="left-panel">
                    <div class="logo">
                        <img src="/assets/images/TranscendenceLogo.png" alt="Transcendence" class="logo-image" />
                    </div>
                    
                    <!-- Dynamic Animated Illustration Area -->
                    <div class="animated-illustration">
                        <!-- Custom Background (you'll replace this with your design) -->
                        <div class="custom-background"></div>
                        
                        <!-- Animated PNG Images Container -->
                        <div class="floating-elements">
                            <!-- Floating Element 1 -->
                            <div class="floating-element element-1" data-animation="float-slow">
                                <img src="/assets/images/floating-1.png" alt="" class="floating-image" />
                            </div>
                            
                            <!-- Floating Element 2 -->
                            <div class="floating-element element-2" data-animation="float-medium">
                                <img src="/assets/images/floating-2.png" alt="" class="floating-image" />
                            </div>
                            
                            <!-- Floating Element 3 -->
                            <div class="floating-element element-3" data-animation="float-fast">
                                <img src="/assets/images/floating-3.png" alt="" class="floating-image" />
                            </div>
                            
                            <!-- Floating Element 4 -->
                            <div class="floating-element element-4" data-animation="drift-left">
                                <img src="/assets/images/floating-4.png" alt="" class="floating-image" />
                            </div>
                            
                            <!-- Floating Element 5 -->
                            <div class="floating-element element-5" data-animation="drift-right">
                                <img src="/assets/images/floating-5.png" alt="" class="floating-image" />
                            </div>
                            
                            <!-- Floating Element 6 -->
                            <div class="floating-element element-6" data-animation="pulse-glow">
                                <img src="/assets/images/floating-6.png" alt="" class="floating-image" />
                            </div>
                        </div>
                        
                        <!-- Interactive Hover Effects -->
                        <div class="interactive-zone" data-hover-effect="particle-burst"></div>
                    </div>
                </div>

                <!-- Right Panel - Login Form -->
                <div class="right-panel">
                    <!-- Decorative flowers -->
                    <div class="decorative-flower top-right"></div>
                    <div class="decorative-flower bottom-right"></div>
                    
                    <div class="login-form-container">
                        <div class="login-form">
                            <h1 class="login-title">Login</h1>
                            
                            <form id="loginForm" class="form">
                                <!-- Email Input -->
                                <div class="input-group">
                                    <label for="email" class="input-label">Email</label>
                                    <div class="input-wrapper">
                                        <input 
                                            type="email" 
                                            id="email" 
                                            name="email" 
                                            class="form-input" 
                                            placeholder="delulu99@email.com"
                                            required
                                        >
                                        <svg class="input-icon" width="20" height="20" viewBox="0 0 20 20" fill="none">
                                            <path d="M3.33 5.83L10 10.83L16.67 5.83" stroke="#999" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                                            <rect x="2.5" y="4.17" width="15" height="11.67" rx="2" stroke="#999" stroke-width="1.5"/>
                                        </svg>
                                    </div>
                                </div>

                                <!-- Password Input -->
                                <div class="input-group">
                                    <label for="password" class="input-label">Password</label>
                                    <div class="input-wrapper">
                                        <input 
                                            type="password" 
                                            id="password" 
                                            name="password" 
                                            class="form-input" 
                                            placeholder="••••••••"
                                            required
                                        >
                                        <button type="button" class="password-toggle" id="passwordToggle">
                                            <svg class="eye-icon" width="20" height="20" viewBox="0 0 20 20" fill="none">
                                                <path d="M1 10s3-7 9-7 9 7 9 7-3 7-9 7-9-7-9-7z" stroke="#999" stroke-width="1.5"/>
                                                <circle cx="10" cy="10" r="3" stroke="#999" stroke-width="1.5"/>
                                            </svg>
                                        </button>
                                    </div>
                                </div>

                                <!-- Forgot Password Link -->
                                <div class="forgot-password-container">
                                    <a href="#" class="forgot-password-link">Forgot Password?</a>
                                </div>

                                <!-- Login Button -->
                                <button type="submit" class="login-button">
                                    <span class="button-text">Log In</span>
                                    <div class="button-loader hidden">
                                        <div class="spinner"></div>
                                    </div>
                                </button>
                            </form>

                            <!-- Divider -->
                            <div class="divider">
                                <span class="divider-text">Or</span>
                            </div>

                            <!-- Sign Up Prompt -->
                            <div class="signup-prompt">
                                New to ft_transcendence? <a href="#" class="signup-link">Create Account</a>
                            </div>

                            <!-- Social Login Buttons -->
                            <div class="social-login">
                                <button class="social-button intra42-button">
                                    <div class="social-icon intra42-icon">
                                        <img src="/assets/images/42logo.png" alt="42 School" width="24" height="24" />
                                    </div>
                                    <span>Continue with 42 School</span>
                                </button>

                                <div class="auth-divider">
                                    <span>or</span>
                                </div>

                                <!-- Manual Login Option -->
                                <div class="manual-auth-note">
                                    <p class="auth-note-text">
                                        <svg class="info-icon" width="16" height="16" viewBox="0 0 16 16" fill="none">
                                            <circle cx="8" cy="8" r="7" stroke="#40c4c4" stroke-width="1.5"/>
                                            <path d="M8 7v4M8 5h.01" stroke="#40c4c4" stroke-width="1.5" stroke-linecap="round"/>
                                        </svg>
                                        Use the form above for manual login or click below for 42 authentication
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <!-- End Main Container -->
            </div>
            <!-- End Login Page -->
        `;
        
        this.setupEventListeners();
    }

    private setupEventListeners(): void {
        // Form submission
        const form = this.element.querySelector('#loginForm') as HTMLFormElement;
        form?.addEventListener('submit', this.handleSubmit.bind(this));

        // Password toggle
        const passwordToggle = this.element.querySelector('#passwordToggle');
        passwordToggle?.addEventListener('click', this.togglePassword.bind(this));

        // 42 School OAuth login
        const intra42Button = this.element.querySelector('.intra42-button');
        intra42Button?.addEventListener('click', () => this.handle42Login());

        // Navigation links
        const signupLink = this.element.querySelector('.signup-link');
        signupLink?.addEventListener('click', (e: Event) => {
            e.preventDefault();
            window.location.href = '/auth/signup';
        });

        const forgotPasswordLink = this.element.querySelector('.forgot-password-link');
        forgotPasswordLink?.addEventListener('click', (e: Event) => {
            e.preventDefault();
            // TODO: Navigate to forgot password page
            console.log('Navigate to forgot password');
        });
    }

    private async handleSubmit(event: Event): Promise<void> {
        event.preventDefault();
        
        const form = event.target as HTMLFormElement;
        const formData = new FormData(form);
        const email = formData.get('email') as string;
        const password = formData.get('password') as string;

        // Validation
        const emailValidation = validateEmail(email);
        if (!emailValidation.isValid) {
            showError(emailValidation.errors[0] ?? 'Please enter a valid email address');
            return;
        }

        const passwordValidation = validatePassword(password);
        if (!passwordValidation.isValid) {
            showError(passwordValidation.errors[0] ?? 'Please enter a valid password');
            return;
        }

        // Show loading state
        this.setLoading(true);

        try {
            await authManager.login(email, password);
            showSuccess('Login successful!');
            
            // TODO: Navigate to dashboard
            console.log('Login successful');
            
        } catch (error) {
            showError('Invalid email or password');
        } finally {
            this.setLoading(false);
        }
    }

    private togglePassword(): void {
        const passwordInput = this.element.querySelector('#password') as HTMLInputElement;
        const eyeIcon = this.element.querySelector('.eye-icon');
        
        this.isPasswordVisible = !this.isPasswordVisible;
        passwordInput.type = this.isPasswordVisible ? 'text' : 'password';
        
        // Update eye icon
        if (eyeIcon && this.isPasswordVisible) {
            eyeIcon.innerHTML = `
                <path d="M1 10s3-7 9-7 9 7 9 7-3 7-9 7-9-7-9-7z" stroke="#999" stroke-width="1.5"/>
                <circle cx="10" cy="10" r="3" stroke="#999" stroke-width="1.5"/>
                <line x1="1" y1="1" x2="19" y2="19" stroke="#999" stroke-width="1.5"/>
            `;
        }
    }

    private async handle42Login(): Promise<void> {
        try {
            console.log('🚀 Starting 42 School OAuth login...');
            
            // Show loading state
            const button = this.element.querySelector('.intra42-button') as HTMLButtonElement;
            const buttonText = button.querySelector('span');
            
            if (buttonText) {
                buttonText.textContent = 'Redirecting to 42...';
            }
            button.disabled = true;
            
            // Initiate 42 School OAuth login - this will redirect automatically
            await authManager.start42Login();
            
        } catch (error) {
            console.error('❌ 42 School login failed:', error);
            showError('Failed to start 42 School authentication. Please try again.');
            
            // Reset button state
            const button = this.element.querySelector('.intra42-button') as HTMLButtonElement;
            const buttonText = button.querySelector('span');
            if (buttonText) {
                buttonText.textContent = 'Continue with 42 School';
            }
            button.disabled = false;
        }
    }

    private setLoading(loading: boolean): void {
        const button = this.element.querySelector('.login-button') as HTMLButtonElement;
        const buttonText = this.element.querySelector('.button-text');
        const buttonLoader = this.element.querySelector('.button-loader');

        if (loading) {
            button.disabled = true;
            buttonText?.classList.add('hidden');
            buttonLoader?.classList.remove('hidden');
        } else {
            button.disabled = false;
            buttonText?.classList.remove('hidden');
            buttonLoader?.classList.add('hidden');
        }
    }
}
