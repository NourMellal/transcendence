export class UserServiceClient {
  constructor(
    private readonly baseUrl: string,
    private readonly internalApiKey?: string
  ) {}    
  async isBlocked(senderId: string, recipientId: string): Promise<boolean> {
    const response = await fetch(`${this.baseUrl}/friends`, {
      method: 'GET',
      headers: this.buildHeaders(senderId),
    });

    if (!response.ok) {
      throw new Error(`User service unavailable (status ${response.status})`);
    }
    const body = await response.json();
    const friends: any[] = (body as any)?.friends ?? [];
    const isBlocked = friends.some((friend) => {
      const friendId = friend.id ?? friend.friendId;
      const status = friend.friendshipStatus ?? friend.status;
      const blockedBy = friend.blockedBy;
      const matchesRecipient = friendId === recipientId;
      if (!matchesRecipient) {
        return false;
      }
      if (status === 'blocked') {
        return true;
      }

      if (blockedBy && (blockedBy === recipientId || blockedBy === senderId)) {
        return true;
      }

      return false;
    });

    return isBlocked;
  }
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
