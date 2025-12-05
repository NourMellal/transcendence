import { Database } from 'sqlite3';
import { Conversation } from '../../../domain/entities/conversation.entity';
import { IconversationRepository } from 'src/domain/repositories/conversation-repository';
export class SQLiteConversationRepository implements IconversationRepository {
  constructor(private db: Database) {}
  // ============================================
  async save(conversation: Conversation): Promise<void> {
    return new Promise((resolve, reject) => {
      const query = `
        INSERT OR REPLACE INTO conversations (
          id,
          user1_id,
          user2_id,
          last_message_at
        ) VALUES (?, ?, ?, ?)
      `;

      const params = [
        conversation.id.toString(),
        conversation.participants[0],
        conversation.participants[1],
        conversation.lastMessageAt.toISOString()
      ];

      this.db.run(query, params, (err) => {
        if (err) {
          reject(new Error(`Failed to save conversation: ${err.message}`));
        } else {
          resolve();
        }
      });
    });
  }

  async findByUserId(userId: string): Promise<Conversation[]> {
    return new Promise((resolve, reject) => {
      const query = `
        SELECT * FROM conversations 
        WHERE user1_id = ? OR user2_id = ?
        ORDER BY last_message_at DESC
      `;

      const params = [userId, userId];

      this.db.all(query, params, (err, rows: any[]) => {
        if (err) {
          reject(new Error(`Failed to find conversations: ${err.message}`));
        } else {
          const conversations = rows.map(row => this.mapRowToConversation(row));
          resolve(conversations);
        }
      });
    });
  }

  async findByParticipants(
    userId1: string,
    userId2: string
  ): Promise<Conversation | null> {
    return new Promise((resolve, reject) => {
      // Sort user IDs to match how they're stored in the database
      const [sortedUser1, sortedUser2] = [userId1, userId2].sort();

      const query = `
        SELECT * FROM conversations 
        WHERE user1_id = ? AND user2_id = ?
      `;

      const params = [sortedUser1, sortedUser2];

      this.db.get(query, params, (err, row: any) => {
        if (err) {
          reject(new Error(`Failed to find conversation by participants: ${err.message}`));
        } else if (!row) {
          resolve(null);
        } else {
          const conversation = this.mapRowToConversation(row);
          resolve(conversation);
        }
      });
    });
  }

  async getUnreadCount(userId: string, recipientId: string): Promise<number> {
    return new Promise((resolve, reject) => {
      const query = `
        SELECT COUNT(*) as count
        FROM messages 
        WHERE type = 'PRIVATE'
        AND sender_id = ?
        AND recipient_id = ?
      `;

      const params = [recipientId, userId];

      this.db.get(query, params, (err, row: any) => {
        if (err) {
          reject(new Error(`Failed to get unread count: ${err.message}`));
        } else {
          resolve(row.count || 0);
        }
      });
    });
  }
  private mapRowToConversation(row: any): Conversation {
    return Conversation.reconstitute({
      id: row.id,
      participants: [row.user1_id, row.user2_id],
      lastMessageAt: new Date(row.last_message_at)
    });
  }
}
