import {Message} from "amqplib";

export class MessagingError extends Error {
    constructor(
        message: string,
        public readonly code: string,
        public readonly originalMessage?: Message
    ) {
        super(message);
        this.name = 'MessagingError';
    }
}

export const ErrorCodes = {
    CONNECTION_FAILED: 'CONNECTION_FAILED',
    PUBLISH_FAILED: 'PUBLISH_FAILED',
    CONSUME_FAILED: 'CONSUME_FAILED',
    SERIALIZATION_FAILED: 'SERIALIZATION_FAILED'
};