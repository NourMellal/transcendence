import { IMessageRepository } from 'src/domain/repositories/message.respository';
import { IconversationRepository } from 'src/domain/repositories/conversation-repository';
import { Message } from '../../domain/entities/message.entity';
import { MessageType } from '../../domain/value-objects/messageType';
import { SendMessageResponseDTO, InvitePayload } from '../dto/send-message.dto';
import { GameServiceClient } from '../../infrastructure/external/GameServiceClient';
import { InviteErrorHandler } from '../services/invite-error-handler';
import { logger } from '../../infrastructure/config';

export interface RespondInviteRequestDTO {
  inviteId: string;
  responderId: string;
  responderUsername: string;
}

export interface RespondInviteUseCaseResult extends SendMessageResponseDTO {
  error?: string;
  errorType?: string;
}

/**
 * Use case for responding to game invites
 * Handles acceptance/decline with proper error handling, rollback, and repository verification
 * Follows Single Responsibility Principle and Clean Code practices
 */
export class RespondInviteUseCase {
  constructor(
    private readonly messageRepository: IMessageRepository,
    private readonly conversationRepository: IconversationRepository,
    private readonly gameServiceClient: GameServiceClient,
    private readonly errorHandler?: InviteErrorHandler
  ) {}

  async accept(dto: RespondInviteRequestDTO): Promise<RespondInviteUseCaseResult> {
    return this.respond(dto, true);
  }

  async decline(dto: RespondInviteRequestDTO): Promise<RespondInviteUseCaseResult> {
    return this.respond(dto, false);
  }

  private async respond(dto: RespondInviteRequestDTO, accept: boolean): Promise<RespondInviteUseCaseResult> {
    // Step 1: Validate invite
    const { invite, conversation, invitePayload } = await this.validateInvite(dto);

    const inviterId = invite.senderId;
    const inviteeId = invite.recipientId!;

    let gameId: string | undefined;
    let gameCreationError: Error | null = null;

    // Step 2: Create game if accepting
    if (accept) {
      try {
        logger.info({ inviteId: dto.inviteId, inviterId, inviteeId }, '[RespondInviteUseCase] Creating game from invite');
        
        const game = await this.gameServiceClient.createGameFromInvite(inviteeId, inviterId, {
          mode: invitePayload?.mode,
          config: invitePayload?.config,
          timeoutMs: 10000, // 10 second timeout
          retries: 2, // 2 retries
        });
        gameId = game.id;

        // Step 3: Verify game was persisted
        const gameExists = await this.gameServiceClient.verifyGameExists(gameId);
        if (!gameExists) {
          throw new Error('Game was created but could not be verified in the repository');
        }

        logger.info({ gameId, inviteId: dto.inviteId }, '[RespondInviteUseCase] Game created and verified successfully');
      } catch (error) {
        gameCreationError = error as Error;
        logger.error({ error, inviteId: dto.inviteId }, '[RespondInviteUseCase] Failed to create game');

        // Handle error through error handler
        if (this.errorHandler) {
          const errorType = this.errorHandler.categorizeError(gameCreationError);
          await this.errorHandler.handleInviteAcceptanceError({
            inviteId: dto.inviteId,
            conversationId: conversation.id.toString(),
            senderId: dto.responderId,
            senderUsername: dto.responderUsername,
            recipientId: inviterId,
            errorType,
            errorMessage: gameCreationError.message,
          });
        }

        // Mark invite as failed to prevent duplicate attempts
        if (this.errorHandler) {
          await this.errorHandler.markInviteAsFailed(
            dto.inviteId,
            conversation.id.toString(),
            dto.responderId,
            dto.responderUsername,
            inviterId,
            gameCreationError.message
          );
        }

        // Return error response instead of throwing
        return {
          id: dto.inviteId,
          conversationId: conversation.id.toString(),
          senderId: dto.responderId,
          senderUsername: dto.responderUsername,
          content: JSON.stringify({ error: gameCreationError.message }),
          type: MessageType.INVITE_DECLINED, // Treat as declined
          recipientId: inviterId,
          invitePayload,
          createdAt: new Date().toISOString(),
          error: this.errorHandler?.getUserFriendlyMessage(this.errorHandler.categorizeError(gameCreationError)) || gameCreationError.message,
          errorType: this.errorHandler?.categorizeError(gameCreationError),
        };
      }
    }

    // Step 4: Create response message
    const responseType = accept && !gameCreationError ? MessageType.INVITE_ACCEPTED : MessageType.INVITE_DECLINED;
    const content = this.serializeResponseContent(responseType, invite.id.toString(), invitePayload, gameId);

    const responseMessage = Message.create({
      conversationId: conversation.id.toString(),
      senderId: dto.responderId,
      senderUsername: dto.responderUsername,
      content,
      type: responseType,
      recipientId: inviterId,
      gameId
    });

    // Step 5: Persist response message
    try {
      await this.messageRepository.save(responseMessage);
      logger.info({ messageId: responseMessage.id.toString() }, '[RespondInviteUseCase] Response message saved');
    } catch (error) {
      logger.error({ error }, '[RespondInviteUseCase] Failed to save response message');
      throw new Error('Failed to save invite response. Please try again.');
    }

    // Step 6: Update conversation
    try {
      conversation.updateLastMessageTime();
      await this.conversationRepository.save(conversation);
      logger.info({ conversationId: conversation.id.toString() }, '[RespondInviteUseCase] Conversation updated');
    } catch (error) {
      logger.error({ error }, '[RespondInviteUseCase] Failed to update conversation');
      // Don't throw here - message is saved, conversation update is less critical
    }

    // Step 7: Verify persistence
    const savedMessage = await this.messageRepository.findById(responseMessage.id.toString());
    if (!savedMessage) {
      logger.error({ messageId: responseMessage.id.toString() }, '[RespondInviteUseCase] Failed to verify message persistence');
      throw new Error('Response message could not be verified. Please check your connection.');
    }

    return {
      id: responseMessage.id.toString(),
      conversationId: responseMessage.conversationId,
      senderId: responseMessage.senderId,
      senderUsername: responseMessage.senderUsername,
      content: responseMessage.content.getValue(),
      type: responseMessage.type,
      recipientId: responseMessage.recipientId,
      gameId: responseMessage.gameId,
      invitePayload,
      createdAt: responseMessage.createdAt.toISOString()
    };
  }

