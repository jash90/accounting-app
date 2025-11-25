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
   * Generate unique simple text title
   */
  static generateSimpleTextTitle(): string {
    this.counter++;
    const timestamp = Date.now();
    return `Test Text ${timestamp}-${this.counter}`;
  }

  /**
   * Generate simple text content
   */
  static generateSimpleTextContent(): string {
    return `This is test content generated at ${new Date().toISOString()}. Lorem ipsum dolor sit amet.`;
  }

  /**
   * Generate test password (meets requirements)
   */
  static generatePassword(): string {
    return 'TestPass123!';
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
  createUserData: (role: 'ADMIN' | 'COMPANY_OWNER' | 'EMPLOYEE' = 'EMPLOYEE', companyName?: string) => ({
    email: TestDataGenerator.generateEmail(role.toLowerCase().split('_')[0] as 'admin' | 'owner' | 'employee'),
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
   * Create test simple text data
   */
  createSimpleTextData: () => ({
    title: TestDataGenerator.generateSimpleTextTitle(),
    content: TestDataGenerator.generateSimpleTextContent(),
  }),

  /**
   * Create multiple test simple texts
   */
  createMultipleSimpleTexts: (count: number) => {
    return Array.from({ length: count }, () => ({
      title: TestDataGenerator.generateSimpleTextTitle(),
      content: TestDataGenerator.generateSimpleTextContent(),
    }));
  },
};

/**
 * Seeded test data (existing in database after seed)
 */
export const SEEDED_DATA = {
  companies: {
    companyA: {
      name: 'Company A',
      owner: {
        email: 'owner.a@company.com',
        password: 'Owner123!',
      },
      employees: [
        {
          email: 'employee1.a@company.com',
          password: 'Employee123!',
          permissions: {
            'simple-text': { read: true, write: true, delete: false },
          },
        },
        {
          email: 'employee2.a@company.com',
          password: 'Employee123!',
          permissions: {
            'simple-text': { read: true, write: false, delete: false },
          },
        },
      ],
    },
    companyB: {
      name: 'Company B',
      owner: {
        email: 'owner.b@company.com',
        password: 'Owner123!',
      },
      employees: [
        {
          email: 'employee1.b@company.com',
          password: 'Employee123!',
          permissions: {
            'simple-text': { read: true, write: true, delete: true },
          },
        },
      ],
    },
  },
  admin: {
    email: 'admin@system.com',
    password: 'Admin123!',
  },
  modules: [
    { name: 'simple-text', displayName: 'Simple Text' },
    { name: 'ai-agent', displayName: 'AI Agent' },
  ],
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
