/**
 * Test data generators and fixtures
 */

export class TestDataGenerator {
  private static counter = 0;

  /**
   * Generate unique test email
   */
  static generateEmail(role: 'admin' | 'owner' | 'employee' = 'employee'): string {
    this.counter++;
    const timestamp = Date.now();
    return `test.${role}.${timestamp}.${this.counter}@test.com`;
  }

  /**
   * Generate unique company name
   */
  static generateCompanyName(): string {
    this.counter++;
    const timestamp = Date.now();
    return `Test Company ${timestamp}-${this.counter}`;
  }

  /**
   * Generate test password (meets requirements)
   */
  static generatePassword(): string {
    return 'TestPass123456!';
  }

  /**
   * Reset counter (useful for test isolation)
   */
  static reset(): void {
    this.counter = 0;
  }
}

/**
 * Test data factory for common test entities
 */
export const TestDataFactory = {
  /**
   * Create test user data
   */
  createUserData: (
    role: 'ADMIN' | 'COMPANY_OWNER' | 'EMPLOYEE' = 'EMPLOYEE',
    companyName?: string
  ) => ({
    email: TestDataGenerator.generateEmail(
      role.toLowerCase().split('_')[0] as 'admin' | 'owner' | 'employee'
    ),
    password: TestDataGenerator.generatePassword(),
    role,
    companyName,
  }),

  /**
   * Create test company data
   */
  createCompanyData: () => ({
    name: TestDataGenerator.generateCompanyName(),
    description: `Test company created at ${new Date().toISOString()}`,
  }),

  /**
   * Create document template data
   */
  createDocumentTemplateData: (
    overrides?: Partial<{
      name: string;
      description: string;
      templateContent: string;
      placeholders: string[];
      category: string;
      isActive: boolean;
    }>
  ) => ({
    name: `Test Document Template ${Date.now()}`,
    description: 'Test template description',
    templateContent: 'Hello {{client_name}}, this is a test template.',
    placeholders: ['client_name'],
    category: 'other',
    isActive: true,
    ...overrides,
  }),

  /**
   * Create task template data
   */
  createTaskTemplateData: (
    overrides?: Partial<{
      title: string;
      description: string;
      priority: string;
      recurrencePattern: object;
    }>
  ) => ({
    title: `Test Task Template ${Date.now()}`,
    description: 'Test task template description',
    priority: 'MEDIUM',
    ...overrides,
  }),

  /**
   * Create auto-reply template data
   */
  createAutoReplyTemplateData: (
    overrides?: Partial<{
      name: string;
      triggerKeywords: string[];
      bodyTemplate: string;
      isActive: boolean;
      category: string;
      tone: string;
    }>
  ) => ({
    name: `Test Auto Reply ${Date.now()}`,
    triggerKeywords: ['test', 'example'],
    bodyTemplate: 'Thank you for your message. We will respond shortly.',
    isActive: true,
    tone: 'formal',
    keywordMatchMode: 'any',
    matchSubjectOnly: false,
    ...overrides,
  }),
};

/**
 * Seeded test data (existing in database after seed)
 */
export const SEEDED_DATA = {
  companies: {
    companyA: {
      name: 'Company A',
      owner: {
        email: process.env.SEED_OWNER_EMAIL ?? '',
        password: process.env.SEED_OWNER_PASSWORD ?? '',
      },
      employees: [
        {
          email: process.env.SEED_EMPLOYEE_EMAIL ?? '',
          password: process.env.SEED_EMPLOYEE_PASSWORD ?? '',
          permissions: {},
        },
      ],
    },
  },
  admin: {
    email: process.env.SEED_ADMIN_EMAIL ?? '',
    password: process.env.SEED_ADMIN_PASSWORD ?? '',
  },
  modules: [{ name: 'ai-agent', displayName: 'AI Agent' }],
};

/**
 * Test data cleanup helper
 */
export class TestDataCleanup {
  private static createdEmails: Set<string> = new Set();
  private static createdCompanyNames: Set<string> = new Set();

  /**
   * Track created email for cleanup
   */
  static trackEmail(email: string): void {
    this.createdEmails.add(email);
  }

  /**
   * Track created company for cleanup
   */
  static trackCompany(name: string): void {
    this.createdCompanyNames.add(name);
  }

  /**
   * Get all tracked emails
   */
  static getTrackedEmails(): string[] {
    return Array.from(this.createdEmails);
  }

  /**
   * Get all tracked companies
   */
  static getTrackedCompanies(): string[] {
    return Array.from(this.createdCompanyNames);
  }

  /**
   * Clear tracking
   */
  static clear(): void {
    this.createdEmails.clear();
    this.createdCompanyNames.clear();
  }
}
