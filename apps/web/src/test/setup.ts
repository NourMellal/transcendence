import { afterAll, afterEach, beforeAll } from 'vitest';
import { setupServer } from 'msw/node';
import { handlers } from '../mocks/handlers';
import { randomUUID, webcrypto } from 'node:crypto';

// Ensure Web Crypto + randomUUID exist in the jsdom environment
if (!globalThis.crypto) {
  // @ts-expect-error - jsdom typing mismatch
  globalThis.crypto = webcrypto;
}
if (!globalThis.crypto.randomUUID) {
  // @ts-expect-error - narrow typing
  globalThis.crypto.randomUUID = randomUUID;
}

const server = setupServer(...handlers);

// Node's fetch() requires absolute URLs; the app uses relative '/api/...'
const realFetch = globalThis.fetch;
if (typeof realFetch === 'function') {
  globalThis.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
    if (typeof input === 'string' && input.startsWith('/')) {
      return realFetch(`http://localhost${input}`, init);
    }
    return realFetch(input as any, init);
  };
}

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
