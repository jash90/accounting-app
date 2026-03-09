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
   * Generate collision-safe unique ID for factory data
   */
  static uniqueId(): string {
    this.counter++;
    return `${Date.now()}-${this.counter}`;
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
    name: `Test Document Template ${TestDataGenerator.uniqueId()}`,
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
    title: `Test Task Template ${TestDataGenerator.uniqueId()}`,
    description: 'Test task template description',
    priority: 'MEDIUM',
    ...overrides,
  }),

  /**
   * Create task data
   */
  createTaskData: (
    overrides?: Partial<{
      title: string;
      description: string;
      status: string;
      priority: string;
    }>
  ) => ({
    title: `E2E Task ${TestDataGenerator.uniqueId()}`,
    description: 'E2E test task description',
    priority: 'MEDIUM',
    ...overrides,
  }),

  /**
   * Create client data
   */
  createClientData: (
    overrides?: Partial<{
      name: string;
      nip: string;
      email: string;
      phone: string;
      address: string;
      vatStatus: string;
    }>
  ) => ({
    name: `E2E Client ${TestDataGenerator.uniqueId()}`,
    email: `client.${TestDataGenerator.uniqueId()}@e2e-test.com`,
    nip: `${1000000000 + Math.floor(Math.random() * 9000000000)}`,
    ...overrides,
  }),

  /**
   * Create time entry data
   */
  createTimeEntryData: (
    overrides?: Partial<{
      description: string;
      startTime: string;
      endTime: string;
      clientId: string;
      taskId: string;
    }>
  ) => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 9, 0);
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 10, 0);
    return {
      description: `E2E Time Entry ${TestDataGenerator.uniqueId()}`,
      startTime: start.toISOString(),
      endTime: end.toISOString(),
      ...overrides,
    };
  },

  /**
   * Create offer data
   */
  createOfferData: (
    overrides?: Partial<{
      title: string;
      description: string;
      clientId: string;
      validUntil: string;
    }>
  ) => {
    const validUntil = new Date();
    validUntil.setMonth(validUntil.getMonth() + 1);
    return {
      title: `E2E Offer ${TestDataGenerator.uniqueId()}`,
      description: 'E2E test offer description',
      validUntil: validUntil.toISOString().split('T')[0],
      ...overrides,
    };
  },

  /**
   * Create lead data
   */
  createLeadData: (
    overrides?: Partial<{
      companyName: string;
      contactPerson: string;
      email: string;
      phone: string;
      source: string;
      status: string;
    }>
  ) => ({
    companyName: `E2E Lead Company ${TestDataGenerator.uniqueId()}`,
    contactPerson: 'Jan Testowy',
    email: `lead.${TestDataGenerator.uniqueId()}@e2e-test.com`,
    source: 'WEBSITE',
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
    name: `Test Auto Reply ${TestDataGenerator.uniqueId()}`,
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
