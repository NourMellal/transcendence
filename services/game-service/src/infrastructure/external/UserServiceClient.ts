import { IUserServiceClient, UserSummary } from '../../application/ports/external/IUserServiceClient';

export class UserServiceClient implements IUserServiceClient {
    constructor(
        private readonly baseUrl: string,
        private readonly internalApiKey?: string
    ) {}

    async getUserSummary(userId: string): Promise<UserSummary | null> {
        const response = await fetch(`${this.baseUrl}/internal/users/${userId}`, {
            headers: this.buildHeaders()
        });

        if (response.status === 404) {
            return null;
        }

        if (!response.ok) {
            throw new Error('Failed to fetch user summary');
        }

        const body = await response.json();
        return body.data as UserSummary;
    }

    async ensureUsersExist(userIds: string[]): Promise<void> {
        await Promise.all(userIds.map((userId) => this.getUserSummary(userId)));
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
