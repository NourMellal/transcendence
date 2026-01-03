import { DomainEvent } from "./DomainEvent";

export class InviteDeclinedEvent extends DomainEvent {
  constructor(
    public readonly inviteId: string,
    public readonly conversationId: string,
    public readonly declinedBy: string,
    public readonly declinedByUsername: string,
    public readonly inviterId: string,
    public readonly reason?: string
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
      declinedBy: this.declinedBy,
      declinedByUsername: this.declinedByUsername,
      inviterId: this.inviterId,
      reason: this.reason
    };
  }
} 