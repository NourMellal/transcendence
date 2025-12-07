import * as fs from 'fs';
import * as path from 'path';
import { SQLiteConnection } from '../connection';
/**
 * Database Migration Runner
 * 
 * Automatically runs SQL migration files in order
 */
export class MigrationRunner {
  private readonly migrationsPath: string;

  constructor(
    private readonly db: SQLiteConnection,
    migrationsPath?: string
  ) {
    this.migrationsPath = migrationsPath || path.join(__dirname, 'sql');
  }

  /**
   * Run all pending migrations
   */
  async runMigrations(): Promise<void> {
    console.log('🔄 Running database migrations...');

    // Create migrations tracking table if not exists
    await this.createMigrationsTable();

    // Get migration files
    const migrationFiles = this.getMigrationFiles();

    // Run each migration
    for (const file of migrationFiles) {
      await this.runMigration(file);
    }

    console.log('✅ All migrations completed');
  }

  /**
   * Create table to track which migrations have run
   */
  private async createMigrationsTable(): Promise<void> {
    await this.db.run(`
      CREATE TABLE IF NOT EXISTS migrations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        filename TEXT UNIQUE NOT NULL,
        executed_at TEXT NOT NULL
      )
    `);
  }

  /**
   * Get all migration files sorted by name
   */
  private getMigrationFiles(): string[] {
    if (!fs.existsSync(this.migrationsPath)) {
      console.warn(`⚠️  Migrations directory not found: ${this.migrationsPath}`);
      return [];
    }

    return fs
      .readdirSync(this.migrationsPath)
      .filter(file => file.endsWith('.sql'))
      .sort();  // Sort alphabetically (001_xxx.sql, 002_xxx.sql, etc.)
  }

  /**
   * Run a single migration file
   */
  private async runMigration(filename: string): Promise<void> {
    // Check if already executed
    const existing = await this.db.get(
      'SELECT * FROM migrations WHERE filename = ?',
      [filename]
    );

    if (existing) {
      console.log(`⏭️  Skipping migration: ${filename} (already executed)`);
      return;
    }

    console.log(`📝 Running migration: ${filename}`);

    // Read SQL file
    const filePath = path.join(this.migrationsPath, filename);
    const sql = fs.readFileSync(filePath, 'utf-8');

    // Execute SQL
    try {
      await this.db.run(sql);

      // Mark as executed
      await this.db.run(
        'INSERT INTO migrations (filename, executed_at) VALUES (?, ?)',
        [filename, new Date().toISOString()]
      );

      console.log(`✅ Migration completed: ${filename}`);
    } catch (error) {
      console.error(`❌ Migration failed: ${filename}`);
      throw error;
    }
  }

  /**
   * Rollback last migration (optional, for development)
   */
  async rollbackLastMigration(): Promise<void> {
    const lastMigration = await this.db.get<{ filename: string }>(
      'SELECT filename FROM migrations ORDER BY id DESC LIMIT 1'
    );

    if (!lastMigration) {
      console.log('No migrations to rollback');
      return;
    }

    console.log(`⏪ Rolling back migration: ${lastMigration.filename}`);
    
    // Remove from tracking
    await this.db.run(
      'DELETE FROM migrations WHERE filename = ?',
      [lastMigration.filename]
    );

    console.log(`✅ Rollback completed: ${lastMigration.filename}`);
    console.log('⚠️  Note: Tables were not dropped. Manual cleanup may be needed.');
  }
}
