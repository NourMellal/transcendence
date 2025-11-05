import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Profile } from './Profile';
import * as api from '../services/api';

// Mock the API module
vi.mock('../services/api', () => ({
  userApi: {
    getMe: vi.fn(),
    updateProfile: vi.fn(),
  },
  ApiError: class ApiError extends Error {
    constructor(public status: number, message: string) {
      super(message);
    }
  },
}));

const mockUser = {
  id: '123e4567-e89b-12d3-a456-426614174000',
  email: 'test@example.com',
  username: 'testuser',
  avatar: undefined,
  isTwoFAEnabled: false,
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
};

describe('Profile Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows loading state initially', () => {
    vi.mocked(api.userApi.getMe).mockImplementation(() => new Promise(() => {}));
    render(<Profile />);
    expect(screen.getByText('Loading profile...')).toBeInTheDocument();
  });

  it('displays user information when loaded', async () => {
    vi.mocked(api.userApi.getMe).mockResolvedValue(mockUser);
    
    render(<Profile />);
    
    await waitFor(() => {
      expect(screen.getByDisplayValue('testuser')).toBeInTheDocument();
      expect(screen.getByDisplayValue('test@example.com')).toBeInTheDocument();
      expect(screen.getByDisplayValue(mockUser.id)).toBeInTheDocument();
    });
  });

  it('displays error message when API fails', async () => {
    vi.mocked(api.userApi.getMe).mockRejectedValue(new api.ApiError(500, 'Server error'));
    
    render(<Profile />);
    
    await waitFor(() => {
      expect(screen.getByText(/Failed to load user data/i)).toBeInTheDocument();
    });
  });

  it('enables editing mode when Edit Profile button is clicked', async () => {
    vi.mocked(api.userApi.getMe).mockResolvedValue(mockUser);
    const user = userEvent.setup();
    
    render(<Profile />);
    
    await waitFor(() => {
      expect(screen.getByText('Edit Profile')).toBeInTheDocument();
    });
    
    const editButton = screen.getByText('Edit Profile');
    await user.click(editButton);
    
    expect(screen.getByText('Save Changes')).toBeInTheDocument();
    expect(screen.getByText('Cancel')).toBeInTheDocument();
  });

  it('cancels editing and restores original values', async () => {
    vi.mocked(api.userApi.getMe).mockResolvedValue(mockUser);
    const user = userEvent.setup();
    
    render(<Profile />);
    
    await waitFor(() => {
      expect(screen.getByText('Edit Profile')).toBeInTheDocument();
    });
    
    // Enter edit mode
    await user.click(screen.getByText('Edit Profile'));
    
    // Change username
    const usernameInput = screen.getByDisplayValue('testuser');
    await user.clear(usernameInput);
    await user.type(usernameInput, 'newusername');
    
    // Cancel
    await user.click(screen.getByText('Cancel'));
    
    // Check username is restored
    expect(screen.getByDisplayValue('testuser')).toBeInTheDocument();
    expect(screen.getByText('Edit Profile')).toBeInTheDocument();
  });

  it('updates username successfully', async () => {
    const updatedUser = { ...mockUser, username: 'newusername' };
    vi.mocked(api.userApi.getMe).mockResolvedValue(mockUser);
    vi.mocked(api.userApi.updateProfile).mockResolvedValue(updatedUser);
    const user = userEvent.setup();
    
    render(<Profile />);
    
    await waitFor(() => {
      expect(screen.getByText('Edit Profile')).toBeInTheDocument();
    });
    
    // Enter edit mode
    await user.click(screen.getByText('Edit Profile'));
    
    // Change username
    const usernameInput = screen.getByDisplayValue('testuser');
    await user.clear(usernameInput);
    await user.type(usernameInput, 'newusername');
    
    // Save changes
    await user.click(screen.getByText('Save Changes'));
    
    await waitFor(() => {
      expect(screen.getByText('Profile updated successfully!')).toBeInTheDocument();
      expect(screen.getByDisplayValue('newusername')).toBeInTheDocument();
    });
  });

  it('shows error when update fails', async () => {
    vi.mocked(api.userApi.getMe).mockResolvedValue(mockUser);
    vi.mocked(api.userApi.updateProfile).mockRejectedValue(new api.ApiError(400, 'Invalid username'));
    const user = userEvent.setup();
    
    render(<Profile />);
    
    await waitFor(() => {
      expect(screen.getByText('Edit Profile')).toBeInTheDocument();
    });
    
    // Enter edit mode
    await user.click(screen.getByText('Edit Profile'));
    
    // Change username
    const usernameInput = screen.getByDisplayValue('testuser');
    await user.clear(usernameInput);
    await user.type(usernameInput, 'new');
    
    // Save changes
    await user.click(screen.getByText('Save Changes'));
    
    await waitFor(() => {
      expect(screen.getByText(/Failed to update profile/i)).toBeInTheDocument();
    });
  });

  it('displays 2FA status correctly', async () => {
    const userWith2FA = { ...mockUser, isTwoFAEnabled: true };
    vi.mocked(api.userApi.getMe).mockResolvedValue(userWith2FA);
    
    render(<Profile />);
    
    await waitFor(() => {
      expect(screen.getByText('Yes')).toBeInTheDocument();
    });
  });
});
