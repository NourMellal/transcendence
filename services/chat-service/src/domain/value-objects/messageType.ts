export enum MessageType {
  DIRECT = 'DIRECT',
  GAME = 'GAME'
}

export namespace MessageType {
  export function isValid(type: string): type is MessageType {
    return Object.values(MessageType).includes(type as MessageType);
  }

  export function requiresRecipient(type: MessageType): boolean {
    return type === MessageType.DIRECT;
  }

  export function requiresGameId(type: MessageType): boolean {
    return type === MessageType.GAME;
  }
}
