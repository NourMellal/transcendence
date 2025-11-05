import { worker } from './mocks/browser';
import type { User, LoginRequest, SignUpRequest } from './types';

// Start MSW
worker.start({
  onUnhandledRequest: 'warn',
}).then(() => {
  console.log('🎭 MSW is running - Mock API enabled');
  initApp();
});

const API_BASE = 'http://localhost:3000';

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
    const response = await fetch(`${API_BASE}/auth/status`);
    const data = response.status === 401 ? null : await response.json();
    result.textContent = JSON.stringify({
      status: response.status,
      statusText: response.statusText,
      data,
    }, null, 2);
  } catch (error) {
    result.textContent = `Error: ${error}`;
  }
}

async function testUsersMe() {
  const result = document.getElementById('result-users-me')!;
  result.textContent = 'Testing...';

  try {
    const response = await fetch(`${API_BASE}/users/me`);
    const data = response.status === 401 ? null : await response.json();
    result.textContent = JSON.stringify({
      status: response.status,
      statusText: response.statusText,
      data,
    }, null, 2);
  } catch (error) {
    result.textContent = `Error: ${error}`;
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

    const response = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(loginData),
    });

    const data = await response.json();
    result.textContent = JSON.stringify({
      status: response.status,
      statusText: response.statusText,
      data,
    }, null, 2);
  } catch (error) {
    result.textContent = `Error: ${error}`;
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

    const response = await fetch(`${API_BASE}/auth/signup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(signupData),
    });

    const data = await response.json();
    result.textContent = JSON.stringify({
      status: response.status,
      statusText: response.statusText,
      data,
    }, null, 2);
  } catch (error) {
    result.textContent = `Error: ${error}`;
  }
}

async function testUpdateProfile() {
  const result = document.getElementById('result-update')!;
  result.textContent = 'Testing...';

  try {
    const updateData = {
      username: 'updated_ponger',
    };

    const response = await fetch(`${API_BASE}/users/me`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updateData),
    });

    const data = await response.json();
    result.textContent = JSON.stringify({
      status: response.status,
      statusText: response.statusText,
      data,
    }, null, 2);
  } catch (error) {
    result.textContent = `Error: ${error}`;
  }
}

async function testLogout() {
  const result = document.getElementById('result-logout')!;
  result.textContent = 'Testing...';

  try {
    const response = await fetch(`${API_BASE}/auth/logout`, {
      method: 'POST',
    });

    result.textContent = JSON.stringify({
      status: response.status,
      statusText: response.statusText,
      data: response.status === 204 ? 'No Content (Success)' : await response.text(),
    }, null, 2);
  } catch (error) {
    result.textContent = `Error: ${error}`;
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
