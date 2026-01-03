import { MessageType } from "src/domain/value-objects/messageType";   

export interface InvitePayload {
  mode?: string;
  map?: string;
  notes?: string;
  config?: Record<string, unknown>;
}

export interface SendMessageRequestDTO {
  senderId: string;           
  senderUsername: string;     
  content: string;           
  type: MessageType;         
  recipientId?: string;     
  gameId?: string;            
  invitePayload?: InvitePayload;
}


export interface SendMessageResponseDTO {
  id: string;
  conversationId: string;
  senderId: string;
  senderUsername: string;
  content: string;
  type: MessageType;
  recipientId?: string;
  gameId?: string;
  invitePayload?: InvitePayload;
  createdAt: string;        
}
