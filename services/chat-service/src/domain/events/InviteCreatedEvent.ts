import { DomainEvent } from "./DomainEvent";

export class InviteCreatedEvent extends DomainEvent {
  constructor(
    public readonly inviteId: string,
    public readonly conversationId: string,
    public readonly senderId: string,
    public readonly senderUsername: string,
    public readonly recipientId: string,
    public readonly recipientUsername: string,
    public readonly inviteType: string
  ) {
    super();
  }

  getAggregateId(): string {
    return this.inviteId;
  }

  protected getEventData(): Record<string, any> {
    return {
      inviteId: this.inviteId,
      conversationId: this.conversationId,
      senderId: this.senderId,
      senderUsername: this.senderUsername,
      recipientId: this.recipientId,
      recipientUsername: this.recipientUsername,
      inviteType: this.inviteType
    };
  }
}