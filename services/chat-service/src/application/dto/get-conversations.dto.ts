/**
 * Input DTO - Request to get user's conversations
 */
export interface GetConversationsRequestDTO {
  userId: string;              // Current user requesting their conversations
}

/**
 * Single conversation in response
 */
export interface ConversationDTO {
  id: string;
  otherUserId: string;         // The other person in the conversation
  otherUsername?: string;      // Display name (optional, can be fetched from User Service)
  lastMessageAt: string;       // ISO 8601 format
  unreadCount?: number;        // Number of unread messages (optional for MVP)
}

/**
 * Output DTO - List of conversations
 */
export interface GetConversationsResponseDTO {
  conversations: ConversationDTO[];
}
