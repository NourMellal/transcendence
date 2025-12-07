import sqlite3 from 'sqlite3';
import { promisify } from 'util';
import * as path from 'path';
import * as fs from 'fs';

/**
 * SQLite Database Connection Manager
 * 
 * Handles database connection lifecycle and provides
 * a promise-based wrapper around sqlite3
 */
export class SQLiteConnection {
  private db: sqlite3.Database | null = null;
  private dbPath: string;

  constructor(dbPath: string) {
    this.dbPath = dbPath;
  }

  /**
   * Open database connection
   */
  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      // Ensure directory exists
      const dir = path.dirname(this.dbPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      this.db = new sqlite3.Database(this.dbPath, (err) => {
        if (err) {
          reject(new Error(`Failed to connect to database: ${err.message}`));
        } else {
          console.log(`✅ Connected to SQLite database at ${this.dbPath}`);
          resolve();
        }
      });

      // Enable foreign keys
      this.db.run('PRAGMA foreign_keys = ON');
    });
  }

  /**
   * Close database connection
   */
  async close(): Promise<void> {
    if (!this.db) return;

    return new Promise((resolve, reject) => {
      this.db!.close((err) => {
        if (err) {
          reject(new Error(`Failed to close database: ${err.message}`));
        } else {
          console.log('✅ Database connection closed');
          this.db = null;
          resolve();
        }
      });
    });
  }

  /**
   * Get the database instance
   */
  getDatabase(): sqlite3.Database {
    if (!this.db) {
      throw new Error('Database not connected. Call connect() first.');
    }
    return this.db;
  }

  /**
   * Run a SQL statement (INSERT, UPDATE, DELETE)
   */
  async run(sql: string, params: any[] = []): Promise<void> {
    const db = this.getDatabase();
    return new Promise((resolve, reject) => {
      db.run(sql, params, (err: Error | null) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  /**
   * Get a single row (SELECT)
   */
  async get<T = any>(sql: string, params: any[] = []): Promise<T | undefined> {
    const db = this.getDatabase();
    return new Promise((resolve, reject) => {
      db.get(sql, params, (err: Error | null, row: T | undefined) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  }

  /**
   * Get all rows (SELECT)
   */
  async all<T = any>(sql: string, params: any[] = []): Promise<T[]> {
    const db = this.getDatabase();
    return new Promise((resolve, reject) => {
      db.all(sql, params, (err: Error | null, rows: T[]) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }

  /**
   * Run multiple SQL statements in a transaction
   */
  async transaction(statements: Array<{ sql: string; params?: any[] }>): Promise<void> {
    const db = this.getDatabase();

    return new Promise((resolve, reject) => {
      db.serialize(() => {
        db.run('BEGIN TRANSACTION');

        try {
          for (const stmt of statements) {
            db.run(stmt.sql, stmt.params || []);
          }
          db.run('COMMIT', (err) => {
            if (err) reject(err);
            else resolve();
          });
        } catch (error) {
          db.run('ROLLBACK');
          reject(error);
        }
      });
    });
  }
}
