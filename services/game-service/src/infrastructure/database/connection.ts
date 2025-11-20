import sqlite3 from 'sqlite3';
import { open, Database } from 'sqlite';

export type GameDatabase = Database;

export async function createDatabaseConnection(filename: string): Promise<GameDatabase> {
    const db = await open({ filename, driver: sqlite3.Database });
    await db.exec('PRAGMA journal_mode = WAL;');
    return db;
}
