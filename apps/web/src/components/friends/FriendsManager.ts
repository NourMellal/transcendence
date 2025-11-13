import { Signal } from '../../core/Signal';
import { Component } from '../base/Component';
import { friendsService, FriendsService } from '../../services/api/FriendsService';
import type { User, Friendship, FriendsState } from '../../models/Friends';

/**
 * Friends Manager - Reactive state management for Friends System
 * Uses Signal-based architecture for reactive updates
 */
export class FriendsManager extends Component {
  // Reactive state using Signals
  private friendsState: Signal<FriendsState>;
  private friendsService: FriendsService;

  constructor(friendsServiceInstance?: FriendsService) {
    super('div', 'friends-manager');
    
    this.friendsService = friendsServiceInstance || friendsService;
    
    // Initialize reactive state
    this.friendsState = this.createSignal<FriendsState>({
      friends: [],
      pendingRequests: [],
      sentRequests: [],
      searchResults: [],
      isLoading: false,
      error: null
    });
  }

  /**
   * Get the friends state Signal for reactive subscriptions
   */
  public getFriendsState(): Signal<FriendsState> {
    return this.friendsState;
  }

  /**
   * Get current friends list
   */
  public getFriends(): User[] {
    return this.friendsState.get().friends;
  }

  /**
   * Get pending friend requests
   */
  public getPendingRequests(): Friendship[] {
    return this.friendsState.get().pendingRequests;
  }

  /**
   * Get sent friend requests
   */
  public getSentRequests(): Friendship[] {
    return this.friendsState.get().sentRequests;
  }

  /**
   * Get search results
   */
  public getSearchResults(): User[] {
    return this.friendsState.get().searchResults;
  }

  /**
   * Check if currently loading
   */
  public isLoading(): boolean {
    return this.friendsState.get().isLoading;
  }

  /**
   * Get current error
   */
  public getError(): string | null {
    return this.friendsState.get().error;
  }

  /**
   * Load friends list
   */
  public async loadFriends(): Promise<void> {
    try {
      this.setLoading(true);
      const friends = await this.friendsService.getFriends();
      
      this.updateState({
        friends,
        error: null
      });
    } catch (error: any) {
      this.setError(error.message || 'Failed to load friends');
    } finally {
      this.setLoading(false);
    }
  }

  /**
   * Load pending friend requests
   */
  public async loadPendingRequests(): Promise<void> {
    try {
      this.setLoading(true);
      const pendingRequests = await this.friendsService.getPendingRequests();
      
      this.updateState({
        pendingRequests,
        error: null
      });
    } catch (error: any) {
      this.setError(error.message || 'Failed to load pending requests');
    } finally {
      this.setLoading(false);
    }
  }

  /**
   * Load sent friend requests
   */
  public async loadSentRequests(): Promise<void> {
    try {
      this.setLoading(true);
      const sentRequests = await this.friendsService.getSentRequests();
      
      this.updateState({
        sentRequests,
        error: null
      });
    } catch (error: any) {
      this.setError(error.message || 'Failed to load sent requests');
    } finally {
      this.setLoading(false);
    }
  }

  /**
   * Search for users
   */
  public async searchUsers(query: string): Promise<void> {
    if (!query || query.trim().length < 2) {
      this.updateState({
        searchResults: [],
        error: null
      });
      return;
    }

    try {
      this.setLoading(true);
      const searchResults = await this.friendsService.searchUsers(query.trim());
      
      this.updateState({
        searchResults,
        error: null
      });
    } catch (error: any) {
      this.setError(error.message || 'Failed to search users');
    } finally {
      this.setLoading(false);
    }
  }

  /**
   * Send friend request
   */
  public async sendFriendRequest(toUserId: string, message?: string): Promise<void> {
    try {
      this.setLoading(true);
      await this.friendsService.sendFriendRequest(toUserId, message);
      
      // Reload sent requests to show the new request
      await this.loadSentRequests();
      
      // Clear search results
      this.updateState({
        searchResults: [],
        error: null
      });
    } catch (error: any) {
      this.setError(error.message || 'Failed to send friend request');
    } finally {
      this.setLoading(false);
    }
  }

  /**
   * Accept friend request
   */
  public async acceptFriendRequest(friendshipId: string): Promise<void> {
    try {
      this.setLoading(true);
      await this.friendsService.acceptFriendRequest(friendshipId);
      
      // Reload friends and pending requests
      await Promise.all([
        this.loadFriends(),
        this.loadPendingRequests()
      ]);
      
      this.setError(null);
    } catch (error: any) {
      this.setError(error.message || 'Failed to accept friend request');
    } finally {
      this.setLoading(false);
    }
  }

  /**
   * Decline friend request
   */
  public async declineFriendRequest(friendshipId: string): Promise<void> {
    try {
      this.setLoading(true);
      await this.friendsService.declineFriendRequest(friendshipId);
      
      // Reload pending requests
      await this.loadPendingRequests();
      
      this.setError(null);
    } catch (error: any) {
      this.setError(error.message || 'Failed to decline friend request');
    } finally {
      this.setLoading(false);
    }
  }

  /**
   * Remove friend
   */
  public async removeFriend(friendId: string): Promise<void> {
    try {
      this.setLoading(true);
      await this.friendsService.removeFriend(friendId);
      
      // Reload friends list
      await this.loadFriends();
      
      this.setError(null);
    } catch (error: any) {
      this.setError(error.message || 'Failed to remove friend');
    } finally {
      this.setLoading(false);
    }
  }

  /**
   * Clear error state
   */
  public clearError(): void {
    this.updateState({ error: null });
  }

  /**
   * Clear search results
   */
  public clearSearchResults(): void {
    this.updateState({ searchResults: [] });
  }

  /**
   * Initialize friends data
   */
  public async initialize(): Promise<void> {
    await Promise.all([
      this.loadFriends(),
      this.loadPendingRequests(),
      this.loadSentRequests()
    ]);
  }

  /**
   * Update friends state
   */
  private updateState(updates: Partial<FriendsState>): void {
    const currentState = this.friendsState.get();
    this.friendsState.set({
      ...currentState,
      ...updates
    });
  }

  /**
   * Set loading state
   */
  private setLoading(isLoading: boolean): void {
    this.updateState({ isLoading });
  }

  /**
   * Set error state
   */
  private setError(error: string | null): void {
    this.updateState({ error });
  }

  protected render(): void {
    // This component manages state but doesn't render UI directly
    // UI components will subscribe to its signals
    this.element.innerHTML = '';
  }
}

// Export singleton instance
export const friendsManager = new FriendsManager();