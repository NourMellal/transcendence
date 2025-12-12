import { randomUUID } from 'crypto';

export class MessageId {
  private constructor(private readonly value: string) {
    if (!this.isValidUUID(value)) {
      throw new Error('Invalid MessageId: must be a valid UUID');
    }
  }

  static create(): MessageId {
    return new MessageId(randomUUID());
  }

  static from(id: string): MessageId {
    return new MessageId(id);
  }

  toString(): string {
    return this.value;
  }

  equals(other: MessageId): boolean {
    return this.value === other.value;
  }

  private isValidUUID(uuid: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  }
}
