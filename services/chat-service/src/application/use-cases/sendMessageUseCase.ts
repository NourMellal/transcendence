import { Message } from '../../domain/entities/message.entity';
import { Conversation } from '../../domain/entities/conversation.entity';      
import { IMessageRepository } from 'src/domain/repositories/message.respository';
import { MessageType } from 'src/domain/value-objects/messageType';
import { SendMessageRequestDTO, SendMessageResponseDTO } from '../dto/send-message.dto';
import { IconversationRepository } from 'src/domain/repositories/conversation-repository';


/**
 * Use Case Interface
 */
export interface ISendMessageUseCase {
  execute(dto: SendMessageRequestDTO): Promise<SendMessageResponseDTO>;
}


/**
 * Send Message Use Case
 * 
 * Handles the complete workflow of sending a chat message:
 * - Validates permissions
 * - Creates and saves message
 * - Updates conversation (for private messages)
 * 
 * @example
 * const result = await sendMessageUseCase.execute({
 *   senderId: 'user-123',
 *   senderUsername: 'alice',
 *   content: 'Hello!',
 *   type: MessageType.PRIVATE,
 *   recipientId: 'user-456'
 * });
 */
export class SendMessageUseCase implements ISendMessageUseCase {
  constructor(
    private readonly messageRepository: IMessageRepository,
    private readonly conversationRepository: IconversationRepository  // ✅ Fixed
  ) {}


  /**
   * Execute the send message workflow
   */
  async execute(dto: SendMessageRequestDTO): Promise<SendMessageResponseDTO> {
    // Step 1: Validate business permissions
    await this.validatePermissions(dto);


    // Step 2: Create Message entity
    // Entity validates: content length, type rules, required fields
    const message = Message.create({
      senderId: dto.senderId,
      senderUsername: dto.senderUsername,
      content: dto.content,
      type: dto.type,
      recipientId: dto.recipientId,
      gameId: dto.gameId
    });


    // Step 3: Persist message to database
    await this.messageRepository.save(message);


    // Step 4: Handle conversation update (for private messages only)
    if (message.isPrivate() && dto.recipientId) {
      await this.handleConversation(dto.senderId, dto.recipientId);
    }


    // Step 5: Convert entity to DTO for response
    return this.toResponseDTO(message);
  }


  // ============================================
  // PRIVATE HELPER METHODS
  // ============================================


  /**
   * Validate user has permission to send this type of message
   */
  private async validatePermissions(dto: SendMessageRequestDTO): Promise<void> {
    // Validate PRIVATE message requirements
    if (dto.type === MessageType.PRIVATE) {
      if (!dto.recipientId) {
        throw new Error('recipientId is required for PRIVATE messages');
      }


      // Check if sender can message recipient
      // TODO: Integrate with User Service API
      // const canMessage = await this.userServiceClient.canMessage(
      //   dto.senderId, 
      //   dto.recipientId
      // );
      // if (!canMessage) {
      //   throw new Error('Cannot send message: users are not friends or user is blocked');
      // }


      // For now: Allow all private messages (MVP)
    }


    // Validate GAME message requirements
    if (dto.type === MessageType.GAME) {
      if (!dto.gameId) {
        throw new Error('gameId is required for GAME messages');
      }


      // Check if sender is in this game
      // TODO: Integrate with Game Service API
      // const isInGame = await this.gameServiceClient.isUserInGame(
      //   dto.senderId,
      //   dto.gameId
      // );
      // if (!isInGame) {
      //   throw new Error('Cannot send message: user is not in this game');
      // }


      // For now: Allow all game messages (MVP)
    }


    // GLOBAL messages: No special validation needed
  }


  /**
   * Handle conversation creation/update for private messages
   */
  private async handleConversation(
    senderId: string,
    recipientId: string
  ): Promise<void> {
    // Try to find existing conversation
    let conversation = await this.conversationRepository.findByParticipants(
      senderId,
      recipientId
    );


    if (!conversation) {
      // First message between these users - create new conversation
      conversation = Conversation.create(senderId, recipientId);
    } else {
      // Existing conversation - update last message timestamp
      conversation.updateLastMessageTime();
    }


    // Save (insert or update)
    await this.conversationRepository.save(conversation);
  }


  /**
   * Convert Message entity to response DTO
   */
  private toResponseDTO(message: Message): SendMessageResponseDTO {
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
