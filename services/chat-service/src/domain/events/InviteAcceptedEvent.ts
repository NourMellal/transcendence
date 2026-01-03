import { DomainEvent } from "./DomainEvent";

export class InviteAcceptedEvent extends DomainEvent {
  constructor(
    public readonly inviteId: string,
    public readonly conversationId: string,
    public readonly acceptedBy: string,
    public readonly acceptedByUsername: string,
    public readonly gameId: string,
    public readonly inviterId: string
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
      acceptedBy: this.acceptedBy,
      acceptedByUsername: this.acceptedByUsername,
      gameId: this.gameId,
      inviterId: this.inviterId
    };
  }
} 