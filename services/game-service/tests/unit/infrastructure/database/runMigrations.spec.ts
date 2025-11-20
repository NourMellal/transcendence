import { describe, it, expect } from 'vitest';
import { runMigrations } from '../../../../src/infrastructure/database/migrations';
type GameDatabase = Parameters<typeof runMigrations>[0];

class MockDatabase {
    private readonly tables = new Map<string, Set<string>>();
    private readonly appliedMigrations = new Set<string>();

    async exec(sql: string): Promise<void> {
        const normalized = sql.replace(/\s+/g, ' ').trim();

        if (normalized.startsWith('CREATE TABLE IF NOT EXISTS _migrations')) {
            this.tables.set('_migrations', new Set(['name']));
            return;
        }

        if (normalized.startsWith('CREATE TABLE IF NOT EXISTS games')) {
            this.tables.set('games', new Set(['id', 'status', 'mode', 'snapshot', 'created_at', 'updated_at']));
            return;
        }

        if (normalized.startsWith('ALTER TABLE games ADD COLUMN')) {
            const [, columnDefinition] = normalized.match(/ADD COLUMN (.+);?$/i) ?? [];
            if (!columnDefinition) {
                return;
            }
            const columnName = columnDefinition.split(' ')[0];
            const columns = this.tables.get('games');
            if (columns) {
                columns.add(columnName);
            }
            return;
        }

        if (normalized === 'BEGIN' || normalized === 'COMMIT' || normalized === 'ROLLBACK') {
            return;
        }
    }

    async run(sql: string, name?: string): Promise<void> {
        if (sql.startsWith('INSERT INTO _migrations') && name) {
            this.appliedMigrations.add(name);
        }
    }

    async all(sql: string): Promise<any[]> {
        if (sql.startsWith('SELECT name FROM _migrations')) {
            return Array.from(this.appliedMigrations).map((name) => ({ name }));
        }

        const tableInfoMatch = sql.match(/PRAGMA table_info\(['"]?(\w+)['"]?\);?/i);
        if (tableInfoMatch) {
            const tableName = tableInfoMatch[1];
            const columns = Array.from(this.tables.get(tableName) ?? []);
            return columns.map((name) => ({ name }));
        }

        return [];
    }

    getColumns(tableName: string): string[] {
        return Array.from(this.tables.get(tableName) ?? []);
    }

    getAppliedMigrations(): string[] {
        return Array.from(this.appliedMigrations);
    }
}

describe('runMigrations', () => {
    it('applies migrations only once and records them', async () => {
        const db = new MockDatabase();

        await runMigrations(db as unknown as GameDatabase);
        expect(db.getColumns('games')).toContain('tournament_id');

        await expect(runMigrations(db as unknown as GameDatabase)).resolves.toBeUndefined();
        expect(db.getAppliedMigrations().length).toBeGreaterThanOrEqual(2);
    });
});
