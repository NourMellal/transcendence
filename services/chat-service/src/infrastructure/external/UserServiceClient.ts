export class UserServiceClient {
  constructor(
    private readonly baseUrl: string,
    private readonly internalApiKey?: string
  ) {}

  async ensureFriendship(senderId: string, recipientId: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/friends`, {
      method: 'GET',
      headers: this.buildHeaders(senderId),
    });

    if (!response.ok) {
      throw new Error(`User service unavailable (status ${response.status})`);
    }

    const body = await response.json();
    const friends: any[] = (body as any)?.friends ?? [];
    const isFriend = friends.some(
      (friend) =>
        (friend.id === recipientId || friend.friendId === recipientId) &&
        (friend.friendshipStatus === 'accepted' || friend.status === 'accepted')
    );

    if (!isFriend) {
      throw new Error('You can only message accepted friends');
    }
  }

  private buildHeaders(userId: string): Record<string, string> {
    const headers: Record<string, string> = {
      'x-user-id': userId,
    };
    if (this.internalApiKey) {
      headers['x-internal-api-key'] = this.internalApiKey;
    }
    return headers;
  }
}
