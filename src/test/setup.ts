import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

// Automatically clean up DOM elements created by React Testing Library after each test
afterEach(() => {
  cleanup();
});

// Mock fetch globally since our application fetches data assets at runtime
(globalThis as any).fetch = vi.fn();
