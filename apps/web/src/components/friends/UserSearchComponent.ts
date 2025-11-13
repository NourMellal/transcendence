import { Component } from '../base/Component';
import { FriendsManager, friendsManager } from './FriendsManager';
import type { User } from '../../models/Friends';

/**
 * User Search Component - Search for users and send friend requests
 */
export class UserSearchComponent extends Component {
  private friendsManager: FriendsManager;
  private searchInput: HTMLInputElement;
  private searchButton: HTMLButtonElement;
  private searchResults: HTMLElement;
  private loadingIndicator: HTMLElement;
  private errorMessage: HTMLElement;
  private emptyState: HTMLElement;

  constructor(friendsManagerInstance?: FriendsManager) {
    super('div', 'user-search');
    this.friendsManager = friendsManagerInstance || friendsManager;
    
    this.searchInput = this.createElement('input', 'search-input') as HTMLInputElement;
    this.searchButton = this.createElement('button', 'btn btn-primary search-btn', 'Search') as HTMLButtonElement;
    this.searchResults = this.createElement('div', 'search-results');
    this.loadingIndicator = this.createElement('div', 'loading-indicator', 'Searching...');
    this.errorMessage = this.createElement('div', 'error-message');
    this.emptyState = this.createElement('div', 'empty-state', 'No users found');
    
    this.setupSearchInput();
    this.setupEventListeners();
    
    // Subscribe to search results state changes
    this.subscribeToSignal(
      this.friendsManager.getFriendsState(),
      () => this.renderSearchResults()
    );
    
    this.render();
  }

  private setupSearchInput(): void {
    this.searchInput.type = 'text';
    this.searchInput.placeholder = 'Search for users by username...';
    this.searchInput.maxLength = 50;
  }

  private setupEventListeners(): void {
    // Search on button click
    this.addEventListener(this.searchButton, 'click', () => {
      this.performSearch();
    });
    
    // Search on Enter key
    this.addEventListener(this.searchInput, 'keypress', (event) => {
      if (event.key === 'Enter') {
        this.performSearch();
      }
    });
    
    // Clear results when input is cleared
    this.addEventListener(this.searchInput, 'input', () => {
      if (this.searchInput.value.trim() === '') {
        this.clearSearchResults();
      }
    });
  }

  protected render(): void {
    this.element.innerHTML = '';
    
    // Header
    const header = this.createElement('h2', 'section-title', 'Find Friends');
    this.element.appendChild(header);
    
    // Search form
    const searchForm = this.createElement('div', 'search-form');
    
    const inputWrapper = this.createElement('div', 'input-wrapper');
    inputWrapper.appendChild(this.searchInput);
    inputWrapper.appendChild(this.searchButton);
    
    searchForm.appendChild(inputWrapper);
    this.element.appendChild(searchForm);
    
    // Search results container
    this.element.appendChild(this.searchResults);
    
    // Initial render of search results
    this.renderSearchResults();
  }

  private renderSearchResults(): void {
    const state = this.friendsManager.getFriendsState().get();
    
    this.searchResults.innerHTML = '';
    
    // Show loading state
    if (state.isLoading && this.searchInput.value.trim() !== '') {
      this.searchResults.appendChild(this.loadingIndicator);
      return;
    }
    
    // Show error state
    if (state.error) {
      this.errorMessage.textContent = state.error;
      this.errorMessage.className = 'error-message show';
      
      const dismissButton = this.createElement('button', 'btn btn-sm', 'Dismiss');
      this.addEventListener(dismissButton, 'click', () => {
        this.friendsManager.clearError();
      });
      
      this.errorMessage.appendChild(dismissButton);
      this.searchResults.appendChild(this.errorMessage);
    }
    
    // Show search results
    if (state.searchResults.length === 0 && this.searchInput.value.trim() !== '' && !state.isLoading) {
      this.searchResults.appendChild(this.emptyState);
    } else if (state.searchResults.length > 0) {
      this.renderUserResults(state.searchResults);
    }
  }

  private renderUserResults(users: User[]): void {
    const resultsContainer = this.createElement('div', 'users-grid');
    
    users.forEach(user => {
      const userCard = this.createUserCard(user);
      resultsContainer.appendChild(userCard);
    });
    
    this.searchResults.appendChild(resultsContainer);
  }

