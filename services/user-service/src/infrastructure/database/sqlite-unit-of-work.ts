import type { Database } from 'sqlite';
import type { UnitOfWork } from '../../domain/ports.js';

export class SQLiteUnitOfWork implements UnitOfWork {
    private transactionDepth = 0;

    constructor(private readonly db: Database) {}

    async withTransaction<T>(handler: () => Promise<T>): Promise<T> {
        const isOuterTransaction = this.transactionDepth === 0;

        if (isOuterTransaction) {
            await this.db.exec('BEGIN IMMEDIATE');
        }

        this.transactionDepth += 1;

        try {
            const result = await handler();

            if (isOuterTransaction) {
                await this.db.exec('COMMIT');
            }

            return result;
        } catch (error) {
            if (isOuterTransaction) {
                await this.db.exec('ROLLBACK');
            }
            throw error;
        } finally {
            this.transactionDepth = Math.max(0, this.transactionDepth - 1);
        }
    }
}
