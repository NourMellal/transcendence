import { MessageType } from "src/domain/value-objects/messageType";   

export interface SendMessageRequestDTO {
  senderId: string;           
  senderUsername: string;     
  content: string;           
  type: MessageType;         
  recipientId?: string;     
  gameId?: string;            
}


export interface SendMessageResponseDTO {
  id: string;
  senderId: string;
  senderUsername: string;
  content: string;
  type: MessageType;
  recipientId?: string;
  gameId?: string;
  createdAt: string;        
}