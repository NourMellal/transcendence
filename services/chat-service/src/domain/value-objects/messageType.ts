export enum MessageType {
  DIRECT = 'DIRECT', 
  GAME = 'GAME'  ,  
  INVITE = 'INVITE'  ,   
  INVITE_ACCEPTED = 'INVITE_ACCEPTED' ,  
  INVITE_DECLINED = 'INVITE_DECLINED' ,   
}

export namespace MessageType {
  export function isValid(type: string): type is MessageType {
    return Object.values(MessageType).includes(type as MessageType);
  }

  export function requiresRecipient(type: MessageType): boolean {
    return type !== MessageType.GAME;
  }

  export function requiresGameId(type: MessageType): boolean {
    return type === MessageType.GAME;
  }

  export function isDirectLike(type: MessageType): boolean {
    return type === MessageType.DIRECT || type === MessageType.INVITE || type === MessageType.INVITE_ACCEPTED || type === MessageType.INVITE_DECLINED;
  }
}
