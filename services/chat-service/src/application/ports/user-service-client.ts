export interface IUserServiceClient {
  isBlocked(senderId: string, recipientId: string): Promise<boolean>;
  ensureFriendship(senderId: string, recipientId: string): Promise<void>;
}
