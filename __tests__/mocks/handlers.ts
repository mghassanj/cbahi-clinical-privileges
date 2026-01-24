/**
 * MSW (Mock Service Worker) Request Handlers
 *
 * Define mock API responses for testing.
 * These handlers intercept network requests and return mock data.
 */

import { http, HttpResponse } from 'msw';

// Base URL for API requests
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '';

// Mock user data
const mockUser = {
  id: 'user-1',
  nameEn: 'John Doe',
  nameAr: 'جون دو',
  email: 'john.doe@example.com',
  employeeCode: 'EMP001',
  role: 'EMPLOYEE',
  departmentEn: 'Cardiology',
  departmentAr: 'أمراض القلب',
  isActive: true,
  status: 'ACTIVE',
};

// Mock request data
const mockRequests = [
  {
    id: 'request-1',
    applicantId: 'user-1',
    type: 'NEW',
    requestType: 'CORE',
    status: 'DRAFT',
    createdAt: '2024-01-15T10:00:00Z',
    updatedAt: '2024-01-15T10:00:00Z',
    applicant: mockUser,
    requestedPrivileges: [],
    approvals: [],
    _count: { attachments: 0 },
  },
  {
    id: 'request-2',
    applicantId: 'user-1',
    type: 'RENEWAL',
    requestType: 'CORE',
    status: 'PENDING',
    createdAt: '2024-01-10T10:00:00Z',
    updatedAt: '2024-01-12T14:30:00Z',
    submittedAt: '2024-01-12T14:30:00Z',
    applicant: mockUser,
    requestedPrivileges: [],
    approvals: [],
    _count: { attachments: 2 },
  },
];

// Mock privileges data
const mockPrivileges = [
  {
    id: 'priv-1',
    code: 'CORE-001',
    nameEn: 'Patient Assessment',
    nameAr: 'تقييم المريض',
    category: 'CORE',
    isActive: true,
  },
  {
    id: 'priv-2',
    code: 'CORE-002',
    nameEn: 'Medication Administration',
    nameAr: 'إدارة الأدوية',
    category: 'CORE',
    isActive: true,
  },
];

/**
 * Request handlers for MSW
 * These intercept API calls and return mock responses
 */
export const handlers = [
  // GET /api/requests - List requests
  http.get(`${API_BASE_URL}/api/requests`, ({ request }) => {
    const url = new URL(request.url);
    const status = url.searchParams.get('status');
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '20');

    let filteredRequests = [...mockRequests];

    // Filter by status if provided
    if (status) {
      filteredRequests = filteredRequests.filter((r) => r.status === status);
    }

    // Pagination
    const start = (page - 1) * limit;
    const paginatedRequests = filteredRequests.slice(start, start + limit);

    return HttpResponse.json({
      data: paginatedRequests,
      pagination: {
        page,
        limit,
        total: filteredRequests.length,
        totalPages: Math.ceil(filteredRequests.length / limit),
        hasNext: start + paginatedRequests.length < filteredRequests.length,
        hasPrev: page > 1,
      },
    });
  }),

  // POST /api/requests - Create request
  http.post(`${API_BASE_URL}/api/requests`, async ({ request }) => {
    const body = await request.json() as Record<string, unknown>;

    const newRequest = {
      id: `request-${Date.now()}`,
      applicantId: mockUser.id,
      type: body.type || 'NEW',
      requestType: body.requestType || 'CORE',
      status: body.submit ? 'PENDING' : 'DRAFT',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      submittedAt: body.submit ? new Date().toISOString() : null,
      applicant: mockUser,
      requestedPrivileges: [],
      approvals: [],
    };

    return HttpResponse.json(
      {
        message: body.submit
          ? 'Request submitted successfully'
          : 'Draft saved successfully',
        data: newRequest,
      },
      { status: 201 }
    );
  }),

  // GET /api/requests/:id - Get single request
  http.get(`${API_BASE_URL}/api/requests/:id`, ({ params }) => {
    const { id } = params;
    const request = mockRequests.find((r) => r.id === id);

    if (!request) {
      return HttpResponse.json(
        { error: 'Not found', message: 'Request not found' },
        { status: 404 }
      );
    }

    return HttpResponse.json({ data: request });
  }),

  // GET /api/users - List users
  http.get(`${API_BASE_URL}/api/users`, () => {
    return HttpResponse.json({
      data: [mockUser],
      pagination: {
        page: 1,
        limit: 20,
        total: 1,
        totalPages: 1,
      },
    });
  }),

  // GET /api/privileges - List privileges
  http.get(`${API_BASE_URL}/api/privileges`, () => {
    return HttpResponse.json({
      data: mockPrivileges,
    });
  }),

  // Catch-all for unhandled requests (useful for debugging)
  http.all('*', ({ request }) => {
    console.warn(`Unhandled ${request.method} request to ${request.url}`);
    return HttpResponse.json(
      { error: 'Not mocked', message: `No mock handler for ${request.url}` },
      { status: 404 }
    );
  }),
];

// Export mock data for use in tests
export { mockUser, mockRequests, mockPrivileges };