  private createUserCard(user: User): HTMLElement {
    const card = this.createElement('div', 'user-card');
    
    // Avatar
    const avatar = this.createElement('div', 'user-avatar');
    if (user.avatar) {
      const avatarImg = this.createElement('img') as HTMLImageElement;
      avatarImg.src = user.avatar;
      avatarImg.alt = `${user.displayName || user.username} avatar`;
      avatar.appendChild(avatarImg);
    } else {
      avatar.textContent = (user.displayName || user.username).charAt(0).toUpperCase();
    }
    
    // Info
    const info = this.createElement('div', 'user-info');
    const name = this.createElement('h3', 'user-name', user.displayName || user.username);
    const username = this.createElement('p', 'user-username', `@${user.username}`);
    
    // Status indicator
    const status = this.createElement('div', `user-status ${(user.status || 'offline').toLowerCase()}`);
    status.textContent = user.status || 'Offline';
    
    info.appendChild(name);
    info.appendChild(username);
    info.appendChild(status);
    
    // Actions
    const actions = this.createElement('div', 'user-actions');
    
    // Check if user is already a friend or has pending request
    const friendshipStatus = this.getFriendshipStatus(user);
    
    if (friendshipStatus === 'none') {
      const addBtn = this.createElement('button', 'btn btn-sm btn-primary', 'Add Friend');
      this.addEventListener(addBtn, 'click', async () => {
        await this.sendFriendRequest(user);
      });
      actions.appendChild(addBtn);
    } else if (friendshipStatus === 'pending') {
      const pendingBtn = this.createElement('button', 'btn btn-sm btn-secondary disabled', 'Request Sent');
      pendingBtn.setAttribute('disabled', 'true');
      actions.appendChild(pendingBtn);
    } else if (friendshipStatus === 'friend') {
      const friendBtn = this.createElement('button', 'btn btn-sm btn-success disabled', 'Already Friends');
      friendBtn.setAttribute('disabled', 'true');
      actions.appendChild(friendBtn);
    }
    
    // Profile button
    const profileBtn = this.createElement('button', 'btn btn-sm btn-outline', 'View Profile');
    this.addEventListener(profileBtn, 'click', () => {
      this.viewUserProfile(user);
    });
    actions.appendChild(profileBtn);
    
    card.appendChild(avatar);
    card.appendChild(info);
    card.appendChild(actions);
    
    return card;
  }

  private getFriendshipStatus(user: User): 'none' | 'pending' | 'friend' {
    const state = this.friendsManager.getFriendsState().get();
    
    // Check if already friends
    if (state.friends.some(friend => friend.id === user.id)) {
      return 'friend';
    }
    
    // Check if there's a pending request (sent or received)
    const hasPendingRequest = state.sentRequests.some(request => 
      request.addresseeId === user.id
    ) || state.pendingRequests.some(request => 
      request.requesterId === user.id
    );
    
    if (hasPendingRequest) {
      return 'pending';
    }
    
    return 'none';
  }

  private async performSearch(): Promise<void> {
    const query = this.searchInput.value.trim();
    
    if (query === '') {
      this.clearSearchResults();
      return;
    }
    
    if (query.length < 2) {
      // Show inline error message instead
      this.showInlineError('Please enter at least 2 characters to search');
      return;
    }
    
    await this.friendsManager.searchUsers(query);
  }

  private clearSearchResults(): void {
    this.searchResults.innerHTML = '';
    // Clear search results in the state
    this.friendsManager.clearSearchResults();
  }

  private showInlineError(message: string): void {
    this.searchResults.innerHTML = '';
    const errorDiv = this.createElement('div', 'inline-error', message);
    this.searchResults.appendChild(errorDiv);
    
    // Clear error after 3 seconds
    setTimeout(() => {
      if (this.searchResults.contains(errorDiv)) {
        this.searchResults.removeChild(errorDiv);
      }
    }, 3000);
  }

  private async sendFriendRequest(user: User): Promise<void> {
    await this.friendsManager.sendFriendRequest(user.id);
    
    // Refresh search results to update button states
    if (this.searchInput.value.trim() !== '') {
      await this.performSearch();
    }
  }

  private viewUserProfile(user: User): void {
    // Navigate to user's profile
    // This would typically use the router
    console.log('Navigate to user profile:', user);
    // Example: window.location.hash = `#/profile/${user.id}`;
  }

  /**
   * Focus the search input
   */
  public focus(): void {
    this.searchInput.focus();
  }

  /**
   * Clear the search input and results
   */
  public clear(): void {
    this.searchInput.value = '';
    this.clearSearchResults();
  }

  /**
   * Set the search query and perform search
   */
  public async search(query: string): Promise<void> {
    this.searchInput.value = query;
    await this.performSearch();
  }
}