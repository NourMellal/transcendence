import { Conversation } from "src/domain/entities/conversation.entity";

export interface IconversationRepository {  
     save(conversation : Conversation):Promise<void>  ;   
    findByUserId(userId: string): Promise<Conversation[]> ;   
    getUnreadCount(userId: string, recipientId: string): Promise<number> ;    
}