import sqlite3 from 'sqlite3';
import { Database, open } from 'sqlite';

export async function createTestDatabase(): Promise<Database> {
    return open({
        filename: ':memory:',
        driver: sqlite3.Database,
    });
}

export async function closeTestDatabase(db: Database): Promise<void> {
    await db.close();
}
