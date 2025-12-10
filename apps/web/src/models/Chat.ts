/**
 * Chat-related types and interfaces
 * Aligned with backend chat-service API
 */

import type { ChatMessage as BaseChatMessage } from './Common';

/**
 * Chat message types
 */
export type ChatMessageType = 'DIRECT' | 'GAME';

/**
 * Extended Chat message interface for chat service
 * Extends the base ChatMessage from Common with additional fields
 */
export interface ChatMessage extends BaseChatMessage {
  senderAvatar?: string;
  gameId?: string;
  timestamp?: string; // ISO date (can use sentAt as fallback)
  isOwn?: boolean; // computed on frontend
  conversationId?: string; // added by backend for grouping
}

/**
 * Conversation interface
 * Represents a chat conversation with a friend or in a game
 */
export interface Conversation {
  conversationId: string;
  type: ChatMessageType;
  recipientId?: string;
  recipientUsername?: string;
  recipientAvatar?: string;
  gameId?: string;
  isOnline?: boolean;
  lastMessage?: ChatMessage;
  unreadCount: number;
}

/**
 * Typing indicator payload
 */
export interface TypingIndicator {
  userId: string;
  username: string;
  recipientId?: string;
  gameId?: string;
}

/**
 * Parameters for getting messages
 */
export interface GetMessagesParams {
  type: ChatMessageType;
  recipientId?: string;
  gameId?: string;
  page?: number;
  limit?: number;
}

/**
 * Parameters for sending a message
 */
export interface SendMessageParams {
  type: ChatMessageType;
  content: string;
  recipientId?: string;
  gameId?: string;
}

/**
 * Messages response with pagination
 */
export interface MessagesResponse {
  messages: ChatMessage[];
  hasMore: boolean;
  total: number;
}
