import { Database } from 'sqlite3';
import { Message } from '../../../domain/entities/message.entity';
import { IMessageRepository } from 'src/domain/repositories/message.respository';
import { MessageType } from 'src/domain/value-objects/messageType';

export class SQLiteMessageRepository implements IMessageRepository {
  constructor(private db: Database) {}

  async save(message: Message): Promise<void> {
    return new Promise((resolve, reject) => {
      const query = `
        INSERT OR REPLACE INTO messages (
          id,
          sender_id,
          sender_username,
          content,
          type,
          recipient_id,
          game_id,
          created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `;

      const params = [
        message.id.toString(),
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

  async findByType(
    type: MessageType,
    options: { limit: number; before?: Date }
  ): Promise<Message[]> {
    return new Promise((resolve, reject) => {
      let query = 'SELECT * FROM messages WHERE type = ?';
      const params: any[] = [type];

      if (options.before) {
        query += ' AND created_at < ?';
        params.push(options.before.toISOString());
      }

      query += ' ORDER BY created_at DESC LIMIT ?';
      params.push(options.limit);

      this.db.all(query, params, (err, rows: any[]) => {
        if (err) {
          reject(new Error(`Failed to find messages by type: ${err.message}`));
        } else {
          const messages = rows.map(row => this.mapRowToMessage(row));
          resolve(messages);
        }
      });
    });
  }

  async findPrivateMessages(
    userId1: string,
    userId2: string,
    options: { limit: number; before?: Date }
  ): Promise<Message[]> {
    return new Promise((resolve, reject) => {
      let query = `
        SELECT * FROM messages 
        WHERE type = ? 
        AND (
          (sender_id = ? AND recipient_id = ?)
          OR
          (sender_id = ? AND recipient_id = ?)
        )
      `;

      const params: any[] = [
        MessageType.PRIVATE,
        userId1,
        userId2,
        userId2,
        userId1
      ];

      if (options.before) {
        query += ' AND created_at < ?';
        params.push(options.before.toISOString());
      }

      query += ' ORDER BY created_at DESC LIMIT ?';
      params.push(options.limit);

      this.db.all(query, params, (err, rows: any[]) => {
        if (err) {
          reject(new Error(`Failed to find private messages: ${err.message}`));
        } else {
          const messages = rows.map(row => this.mapRowToMessage(row));
          resolve(messages);
        }
      });
    });
  }

  async findGameMessages(
    gameId: string,
    options: { limit: number; before?: Date }
  ): Promise<Message[]> {
    return new Promise((resolve, reject) => {
      let query = 'SELECT * FROM messages WHERE type = ? AND game_id = ?';
      const params: any[] = [MessageType.GAME, gameId];

      if (options.before) {
        query += ' AND created_at < ?';
        params.push(options.before.toISOString());
      }

      query += ' ORDER BY created_at DESC LIMIT ?';
      params.push(options.limit);

      this.db.all(query, params, (err, rows: any[]) => {
        if (err) {
          reject(new Error(`Failed to find game messages: ${err.message}`));
        } else {
          const messages = rows.map(row => this.mapRowToMessage(row));
          resolve(messages);
        }
      });
    });
  }

  private mapRowToMessage(row: any): Message {
    return Message.reconstitute({
      id: row.id,
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
