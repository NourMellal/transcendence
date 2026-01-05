import { Message } from '../../domain/entities/message.entity';
import { Conversation } from '../../domain/entities/conversation.entity';
import { IMessageRepository } from 'src/domain/repositories/message.respository';
import { MessageType } from 'src/domain/value-objects/messageType';
import { SendMessageRequestDTO, SendMessageResponseDTO } from '../dto/send-message.dto';
import { IconversationRepository } from 'src/domain/repositories/conversation-repository';
import { IEventBus } from '../../domain/events/IeventBus';
import { MessageSentEvent } from '../../domain/events/MessageSentEvent';
import { InviteCreatedEvent } from '../../domain/events/InviteCreatedEvent';

export interface IFriendshipPolicy {
  ensureCanDirectMessage(senderId: string, recipientId: string): Promise<void>;
}

export interface IGameChatPolicy {
  ensureCanChatInGame(gameId: string, userId: string): Promise<{ participants: [string, string] }>;
}

export interface ISendMessageUseCase {
  execute(dto: SendMessageRequestDTO): Promise<SendMessageResponseDTO>;
}

export class SendMessageUseCase implements ISendMessageUseCase {
  constructor(
    private readonly messageRepository: IMessageRepository,
    private readonly conversationRepository: IconversationRepository,
    private readonly friendshipPolicy: IFriendshipPolicy,
    private readonly gameChatPolicy: IGameChatPolicy,
    private readonly eventBus: IEventBus
  ) {}

  async execute(dto: SendMessageRequestDTO): Promise<SendMessageResponseDTO> {
    const type = this.normalizeType(dto.type);

    if (MessageType.isDirectLike(type)) {
      if (!dto.recipientId) {
        throw new Error('recipientId is required for this message type');
      }
      await this.friendshipPolicy.ensureCanDirectMessage(dto.senderId, dto.recipientId);
    }

    let gameParticipants: [string, string] | undefined;
    
    if (type === MessageType.GAME) {
      if (!dto.gameId) {
        throw new Error('gameId is required for GAME messages');
      }
      const { participants } = await this.gameChatPolicy.ensureCanChatInGame(dto.gameId, dto.senderId);
      gameParticipants = participants;

      // Ensure game conversation exists before saving message
      await this.ensureGameConversation(dto.gameId, participants[0], participants[1]);
    }

    const conversation = await this.resolveConversation(dto, type, gameParticipants);

    const contentToPersist = this.serializeContent(type, dto.content, dto.invitePayload);

    const message = Message.create({
      conversationId: conversation.id.toString(),
      senderId: dto.senderId,
      senderUsername: dto.senderUsername,
      content: contentToPersist,
      type,
      recipientId: dto.recipientId,
      gameId: dto.gameId
    });

    await this.messageRepository.save(message);

    conversation.updateLastMessageTime();
    await this.conversationRepository.save(conversation);

    // Publish domain event - decouples from infrastructure
    await this.eventBus.publish(new MessageSentEvent(
      message.id.toString(),
      conversation.id.toString(),
      message.senderId,
      message.senderUsername,
      message.content.getValue(),
      message.type,
      message.recipientId,
      message.gameId
    ));

    // Publish invite-specific event if it's an INVITE message
    if (type === MessageType.INVITE && dto.recipientId) {
      await this.eventBus.publish(new InviteCreatedEvent(
        message.id.toString(),
        conversation.id.toString(),
        message.senderId,
        message.senderUsername,
        dto.recipientId,
        '', // recipientUsername - could be added to DTO if needed
        MessageType.INVITE
      ));
    }

    return this.toResponseDTO(message, dto.invitePayload);
  }

  private normalizeType(raw: MessageType | string): MessageType {
    const upper = String(raw).toUpperCase();
    if (!MessageType.isValid(upper)) {
      throw new Error(`Invalid message type: ${raw}`);
    }
    return upper as MessageType;
  }

  private async resolveConversation(
    dto: SendMessageRequestDTO,
    type: MessageType,
    gameParticipants?: [string, string]
  ): Promise<Conversation> {
    if (MessageType.isDirectLike(type)) {
      const existing = await this.conversationRepository.findByParticipants(
        dto.senderId,
        dto.recipientId!,
        MessageType.DIRECT
      );
      if (existing) {
        return existing;
      }
      return Conversation.createDirect(dto.senderId, dto.recipientId!);
    }

    const existing = await this.conversationRepository.findByGameId(dto.gameId!);
    if (existing) {
      return existing;
    }
    if (!gameParticipants) {
      const ensured = await this.gameChatPolicy.ensureCanChatInGame(dto.gameId!, dto.senderId);
      gameParticipants = ensured.participants;
    }
    return Conversation.createGame(dto.gameId!, gameParticipants[0], gameParticipants[1]);
  }

  private async ensureGameConversation(gameId: string, player1: string, player2: string): Promise<void> {
    const existing = await this.conversationRepository.findByGameId(gameId);
    if (existing) {
      return;
    }
    const conversation = Conversation.createGame(gameId, player1, player2);
    await this.conversationRepository.save(conversation);
  }

  private serializeContent(type: MessageType, content: string, invitePayload?: any): string {
    if (type === MessageType.INVITE || type === MessageType.INVITE_ACCEPTED || type === MessageType.INVITE_DECLINED) {
      const note = (content ?? '').trim();
      const payload = invitePayload && Object.keys(invitePayload).length > 0 ? invitePayload : undefined;
      return JSON.stringify({ kind: type, note: note || undefined, invitePayload: payload });
    }
    return content;
  }

  private tryExtractInvitePayload(message: Message): any {
    if (message.type !== MessageType.INVITE && message.type !== MessageType.INVITE_ACCEPTED && message.type !== MessageType.INVITE_DECLINED) {
      return undefined;
    }
    try {
      const parsed = JSON.parse(message.content.getValue());
      if (parsed && typeof parsed === 'object' && 'invitePayload' in parsed) {
        return parsed.invitePayload;
      }
    } catch (_err) {
      return undefined;
    }
    return undefined;
  }

  private toResponseDTO(message: Message, invitePayload?: any): SendMessageResponseDTO {
    return {
      id: message.id.toString(),
      conversationId: message.conversationId,
      senderId: message.senderId,
      senderUsername: message.senderUsername,
      content: message.content.getValue(),
      type: message.type,
      recipientId: message.recipientId,
      gameId: message.gameId,
      invitePayload: invitePayload ?? this.tryExtractInvitePayload(message),
      createdAt: message.createdAt.toISOString()
    } 
    ;
  }
}
