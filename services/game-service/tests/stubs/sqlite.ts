class InMemoryDB {
    private games: any[] = [];
    private migrations = new Set<string>();

    async exec(_sql: string): Promise<void> {}

    async run(sql: string, ...params: any[]): Promise<void> {
        if (sql.includes('INSERT INTO games')) {
            const [id, status, mode, snapshot, tournamentId, createdAt, updatedAt, startedAt, finishedAt] = params;
            this.games.push({
                id,
                status,
                mode,
                snapshot,
                tournament_id: tournamentId ?? null,
                created_at: createdAt,
                updated_at: updatedAt,
                started_at: startedAt ?? null,
                finished_at: finishedAt ?? null,
            });
            return;
        }

        if (sql.startsWith('UPDATE games')) {
            const [status, mode, snapshot, tournamentId, updatedAt, startedAt, finishedAt, id] = params;
            const game = this.games.find((g) => g.id === id);
            if (game) {
                Object.assign(game, {
                    status,
                    mode,
                    snapshot,
                    tournament_id: tournamentId ?? null,
                    updated_at: updatedAt,
                    started_at: startedAt ?? null,
                    finished_at: finishedAt ?? null,
                });
            }
            return;
        }

        if (sql.includes('INSERT INTO _migrations')) {
            const [name] = params;
            this.migrations.add(name);
        }
    }

    async get(sql: string, param: string): Promise<any | undefined> {
        if (sql.includes('FROM games WHERE id = ?')) {
            return this.games.find((g) => g.id === param);
        }
        return undefined;
    }

    async all(sql: string, _values: unknown[] = []): Promise<any[]> {
        if (sql.includes('_migrations')) {
            return Array.from(this.migrations).map((name) => ({ name }));
        }

        if (sql.includes('FROM games')) {
            return [...this.games];
        }

        return [];
    }

    async close(): Promise<void> {}
}

export async function open(_options: unknown): Promise<InMemoryDB> {
    return new InMemoryDB();
}
