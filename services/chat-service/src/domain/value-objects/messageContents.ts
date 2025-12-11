export class MessageContent {
  private static readonly MAX_LENGTH = 500;
  private readonly value: string;
  constructor(content: string) {
    const trimmed = content.trim();
    if (!trimmed) {
      throw new Error('Message content cannot be empty');
    }

    if (trimmed.length > MessageContent.MAX_LENGTH) {
      throw new Error(
        `Message content exceeds maximum length of ${MessageContent.MAX_LENGTH} characters`
      );
    }
    this.value = trimmed;
  }
  getValue(): string {
    return this.value;
  }
  get length(): number {
    return this.value.length;
  }
  toString(): string {
    return this.value;
  }
}
