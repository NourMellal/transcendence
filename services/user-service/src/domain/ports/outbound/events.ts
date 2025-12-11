export interface UserEventsPublisher {
    publishUserDeleted(event: {
        readonly userId: string;
        readonly deletedAt: Date;
        readonly reason?: string;
        readonly initiatedBy: string;
    }): Promise<void>;
}
