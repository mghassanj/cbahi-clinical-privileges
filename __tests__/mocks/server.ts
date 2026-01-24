/**
 * MSW Server Setup for Node.js (Jest tests)
 *
 * This file sets up MSW to intercept network requests in Node.js environment.
 * Used for unit and integration tests with Jest.
 */

import { setupServer } from 'msw/node';
import { handlers } from './handlers';

// Create the MSW server instance with default handlers
export const server = setupServer(...handlers);

// Export for tests to add custom handlers
export { handlers };
