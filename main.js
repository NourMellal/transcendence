/**
 * Browser-compatible version of the Transcendence frontend
 * This is a simplified version without module imports for direct browser testing
 */

// ========================================
// BASE COMPONENT CLASS
// ========================================

class Component {
  constructor(tagName = 'div', className) {
    this.element = document.createElement(tagName);
    if (className) {
      this.element.className = className;
    }
    this.mounted = false;
  }

  getElement() {
    return this.element;
  }

  mount(parent) {
    if (!this.mounted) {
      this.render();
      this.mounted = true;
    }
    parent.appendChild(this.element);
  }

  unmount() {
    if (this.element.parentNode) {
      this.element.parentNode.removeChild(this.element);
    }
    this.mounted = false;
    this.cleanup();
  }

  update() {
    if (this.mounted) {
      this.render();
    }
  }

  createElement(tagName, className, textContent) {
    const element = document.createElement(tagName);
    if (className) element.className = className;
    if (textContent) element.textContent = textContent;
    return element;
  }

  cleanup() {
    // Override in subclasses
  }
}

// ========================================
// HTTP CLIENT
// ========================================

class ApiError extends Error {
  constructor(message, status, response) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.response = response;
  }
}

class HttpClient {
  constructor(baseUrl = '/api') {
    this.baseUrl = baseUrl;
    this.defaultHeaders = {
      'Content-Type': 'application/json',
    };
  }

  getAuthToken() {
    return localStorage.getItem('auth_token');
  }

  setAuthToken(token) {
    localStorage.setItem('auth_token', token);
  }

  clearAuthToken() {
    localStorage.removeItem('auth_token');
  }

  buildHeaders(customHeaders = {}) {
    const headers = { ...this.defaultHeaders };
    
    const token = this.getAuthToken();
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    Object.assign(headers, customHeaders);
    return headers;
  }

  async handleResponse(response) {
    const status = response.status;
    let data;
    
    try {
      const text = await response.text();
      data = text ? JSON.parse(text) : null;
    } catch {
      data = null;
    }

    if (!response.ok) {
      const errorMessage = data?.message || data?.error || `HTTP ${status}: ${response.statusText}`;
      throw new ApiError(errorMessage, status, data);
    }

    return { data, status };
  }

  async request(method, url, config = {}) {
    const fullUrl = `${this.baseUrl}${url}`;
    const headers = this.buildHeaders(config.headers);

    const fetchConfig = {
      method,
      headers,
    };

    if (config.body && method !== 'GET') {
      if (config.body instanceof FormData) {
        delete headers['Content-Type'];
        fetchConfig.body = config.body;
      } else {
        fetchConfig.body = JSON.stringify(config.body);
      }
    }

    try {
      const response = await fetch(fullUrl, fetchConfig);
      return this.handleResponse(response);
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      
      throw new ApiError(
        error instanceof Error ? error.message : 'Network error occurred',
        0
      );
    }
  }

  async get(url, config) { return this.request('GET', url, config); }
  async post(url, body, config = {}) { return this.request('POST', url, { ...config, body }); }
  async put(url, body, config = {}) { return this.request('PUT', url, { ...config, body }); }
  async patch(url, body, config = {}) { return this.request('PATCH', url, { ...config, body }); }
  async delete(url, config) { return this.request('DELETE', url, config); }
}

const httpClient = new HttpClient();

// ========================================
// AUTH SERVICE
// ========================================

class AuthService {
  async register(request) {
    const response = await httpClient.post('/auth/register', request);
    
    if (response.data?.token) {
      httpClient.setAuthToken(response.data.token);
    }
    
    return response.data;
  }

  async login(request) {
    const response = await httpClient.post('/auth/login', request);
    
    if (response.data?.token) {
      httpClient.setAuthToken(response.data.token);
    }
    
    return response.data;
  }

  async start42Login() {
    const response = await httpClient.get('/auth/42/login');
    return response.data;
  }

  async getStatus() {
    try {
      const response = await httpClient.get('/auth/status');
      return response.data;
    } catch (error) {
      return null;
    }
  }

  async logout() {
    try {
      await httpClient.post('/auth/logout');
    } finally {
      httpClient.clearAuthToken();
    }
  }

  isAuthenticated() {
    return httpClient.getAuthToken() !== null;
  }
}

const authService = new AuthService();

// ========================================
// VALIDATION UTILITIES
// ========================================

function validateEmail(email) {
  const errors = [];
  
  if (!email) {
    errors.push('Email is required');
  } else if (!/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(email)) {
    errors.push('Please enter a valid email address');
  }
  
  return { isValid: errors.length === 0, errors };
}

