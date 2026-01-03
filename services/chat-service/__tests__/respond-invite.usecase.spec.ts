import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RespondInviteUseCase } from '../respond-invite.usecase';
import { MessageType } from '../../../domain/value-objects/messageType';
import { Message } from '../../../domain/entities/message.entity';
import { Conversation } from '../../../domain/entities/conversation.entity';
import type { IMessageRepository } from '../../../domain/repositories/message.respository';
import type { IconversationRepository } from '../../../domain/repositories/conversation-repository';
import type { GameServiceClient } from '../../../infrastructure/external/GameServiceClient';

function createMocks() {
  const messageRepository: IMessageRepository = {
    save: vi.fn().mockResolvedValue(undefined),
    findById: vi.fn(),
    findByConversationId: vi.fn(),
    findLatestByConversationId: vi.fn(),
    findResponseToInvite: vi.fn().mockResolvedValue(null),
  } as unknown as IMessageRepository;

  const conversationRepository: IconversationRepository = {
    save: vi.fn().mockResolvedValue(undefined),
    findByUserId: vi.fn(),
    getUnreadCount: vi.fn(),
    findByParticipants: vi.fn(),
    findByGameId: vi.fn(),
  } as unknown as IconversationRepository;

  const gameServiceClient: GameServiceClient = {
    ensureUserInGame: vi.fn(),
    createGameFromInvite: vi.fn().mockResolvedValue({ id: 'game-123' }),
  } as unknown as GameServiceClient;

  return { messageRepository, conversationRepository, gameServiceClient };
}