  /**
   * Validate invite and check for duplicate responses
   * Extracted for better separation of concerns
   */
  private async validateInvite(dto: RespondInviteRequestDTO): Promise<{
    invite: Message;
    conversation: any;
    invitePayload: InvitePayload | undefined;
  }> {
    const invite = await this.messageRepository.findById(dto.inviteId);
    if (!invite) {
      throw new Error('Invite not found');
    }
    if (invite.type !== MessageType.INVITE) {
      throw new Error('Message is not an invite');
    }
    if (!invite.recipientId) {
      throw new Error('Invite is missing recipient');
    }
    if (invite.recipientId !== dto.responderId) {
      throw new Error('Only the invitee can respond to this invite');
    }

    const inviterId = invite.senderId;
    const inviteeId = invite.recipientId;

    const conversation = await this.conversationRepository.findByParticipants(inviterId, inviteeId, MessageType.DIRECT);
    if (!conversation) {
      throw new Error('Conversation for invite not found');
    }

    // Check if invite has already been responded to
    const existingResponse = await this.messageRepository.findResponseToInvite(
      conversation.id.toString(),
      dto.inviteId
    );
    if (existingResponse) {
      throw new Error('Invite has already been responded to');
    }

    const invitePayload = this.tryExtractInvitePayload(invite.content.getValue());

    return { invite, conversation, invitePayload };
  }

  private tryExtractInvitePayload(content: string): InvitePayload | undefined {
    try {
      const parsed = JSON.parse(content);
      if (parsed && typeof parsed === 'object' && 'invitePayload' in parsed) {
        return parsed.invitePayload as InvitePayload;
      }
    } catch (_err) {
      return undefined;
    }
    return undefined;
  }

  private serializeResponseContent(
    type: MessageType,
    inviteId: string,
    invitePayload?: InvitePayload,
    gameId?: string
  ): string {
    return JSON.stringify({
      kind: type,
      inviteId,
      invitePayload,
      gameId
    });
  }
}
