import { Component } from '../base/Component';
import { FriendsManager, friendsManager } from './FriendsManager';
import type { Friendship } from '../../models/Friends';

/**
 * Friend Requests Component - Displays pending and sent friend requests
 * Works with Friendship objects from the FriendsState
 */
export class FriendRequestsComponent extends Component {
  private friendsManager: FriendsManager;
  private pendingContainer: HTMLElement;
  private sentContainer: HTMLElement;
  private loadingIndicator: HTMLElement;
  private errorMessage: HTMLElement;

  constructor(friendsManagerInstance?: FriendsManager) {
    super('div', 'friend-requests');
    this.friendsManager = friendsManagerInstance || friendsManager;
    
    this.pendingContainer = this.createElement('div', 'pending-requests');
    this.sentContainer = this.createElement('div', 'sent-requests');
    this.loadingIndicator = this.createElement('div', 'loading-indicator', 'Loading requests...');
    this.errorMessage = this.createElement('div', 'error-message');
    
    // Subscribe to friend requests state changes
    this.subscribeToSignal(
      this.friendsManager.getFriendsState(),
      () => this.render()
    );
    
    this.render();
  }

  protected render(): void {
    const state = this.friendsManager.getFriendsState().get();
    
    this.element.innerHTML = '';
    this.element.appendChild(this.createElement('h2', 'section-title', 'Friend Requests'));
    
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
    
    // Render pending requests (requests sent TO me)
    this.renderPendingRequests(state.pendingRequests);
    this.element.appendChild(this.pendingContainer);
    
    // Render sent requests (requests I sent)
    this.renderSentRequests(state.sentRequests);
    this.element.appendChild(this.sentContainer);
  }

  private renderPendingRequests(requests: Friendship[]): void {
    this.pendingContainer.innerHTML = '';
    
    const title = this.createElement('h3', 'subsection-title', `Pending Requests (${requests.length})`);
    this.pendingContainer.appendChild(title);
    
    if (requests.length === 0) {
      const emptyState = this.createElement('p', 'empty-state-text', 'No pending friend requests');
      this.pendingContainer.appendChild(emptyState);
      return;
    }
    
    const requestsList = this.createElement('div', 'requests-list');
    
    requests.forEach(request => {
      const requestCard = this.createPendingRequestCard(request);
      requestsList.appendChild(requestCard);
    });
    
    this.pendingContainer.appendChild(requestsList);
  }

  private renderSentRequests(requests: Friendship[]): void {
    this.sentContainer.innerHTML = '';
    
    const title = this.createElement('h3', 'subsection-title', `Sent Requests (${requests.length})`);
    this.sentContainer.appendChild(title);
    
    if (requests.length === 0) {
      const emptyState = this.createElement('p', 'empty-state-text', 'No sent friend requests');
      this.sentContainer.appendChild(emptyState);
      return;
    }
    
    const requestsList = this.createElement('div', 'requests-list');
    
    requests.forEach(request => {
      const requestCard = this.createSentRequestCard(request);
      requestsList.appendChild(requestCard);
    });
    
    this.sentContainer.appendChild(requestsList);
  }

  private createPendingRequestCard(request: Friendship): HTMLElement {
    const card = this.createElement('div', 'request-card pending');
    
    // User info placeholder (we only have user ID from the Friendship)
    const userInfo = this.createElement('div', 'request-user-info');
    
    const avatar = this.createElement('div', 'request-avatar');
    // Use first letter of requester ID as placeholder - safe check for undefined
    const requesterId = request.requesterId || '';
    avatar.textContent = requesterId.charAt(0).toUpperCase() || '?';
    
    const details = this.createElement('div', 'request-details');
    const name = this.createElement('h4', 'request-name', `User ${requesterId.substring(0, 8)}...`);
    const requestId = this.createElement('p', 'request-id', `Request ID: ${request.id}`);
    const timestamp = this.createElement('p', 'request-timestamp', 
      `Received ${this.formatDate(request.createdAt)}`
    );
    
    details.appendChild(name);
    details.appendChild(requestId);
    details.appendChild(timestamp);
    
    userInfo.appendChild(avatar);
    userInfo.appendChild(details);
    
    // Actions
    const actions = this.createElement('div', 'request-actions');
    
    const acceptBtn = this.createElement('button', 'btn btn-sm btn-primary', 'Accept');
    this.addEventListener(acceptBtn, 'click', async () => {
      await this.acceptRequest(request);
    });
    
    const declineBtn = this.createElement('button', 'btn btn-sm btn-secondary', 'Decline');
    this.addEventListener(declineBtn, 'click', async () => {
      await this.declineRequest(request);
    });
    
    actions.appendChild(acceptBtn);
    actions.appendChild(declineBtn);
    
    card.appendChild(userInfo);
    card.appendChild(actions);
    
    return card;
  }

  private createSentRequestCard(request: Friendship): HTMLElement {
    const card = this.createElement('div', 'request-card sent');
    
    // User info placeholder (we only have user ID from the Friendship)
    const userInfo = this.createElement('div', 'request-user-info');
    
    const avatar = this.createElement('div', 'request-avatar');
    // Use first letter of addressee ID as placeholder
    avatar.textContent = request.addresseeId.charAt(0).toUpperCase();
    
    const details = this.createElement('div', 'request-details');
    const name = this.createElement('h4', 'request-name', `User ${request.addresseeId.substring(0, 8)}...`);
    const requestId = this.createElement('p', 'request-id', `Request ID: ${request.id}`);
    const timestamp = this.createElement('p', 'request-timestamp', 
      `Sent ${this.formatDate(request.createdAt)}`
    );
    
    details.appendChild(name);
    details.appendChild(requestId);
    details.appendChild(timestamp);
    
    userInfo.appendChild(avatar);
    userInfo.appendChild(details);
    
    // Actions
    const actions = this.createElement('div', 'request-actions');
    
    const cancelBtn = this.createElement('button', 'btn btn-sm btn-danger', 'Cancel');
    this.addEventListener(cancelBtn, 'click', async () => {
      await this.cancelRequest(request);
    });
    
    actions.appendChild(cancelBtn);
    
    card.appendChild(userInfo);
    card.appendChild(actions);
    
    return card;
  }

  private async acceptRequest(request: Friendship): Promise<void> {
    await this.friendsManager.acceptFriendRequest(request.id);
  }

  private async declineRequest(request: Friendship): Promise<void> {
    await this.friendsManager.declineFriendRequest(request.id);
  }

  private async cancelRequest(request: Friendship): Promise<void> {
    // Cancel is essentially declining our own sent request
    await this.friendsManager.declineFriendRequest(request.id);
  }

  private formatDate(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString();
  }

  /**
   * Initialize the component and load friend requests
   */
  public async initialize(): Promise<void> {
    await Promise.all([
      this.friendsManager.loadPendingRequests(),
      this.friendsManager.loadSentRequests()
    ]);
  }
}