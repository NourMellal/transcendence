import { worker } from './mocks/browser';
import { HttpClient, AuthService, UserService } from './services';
import type { LoginRequest, SignUpRequest } from './models';

// Start MSW
worker.start({
  onUnhandledRequest: 'warn',
}).then(() => {
  console.log('🎭 MSW is running - Mock API enabled');
  initApp();
});

const API_BASE = 'http://localhost:3000';

// Initialize services
const httpClient = new HttpClient({ baseURL: API_BASE });
const authService = new AuthService(httpClient);
const userService = new UserService(httpClient);

async function initApp() {
  const statusDiv = document.getElementById('status')!;
  const contentDiv = document.getElementById('content')!;

  statusDiv.innerHTML = '<p>✅ MSW Started - Testing Mock Endpoints...</p>';

  // Create test UI
  contentDiv.innerHTML = `
    <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px;">
      <h2>Mock API Test Suite</h2>
      
      <section style="margin: 20px 0; padding: 15px; border: 1px solid #ddd; border-radius: 5px;">
        <h3>1. Auth Status</h3>
        <button id="test-status">Test GET /auth/status</button>
        <pre id="result-status" style="background: #f4f4f4; padding: 10px; margin-top: 10px;"></pre>
      </section>

      <section style="margin: 20px 0; padding: 15px; border: 1px solid #ddd; border-radius: 5px;">
        <h3>2. User Profile</h3>
        <button id="test-users-me">Test GET /users/me</button>
        <pre id="result-users-me" style="background: #f4f4f4; padding: 10px; margin-top: 10px;"></pre>
      </section>

      <section style="margin: 20px 0; padding: 15px; border: 1px solid #ddd; border-radius: 5px;">
        <h3>3. Login</h3>
        <button id="test-login">Test POST /auth/login</button>
        <pre id="result-login" style="background: #f4f4f4; padding: 10px; margin-top: 10px;"></pre>
      </section>

      <section style="margin: 20px 0; padding: 15px; border: 1px solid #ddd; border-radius: 5px;">
        <h3>4. Sign Up</h3>
        <button id="test-signup">Test POST /auth/signup</button>
        <pre id="result-signup" style="background: #f4f4f4; padding: 10px; margin-top: 10px;"></pre>
      </section>

      <section style="margin: 20px 0; padding: 15px; border: 1px solid #ddd; border-radius: 5px;">
        <h3>5. Update Profile</h3>
        <button id="test-update">Test PATCH /users/me</button>
        <pre id="result-update" style="background: #f4f4f4; padding: 10px; margin-top: 10px;"></pre>
      </section>

      <section style="margin: 20px 0; padding: 15px; border: 1px solid #ddd; border-radius: 5px;">
        <h3>6. Logout</h3>
        <button id="test-logout">Test POST /auth/logout</button>
        <pre id="result-logout" style="background: #f4f4f4; padding: 10px; margin-top: 10px;"></pre>
      </section>

      <section style="margin: 20px 0; padding: 15px; border: 1px solid #ddd; border-radius: 5px;">
        <h3>Run All Tests</h3>
        <button id="test-all" style="background: #4CAF50; color: white; padding: 10px 20px; border: none; border-radius: 4px; cursor: pointer;">Run All Tests</button>
      </section>
    </div>
  `;

  // Setup event listeners
  document.getElementById('test-status')?.addEventListener('click', testAuthStatus);
  document.getElementById('test-users-me')?.addEventListener('click', testUsersMe);
  document.getElementById('test-login')?.addEventListener('click', testLogin);
  document.getElementById('test-signup')?.addEventListener('click', testSignup);
  document.getElementById('test-update')?.addEventListener('click', testUpdateProfile);
  document.getElementById('test-logout')?.addEventListener('click', testLogout);
  document.getElementById('test-all')?.addEventListener('click', runAllTests);

  // Run initial test
  await testAuthStatus();
}

