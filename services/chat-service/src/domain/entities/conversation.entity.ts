
import { ConversationId } from "../value-objects/conversationId";
import { MessageType } from "../value-objects/messageType";

export class Conversation {
  private constructor(
    private readonly _id: ConversationId,
    private readonly _participants: readonly [string, string], // Always exactly 2 users
    private readonly _type: MessageType,
    private readonly _gameId: string | undefined,
    private _lastMessageAt: Date
  ) {
  }

  // ============================================
  // FACTORY METHOD: Create New Conversation
  // ============================================
  static createDirect(userId1: string, userId2: string): Conversation {
    Conversation.validateDirectBusinessRules(userId1, userId2);
    const participants = [userId1, userId2].sort() as [string, string];
    return new Conversation(ConversationId.create(), participants, MessageType.DIRECT, undefined, new Date());
  }

  static createGame(gameId: string, userId1: string, userId2: string): Conversation {
    Conversation.validateGameBusinessRules(gameId, userId1, userId2);
    const participants = [userId1, userId2].sort() as [string, string];
    return new Conversation(ConversationId.create(), participants, MessageType.GAME, gameId, new Date());
  }

  // ============================================
  // FACTORY METHOD: Reconstitute from Database
  // ============================================
  static reconstitute(params: {
    id: string;
    participants: [string, string];
    type: MessageType;
    gameId?: string;
    lastMessageAt: Date;
  }): Conversation {
    const id = ConversationId.from(params.id);
    
    return new Conversation(
      id,
      params.participants,
      params.type,
      params.gameId,
      params.lastMessageAt
    );
  }

  // ============================================
  // BUSINESS RULES VALIDATION
  // ============================================
  private static validateDirectBusinessRules(userId1: string, userId2: string): void {
    // Rule 1: Both user IDs must be provided
    if (!userId1 || userId1.trim() === '') {
      throw new Error('First user ID is required');
    }

    if (!userId2 || userId2.trim() === '') {
      throw new Error('Second user ID is required');
    }

    // Rule 2: Cannot chat with yourself
    if (userId1 === userId2) {
      throw new Error('Cannot create conversation with yourself');
    }
  }

  private static validateGameBusinessRules(gameId: string, userId1: string, userId2: string): void {
    if (!gameId || gameId.trim() === '') {
      throw new Error('Game ID is required for game conversations');
    }
    this.validateDirectBusinessRules(userId1, userId2);
  }

  // ============================================
  // GETTERS
  // ============================================
  get id(): ConversationId {
    return this._id;
  }

  get participants(): readonly [string, string] {
    return this._participants;
  }

  get type(): MessageType {
    return this._type;
  }

  get gameId(): string | undefined {
    return this._gameId;
  }

  get lastMessageAt(): Date {
    return this._lastMessageAt;
  }

  // ============================================
  // DOMAIN METHODS (Business Logic)
  // ============================================
  
  /**
   * Update the last message timestamp
   * Call this when a new message is sent in this conversation
   */
  updateLastMessageTime(): void {
    this._lastMessageAt = new Date();
  }

  includesUser(userId: string): boolean {
    return this._participants.includes(userId);
  }

  /**
   * Get the other participant in the conversation
   * @param userId - The current user's ID
   * @returns The other user's ID
   * @throws Error if the user is not part of this conversation
   */
  getOtherParticipant(userId: string): string {
    if (!this.includesUser(userId)) {
      throw new Error('User is not part of this conversation');
    }

    return this._participants[0] === userId 
      ? this._participants[1] 
      : this._participants[0];
  }

  toJSON(): {
    id: string;
    participants: [string, string];
    type: MessageType;
    gameId?: string;
    lastMessageAt: string;
  } {
    return {
      id: this._id.toString(),
      participants: [...this._participants] as [string, string],
      type: this._type,
      gameId: this._gameId,
      lastMessageAt: this._lastMessageAt.toISOString()
    };
  }

  equals(other: Conversation): boolean {
    return this._id.equals(other._id);
  }

  /**
   * Check if this conversation is between the same two users
   * Useful for finding existing conversations
   */
  hasSameParticipants(userId1: string, userId2: string): boolean {
    const sorted = [userId1, userId2].sort();
    return (
      this._participants[0] === sorted[0] && 
      this._participants[1] === sorted[1]
    );
  }
}
