import { Conversation } from "src/domain/entities/conversation.entity";
import { MessageType } from "../value-objects/messageType";

export interface IconversationRepository {  
    save(conversation : Conversation):Promise<void>  ;   
    findByUserId(userId: string): Promise<Conversation[]> ;   
    getUnreadCount(userId: string, recipientId: string): Promise<number> ;    
    findByParticipants(userId1:string ,  userId2:string , type: MessageType):Promise<Conversation | null>  ;   
    findByGameId(gameId: string): Promise<Conversation | null>;
    deleteByGameId(gameId: string): Promise<void>;
}
