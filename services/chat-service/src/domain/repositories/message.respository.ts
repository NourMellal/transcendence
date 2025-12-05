import { Message } from "../entities/message.entity";
import { MessageType } from "../value-objects/messageType";

export interface IMessageRepository { 
    save(message:Message):Promise<void>  ;   
    findByType(
            type: MessageType,
            options: {
            limit: number;
            before?: Date;
            }
        ): Promise<Message[]>;    
    findPrivateMessages(
            userId1: string,
            userId2: string,
            options: {
            limit: number;
            before?: Date;
            }
        ): Promise<Message[]>;   
    findGameMessages(
        gameId: string,
        options: {
        limit: number;
        before?: Date;
        }
    ): Promise<Message[]>;
}