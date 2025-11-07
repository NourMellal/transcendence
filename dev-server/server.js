import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3001;

// Enable CORS for frontend-backend communication
app.use(cors());

// Parse JSON bodies
app.use(express.json());

// Serve static files (our frontend)
app.use(express.static(path.join(__dirname, '..')));

// Mock API endpoints for testing
app.use('/api', (req, res, next) => {
  console.log(`[API] ${req.method} ${req.path}`, req.body || '');
  next();
});

// Mock auth endpoints
app.post('/api/auth/login', (req, res) => {
  const { email, password, twoFACode } = req.body;
  
  // Mock successful login
  setTimeout(() => {
    res.json({
      user: {
        id: 'user-123',
        username: 'test_user',
        email: email,
        avatar: null,
        isTwoFAEnabled: false,
        status: 'ONLINE',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      token: 'mock-jwt-token-' + Date.now()
    });
  }, 1000); // Simulate network delay
});

app.post('/api/auth/register', (req, res) => {
  const { username, email, password } = req.body;
  
  // Mock successful registration
  setTimeout(() => {
    res.json({
      user: {
        id: 'user-' + Date.now(),
        username: username,
        email: email,
        avatar: null,
        isTwoFAEnabled: false,
        status: 'ONLINE',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      token: 'mock-jwt-token-' + Date.now()
    });
  }, 1500); // Simulate network delay
});

app.get('/api/auth/42/login', (req, res) => {
  res.json({
    authorizationUrl: 'https://api.intra.42.fr/oauth/authorize?mock=true',
    state: 'mock-state-123'
  });
});

app.get('/api/auth/status', (req, res) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No valid token provided' });
  }
  
  // Mock user status check
  res.json({
    id: 'user-123',
    username: 'test_user',
    email: 'test@example.com',
    avatar: null,
    isTwoFAEnabled: false,
    status: 'ONLINE',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  });
});

app.post('/api/auth/logout', (req, res) => {
  res.status(204).send();
});

// Mock user endpoints
app.get('/api/users/me', (req, res) => {
  res.json({
    id: 'user-123',
    username: 'test_user',
    email: 'test@example.com',
    avatar: null,
    isTwoFAEnabled: false,
    status: 'ONLINE',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  });
});

// Catch-all for other API routes
app.all('/api/*', (req, res) => {
  console.log(`[API] Unhandled route: ${req.method} ${req.path}`);
  res.status(404).json({ 
    error: 'API endpoint not implemented yet',
    message: `${req.method} ${req.path} is not implemented in the mock server`
  });
});

// Serve index.html for SPA routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`🚀 Frontend Development Server running at http://localhost:${PORT}`);
  console.log('📁 Serving files from:', path.join(__dirname, '..'));
  console.log('🔌 Mock API endpoints available at http://localhost:${PORT}/api');
  console.log('');
  console.log('🧪 Testing the frontend:');
  console.log('  1. Open http://localhost:${PORT} in your browser');
  console.log('  2. Try logging in with any email/password');
  console.log('  3. Check browser console for API calls');
  console.log('  4. Check this terminal for mock API logs');
});