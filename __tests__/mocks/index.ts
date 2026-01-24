/**
 * MSW Mocks Index
 *
 * Export all mock-related utilities and data from this central location.
 */

// Server for Node.js environment (Jest tests)
export { server } from './server';

// Worker for browser environment (E2E tests, development)
export { worker } from './browser';

// Request handlers
export { handlers } from './handlers';

// Mock data
export { mockUser, mockRequests, mockPrivileges } from './handlers';
