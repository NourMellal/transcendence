// Core
export { MessagingConnection } from './core/connection'
export { MessagePublisher } from './core/publisher'
export { MessageConsumer } from './core/consumer'

// Types
export * from './types/events.types';
export * from './types/message.types'
export * from './types/exchange.types'

// Config
export { defaultConfig, type RabbitMQConfig } from './config/messaging.config';

// Utils
export { serialize, deserialize } from './utils/serialization'
export { MessagingError, ErrorCodes } from './utils/error-handling'