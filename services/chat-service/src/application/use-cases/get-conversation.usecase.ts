import { IconversationRepository } from 'src/domain/repositories/conversation-repository';
import { Conversation } from '../../domain/entities/conversation.entity';
import { 
  GetConversationsRequestDTO, 
  GetConversationsResponseDTO,
  ConversationDTO 
} from '../dto/get-conversations.dto';

/**
 * Use Case Interface
 */
export interface IGetConversationsUseCase {
  execute(dto: GetConversationsRequestDTO): Promise<GetConversationsResponseDTO>;
}

/**
 * Get Conversations Use Case
 * 
 * Retrieves all conversations for a user, ordered by most recent activity.
 * This powers the "inbox" or "conversation list" view in the chat UI.
 * 
 * @example
 * const result = await getConversationsUseCase.execute({
 *   userId: 'alice-id'
 * });
 * 
 * // Returns:
 * {
 *   conversations: [
 *     {
 *       id: "conv-1",
 *       otherUserId: "bob-id",
 *       lastMessageAt: "2025-12-07T14:00:00.000Z"
 *     },
 *     {
 *       id: "conv-2",
 *       otherUserId: "charlie-id",
 *       lastMessageAt: "2025-12-07T12:00:00.000Z"
 *     }
 *   ]
 * }
 */
export class GetConversationsUseCase implements IGetConversationsUseCase {
  constructor(
    private readonly conversationRepository: IconversationRepository
  ) {}

  /**
   * Execute the get conversations workflow
   */
  async execute(dto: GetConversationsRequestDTO): Promise<GetConversationsResponseDTO> {
    // Step 1: Validate input
    this.validateRequest(dto);

    // Step 2: Fetch all conversations for user
    const conversations = await this.conversationRepository.findByUserId(dto.userId);

    // Step 3: Convert to DTOs with additional data
    const conversationDTOs = await Promise.all(
      conversations.map(conv => this.toConversationDTO(conv, dto.userId))
    );

    // Step 4: Return response
    return {
      conversations: conversationDTOs
    };
  }

  // ============================================
  // PRIVATE HELPER METHODS
  // ============================================

  /**
   * Validate request parameters
   */
  private validateRequest(dto: GetConversationsRequestDTO): void {
    if (!dto.userId) {
      throw new Error('userId is required');
    }

    if (typeof dto.userId !== 'string' || dto.userId.trim() === '') {
      throw new Error('userId must be a non-empty string');
    }
  }

  /**
   * Convert Conversation entity to DTO
   * Includes calculating the "other user" and fetching unread count
   */
  private async toConversationDTO(
    conversation: Conversation,
    currentUserId: string
  ): Promise<ConversationDTO> {
    // Get the other participant (not the current user)
    const otherUserId = conversation.getOtherParticipant(currentUserId);

    // Get unread count for this conversation
    const unreadCount = await this.conversationRepository.getUnreadCount(
      currentUserId,
      otherUserId
    );

    // TODO: Fetch other user's username from User Service
    // const userDetails = await this.userServiceClient.getUserById(otherUserId);
    // For now: otherUsername is undefined (frontend can fetch separately)

    return {
      id: conversation.id.toString(),
      otherUserId,
      otherUsername: undefined,  // TODO: Integrate with User Service
      lastMessageAt: conversation.lastMessageAt.toISOString(),
      unreadCount
    };
  }
}
