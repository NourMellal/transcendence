import { httpClient } from './client';
import {
  ChatMessage,
  Notification,
  PaginatedResponse
} from '../../models';

const API_PREFIX = '/api';

/**
 * Chat Service
 * Handles chat messages, notifications, and real-time communication
 */
export class ChatService {
  /**
   * Send a direct message to another user
   */
  async sendDirectMessage(recipientId: string, content: string): Promise<ChatMessage> {
    const response = await httpClient.post<ChatMessage>(`${API_PREFIX}/chat/messages`, {
      recipientId,
      content,
      type: 'text'
    });
    return response.data!;
  }

  /**
   * Send a game invitation through chat
   */
  async sendGameInvitation(recipientId: string, gameId: string): Promise<ChatMessage> {
    const response = await httpClient.post<ChatMessage>(`${API_PREFIX}/chat/messages`, {
      recipientId,
      content: `Game invitation: ${gameId}`,
      type: 'game_invite',
      data: { gameId }
    });
    return response.data!;
  }

  /**
   * Get chat messages with a specific user
   */
  async getDirectMessages(
    userId: string, 
    page = 1,
    limit = 50
  ): Promise<PaginatedResponse<ChatMessage>> {
    const response = await httpClient.get<PaginatedResponse<ChatMessage>>(
      `${API_PREFIX}/chat/messages/direct/${userId}?page=${page}&limit=${limit}`
    );
    return response.data!;
  }

  /**
   * Get all conversations (list of users with last message)
   */
  async getConversations(): Promise<Array<{
    userId: string;
    username: string;
    avatar?: string;
    lastMessage?: ChatMessage;
    unreadCount: number;
  }>> {
    const response = await httpClient.get<Array<{
      userId: string;
      username: string;
      avatar?: string;
      lastMessage?: ChatMessage;
      unreadCount: number;
    }>>(`${API_PREFIX}/chat/conversations`);
    return response.data!;
  }

  /**
   * Mark messages as read
   */
  async markAsRead(userId: string): Promise<void> {
    await httpClient.post(`${API_PREFIX}/chat/conversations/${userId}/read`);
  }

  /**
   * Get notifications
   */
  async getNotifications(page = 1, limit = 20): Promise<PaginatedResponse<Notification>> {
    const response = await httpClient.get<PaginatedResponse<Notification>>(
      `${API_PREFIX}/notifications?page=${page}&limit=${limit}`
    );
    return response.data!;
  }

  /**
   * Mark notification as read
   */
  async markNotificationAsRead(notificationId: string): Promise<void> {
    await httpClient.patch(`${API_PREFIX}/notifications/${notificationId}/read`);
  }

  /**
   * Mark all notifications as read
   */
  async markAllNotificationsAsRead(): Promise<void> {
    await httpClient.patch(`${API_PREFIX}/notifications/read-all`);
  }

  /**
   * Delete notification
   */
  async deleteNotification(notificationId: string): Promise<void> {
    await httpClient.delete(`${API_PREFIX}/notifications/${notificationId}`);
  }

  /**
   * Get unread notification count
   */
  async getUnreadCount(): Promise<{ messages: number; notifications: number }> {
    const response = await httpClient.get<{ messages: number; notifications: number }>(`${API_PREFIX}/chat/unread-count`);
    return response.data!;
  }

  /**
   * Block user from sending messages
   */
  async blockUser(userId: string): Promise<void> {
    await httpClient.post(`${API_PREFIX}/chat/block`, { userId });
  }

  /**
   * Unblock user
   */
  async unblockUser(userId: string): Promise<void> {
    await httpClient.delete(`${API_PREFIX}/chat/block/${userId}`);
  }

  /**
   * Get list of blocked users
   */
  async getBlockedUsers(): Promise<Array<{
    userId: string;
    username: string;
    blockedAt: string;
  }>> {
    const response = await httpClient.get<Array<{
      userId: string;
      username: string;
      blockedAt: string;
    }>>(`${API_PREFIX}/chat/blocked`);
    return response.data!;
  }

  /**
   * Delete conversation (clear message history)
   */
  async deleteConversation(userId: string): Promise<void> {
    await httpClient.delete(`${API_PREFIX}/chat/conversations/${userId}`);
  }
}

// Export singleton instance
export const chatService = new ChatService();
