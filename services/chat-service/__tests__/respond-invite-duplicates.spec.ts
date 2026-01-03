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

describe('RespondInviteUseCase - Duplicate Prevention', () => {
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

  it('prevents accepting an already accepted invite', async () => {
    const invitePayload = { mode: 'RANKED' };
    const inviteContent = JSON.stringify({ kind: MessageType.INVITE, invitePayload });

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

    const existingResponse = Message.reconstitute({
      id: 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12',
      conversationId: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      senderId: 'bob',
      senderUsername: 'bob',
      content: JSON.stringify({ kind: MessageType.INVITE_ACCEPTED, inviteId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' }),
      type: MessageType.INVITE_ACCEPTED,
      recipientId: 'alice',
      gameId: 'game-123',
      createdAt: new Date(),
    });

    vi.mocked(messageRepository.findById).mockResolvedValue(inviteMessage);
    vi.mocked(conversationRepository.findByParticipants).mockResolvedValue(conversation);
    vi.mocked(messageRepository.findResponseToInvite).mockResolvedValue(existingResponse);

    await expect(
      useCase.accept({
        inviteId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
        responderId: 'bob',
        responderUsername: 'bob',
      })
    ).rejects.toThrow('already been responded to');

    expect(gameServiceClient.createGameFromInvite).not.toHaveBeenCalled();
    expect(messageRepository.save).not.toHaveBeenCalled();
  });

  it('prevents declining an already declined invite', async () => {
    const invitePayload = { mode: 'CLASSIC' };
    const inviteContent = JSON.stringify({ kind: MessageType.INVITE, invitePayload });

    const inviteMessage = Message.reconstitute({
      id: 'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13',
      conversationId: 'e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13',
      senderId: 'charlie',
      senderUsername: 'charlie',
      content: inviteContent,
      type: MessageType.INVITE,
      recipientId: 'dave',
      createdAt: new Date(),
    });

    const conversation = Conversation.reconstitute({
      id: 'e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13',
      participants: ['charlie', 'dave'],
      type: MessageType.DIRECT,
      lastMessageAt: new Date(),
    });

    const existingResponse = Message.reconstitute({
      id: 'f0eebc99-9c0b-4ef8-bb6d-6bb9bd380a14',
      conversationId: 'e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13',
      senderId: 'dave',
      senderUsername: 'dave',
      content: JSON.stringify({ kind: MessageType.INVITE_DECLINED, inviteId: 'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13' }),
      type: MessageType.INVITE_DECLINED,
      recipientId: 'charlie',
      createdAt: new Date(),
    });

    vi.mocked(messageRepository.findById).mockResolvedValue(inviteMessage);
    vi.mocked(conversationRepository.findByParticipants).mockResolvedValue(conversation);
    vi.mocked(messageRepository.findResponseToInvite).mockResolvedValue(existingResponse);

    await expect(
      useCase.decline({
        inviteId: 'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13',
        responderId: 'dave',
        responderUsername: 'dave',
      })
    ).rejects.toThrow('already been responded to');

    expect(messageRepository.save).not.toHaveBeenCalled();
  });

  it('allows accepting an invite that has not been responded to', async () => {
    const invitePayload = { mode: 'RANKED' };
    const inviteContent = JSON.stringify({ kind: MessageType.INVITE, invitePayload });

    const inviteMessage = Message.reconstitute({
      id: '10eebc99-9c0b-4ef8-bb6d-6bb9bd380a15',
      conversationId: '20eebc99-9c0b-4ef8-bb6d-6bb9bd380a15',
      senderId: 'alice',
      senderUsername: 'alice',
      content: inviteContent,
      type: MessageType.INVITE,
      recipientId: 'bob',
      createdAt: new Date(),
    });

    const conversation = Conversation.reconstitute({
      id: '20eebc99-9c0b-4ef8-bb6d-6bb9bd380a15',
      participants: ['alice', 'bob'],
      type: MessageType.DIRECT,
      lastMessageAt: new Date(),
    });

    vi.mocked(messageRepository.findById).mockResolvedValue(inviteMessage);
    vi.mocked(conversationRepository.findByParticipants).mockResolvedValue(conversation);
    vi.mocked(messageRepository.findResponseToInvite).mockResolvedValue(null);

    const result = await useCase.accept({
      inviteId: '10eebc99-9c0b-4ef8-bb6d-6bb9bd380a15',
      responderId: 'bob',
      responderUsername: 'bob',
    });

    expect(messageRepository.findResponseToInvite).toHaveBeenCalledWith(
      '20eebc99-9c0b-4ef8-bb6d-6bb9bd380a15',
      '10eebc99-9c0b-4ef8-bb6d-6bb9bd380a15'
    );
    expect(gameServiceClient.createGameFromInvite).toHaveBeenCalled();
    expect(messageRepository.save).toHaveBeenCalled();
    expect(result.type).toBe(MessageType.INVITE_ACCEPTED);
  });
});
