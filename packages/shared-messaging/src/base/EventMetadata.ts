export interface EventMetadata {
    /**
     * Unique identifier for the event
     */
    readonly eventId: string;
    /**
     * Type of the event (e.g., 'user.registered', 'game.started')
     */
    readonly eventType: string;
    /**
     * Version of the event payload schema
     */
    readonly version: string;
    /**
     * Timestamp when the event occurred
     */
    readonly timestamp: Date;
    /**
     * source of the event (e.g., 'user-service', 'game-service')
     */
    readonly source: string;
    /**
     * Optional correlation and causation IDs for tracing
     */
    readonly correlationId?: string;
    readonly causationId?: string;

}