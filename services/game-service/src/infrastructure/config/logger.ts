import { createLogger } from '@transcendence/shared-logging';

export const logger: ReturnType<typeof createLogger> = createLogger('game-service', {
    pretty: process.env.LOG_PRETTY === 'true'
});
