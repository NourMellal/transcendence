import { Database } from 'sqlite3';
import { Message } from '../../../domain/entities/message.entity';
import { IMessageRepository } from 'src/domain/repositories/message.respository';
import { MessageType } from '../../../domain/value-objects/messageType';

export class SQLiteMessageRepository implements IMessageRepository {
  constructor(private db: Database) {}

  async save(message: Message): Promise<void> {
    return new Promise((resolve, reject) => {
      const query = `
        INSERT OR REPLACE INTO messages (
          id,
          conversation_id,
          sender_id,
          sender_username,
          content,
          type,
          recipient_id,
          game_id,
          created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      const params = [
        message.id.toString(),
        message.conversationId,
        message.senderId,
        message.senderUsername,
        message.content.getValue(),
        message.type,
        message.recipientId || null,
        message.gameId || null,
        message.createdAt.toISOString()
      ];

      this.db.run(query, params, (err) => {
        if (err) {
          reject(new Error(`Failed to save message: ${err.message}`));
        } else {
          resolve();
        }
      });
    });
  }

  async findById(id: string): Promise<Message | null> {
    return new Promise((resolve, reject) => {
      const query = `
        SELECT * FROM messages
        WHERE id = ?
        LIMIT 1
      `;

      this.db.get(query, [id], (err, row: any) => {
        if (err) {
          reject(new Error(`Failed to find message: ${err.message}`));
        } else if (!row) {
          resolve(null);
        } else {
          resolve(this.mapRowToMessage(row));
        }
      });
    });
  }

  async findByConversationId(
    conversationId: string,
    options: { limit: number; before?: Date }
  ): Promise<Message[]> {
    return new Promise((resolve, reject) => {
      let query = 'SELECT * FROM messages WHERE conversation_id = ?';
      const params: any[] = [conversationId];

      if (options.before) {
        query += ' AND created_at < ?';
        params.push(options.before.toISOString());
      }

      query += ' ORDER BY created_at DESC LIMIT ?';
      params.push(options.limit);

      this.db.all(query, params, (err, rows: any[]) => {
        if (err) {
          reject(new Error(`Failed to find messages: ${err.message}`));
        } else {
          const messages = rows.map(row => this.mapRowToMessage(row));
          resolve(messages);
        }
      });
    });
  }

  async deleteByConversationId(conversationId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const query = `
        DELETE FROM messages
        WHERE conversation_id = ?
      `;

      this.db.run(query, [conversationId], (err) => {
        if (err) {
          reject(new Error(`Failed to delete messages: ${err.message}`));
        } else {
          resolve();
        }
      });
    });
  }

  async findLatestByConversationId(conversationId: string): Promise<Message | null> {
    return new Promise((resolve, reject) => {
      const query = `
        SELECT * FROM messages
        WHERE conversation_id = ?
        ORDER BY created_at DESC
        LIMIT 1
      `;

      this.db.get(query, [conversationId], (err, row: any) => {
        if (err) {
          reject(new Error(`Failed to find latest message: ${err.message}`));
        } else if (!row) {
          resolve(null);
        } else {
          resolve(this.mapRowToMessage(row));
        }
      });
    });
  }

  async findResponseToInvite(conversationId: string, inviteId: string): Promise<Message | null> {
    return new Promise((resolve, reject) => {
      const query = `
        SELECT * FROM messages
        WHERE conversation_id = ?
          AND (type = ? OR type = ?)
          AND content LIKE ?
        ORDER BY created_at ASC
        LIMIT 1
      `;

      const searchPattern = `%"inviteId":"${inviteId}"%`;
      const params = [conversationId, MessageType.INVITE_ACCEPTED, MessageType.INVITE_DECLINED, searchPattern];

      this.db.get(query, params, (err, row: any) => {
        if (err) {
          reject(new Error(`Failed to find invite response: ${err.message}`));
        } else if (!row) {
          resolve(null);
        } else {
          resolve(this.mapRowToMessage(row));
        }
      });
    });
  }

  private mapRowToMessage(row: any): Message {
    return Message.reconstitute({
      id: row.id,
      conversationId: row.conversation_id,
      senderId: row.sender_id,
      senderUsername: row.sender_username,
      content: row.content,
      type: row.type as MessageType,
      recipientId: row.recipient_id || undefined,
      gameId: row.game_id || undefined,
      createdAt: new Date(row.created_at)
    });
  }
}
