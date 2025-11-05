import { useState, useEffect } from 'react'
import './App.css'
import type { User } from './mocks/data'

const API_BASE_URL = 'http://localhost:3000/api';

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newUsername, setNewUsername] = useState('');

  // Fetch auth status on mount
  useEffect(() => {
    fetchAuthStatus();
  }, []);

  const fetchAuthStatus = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/auth/status`);
      if (!response.ok) {
        throw new Error('Not authenticated');
      }
      const data = await response.json();
      setUser(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch auth status');
    } finally {
      setLoading(false);
    }
  };

  const fetchUserProfile = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/users/me`);
      if (!response.ok) {
        throw new Error('Failed to fetch user profile');
      }
      const data = await response.json();
      setUser(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch user profile');
    } finally {
      setLoading(false);
    }
  };

  const updateUsername = async () => {
    if (!newUsername.trim()) {
      setError('Username cannot be empty');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/users/me`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username: newUsername }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to update username');
      }
      
      const data = await response.json();
      setUser(data);
      setNewUsername('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update username');
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/auth/logout`, {
        method: 'POST',
      });
      
      if (response.status === 204) {
        setUser(null);
        alert('Logged out successfully!');
      } else {
        throw new Error('Failed to logout');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to logout');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <h1>Mock API Testing - Auth & User Endpoints</h1>
      
      <div className="card">
        {loading && <p>Loading...</p>}
        {error && <p style={{ color: 'red' }}>Error: {error}</p>}
        
        {user ? (
          <div>
            <h2>Current User</h2>
            <div style={{ textAlign: 'left', margin: '20px auto', maxWidth: '400px' }}>
              <p><strong>ID:</strong> {user.id}</p>
              <p><strong>Username:</strong> {user.username}</p>
              <p><strong>Email:</strong> {user.email}</p>
              <p><strong>Avatar:</strong> {user.avatar || 'None'}</p>
              <p><strong>2FA Enabled:</strong> {user.is2FAEnabled ? 'Yes' : 'No'}</p>
              <p><strong>Status:</strong> {user.status}</p>
            </div>
            
            <div style={{ marginTop: '20px' }}>
              <h3>Update Username</h3>
              <input
                type="text"
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
                placeholder="New username"
                style={{ marginRight: '10px' }}
              />
              <button onClick={updateUsername} disabled={loading}>
                Update Username
              </button>
            </div>
            
            <div style={{ marginTop: '20px' }}>
              <button onClick={logout} disabled={loading}>
                Logout
              </button>
            </div>
          </div>
        ) : (
          <div>
            <p>Not logged in</p>
            <button onClick={fetchAuthStatus} disabled={loading}>
              Check Auth Status
            </button>
          </div>
        )}
        
        <div style={{ marginTop: '30px' }}>
          <button onClick={fetchAuthStatus} disabled={loading}>
            GET /auth/status
          </button>
          <button onClick={fetchUserProfile} disabled={loading} style={{ marginLeft: '10px' }}>
            GET /users/me
          </button>
        </div>
      </div>
      
      <p className="read-the-docs">
        This app demonstrates MSW-mocked API endpoints for user authentication and profile management.
      </p>
    </>
  )
}

export default App
