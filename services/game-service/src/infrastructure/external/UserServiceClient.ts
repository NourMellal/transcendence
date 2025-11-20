import { IUserServiceClient, UserSummary } from '../../application/ports/external/IUserServiceClient';
import { InvalidGameStateError } from '../../domain/errors';

export class UserServiceClient implements IUserServiceClient {
    constructor(
        private readonly baseUrl: string,
        private readonly internalApiKey?: string
    ) {}

    async getUserSummary(userId: string): Promise<UserSummary | null> {
        try {
            const response = await fetch(`${this.baseUrl}/internal/users/${userId}`, {
                headers: this.buildHeaders()
            });

            if (response.status === 404) {
                return null;
            }

            if (!response.ok) {
                throw new Error(`User service responded with status ${response.status}`);
            }

            const body = (await response.json()) as { data: UserSummary };
            return body.data;
        } catch (error) {
            console.error('[UserServiceClient] Failed to fetch user summary', error);
            throw new Error('User service unavailable');
        }
    }

    async ensureUsersExist(userIds: string[]): Promise<void> {
        const uniqueUserIds = [...new Set(userIds.filter(Boolean))];
        if (uniqueUserIds.length === 0) {
            return;
        }

        const results = await Promise.all(
            uniqueUserIds.map(async (userId) => {
                const user = await this.getUserSummary(userId);
                return { userId, exists: user !== null };
            })
        );

        const missingUsers = results.filter((result) => !result.exists).map((result) => result.userId);
        if (missingUsers.length > 0) {
            throw new InvalidGameStateError(`Cannot create game: users not found [${missingUsers.join(', ')}]`);
        }
    }

    private buildHeaders(): Record<string, string> {
        if (!this.internalApiKey) {
            return {};
        }

        return {
            'x-internal-api-key': this.internalApiKey
        };
    }
}
