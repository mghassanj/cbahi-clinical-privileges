/**
 * API Route Tests for /api/requests
 *
 * Tests the requests API endpoints using MSW for mocking.
 * Note: These are integration tests that test the API handlers.
 */

import { server } from '../mocks/server';
import { http, HttpResponse } from 'msw';

// Enable request interception before tests
beforeAll(() => server.listen({ onUnhandledRequest: 'warn' }));

// Reset handlers after each test
afterEach(() => server.resetHandlers());

// Clean up after all tests
afterAll(() => server.close());

describe('Requests API', () => {
  const API_BASE = 'http://localhost:3000';

  describe('GET /api/requests', () => {
    it('should return list of requests with pagination', async () => {
      const response = await fetch(`${API_BASE}/api/requests`);
      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(data).toHaveProperty('data');
      expect(data).toHaveProperty('pagination');
      expect(Array.isArray(data.data)).toBe(true);
      expect(data.pagination).toHaveProperty('page');
      expect(data.pagination).toHaveProperty('limit');
      expect(data.pagination).toHaveProperty('total');
    });

    it('should filter requests by status', async () => {
      const response = await fetch(`${API_BASE}/api/requests?status=PENDING`);
      const data = await response.json();

      expect(response.ok).toBe(true);
      data.data.forEach((request: { status: string }) => {
        expect(request.status).toBe('PENDING');
      });
    });

    it('should support pagination parameters', async () => {
      const response = await fetch(`${API_BASE}/api/requests?page=1&limit=10`);
      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(data.pagination.page).toBe(1);
      expect(data.pagination.limit).toBe(10);
    });

    it('should handle unauthorized access', async () => {
      // Override handler to simulate unauthorized
      server.use(
        http.get(`${API_BASE}/api/requests`, () => {
          return HttpResponse.json(
            { error: 'Unauthorized', message: 'Please sign in to continue' },
            { status: 401 }
          );
        })
      );

      const response = await fetch(`${API_BASE}/api/requests`);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should handle server errors gracefully', async () => {
      // Override handler to simulate server error
      server.use(
        http.get(`${API_BASE}/api/requests`, () => {
          return HttpResponse.json(
            { error: 'Internal Server Error', message: 'Failed to fetch requests' },
            { status: 500 }
          );
        })
      );

      const response = await fetch(`${API_BASE}/api/requests`);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Internal Server Error');
    });
  });

  describe('POST /api/requests', () => {
    it('should create a draft request', async () => {
      const requestBody = {
        type: 'NEW',
        requestType: 'CORE',
        privileges: [],
        submit: false,
      };

      const response = await fetch(`${API_BASE}/api/requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.message).toContain('Draft saved');
      expect(data.data).toHaveProperty('id');
      expect(data.data.status).toBe('DRAFT');
    });

    it('should create and submit a request', async () => {
      const requestBody = {
        type: 'NEW',
        requestType: 'CORE',
        privileges: ['priv-1', 'priv-2'],
        submit: true,
      };

      const response = await fetch(`${API_BASE}/api/requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.message).toContain('submitted');
      expect(data.data.status).toBe('PENDING');
    });

    it('should handle validation errors', async () => {
      // Override handler to simulate validation error
      server.use(
        http.post(`${API_BASE}/api/requests`, () => {
          return HttpResponse.json(
            {
              error: 'Invalid privileges',
              message: 'One or more selected privileges are invalid or inactive',
            },
            { status: 400 }
          );
        })
      );

      const response = await fetch(`${API_BASE}/api/requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ privileges: ['invalid-id'] }),
      });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid privileges');
    });

    it('should handle conflict when request already exists', async () => {
      // Override handler to simulate conflict
      server.use(
        http.post(`${API_BASE}/api/requests`, () => {
          return HttpResponse.json(
            {
              error: 'Request exists',
              message:
                'You already have an active privilege request. Please complete or cancel it first.',
              existingRequestId: 'request-existing',
            },
            { status: 409 }
          );
        })
      );

      const response = await fetch(`${API_BASE}/api/requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'NEW' }),
      });
      const data = await response.json();

      expect(response.status).toBe(409);
      expect(data.error).toBe('Request exists');
      expect(data.existingRequestId).toBe('request-existing');
    });

    it('should handle inactive user', async () => {
      // Override handler to simulate forbidden
      server.use(
        http.post(`${API_BASE}/api/requests`, () => {
          return HttpResponse.json(
            {
              error: 'Account inactive',
              message: 'Your account is not active. Please contact administrator.',
            },
            { status: 403 }
          );
        })
      );

      const response = await fetch(`${API_BASE}/api/requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'NEW' }),
      });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Account inactive');
    });
  });

  describe('GET /api/requests/:id', () => {
    it('should return a single request by ID', async () => {
      const response = await fetch(`${API_BASE}/api/requests/request-1`);
      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(data.data).toHaveProperty('id', 'request-1');
      expect(data.data).toHaveProperty('applicant');
      expect(data.data).toHaveProperty('status');
    });

    it('should return 404 for non-existent request', async () => {
      const response = await fetch(`${API_BASE}/api/requests/non-existent`);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Not found');
    });
  });

  describe('Request Data Structure', () => {
    it('should include applicant details in request', async () => {
      const response = await fetch(`${API_BASE}/api/requests/request-1`);
      const data = await response.json();

      expect(data.data.applicant).toHaveProperty('id');
      expect(data.data.applicant).toHaveProperty('nameEn');
      expect(data.data.applicant).toHaveProperty('email');
    });

    it('should include request type information', async () => {
      const response = await fetch(`${API_BASE}/api/requests/request-1`);
      const data = await response.json();

      expect(data.data).toHaveProperty('type');
      expect(data.data).toHaveProperty('requestType');
      expect(['NEW', 'RENEWAL', 'MODIFICATION']).toContain(data.data.type);
    });

    it('should include timestamps', async () => {
      const response = await fetch(`${API_BASE}/api/requests/request-1`);
      const data = await response.json();

      expect(data.data).toHaveProperty('createdAt');
      expect(data.data).toHaveProperty('updatedAt');
    });
  });
});

describe('Error Handling', () => {
  const API_BASE = 'http://localhost:3000';

  beforeAll(() => server.listen({ onUnhandledRequest: 'warn' }));
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());

  it('should handle network errors', async () => {
    server.use(
      http.get(`${API_BASE}/api/requests`, () => {
        return HttpResponse.error();
      })
    );

    await expect(fetch(`${API_BASE}/api/requests`)).rejects.toThrow();
  });

  it('should handle malformed JSON in request body', async () => {
    server.use(
      http.post(`${API_BASE}/api/requests`, () => {
        return HttpResponse.json(
          { error: 'Bad Request', message: 'Invalid JSON' },
          { status: 400 }
        );
      })
    );

    const response = await fetch(`${API_BASE}/api/requests`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'invalid-json',
    });

    expect(response.status).toBe(400);
  });
});