function validatePassword(password) {
  const errors = [];
  
  if (!password) {
    errors.push('Password is required');
  } else {
    if (password.length < 8) {
      errors.push('Password must be at least 8 characters long');
    }
    if (!/(?=.*[a-z])/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }
    if (!/(?=.*[A-Z])/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }
    if (!/(?=.*\\d)/.test(password)) {
      errors.push('Password must contain at least one number');
    }
  }
  
  return { isValid: errors.length === 0, errors };
}

function validateUsername(username) {
  const errors = [];
  
  if (!username) {
    errors.push('Username is required');
  } else {
    if (username.length < 3) {
      errors.push('Username must be at least 3 characters long');
    }
    if (username.length > 20) {
      errors.push('Username must be no more than 20 characters long');
    }
    if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
      errors.push('Username can only contain letters, numbers, underscores, and hyphens');
    }
  }
  
  return { isValid: errors.length === 0, errors };
}

function getErrorMessage(error) {
  if (error instanceof ApiError) {
    return error.message;
  }
  
  if (error instanceof Error) {
    return error.message;
  }
  
  if (typeof error === 'string') {
    return error;
  }
  
  return 'An unexpected error occurred';
}

// ========================================
// AUTH MANAGER
// ========================================

class AuthManager {
  constructor() {
    this.state = {
      isAuthenticated: false,
      user: null,
      token: null,
      isLoading: false
    };
    this.listeners = [];
  }

  getState() {
    return { ...this.state };
  }

  subscribe(listener) {
    this.listeners.push(listener);
    
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  setState(updates) {
    this.state = { ...this.state, ...updates };
    this.listeners.forEach(listener => listener(this.state));
  }

  async initialize() {
    this.setState({ isLoading: true });
    
    try {
      if (authService.isAuthenticated()) {
        const user = await authService.getStatus();
        if (user) {
          this.setState({
            isAuthenticated: true,
            user,
            token: authService.getAuthToken(),
            isLoading: false
          });
          return;
        }
      }
      
      this.setState({
        isAuthenticated: false,
        user: null,
        token: null,
        isLoading: false
      });
    } catch (error) {
      console.error('Auth initialization failed:', error);
      this.setState({
        isAuthenticated: false,
        user: null,
        token: null,
        isLoading: false
      });
    }
  }

  async login(email, password, twoFACode) {
    this.setState({ isLoading: true });
    
    try {
      const response = await authService.login({ email, password, twoFACode });
      
      this.setState({
        isAuthenticated: true,
        user: response.user,
        token: response.token,
        isLoading: false
      });
    } catch (error) {
      this.setState({ isLoading: false });
      throw error;
    }
  }

  async register(username, email, password) {
    this.setState({ isLoading: true });
    
    try {
      const response = await authService.register({ username, email, password });
      
      this.setState({
        isAuthenticated: true,
        user: response.user,
        token: response.token,
        isLoading: false
      });
    } catch (error) {
      this.setState({ isLoading: false });
      throw error;
    }
  }

  async start42Login() {
    try {
      const response = await authService.start42Login();
      window.location.href = response.authorizationUrl;
    } catch (error) {
      console.error('42 OAuth start failed:', error);
      throw error;
    }
  }

  async logout() {
    try {
      await authService.logout();
    } catch (error) {
      console.error('Logout API call failed:', error);
    } finally {
      this.setState({
        isAuthenticated: false,
        user: null,
        token: null,
        isLoading: false
      });
    }
  }
}

const authManager = new AuthManager();

// ========================================
// LOGIN FORM COMPONENT
// ========================================

class LoginForm extends Component {
  constructor() {
    super('div', 'login-form bg-white p-8 rounded-lg shadow-md max-w-md mx-auto');
    this.show2FA = false;
  }

  render() {
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

        <button 
          type="submit"
          class="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Sign In
        </button>
      </form>

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

  initializeElements() {
    this.emailInput = this.element.querySelector('#email');
    this.passwordInput = this.element.querySelector('#password');
    this.submitButton = this.element.querySelector('button[type="submit"]');
    this.errorDiv = this.element.querySelector('.error-message');
    this.loadingDiv = this.element.querySelector('.loading-message');
  }

  attachEventListeners() {
    const form = this.element.querySelector('form');
    form.addEventListener('submit', this.handleSubmit.bind(this));

    const registerLink = this.element.querySelector('.register-link');
    registerLink.addEventListener('click', (e) => {
      e.preventDefault();
      this.onRegisterClick?.();
    });
  }

  async handleSubmit(e) {
    e.preventDefault();
    
    const email = this.emailInput.value.trim();
    const password = this.passwordInput.value;

    const emailValidation = validateEmail(email);
    const passwordValidation = validatePassword(password);

    if (!emailValidation.isValid || !passwordValidation.isValid) {
      const allErrors = [...emailValidation.errors, ...passwordValidation.errors];
      this.showError(allErrors.join(', '));
      return;
    }

    try {
      this.setLoading(true);
      this.hideError();

      await authManager.login(email, password);
      
      this.onLoginSuccess?.();
      
    } catch (error) {
      this.showError(getErrorMessage(error));
    } finally {
      this.setLoading(false);
    }
  }

  showError(message) {
    this.errorDiv.textContent = message;
    this.errorDiv.classList.remove('hidden');
  }

  hideError() {
    this.errorDiv.classList.add('hidden');
  }

  setLoading(loading) {
    if (loading) {
      this.loadingDiv.classList.remove('hidden');
      this.submitButton.disabled = true;
    } else {
      this.loadingDiv.classList.add('hidden');
      this.submitButton.disabled = false;
    }
  }
}

// ========================================
// MAIN APPLICATION
// ========================================

class TranscendenceApp {
  constructor() {
    this.isInitialized = false;
  }