async function testAuthStatus() {
  const result = document.getElementById('result-status')!;
  result.textContent = 'Testing...';

  try {
    const user = await authService.getStatus();
    result.textContent = JSON.stringify({
      status: user ? 200 : 401,
      statusText: user ? 'OK' : 'Unauthorized',
      data: user,
    }, null, 2);
  } catch (error) {
    result.textContent = `Error: ${error}`;
  }
}

async function testUsersMe() {
  const result = document.getElementById('result-users-me')!;
  result.textContent = 'Testing...';

  try {
    const user = await userService.getProfile();
    result.textContent = JSON.stringify({
      status: 200,
      statusText: 'OK',
      data: user,
    }, null, 2);
  } catch (error) {
    const httpError = error as { status?: number; message?: string };
    result.textContent = JSON.stringify({
      status: httpError.status || 500,
      statusText: httpError.message || 'Error',
      data: null,
    }, null, 2);
  }
}

async function testLogin() {
  const result = document.getElementById('result-login')!;
  result.textContent = 'Testing...';

  try {
    const loginData: LoginRequest = {
      email: 'user@example.com',
      password: 'SecurePass123!',
    };

    const response = await authService.login(loginData);
    result.textContent = JSON.stringify({
      status: 200,
      statusText: 'OK',
      data: response,
    }, null, 2);
  } catch (error) {
    const httpError = error as { status?: number; message?: string };
    result.textContent = JSON.stringify({
      status: httpError.status || 500,
      statusText: httpError.message || 'Error',
      data: null,
    }, null, 2);
  }
}

async function testSignup() {
  const result = document.getElementById('result-signup')!;
  result.textContent = 'Testing...';

  try {
    const signupData: SignUpRequest = {
      username: 'newuser123',
      email: 'newuser@example.com',
      password: 'SecurePass123!',
      displayName: 'New User',
    };

    const user = await authService.signup(signupData);
    result.textContent = JSON.stringify({
      status: 201,
      statusText: 'Created',
      data: user,
    }, null, 2);
  } catch (error) {
    const httpError = error as { status?: number; message?: string };
    result.textContent = JSON.stringify({
      status: httpError.status || 500,
      statusText: httpError.message || 'Error',
      data: null,
    }, null, 2);
  }
}

async function testUpdateProfile() {
  const result = document.getElementById('result-update')!;
  result.textContent = 'Testing...';

  try {
    const updateData = {
      username: 'updated_ponger',
    };

    const user = await userService.updateProfile(updateData);
    result.textContent = JSON.stringify({
      status: 200,
      statusText: 'OK',
      data: user,
    }, null, 2);
  } catch (error) {
    const httpError = error as { status?: number; message?: string };
    result.textContent = JSON.stringify({
      status: httpError.status || 500,
      statusText: httpError.message || 'Error',
      data: null,
    }, null, 2);
  }
}

async function testLogout() {
  const result = document.getElementById('result-logout')!;
  result.textContent = 'Testing...';

  try {
    await authService.logout();
    result.textContent = JSON.stringify({
      status: 204,
      statusText: 'No Content',
      data: 'Logged out successfully',
    }, null, 2);
  } catch (error) {
    const httpError = error as { status?: number; message?: string };
    result.textContent = JSON.stringify({
      status: httpError.status || 500,
      statusText: httpError.message || 'Error',
      data: null,
    }, null, 2);
  }
}

async function runAllTests() {
  await testAuthStatus();
  await new Promise(resolve => setTimeout(resolve, 200));
  await testUsersMe();
  await new Promise(resolve => setTimeout(resolve, 200));
  await testLogin();
  await new Promise(resolve => setTimeout(resolve, 200));
  await testSignup();
  await new Promise(resolve => setTimeout(resolve, 200));
  await testUpdateProfile();
  await new Promise(resolve => setTimeout(resolve, 200));
  await testLogout();
}
