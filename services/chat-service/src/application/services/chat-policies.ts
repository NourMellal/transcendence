import { IFriendshipPolicy, IGameChatPolicy } from '../use-cases/sendMessageUseCase';
import { IUserServiceClient } from '../ports/user-service-client';
import { IGameServiceClient } from '../ports/game-service-client';

export class FriendshipPolicy implements IFriendshipPolicy {
  constructor(private readonly userServiceClient: IUserServiceClient) {}
  async ensureCanDirectMessage(senderId: string, recipientId: string): Promise<void> {   
    const blocked = await this.userServiceClient.isBlocked(senderId, recipientId);
    if (blocked) {
      throw new Error('You cannot send messages because one of the users has blocked the other');
    }
    await this.userServiceClient.ensureFriendship(senderId, recipientId);
  }
}

export class GameChatPolicy implements IGameChatPolicy {
  constructor(private readonly gameServiceClient: IGameServiceClient) {}

  async ensureCanChatInGame(gameId: string, userId: string): Promise<{ participants: [string, string] }> {
    const participants = await this.gameServiceClient.ensureUserInGame(gameId, userId);
    return { participants };
  }
}
