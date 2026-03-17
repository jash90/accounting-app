import request from 'supertest';

/**
 * Reusable API E2E test helper.
 *
 * Connects to an already-running API server (default: http://localhost:3000).
 * Bun doesn't support NestJS in-process bootstrap (no emitDecoratorMetadata),
 * so E2E tests hit the external API via HTTP.
 */

const API_BASE_URL = process.env['API_BASE_URL'] || 'http://localhost:3000/api';

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Required environment variable ${name} is not set. Check your .env or test setup.`
    );
  }
  return value;
}

/**
 * Returns a supertest agent bound to the running API.
 */
export function getApiAgent() {
  return request(API_BASE_URL);
}

export async function loginAs(
  role: 'admin' | 'owner' | 'employee' | 'ownerB' | 'employeeB'
): Promise<string> {
  const credentials: Record<string, { email: string; password: string }> = {
    admin: {
      email: requireEnv('SEED_ADMIN_EMAIL'),
      password: requireEnv('SEED_ADMIN_PASSWORD'),
    },
    owner: {
      email: requireEnv('SEED_OWNER_EMAIL'),
      password: requireEnv('SEED_OWNER_PASSWORD'),
    },
    employee: {
      email: requireEnv('SEED_EMPLOYEE_EMAIL'),
      password: requireEnv('SEED_EMPLOYEE_PASSWORD'),
    },
    ownerB: {
      email: requireEnv('SEED_COMPANY_B_OWNER_EMAIL'),
      password: requireEnv('SEED_COMPANY_B_OWNER_PASSWORD'),
    },
    employeeB: {
      email: requireEnv('SEED_COMPANY_B_EMPLOYEE_EMAIL'),
      password: requireEnv('SEED_COMPANY_B_EMPLOYEE_PASSWORD'),
    },
  };

  const cred = credentials[role];
  const response = await getApiAgent()
    .post('/auth/login')
    .send({ email: cred.email, password: cred.password })
    .expect(200);

  return response.body.access_token;
}

export function authHeader(token: string): [string, string] {
  return ['Authorization', `Bearer ${token}`];
}

/**
 * Attempt to DELETE a resource, silently ignoring errors.
 * Use in afterAll for test cleanup.
 */
export async function cleanupResource(path: string, token: string): Promise<void> {
  try {
    await getApiAgent()
      .delete(path)
      .set(...authHeader(token));
  } catch {
    // Ignore cleanup errors
  }
}

/**
 * Assert that the response body is a paginated response with a data array.
 */
export function expectPaginatedResponse(body: any): void {
  expect(body).toHaveProperty('data');
  expect(Array.isArray(body.data)).toBe(true);
}
