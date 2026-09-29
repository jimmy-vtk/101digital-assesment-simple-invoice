import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterAll, afterEach, beforeAll } from 'vitest';
import { backend, server } from './server';
import { setViewport } from './viewport';

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));

afterEach(() => {
  cleanup();
  server.resetHandlers();
  backend.reset();
  localStorage.clear();
  setViewport('desktop');
});

afterAll(() => server.close());
