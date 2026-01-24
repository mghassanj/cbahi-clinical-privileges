/**
 * MSW Browser Setup
 *
 * This file sets up MSW to intercept network requests in the browser.
 * Used for E2E tests and development.
 */

import { setupWorker } from 'msw/browser';
import { handlers } from './handlers';

// Create the MSW worker instance with default handlers
export const worker = setupWorker(...handlers);

// Export for browser initialization
export { handlers };
