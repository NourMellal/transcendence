import type { TournamentDatabase } from '../connection';
import type { UnitOfWork } from '../../../domain/repositories';

export class SQLiteUnitOfWork implements UnitOfWork {
    private transactionDepth = 0;

    constructor(private readonly db: TournamentDatabase) {}

    async withTransaction<T>(handler: () => Promise<T>): Promise<T> {
        const isOuter = this.transactionDepth === 0;

        if (isOuter) {
            await this.db.exec('BEGIN IMMEDIATE');
        }

        this.transactionDepth += 1;

        try {
            const result = await handler();
            if (isOuter) {
                await this.db.exec('COMMIT');
            }
            return result;
        } catch (error) {
            if (isOuter) {
                await this.db.exec('ROLLBACK');
            }
            throw error;
        } finally {
            this.transactionDepth = Math.max(0, this.transactionDepth - 1);
        }
    }
}