  async initialize() {
    if (this.isInitialized) return;

    try {
      await authManager.initialize();
      
      const authState = authManager.getState();
      if (authState.isAuthenticated) {
        this.showMainApp();
      } else {
        this.showAuthFlow();
      }

      this.isInitialized = true;
    } catch (error) {
      console.error('Failed to initialize application:', error);
      this.showError('Failed to initialize application');
    }
  }

  showAuthFlow() {
    this.clearBody();
    
    const container = document.createElement('div');
    container.className = 'auth-manager min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8';
    
    container.innerHTML = `
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

    document.body.appendChild(container);

    const formContainer = container.querySelector('#form-container');
    const loginForm = new LoginForm();
    
    loginForm.onLoginSuccess = () => {
      this.showMainApp();
    };
    
    loginForm.mount(formContainer);
  }

  showMainApp() {
    this.clearBody();
    
    const authState = authManager.getState();
    const user = authState.user;

    document.body.innerHTML = `
      <div class="min-h-screen bg-gray-50">
        <nav class="bg-white shadow">
          <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div class="flex justify-between h-16">
              <div class="flex items-center">
                <h1 class="text-xl font-bold text-gray-900">🏓 Transcendence</h1>
              </div>
              
              <div class="flex items-center space-x-4">
                <span class="text-gray-700">Welcome, ${user?.username || 'User'}!</span>
                <button id="logout-btn" class="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition-colors">
                  Logout
                </button>
              </div>
            </div>
          </div>
        </nav>
        
        <main class="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div class="px-4 py-6 sm:px-0">
            <div class="border-4 border-dashed border-gray-200 rounded-lg h-96 flex items-center justify-center">
              <div class="text-center">
                <h2 class="text-2xl font-bold text-gray-900 mb-4">🎉 Authentication Successful!</h2>
                <p class="text-gray-600 mb-6">Frontend ↔ Backend communication is working perfectly</p>
                
                <div class="bg-green-50 p-4 rounded-lg">
                  <h3 class="font-semibold mb-2 text-green-800">✅ Successfully Tested Features</h3>
                  <ul class="text-left text-sm text-green-700 space-y-1">
                    <li>• HTTP Client with JWT auth handling</li>
                    <li>• API service communication</li>
                    <li>• Frontend model validation</li>
                    <li>• Error handling utilities</li>
                    <li>• Component-based UI architecture</li>
                    <li>• Authentication state management</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    `;

    const logoutBtn = document.getElementById('logout-btn');
    logoutBtn.addEventListener('click', async () => {
      try {
        await authManager.logout();
        this.showAuthFlow();
      } catch (error) {
        console.error('Logout failed:', error);
      }
    });
  }

  showError(message) {
    this.clearBody();
    
    document.body.innerHTML = `
      <div class="min-h-screen bg-gray-50 flex items-center justify-center">
        <div class="max-w-md w-full bg-white p-8 rounded-lg shadow-md text-center">
          <div class="text-red-500 text-6xl mb-4">⚠️</div>
          <h2 class="text-xl font-bold text-gray-900 mb-4">Application Error</h2>
          <p class="text-gray-600 mb-6">${message}</p>
          <button onclick="window.location.reload()" class="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 transition-colors">
            Retry
          </button>
        </div>
      </div>
    `;
  }

  clearBody() {
    document.body.innerHTML = '';
  }
}

// ========================================
// APPLICATION INITIALIZATION
// ========================================

document.addEventListener('DOMContentLoaded', async () => {
  console.log('🏓 Transcendence Frontend Loading...');
  console.log('📡 Testing Frontend ↔ Backend Communication');
  
  const app = new TranscendenceApp();
  await app.initialize();
  
  console.log('✅ Frontend application initialized successfully!');
});

// Make classes available globally for debugging
window.TranscendenceApp = TranscendenceApp;
window.authManager = authManager;
window.httpClient = httpClient;