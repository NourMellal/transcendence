export enum InviteErrorType {
  TIMEOUT = 'TIMEOUT',
  GAME_CREATION_FAILED = 'GAME_CREATION_FAILED',
  ALREADY_RESPONDED = 'ALREADY_RESPONDED',
  NOT_FOUND = 'NOT_FOUND',
  UNAUTHORIZED = 'UNAUTHORIZED',
  INVALID_REQUEST = 'INVALID_REQUEST',
  UNKNOWN = 'UNKNOWN'
}

export interface InviteErrorResponse {
  error: string;
  errorType: InviteErrorType;
  inviteId?: string;
}


export class InviteErrorCategorizer {

  static categorize(error: Error): InviteErrorType {
    const message = error.message.toLowerCase();
    
    if (message.includes('timeout')) {
      return InviteErrorType.TIMEOUT;
    }
    
    if (message.includes('game') || message.includes('creation failed')) {
      return InviteErrorType.GAME_CREATION_FAILED;
    }
    
    if (message.includes('already been responded') || message.includes('already responded')) {
      return InviteErrorType.ALREADY_RESPONDED;
    }
    
    if (message.includes('not found')) {
      return InviteErrorType.NOT_FOUND;
    }
    
    if (message.includes('unauthenticated') || message.includes('unauthorized')) {
      return InviteErrorType.UNAUTHORIZED;
    }
    
    if (message.includes('required') || message.includes('invalid')) {
      return InviteErrorType.INVALID_REQUEST;
    }
    
    return InviteErrorType.UNKNOWN;
  }
  

  static toHttpStatus(errorType: InviteErrorType): number {
    switch (errorType) {
      case InviteErrorType.TIMEOUT:
        return 504;
      case InviteErrorType.ALREADY_RESPONDED:
        return 409; 
      case InviteErrorType.NOT_FOUND:
        return 404; 
      case InviteErrorType.UNAUTHORIZED:
        return 401; 
      case InviteErrorType.INVALID_REQUEST:
        return 400; 
      case InviteErrorType.GAME_CREATION_FAILED:
      case InviteErrorType.UNKNOWN:
      default:
        return 400;
    }
  }
}
