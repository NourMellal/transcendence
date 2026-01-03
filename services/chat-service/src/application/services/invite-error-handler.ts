import { IMessageRepository } from '../../domain/repositories/message.respository';
import { IconversationRepository } from '../../domain/repositories/conversation-repository';
import { Message } from '../../domain/entities/message.entity';
import { MessageType } from '../../domain/value-objects/messageType';
import { createLogger } from '@transcendence/shared-logging';

const logger = createLogger('InviteErrorHandler');

export interface InviteErrorContext {
  inviteId: string;
  conversationId: string;
  senderId: string;
  senderUsername: string;
  recipientId: string;
  errorType: 'GAME_CREATION_FAILED' | 'TIMEOUT' | 'REPOSITORY_ERROR' | 'NETWORK_ERROR';
  errorMessage: string;
  gameId?: string;
}

/**
 * Handles invite-related errors with proper cleanup and notification
 * Follows Single Responsibility Principle - only handles error scenarios
 */
export class InviteErrorHandler {
  constructor(
    private readonly messageRepository: IMessageRepository,
    private readonly conversationRepository: IconversationRepository
  ) {}

  /**
   * Create an error response message when invite acceptance fails
   * This ensures the invite state is properly recorded even on failure
   */
  async handleInviteAcceptanceError(context: InviteErrorContext): Promise<void> {
    logger.error({ context }, '[InviteErrorHandler] Handling invite acceptance error');

    try {
      // Create an error notification message so users are informed
      const errorContent = JSON.stringify({
        kind: 'INVITE_ERROR',
        inviteId: context.inviteId,
        errorType: context.errorType,
        errorMessage: context.errorMessage,
        timestamp: new Date().toISOString()
      });

      const errorMessage = Message.create({
        conversationId: context.conversationId,
        senderId: 'system',
        senderUsername: 'System',
        content: errorContent,
        type: MessageType.DIRECT,
        recipientId: context.recipientId,
      });

      await this.messageRepository.save(errorMessage);
      logger.info({ inviteId: context.inviteId }, '[InviteErrorHandler] Error message saved successfully');
    } catch (saveError) {
      // If we can't even save the error message, just log it
      logger.error({ error: saveError, context }, '[InviteErrorHandler] Failed to save error message');
    }
  }

  /**
   * Mark an invite as failed due to timeout or other issues
   * This prevents duplicate acceptance attempts
   */
  async markInviteAsFailed(
    inviteId: string,
    conversationId: string,
    senderId: string,
    senderUsername: string,
    recipientId: string,
    reason: string
  ): Promise<void> {
    try {
      const failureContent = JSON.stringify({
        kind: 'INVITE_FAILED',
        inviteId,
        reason,
        timestamp: new Date().toISOString()
      });

      const failureMessage = Message.create({
        conversationId,
        senderId,
        senderUsername,
        content: failureContent,
        type: MessageType.INVITE_DECLINED, // Treat as declined to prevent re-acceptance
        recipientId,
      });

      await this.messageRepository.save(failureMessage);
      logger.info({ inviteId, reason }, '[InviteErrorHandler] Invite marked as failed');
    } catch (error) {
      logger.error({ error, inviteId }, '[InviteErrorHandler] Failed to mark invite as failed');
      throw error;
    }
  }

  /**
   * Categorize errors for better handling
   */
  categorizeError(error: Error): InviteErrorContext['errorType'] {
    const message = error.message.toLowerCase();

    if (message.includes('timeout') || message.includes('timed out')) {
      return 'TIMEOUT';
    }
    if (message.includes('game') || message.includes('create')) {
      return 'GAME_CREATION_FAILED';
    }
    if (message.includes('network') || message.includes('fetch') || message.includes('unavailable')) {
      return 'NETWORK_ERROR';
    }
    return 'REPOSITORY_ERROR';
  }

  /**
   * Get user-friendly error message
   */
  getUserFriendlyMessage(errorType: InviteErrorContext['errorType']): string {
    switch (errorType) {
      case 'TIMEOUT':
        return 'Game creation timed out. Please try again.';
      case 'GAME_CREATION_FAILED':
        return 'Failed to create game. Please check your connection and try again.';
      case 'NETWORK_ERROR':
        return 'Network error occurred. Please check your connection.';
      case 'REPOSITORY_ERROR':
        return 'An error occurred while processing your invite. Please try again.';
      default:
        return 'An unexpected error occurred. Please try again.';
    }
  }
}
