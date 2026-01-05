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
    const { type, recipientId, gameId, limit = 50, before } = params;

    const search = new URLSearchParams();
    search.set('type', type);
    search.set('limit', String(limit));
    if (recipientId) search.set('recipientId', recipientId);
    if (gameId) search.set('gameId', gameId);
    if (before) search.set('before', before);

    const response = await httpClient.get<{
      messages: ChatMessage[];
      hasMore: boolean;
      nextCursor?: string;
    }>(`${API_PREFIX}/messages?${search.toString()}`);

    const data = response.data!;
    return {
      messages: data.messages ?? [],
      hasMore: data.hasMore ?? false,
      total: data.messages?.length ?? 0,
      nextCursor: data.nextCursor,
    } as unknown as MessagesResponse;
  }

  /**
   * Get all conversations with participants, type, lastMessage, unreadCount
   * GET /api/chat/conversations
   */
  async getConversations(): Promise<Conversation[]> {
    const response = await httpClient.get<{ conversations: Conversation[] }>(`${API_PREFIX}/conversations`);
    const data = response.data;
    if (Array.isArray((data as any)?.conversations)) {
      return (data as any).conversations;
    }
    return Array.isArray(data) ? (data as any) : [];
  }

  /**
   * Send a message via REST (prefer WebSocket for real-time)
   * POST /api/chat/send
   */
  async sendMessage(params: SendMessageParams): Promise<ChatMessage> {
    const response = await httpClient.post<ChatMessage>(`${API_PREFIX}/messages`, params);
    return response.data!;
  }

  /**
   * Mark messages as read
   */
  async markAsRead(conversationId: string): Promise<void> {
    await httpClient.post(`${API_PREFIX}/conversations/${conversationId}/read`, {});
  }

  /**
   * Accept a game invite
   * POST /api/chat/invites/:id/accept
   */
  async acceptInvite(inviteId: string): Promise<{ gameId: string; message: ChatMessage }> {
    const response = await httpClient.post<{ gameId: string; message: ChatMessage }>(`${API_PREFIX}/invites/${inviteId}/accept`, {});
    return response.data!;
  }

  /**
   * Decline a game invite
   * POST /api/chat/invites/:id/decline
   */
  async declineInvite(inviteId: string): Promise<{ message: ChatMessage }> {
    const response = await httpClient.post<{ message: ChatMessage }>(`${API_PREFIX}/invites/${inviteId}/decline`, {});
    return response.data!;
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
