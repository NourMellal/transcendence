import { Component } from '../base/Component';
import { FriendsManager, friendsManager } from './FriendsManager';
import { FriendsListComponent } from './FriendsListComponent';
import { FriendRequestsComponent } from './FriendRequestsComponent';
import { UserSearchComponent } from './UserSearchComponent';

/**
 * Main Friends Component - Orchestrates all Friends System UI components
 * Uses tab-based navigation between different sections
 */
export class FriendsComponent extends Component {
  private friendsManager: FriendsManager;
  
  // Tab components
  private tabButtons: HTMLElement;
  private tabContents: HTMLElement;
  
  // Sub-components
  private friendsListComponent: FriendsListComponent;
  private friendRequestsComponent: FriendRequestsComponent;
  private userSearchComponent: UserSearchComponent;
  
  // Tab state
  private activeTab: 'friends' | 'requests' | 'search' = 'friends';
  
  constructor(friendsManagerInstance?: FriendsManager) {
    super('div', 'friends-component');
    this.friendsManager = friendsManagerInstance || friendsManager;
    
    // Initialize tab containers
    this.tabButtons = this.createElement('div', 'tab-buttons');
    this.tabContents = this.createElement('div', 'tab-contents');
    
    // Initialize sub-components
    this.friendsListComponent = new FriendsListComponent(this.friendsManager);
    this.friendRequestsComponent = new FriendRequestsComponent(this.friendsManager);
    this.userSearchComponent = new UserSearchComponent(this.friendsManager);
    
    // Setup tabs and render
    this.setupTabs();
    this.render();
    
    // Initialize all components
    this.initialize();
  }

  protected render(): void {
    this.element.innerHTML = '';
    
    // Header
    const header = this.createElement('div', 'friends-header');
    const title = this.createElement('h1', 'friends-title', 'Friends');
    header.appendChild(title);
    
    // Add notification badge for pending requests
    const state = this.friendsManager.getFriendsState().get();
    if (state.pendingRequests.length > 0) {
      const badge = this.createElement('span', 'notification-badge', state.pendingRequests.length.toString());
      header.appendChild(badge);
    }
    
    this.element.appendChild(header);
    
    // Tab navigation
    this.element.appendChild(this.tabButtons);
    
    // Tab contents
    this.element.appendChild(this.tabContents);
    
    // Render active tab
    this.renderActiveTab();
  }

  private setupTabs(): void {
    const tabs = [
      { id: 'friends', label: 'Friends', component: this.friendsListComponent },
      { id: 'requests', label: 'Requests', component: this.friendRequestsComponent },
      { id: 'search', label: 'Find Friends', component: this.userSearchComponent }
    ];
    
    tabs.forEach(tab => {
      const button = this.createElement('button', 
        `tab-button ${this.activeTab === tab.id ? 'active' : ''}`, 
        tab.label
      );
      
      this.addEventListener(button, 'click', () => {
        this.switchTab(tab.id as 'friends' | 'requests' | 'search');
      });
      
      this.tabButtons.appendChild(button);
    });
    
    // Subscribe to friends state changes to update badges
    this.subscribeToSignal(
      this.friendsManager.getFriendsState(),
      () => this.updateTabBadges()
    );
  }

  private switchTab(tabId: 'friends' | 'requests' | 'search'): void {
    this.activeTab = tabId;
    
    // Update button states
    const buttons = this.tabButtons.querySelectorAll('.tab-button');
    buttons.forEach((button, index) => {
      const tabIds = ['friends', 'requests', 'search'];
      if (tabIds[index] === tabId) {
        button.classList.add('active');
      } else {
        button.classList.remove('active');
      }
    });
    
    // Render active tab content
    this.renderActiveTab();
    
    // Focus search input when switching to search tab
    if (tabId === 'search') {
      setTimeout(() => {
        this.userSearchComponent.focus();
      }, 100);
    }
  }

  private renderActiveTab(): void {
    this.tabContents.innerHTML = '';
    
    let activeComponent: Component;
    
    switch (this.activeTab) {
      case 'friends':
        activeComponent = this.friendsListComponent;
        break;
      case 'requests':
        activeComponent = this.friendRequestsComponent;
        break;
      case 'search':
        activeComponent = this.userSearchComponent;
        break;
      default:
        activeComponent = this.friendsListComponent;
    }
    
    this.tabContents.appendChild(activeComponent.getElement());
  }

  private updateTabBadges(): void {
    const state = this.friendsManager.getFriendsState().get();
    const buttons = this.tabButtons.querySelectorAll('.tab-button');
    
    // Update requests tab badge
    const requestsButton = buttons[1]; // requests is the second tab
    const existingBadge = requestsButton.querySelector('.tab-badge');
    
    if (state.pendingRequests.length > 0) {
      if (!existingBadge) {
        const badge = this.createElement('span', 'tab-badge', state.pendingRequests.length.toString());
        requestsButton.appendChild(badge);
      } else {
        existingBadge.textContent = state.pendingRequests.length.toString();
      }
    } else if (existingBadge) {
      requestsButton.removeChild(existingBadge);
    }
  }

  /**
   * Initialize all components and load initial data
   */
  private async initialize(): Promise<void> {
    try {
      // Load initial data for all tabs
      await Promise.all([
        this.friendsListComponent.initialize(),
        this.friendRequestsComponent.initialize()
      ]);
    } catch (error) {
      console.error('Failed to initialize Friends component:', error);
    }
  }

  /**
   * Switch to a specific tab programmatically
   */
  public showTab(tabId: 'friends' | 'requests' | 'search'): void {
    this.switchTab(tabId);
  }

  /**
   * Get the current active tab
   */
  public getActiveTab(): 'friends' | 'requests' | 'search' {
    return this.activeTab;
  }

  /**
   * Refresh all data in the current tab
   */
  public async refresh(): Promise<void> {
    switch (this.activeTab) {
      case 'friends':
        await this.friendsListComponent.initialize();
        break;
      case 'requests':
        await this.friendRequestsComponent.initialize();
        break;
      case 'search':
        // No need to refresh search - it's user-initiated
        break;
    }
  }

  /**
   * Search for users from external call
   */
  public async searchUsers(query: string): Promise<void> {
    this.showTab('search');
    await this.userSearchComponent.search(query);
  }

  /**
   * Show friend requests tab with notification
   */
  public showFriendRequests(): void {
    this.showTab('requests');
  }
}