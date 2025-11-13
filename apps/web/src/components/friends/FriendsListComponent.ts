import { Component } from '../base/Component';
import { FriendsManager, friendsManager } from './FriendsManager';
import type { User } from '../../models/Friends';

/**
 * Friends List Component - Displays current friends with reactive updates
 */
export class FriendsListComponent extends Component {
  private friendsManager: FriendsManager;
  private friendsList: HTMLElement;
  private loadingIndicator: HTMLElement;
  private errorMessage: HTMLElement;
  private emptyState: HTMLElement;

  constructor(friendsManagerInstance?: FriendsManager) {
    super('div', 'friends-list');
    this.friendsManager = friendsManagerInstance || friendsManager;
    
    this.friendsList = this.createElement('div', 'friends-grid');
    this.loadingIndicator = this.createElement('div', 'loading-indicator', 'Loading friends...');
    this.errorMessage = this.createElement('div', 'error-message');
    this.emptyState = this.createElement('div', 'empty-state', 'No friends yet. Start by searching for users to add!');
    
    // Subscribe to friends state changes
    this.subscribeToSignal(
      this.friendsManager.getFriendsState(),
      () => this.render()
    );
    
    this.render();
  }

  protected render(): void {
    const state = this.friendsManager.getFriendsState().get();
    
    this.element.innerHTML = '';
    this.element.appendChild(this.createElement('h2', 'section-title', 'Friends'));
    
    // Show loading state
    if (state.isLoading) {
      this.element.appendChild(this.loadingIndicator);
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
      this.element.appendChild(this.errorMessage);
    }
    
    // Show friends or empty state
    if (state.friends.length === 0) {
      this.element.appendChild(this.emptyState);
    } else {
      this.renderFriendsGrid(state.friends);
      this.element.appendChild(this.friendsList);
    }
  }

  private renderFriendsGrid(friends: User[]): void {
    this.friendsList.innerHTML = '';
    
    friends.forEach(friend => {
      const friendCard = this.createFriendCard(friend);
      this.friendsList.appendChild(friendCard);
    });
  }

  private createFriendCard(friend: User): HTMLElement {
    const card = this.createElement('div', 'friend-card');
    
    // Avatar
    const avatar = this.createElement('div', 'friend-avatar');
    if (friend.avatar) {
      const avatarImg = this.createElement('img') as HTMLImageElement;
      avatarImg.src = friend.avatar;
      avatarImg.alt = `${friend.displayName || friend.username} avatar`;
      avatar.appendChild(avatarImg);
    } else {
      avatar.textContent = (friend.displayName || friend.username).charAt(0).toUpperCase();
    }
    
    // Info
    const info = this.createElement('div', 'friend-info');
    const name = this.createElement('h3', 'friend-name', friend.displayName || friend.username);
    const username = this.createElement('p', 'friend-username', `@${friend.username}`);
    
    // Status indicator
    const status = this.createElement('div', `friend-status ${(friend.status || 'offline').toLowerCase()}`);
    status.textContent = friend.status || 'Offline';
    
    info.appendChild(name);
    info.appendChild(username);
    info.appendChild(status);
    
    // Actions
    const actions = this.createElement('div', 'friend-actions');
    
    // Profile button
    const profileBtn = this.createElement('button', 'btn btn-sm btn-secondary', 'View Profile');
    this.addEventListener(profileBtn, 'click', () => {
      this.viewFriendProfile(friend);
    });
    
    // Remove friend button
    const removeBtn = this.createElement('button', 'btn btn-sm btn-danger', 'Remove');
    this.addEventListener(removeBtn, 'click', () => {
      this.removeFriend(friend);
    });
    
    actions.appendChild(profileBtn);
    actions.appendChild(removeBtn);
    
    card.appendChild(avatar);
    card.appendChild(info);
    card.appendChild(actions);
    
    return card;
  }

  private async removeFriend(friend: User): Promise<void> {
    const confirmed = confirm(`Are you sure you want to remove ${friend.displayName || friend.username} from your friends?`);
    
    if (confirmed) {
      await this.friendsManager.removeFriend(friend.id);
    }
  }

  private viewFriendProfile(friend: User): void {
    // Navigate to friend's profile
    // This would typically use the router
    console.log('Navigate to friend profile:', friend);
    // Example: window.location.hash = `#/profile/${friend.id}`;
  }

  /**
   * Initialize the component and load friends
   */
  public async initialize(): Promise<void> {
    await this.friendsManager.loadFriends();
  }
}