import { Message } from "../entities/message.entity";

export interface IMessageRepository {
    save(message: Message): Promise<void>;
    findById(id: string): Promise<Message | null>;
    findByConversationId(
        conversationId: string,
        options: {
            limit: number;
            before?: Date;
        }
    ): Promise<Message[]>;
    findLatestByConversationId(conversationId: string): Promise<Message | null>;
    findResponseToInvite(conversationId: string, inviteId: string): Promise<Message | null>;
}
