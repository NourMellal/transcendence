export interface UserSummary {
    readonly id: string;
    readonly username: string;
    readonly displayName?: string;
    readonly avatar?: string;
}

export interface IUserServiceClient {
    getUserSummary(userId: string): Promise<UserSummary | null>;
    ensureUsersExist(userIds: string[]): Promise<void>;
}
