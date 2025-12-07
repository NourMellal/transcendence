import { SQLiteConnection } from './connection';  
import { MigrationRunner } from './migrations/runner'; 
import { SQLiteMessageRepository } from './repositories/sqlite-message.repository';
import { SQLiteConversationRepository } from './repositories/sqlite-conversation.repository';
import * as path from 'path';

/**
 * Database initialization and setup
 */
export class DatabaseInitializer {
  private connection: SQLiteConnection | null = null;

  /**
   * Initialize database with migrations
   */
  async initialize(dbPath?: string): Promise<SQLiteConnection> {
    // Use provided path or default
    const finalPath = dbPath || this.getDefaultDatabasePath();

    console.log(`🔌 Initializing database at: ${finalPath}`);

    // Create connection
    this.connection = new SQLiteConnection(finalPath);
    await this.connection.connect();

    // Run migrations
    const migrationRunner = new MigrationRunner(this.connection);
    await migrationRunner.runMigrations();

    return this.connection;
  }

  /**
   * Create repository instances
   */
  createRepositories(connection: SQLiteConnection) {
    const db = connection.getDatabase();

    return {
      messageRepository: new SQLiteMessageRepository(db),
      conversationRepository: new SQLiteConversationRepository(db)
    };
  }

  /**
   * Get default database path based on environment
   */
  private getDefaultDatabasePath(): string {
    const env = process.env.NODE_ENV || 'development';

    if (env === 'test') {
      // Use in-memory database for tests
      return ':memory:';
    }

    // Use file-based database for dev/prod
    return path.join(process.cwd(), 'data', `chat-${env}.db`);
  }

  /**
   * Close database connection
   */
  async close(): Promise<void> {
    if (this.connection) {
      await this.connection.close();
      this.connection = null;
    }
  }
}
