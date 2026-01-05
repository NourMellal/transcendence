import { MessageId } from '../value-objects/MessageId';
import { MessageContent } from '../value-objects/messageContents';
import { MessageType } from '../value-objects/messageType';

export class Message {
  private constructor(
    private readonly _id: MessageId,
    private readonly _conversationId: string,
    private readonly _senderId: string,
    private readonly _senderUsername: string,
    private readonly _content: MessageContent,
    private readonly _type: MessageType,
    private readonly _recipientId: string | undefined,
    private readonly _gameId: string | undefined,
    private readonly _createdAt: Date
  ) {}

  static create(params: {
    conversationId: string;
    senderId: string;
    senderUsername: string;
    content: string;
    type: MessageType;
    recipientId?: string;
    gameId?: string;
  }): Message {
    Message.validateBusinessRules(params);

    return new Message(
      MessageId.create(),
      params.conversationId,
      params.senderId,
      params.senderUsername,
      new MessageContent(params.content),
      params.type,
      params.recipientId,
      params.gameId,
      new Date()
    );
  }

  static reconstitute(params: {
    id: string;
    conversationId: string;
    senderId: string;
    senderUsername: string;
    content: string;
    type: MessageType;
    recipientId?: string;
    gameId?: string;
    createdAt: Date;
  }): Message {
    const id = MessageId.from(params.id);
    const content = new MessageContent(params.content);

    return new Message(
      id,
      params.conversationId,
      params.senderId,
      params.senderUsername,
      content,
      params.type,
      params.recipientId,
      params.gameId,
      params.createdAt
    );
  }

  private static validateBusinessRules(params: {
    conversationId: string;
    senderId: string;
    senderUsername: string;
    type: MessageType;
    recipientId?: string;
    gameId?: string;
  }): void {
    if (!params.conversationId || params.conversationId.trim() === '') {
      throw new Error('conversationId is required');
    }
    if (!params.senderId || params.senderId.trim() === '') {
      throw new Error('senderId is required');
    }
    if (!params.senderUsername || params.senderUsername.trim() === '') {
      throw new Error('senderUsername is required');
    }
    if (MessageType.requiresRecipient(params.type) && !params.recipientId) {
      throw new Error('RecipientId is required for this message type');
    }
    if (MessageType.requiresGameId(params.type) && !params.gameId) {
      throw new Error('GAME messages require a gameId');
    }
  }

  get id(): MessageId {
    return this._id;
  }

  get conversationId(): string {
    return this._conversationId;
  }

  get senderId(): string {
    return this._senderId;
  }

  get senderUsername(): string {
    return this._senderUsername;
  }

  get content(): MessageContent {
    return this._content;
  }

  get type(): MessageType {
    return this._type;
  }

  get recipientId(): string | undefined {
    return this._recipientId;
  }

  get gameId(): string | undefined {
    return this._gameId;
  }

  get createdAt(): Date {
    return this._createdAt;
  }

  isDirect(): boolean {
    return MessageType.isDirectLike(this._type);
  }

  isGameMessage(): boolean {
    return this._type === MessageType.GAME;
  }

  toJson(): {
    id: string;
    conversationId: string;
    senderId: string;
    senderUsername: string;
    content: string;
    type: MessageType;
    recipientId?: string;
    gameId?: string;
    createdAt: string;
  } {
    return {
      id: this._id.toString(),
      conversationId: this._conversationId,
      senderId: this._senderId,
      senderUsername: this._senderUsername,
      content: this.content.toString(),
      type: this._type,
      recipientId: this._recipientId,
      gameId: this._gameId,
      createdAt: this._createdAt.toISOString(),
    };
  }
}
