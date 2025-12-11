import { setupWorker } from 'msw/browser';
import { handlers } from './handlers';

// Setup MSW worker with our handlers
export const worker = setupWorker(...handlers);
