
import { MessageType } from "src/domain/value-objects/messageType";
/**
 * Input DTO - Query parameters
 */
export interface GetMessagesRequestDTO {
  type: MessageType;           // DIRECT or GAME
  userId: string;              // Current user (for authorization)
  
  // For DIRECT messages
  recipientId?: string;        // The other user in conversation
  
  // For GAME messages
  gameId?: string;             // The game room
  
  // Pagination
  limit?: number;              // Default: 50, Max: 100
  before?: string;             // ISO date string for cursor pagination
}

/**
 * Output DTO - Message data
 */
export interface MessageDTO {
  id: string;
  conversationId: string;
  senderId: string;
  senderUsername: string;
  content: string;
  type: MessageType;
  recipientId?: string;
  gameId?: string;
  createdAt: string;
}

/**
 * Response with pagination info
 */
export interface GetMessagesResponseDTO {
  messages: MessageDTO[];
  hasMore: boolean;            // Are there older messages?
  nextCursor?: string;         // Date of oldest message (for next page)
}
