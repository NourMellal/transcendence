import { Message } from "../entities/message.entity";

export interface IMessageRepository {
    save(message: Message): Promise<void>;
    findByConversationId(
        conversationId: string,
        options: {
            limit: number;
            before?: Date;
        }
    ): Promise<Message[]>;
    findLatestByConversationId(conversationId: string): Promise<Message | null>;
    deleteByConversationId(conversationId: string): Promise<void>;
}
