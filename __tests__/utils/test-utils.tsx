/**
 * Test Utilities
 *
 * Common utilities and custom render function for testing React components.
 */

import React, { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';

/**
 * Custom providers wrapper for tests
 * Add any providers your app needs here (theme, auth, etc.)
 */
interface AllTheProvidersProps {
  children: React.ReactNode;
}

function AllTheProviders({ children }: AllTheProvidersProps) {
  return (
    <>
      {/* Add providers here as needed, for example:
        <ThemeProvider>
          <AuthProvider>
            {children}
          </AuthProvider>
        </ThemeProvider>
      */}
      {children}
    </>
  );
}

/**
 * Custom render function that wraps components with necessary providers
 */
const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => render(ui, { wrapper: AllTheProviders, ...options });

// Re-export everything from testing-library
export * from '@testing-library/react';
export { default as userEvent } from '@testing-library/user-event';

// Override render method
export { customRender as render };

/**
 * Utility to wait for a condition
 */
export async function waitForCondition(
  condition: () => boolean,
  timeout = 5000,
  interval = 100
): Promise<void> {
  const startTime = Date.now();

  while (!condition()) {
    if (Date.now() - startTime >= timeout) {
      throw new Error('waitForCondition timed out');
    }
    await new Promise((resolve) => setTimeout(resolve, interval));
  }
}

/**
 * Utility to create mock session data
 */
export function createMockSession(overrides = {}) {
  return {
    user: {
      id: 'test-user-id',
      name: 'Test User',
      email: 'test@example.com',
      role: 'EMPLOYEE',
    },
    expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    ...overrides,
  };
}

/**
 * Utility to mock a successful API response
 */
export function createMockApiResponse<T>(data: T, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => data,
  };
}

/**
 * Utility to mock an error API response
 */
export function createMockApiError(message: string, status = 500) {
  return {
    ok: false,
    status,
    json: async () => ({ error: 'Error', message }),
  };
}

/**
 * Utility to simulate delay (useful for testing loading states)
 */
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Mock ResizeObserver for components that use it
 */
export function mockResizeObserver() {
  global.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}

/**
 * Mock IntersectionObserver for components that use it
 */
export function mockIntersectionObserver() {
  global.IntersectionObserver = class IntersectionObserver {
    root = null;
    rootMargin = '';
    thresholds = [];

    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords() {
      return [];
    }
  } as unknown as typeof IntersectionObserver;
}

/**
 * Mock matchMedia for responsive components
 */
export function mockMatchMedia(matches = false) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockImplementation((query) => ({
      matches,
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    })),
  });
}