describe('RespondInviteUseCase', () => {
  let useCase: RespondInviteUseCase;
  let messageRepository: IMessageRepository;
  let conversationRepository: IconversationRepository;
  let gameServiceClient: GameServiceClient;

  beforeEach(() => {
    const mocks = createMocks();
    messageRepository = mocks.messageRepository;
    conversationRepository = mocks.conversationRepository;
    gameServiceClient = mocks.gameServiceClient;

    useCase = new RespondInviteUseCase(
      messageRepository,
      conversationRepository,
      gameServiceClient
    );
  });

  describe('accept', () => {
    it('accepts invite, creates game, and emits INVITE_ACCEPTED message', async () => {
      const invitePayload = { mode: 'RANKED', config: { scoreLimit: 5 } };
      const inviteContent = JSON.stringify({
        kind: MessageType.INVITE,
        note: 'play?',
        invitePayload,
      });

      const inviteMessage = Message.reconstitute({
        id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
        conversationId: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
        senderId: 'alice',
        senderUsername: 'alice',
        content: inviteContent,
        type: MessageType.INVITE,
        recipientId: 'bob',
        createdAt: new Date(),
      });

      const conversation = Conversation.reconstitute({
        id: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
        participants: ['alice', 'bob'],
        type: MessageType.DIRECT,
        lastMessageAt: new Date(),
      });

      vi.mocked(messageRepository.findById).mockResolvedValue(inviteMessage);
      vi.mocked(conversationRepository.findByParticipants).mockResolvedValue(conversation);

      const result = await useCase.accept({
        inviteId: 'invite-1',
        responderId: 'bob',
        responderUsername: 'bob',
      });

      expect(messageRepository.findById).toHaveBeenCalledWith('invite-1');
      expect(conversationRepository.findByParticipants).toHaveBeenCalledWith('alice', 'bob', MessageType.DIRECT);
      expect(gameServiceClient.createGameFromInvite).toHaveBeenCalledWith('bob', 'alice', {
        mode: 'RANKED',
        config: { scoreLimit: 5 },
      });

      expect(messageRepository.save).toHaveBeenCalledTimes(1);
      const savedMessage = (messageRepository.save as any).mock.calls[0][0];
      expect(savedMessage.type).toBe(MessageType.INVITE_ACCEPTED);
      expect(savedMessage.senderId).toBe('bob');
      expect(savedMessage.recipientId).toBe('alice');
      expect(savedMessage.gameId).toBe('game-123');

      expect(conversationRepository.save).toHaveBeenCalledTimes(1);

      expect(result.type).toBe(MessageType.INVITE_ACCEPTED);
      expect(result.gameId).toBe('game-123');
      expect(result.invitePayload).toEqual(invitePayload);
    });
  });

  describe('decline', () => {
    it('declines invite without creating game and emits INVITE_DECLINED message', async () => {
      const invitePayload = { mode: 'CLASSIC', notes: 'maybe later' };
      const inviteContent = JSON.stringify({
        kind: MessageType.INVITE,
        invitePayload,
      });

      const inviteMessage = Message.reconstitute({
        id: 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12',
        conversationId: 'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12',
        senderId: 'charlie',
        senderUsername: 'charlie',
        content: inviteContent,
        type: MessageType.INVITE,
        recipientId: 'dave',
        createdAt: new Date(),
      });

      const conversation = Conversation.reconstitute({
        id: 'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12',
        participants: ['charlie', 'dave'],
        type: MessageType.DIRECT,
        lastMessageAt: new Date(),
      });

      vi.mocked(messageRepository.findById).mockResolvedValue(inviteMessage);
      vi.mocked(conversationRepository.findByParticipants).mockResolvedValue(conversation);

      const result = await useCase.decline({
        inviteId: 'invite-2',
        responderId: 'dave',
        responderUsername: 'dave',
      });

      expect(messageRepository.findById).toHaveBeenCalledWith('invite-2');
      expect(gameServiceClient.createGameFromInvite).not.toHaveBeenCalled();

      expect(messageRepository.save).toHaveBeenCalledTimes(1);
      const savedMessage = (messageRepository.save as any).mock.calls[0][0];
      expect(savedMessage.type).toBe(MessageType.INVITE_DECLINED);
      expect(savedMessage.senderId).toBe('dave');
      expect(savedMessage.recipientId).toBe('charlie');
      expect(savedMessage.gameId).toBeUndefined();

      expect(conversationRepository.save).toHaveBeenCalledTimes(1);

      expect(result.type).toBe(MessageType.INVITE_DECLINED);
      expect(result.gameId).toBeUndefined();
      expect(result.invitePayload).toEqual(invitePayload);
    });
  });

  describe('error handling', () => {
    it('throws when invite not found', async () => {
      vi.mocked(messageRepository.findById).mockResolvedValue(null);

      await expect(
        useCase.accept({
          inviteId: 'missing',
          responderId: 'bob',
          responderUsername: 'bob',
        })
      ).rejects.toThrow('Invite not found');
    });

    it('throws when message is not an invite', async () => {
      const regularMessage = Message.reconstitute({
        id: 'e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13',
        conversationId: 'f0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13',
        senderId: 'alice',
        senderUsername: 'alice',
        content: 'hello',
        type: MessageType.DIRECT,
        recipientId: 'bob',
        createdAt: new Date(),
      });

      vi.mocked(messageRepository.findById).mockResolvedValue(regularMessage);

      await expect(
        useCase.accept({
          inviteId: 'msg-1',
          responderId: 'bob',
          responderUsername: 'bob',
        })
      ).rejects.toThrow('not an invite');
    });

    it('throws when responder is not the invitee', async () => {
      const inviteMessage = Message.reconstitute({
        id: '10eebc99-9c0b-4ef8-bb6d-6bb9bd380a14',
        conversationId: '20eebc99-9c0b-4ef8-bb6d-6bb9bd380a14',
        senderId: 'alice',
        senderUsername: 'alice',
        content: JSON.stringify({ kind: MessageType.INVITE }),
        type: MessageType.INVITE,
        recipientId: 'bob',
        createdAt: new Date(),
      });

      vi.mocked(messageRepository.findById).mockResolvedValue(inviteMessage);

      await expect(
        useCase.accept({
          inviteId: 'invite-3',
          responderId: 'charlie',
          responderUsername: 'charlie',
        })
      ).rejects.toThrow('Only the invitee can respond');
    });

    it('throws when conversation not found', async () => {
      const inviteMessage = Message.reconstitute({
        id: '30eebc99-9c0b-4ef8-bb6d-6bb9bd380a15',
        conversationId: '40eebc99-9c0b-4ef8-bb6d-6bb9bd380a15',
        senderId: 'alice',
        senderUsername: 'alice',
        content: JSON.stringify({ kind: MessageType.INVITE }),
        type: MessageType.INVITE,
        recipientId: 'bob',
        createdAt: new Date(),
      });

      vi.mocked(messageRepository.findById).mockResolvedValue(inviteMessage);
      vi.mocked(conversationRepository.findByParticipants).mockResolvedValue(null);

      await expect(
        useCase.accept({
          inviteId: 'invite-4',
          responderId: 'bob',
          responderUsername: 'bob',
        })
      ).rejects.toThrow('Conversation for invite not found');
    });
  });
});
