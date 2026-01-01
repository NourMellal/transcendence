import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SendMessageUseCase } from '../sendMessageUseCase';
import { MessageType } from '../../../domain/value-objects/messageType';    
import type { IMessageRepository } from 'src/domain/repositories/message.respository';  
import type { IconversationRepository } from 'src/domain/repositories/conversation-repository';
import type { IFriendshipPolicy, IGameChatPolicy } from '../sendMessageUseCase';

const invitePayload = { mode: 'RANKED', map: 'desert', notes: 'bo3', config: { scoreLimit: 5 } };

function createMocks() {
  const messageRepository: IMessageRepository = {
    save: vi.fn().mockResolvedValue(undefined),
    findById: vi.fn().mockResolvedValue(null),
    findByConversationId: vi.fn(),
    findLatestByConversationId: vi.fn(),
  } as unknown as IMessageRepository;

  const conversationRepository: IconversationRepository = {
    save: vi.fn().mockResolvedValue(undefined),
    findByUserId: vi.fn(),
    getUnreadCount: vi.fn(),
    findByParticipants: vi.fn().mockResolvedValue(null),
    findByGameId: vi.fn(),
  } as unknown as IconversationRepository;

  const friendshipPolicy: IFriendshipPolicy = {
    ensureCanDirectMessage: vi.fn().mockResolvedValue(undefined),
  } as IFriendshipPolicy;

  const gameChatPolicy: IGameChatPolicy = {
    ensureCanChatInGame: vi.fn(),
  } as unknown as IGameChatPolicy;

  return { messageRepository, conversationRepository, friendshipPolicy, gameChatPolicy };
}

describe('SendMessageUseCase - INVITE flow', () => {
  let useCase: SendMessageUseCase;
  let messageRepository: IMessageRepository;
  let conversationRepository: IconversationRepository;
  let friendshipPolicy: IFriendshipPolicy;
  let gameChatPolicy: IGameChatPolicy;

  beforeEach(() => {
    const mocks = createMocks();
    messageRepository = mocks.messageRepository;
    conversationRepository = mocks.conversationRepository;
    friendshipPolicy = mocks.friendshipPolicy;
    gameChatPolicy = mocks.gameChatPolicy;

    useCase = new SendMessageUseCase(
      messageRepository,
      conversationRepository,
      friendshipPolicy,
      gameChatPolicy
    );
  });

  it('sends an invite as a direct-like message and persists payload', async () => {
    const result = await useCase.execute({
      senderId: 'u1',
      senderUsername: 'alice',
      content: 'let us play',
      type: MessageType.INVITE,
      recipientId: 'u2',
      invitePayload,
    });

    expect(friendshipPolicy.ensureCanDirectMessage).toHaveBeenCalledWith('u1', 'u2');
    expect(conversationRepository.findByParticipants).toHaveBeenCalledWith('u1', 'u2', MessageType.DIRECT);

    expect(messageRepository.save).toHaveBeenCalledTimes(1);
    const savedMessage = (messageRepository.save as any).mock.calls[0][0];
    expect(savedMessage.type).toBe(MessageType.INVITE);
    expect(savedMessage.recipientId).toBe('u2');
    expect(savedMessage.content.getValue()).toContain('invitePayload');

    expect(conversationRepository.save).toHaveBeenCalledTimes(1);
    const savedConversation = (conversationRepository.save as any).mock.calls[0][0];
    expect(savedConversation.type).toBe(MessageType.DIRECT);

    expect(result.type).toBe(MessageType.INVITE);
    expect(result.recipientId).toBe('u2');
    expect(result.invitePayload).toEqual(invitePayload);
  });

  it('rejects invite messages without recipientId', async () => {
    await expect(
      useCase.execute({
        senderId: 'u1',
        senderUsername: 'alice',
        content: 'hi',
        type: MessageType.INVITE,
      })
    ).rejects.toThrow('recipientId');
  });
});
