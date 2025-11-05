/**
 * Browser-side MSW setup
 * This initializes the Service Worker for intercepting requests in the browser
 */

import { setupWorker } from 'msw/browser';
import { handlers } from './handlers';

// Create and export the worker instance
export const worker = setupWorker(...handlers);
