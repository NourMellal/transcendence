import { httpClient } from './client';
import {
  ChatMessage,
  Conversation,
  GetMessagesParams,
  MessagesResponse,
  SendMessageParams,
  Notification,
  PaginatedResponse
} from '../../models';

const API_PREFIX = '/chat';

/**
 * Chat Service
 * Handles chat messages, notifications, and real-time communication
 * Aligned with backend chat-service API endpoints
 */
export class ChatService {
  /**
   * Get paginated message history
   * GET /api/chat/messages?type=DIRECT|GAME&recipientId=X or &gameId=Y
   */
  async getMessages(params: GetMessagesParams): Promise<MessagesResponse> {
    const { type, recipientId, gameId, page = 1, limit = 50 } = params;
    
    let queryParams = `type=${type}&page=${page}&limit=${limit}`;
    
    if (recipientId) {
      queryParams += `&recipientId=${recipientId}`;
    }
    
    if (gameId) {
      queryParams += `&gameId=${gameId}`;
    }
    
    const response = await httpClient.get<MessagesResponse>(
      `${API_PREFIX}/messages?${queryParams}`
    );
    return response.data!;
  }

  /**
   * Get all conversations with participants, type, lastMessage, unreadCount
   * GET /api/chat/conversations
   */
  async getConversations(): Promise<Conversation[]> {
    const response = await httpClient.get<Conversation[]>(`${API_PREFIX}/conversations`);
    // Handle both array response and object with data property
    const data = response.data;
    return Array.isArray(data) ? data : [];
  }

  /**
   * Send a message via REST (prefer WebSocket for real-time)
   * POST /api/chat/send
   */
  async sendMessage(params: SendMessageParams): Promise<ChatMessage> {
    const response = await httpClient.post<ChatMessage>(`${API_PREFIX}/send`, params);
    return response.data!;
  }

  /**
   * Mark messages as read
   */
  async markAsRead(conversationId: string): Promise<void> {
    await httpClient.post(`${API_PREFIX}/conversations/${conversationId}/read`, {});
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
    await httpClient.patch(`${API_PREFIX}/notifications/${notificationId}/read`, {});
  }

  /**
   * Mark all notifications as read
   */
  async markAllNotificationsAsRead(): Promise<void> {
    await httpClient.patch(`${API_PREFIX}/notifications/read-all`, {});
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
