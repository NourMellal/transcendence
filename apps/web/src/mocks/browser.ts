import { setupWorker } from 'msw/browser';
import { handlers } from './handlers';
import './realtime/register-mock-ws';

// Setup MSW worker with our handlers
export const worker = setupWorker(...handlers);
