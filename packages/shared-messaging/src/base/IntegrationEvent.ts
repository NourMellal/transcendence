import { EventMetadata } from "./EventMetadata";

/**
 * Base interface for all integration events
 * - Metadata containing event details
 * - Payload containing event data
 */
export interface IntegrationEvent<TPayload = any> {
    readonly metadata: EventMetadata;
    readonly payload: TPayload;
}

/**
 * Extract the payload type from an IntegrationEvent
 */
export type ExtractPayload<T> = T extends IntegrationEvent<infer P> ? P : never;