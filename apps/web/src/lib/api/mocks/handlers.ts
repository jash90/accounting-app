import { http, HttpResponse } from 'msw';

export const handlers = [
  // Auth endpoints
  http.post('/api/auth/login', async ({ request }) => {
    const { email, password } = await request.json() as { email: string; password: string };

    // Mock authentication logic
    if (email && password) {
      return HttpResponse.json({
        access_token: 'mock-access-token',
        refresh_token: 'mock-refresh-token',
        user: {
          id: '1',
          email,
          firstName: 'John',
          lastName: 'Doe',
          role: 'ADMIN',
          isActive: true,
        },
      });
    }

    return HttpResponse.json(
      { message: 'Invalid credentials' },
      { status: 401 }
    );
  }),

  http.post('/api/auth/register', async ({ request }) => {
    const userData = await request.json();
    return HttpResponse.json({
      access_token: 'mock-access-token',
      refresh_token: 'mock-refresh-token',
      user: {
        id: 'new-user-id',
        ...userData,
        isActive: true,
      },
    }, { status: 201 });
  }),

  http.post('/api/auth/refresh', async () => {
    return HttpResponse.json({
      access_token: 'new-mock-access-token',
    });
  }),

  // User endpoints
  http.get('/api/admin/users', () => {
    return HttpResponse.json([
      {
        id: '1',
        email: 'admin@test.com',
        firstName: 'Admin',
        lastName: 'User',
        role: 'ADMIN',
        isActive: true,
      },
      {
        id: '2',
        email: 'owner@test.com',
        firstName: 'Company',
        lastName: 'Owner',
        role: 'COMPANY_OWNER',
        isActive: true,
        company: { id: '1', name: 'Acme Corp' },
      },
    ]);
  }),

  http.get('/api/admin/users/:id', ({ params }) => {
    const { id } = params;
    return HttpResponse.json({
      id,
      email: 'user@test.com',
      firstName: 'Test',
      lastName: 'User',
      role: 'EMPLOYEE',
      isActive: true,
    });
  }),

  http.post('/api/admin/users', async ({ request }) => {
    const userData = await request.json();
    return HttpResponse.json({
      id: 'new-user-id',
      ...userData,
      isActive: true,
    }, { status: 201 });
  }),

  // Add more handlers as needed for all 47 endpoints
];

