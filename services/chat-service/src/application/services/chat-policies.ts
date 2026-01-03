import { IFriendshipPolicy, IGameChatPolicy } from '../use-cases/sendMessageUseCase';
import { UserServiceClient } from '../../infrastructure/external/UserServiceClient';
import { GameServiceClient } from '../../infrastructure/external/GameServiceClient';

export class FriendshipPolicy implements IFriendshipPolicy {
  constructor(private readonly userServiceClient: UserServiceClient) {}
  async ensureCanDirectMessage(senderId: string, recipientId: string): Promise<void> {   
    const blocked = await this.userServiceClient.isBlocked(senderId, recipientId);
    if (blocked) {
      throw new Error('You cannot send messages because one of the users has blocked the other');
    }
    await this.userServiceClient.ensureFriendship(senderId, recipientId);
  }
}

export class GameChatPolicy implements IGameChatPolicy {
  constructor(private readonly gameServiceClient: GameServiceClient) {}

  async ensureCanChatInGame(gameId: string, userId: string): Promise<{ participants: [string, string] }> {
    const participants = await this.gameServiceClient.ensureUserInGame(gameId, userId);
    return { participants };
  }
}
