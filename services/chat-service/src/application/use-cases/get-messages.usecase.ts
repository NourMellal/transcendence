import { IMessageRepository } from 'src/domain/repositories/message.respository';
import { MessageType } from 'src/domain/value-objects/messageType';
import { Message } from '../../domain/entities/message.entity';
import { 
  GetMessagesRequestDTO, 
  GetMessagesResponseDTO, 
  MessageDTO 
} from '../dto/get-messages.dto';

/**
 * Use Case Interface
 */
export interface IGetMessagesUseCase {
  execute(dto: GetMessagesRequestDTO): Promise<GetMessagesResponseDTO>;
}

/**
 * Get Messages Use Case
 * 
 * Retrieves message history based on type:
 * - GLOBAL: Public messages visible to all users
 * - PRIVATE: 1-on-1 conversation between two users
 * - GAME: Messages in a specific game room
 * 
 * Supports cursor-based pagination for infinite scroll UX
 * 
 * @example
 * // Get last 50 global messages
 * const result = await getMessagesUseCase.execute({
 *   type: MessageType.GLOBAL,
 *   userId: 'user-123',
 *   limit: 50
 * });
 * 
 * // Get private conversation with Bob
 * const result = await getMessagesUseCase.execute({
 *   type: MessageType.PRIVATE,
 *   userId: 'alice-id',
 *   recipientId: 'bob-id',
 *   limit: 30
 * });
 * 
 * // Load more (infinite scroll)
 * const older = await getMessagesUseCase.execute({
 *   type: MessageType.PRIVATE,
 *   userId: 'alice-id',
 *   recipientId: 'bob-id',
 *   limit: 30,
 *   before: result.nextCursor  // Get messages older than last batch
 * });
 */
export class GetMessagesUseCase implements IGetMessagesUseCase {
  private readonly DEFAULT_LIMIT = 50;
  private readonly MAX_LIMIT = 100;

  constructor(private readonly messageRepository: IMessageRepository) {}

  /**
   * Execute the get messages workflow
   */
  async execute(dto: GetMessagesRequestDTO): Promise<GetMessagesResponseDTO> {
    // Step 1: Validate input
    this.validateRequest(dto);

    // Step 2: Normalize limit to acceptable range
    const limit = this.normalizeLimit(dto.limit);

    // Step 3: Parse cursor date (for pagination)
    const before = dto.before ? new Date(dto.before) : undefined;

    // Step 4: Fetch messages based on type
    let messages: Message[];

    switch (dto.type) {
      case MessageType.GLOBAL:
        messages = await this.fetchGlobalMessages(limit, before);
        break;

      case MessageType.PRIVATE:
        messages = await this.fetchPrivateMessages(
          dto.userId,
          dto.recipientId!,
          limit,
          before
        );
        break;

      case MessageType.GAME:
        messages = await this.fetchGameMessages(
          dto.gameId!,
          limit,
          before
        );
        break;

      default:
        throw new Error(`Invalid message type: ${dto.type}`);
    }

    // Step 5: Determine if there are more messages (pagination)
    const hasMore = messages.length > limit;
    if (hasMore) {
      messages = messages.slice(0, limit);  // Remove extra message
    }

    // Step 6: Calculate next cursor for pagination
    const nextCursor = this.calculateNextCursor(messages, hasMore);

    // Step 7: Convert entities to DTOs
    return {
      messages: messages.map(msg => this.toMessageDTO(msg)),
      hasMore,
      nextCursor
    };
  }

  // ============================================
  // PRIVATE HELPER METHODS - Validation
  // ============================================

  /**
   * Validate request parameters
   */
  private validateRequest(dto: GetMessagesRequestDTO): void {
    if (!dto.userId) {
      throw new Error('userId is required');
    }

    if (!Object.values(MessageType).includes(dto.type)) {
      throw new Error(`Invalid message type: ${dto.type}`);
    }

    // Type-specific validation
    if (dto.type === MessageType.PRIVATE && !dto.recipientId) {
      throw new Error('recipientId is required for PRIVATE messages');
    }

    if (dto.type === MessageType.GAME && !dto.gameId) {
      throw new Error('gameId is required for GAME messages');
    }
  }

  /**
   * Normalize limit to be within acceptable range
   */
  private normalizeLimit(limit?: number): number {
    if (!limit || limit < 1) {
      return this.DEFAULT_LIMIT;
    }
    if (limit > this.MAX_LIMIT) {
      return this.MAX_LIMIT;
    }
    return limit;
  }

  // ============================================
  // PRIVATE HELPER METHODS - Fetching
  // ============================================

  /**
   * Fetch global messages
   * Fetch limit + 1 to check if there are more messages
   */
  private async fetchGlobalMessages(
    limit: number,
    before?: Date
  ): Promise<Message[]> {
    return this.messageRepository.findByType(
      MessageType.GLOBAL,
      { 
        limit: limit + 1,  // +1 to check hasMore
        before 
      }
    );
  }

  /**
   * Fetch private conversation messages
   */
  private async fetchPrivateMessages(
    userId: string,
    recipientId: string,
    limit: number,
    before?: Date
  ): Promise<Message[]> {
    if (!recipientId) {
      throw new Error('recipientId is required for private messages');
    }

    return this.messageRepository.findPrivateMessages(
      userId,
      recipientId,
      { 
        limit: limit + 1,  // +1 to check hasMore
        before 
      }
    );
  }

  /**
   * Fetch game chat messages
   */
  private async fetchGameMessages(
    gameId: string,
    limit: number,
    before?: Date
  ): Promise<Message[]> {
    if (!gameId) {
      throw new Error('gameId is required for game messages');
    }

    // TODO: Verify user is in this game (call Game Service)
    // For MVP: Allow all users to read game messages

    return this.messageRepository.findGameMessages(
      gameId,
      { 
        limit: limit + 1,  // +1 to check hasMore
        before 
      }
    );
  }

  // ============================================
  // PRIVATE HELPER METHODS - Pagination
  // ============================================

  /**
   * Calculate next cursor for pagination
   * Returns ISO date string of oldest message if there are more
   */
  private calculateNextCursor(
    messages: Message[],
    hasMore: boolean
  ): string | undefined {
    if (!hasMore || messages.length === 0) {
      return undefined;
    }

    // Return createdAt of oldest message (last in array)
    const oldestMessage = messages[messages.length - 1];
    return oldestMessage.createdAt.toISOString();
  }

  // ============================================
  // PRIVATE HELPER METHODS - Conversion
  // ============================================

  /**
   * Convert Message entity to DTO
   */
  private toMessageDTO(message: Message): MessageDTO {
    return {
      id: message.id.toString(),
      senderId: message.senderId,
      senderUsername: message.senderUsername,
      content: message.content.getValue(),
      type: message.type,
      recipientId: message.recipientId,
      gameId: message.gameId,
      createdAt: message.createdAt.toISOString()
    };
  }
}
