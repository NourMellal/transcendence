import { DomainEvent } from "./DomainEvent";  

export class MessageSentEvent extends DomainEvent {  
     constructor(  
        public readonly messageId: string,
        public readonly conversationId: string,
        public readonly senderId: string,
        public readonly senderUsername: string,
        public readonly content: string,
        public readonly messageType: string,
        public readonly recipientId?: string,
        public readonly gameId?: string
     ){  
        super() ; 
     } 

     getAggregateId(): string {
         return this.messageId
     }
     protected getEventData(): Record<string, any> {
           return {
            messageId: this.messageId,
            conversationId: this.conversationId,
            senderId: this.senderId,
            senderUsername: this.senderUsername,
            content: this.content,
            messageType: this.messageType,
            recipientId: this.recipientId,
            gameId: this.gameId
         };
     }
}