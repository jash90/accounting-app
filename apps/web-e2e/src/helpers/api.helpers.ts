import { APIRequestContext, request } from '@playwright/test';

/**
 * API Helper for direct API calls (bypassing UI)
 * Useful for test setup and data creation
 */
export class APIHelper {
  private apiContext?: APIRequestContext;
  private baseURL: string;
  private accessToken?: string;

  constructor(baseURL = 'http://localhost:3000') {
    this.baseURL = baseURL;
  }

  /**
   * Initialize API context
   */
  async init(): Promise<void> {
    this.apiContext = await request.newContext({
      baseURL: this.baseURL,
      extraHTTPHeaders: {
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * Login and get access token
   */
  async login(email: string, password: string): Promise<string> {
    if (!this.apiContext) await this.init();

    const response = await this.apiContext!.post('/api/auth/login', {
      data: { email, password },
    });

    const data = await response.json();
    this.accessToken = data.accessToken;
    return this.accessToken;
  }

  /**
   * Get auth headers with access token
   */
  private getAuthHeaders(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.accessToken}`,
      'Content-Type': 'application/json',
    };
  }

  /**
   * Create user via API
   */
  async createUser(data: {
    email: string;
    password: string;
    role: 'ADMIN' | 'COMPANY_OWNER' | 'EMPLOYEE';
    companyId?: number;
  }): Promise<any> {
    if (!this.apiContext) await this.init();

    const response = await this.apiContext!.post('/api/admin/users', {
      headers: this.getAuthHeaders(),
      data,
    });

    return await response.json();
  }

  /**
   * Create company via API
   */
  async createCompany(name: string, description?: string): Promise<any> {
    if (!this.apiContext) await this.init();

    const response = await this.apiContext!.post('/api/admin/companies', {
      headers: this.getAuthHeaders(),
      data: { name, description },
    });

    return await response.json();
  }

  /**
   * Create employee via API
   */
  async createEmployee(email: string, password: string): Promise<any> {
    if (!this.apiContext) await this.init();

    const response = await this.apiContext!.post('/api/company/employees', {
      headers: this.getAuthHeaders(),
      data: { email, password },
    });

    return await response.json();
  }

  /**
   * Grant permission via API
   */
  async grantPermission(
    employeeId: number,
    moduleId: number,
    permissions: {
      read?: boolean;
      write?: boolean;
      delete?: boolean;
    }
  ): Promise<void> {
    if (!this.apiContext) await this.init();

    await this.apiContext!.post(`/api/company/employees/${employeeId}/permissions`, {
      headers: this.getAuthHeaders(),
      data: { moduleId, ...permissions },
    });
  }

  /**
   * Delete user via API
   */
  async deleteUser(userId: number): Promise<void> {
    if (!this.apiContext) await this.init();

    await this.apiContext!.delete(`/api/admin/users/${userId}`, {
      headers: this.getAuthHeaders(),
    });
  }

  /**
   * Delete company via API
   */
  async deleteCompany(companyId: number): Promise<void> {
    if (!this.apiContext) await this.init();

    await this.apiContext!.delete(`/api/admin/companies/${companyId}`, {
      headers: this.getAuthHeaders(),
    });
  }

  /**
   * Get user by email via API
   */
  async getUserByEmail(email: string): Promise<any> {
    if (!this.apiContext) await this.init();

    const response = await this.apiContext!.get('/api/admin/users', {
      headers: this.getAuthHeaders(),
    });

    const users = await response.json();
    return users.find((u: any) => u.email === email);
  }

  /**
   * Get company by name via API
   */
  async getCompanyByName(name: string): Promise<any> {
    if (!this.apiContext) await this.init();

    const response = await this.apiContext!.get('/api/admin/companies', {
      headers: this.getAuthHeaders(),
    });

    const companies = await response.json();
    return companies.find((c: any) => c.name === name);
  }

  /**
   * Enable module for company via API
   */
  async enableModuleForCompany(companyId: number, moduleId: number): Promise<void> {
    if (!this.apiContext) await this.init();

    await this.apiContext!.post(`/api/admin/companies/${companyId}/modules/${moduleId}`, {
      headers: this.getAuthHeaders(),
    });
  }

  /**
   * Disable module for company via API
   */
  async disableModuleForCompany(companyId: number, moduleId: number): Promise<void> {
    if (!this.apiContext) await this.init();

    await this.apiContext!.delete(`/api/admin/companies/${companyId}/modules/${moduleId}`, {
      headers: this.getAuthHeaders(),
    });
  }

  /**
   * Create document template via API
   */
  async createDocumentTemplate(data: {
    name: string;
    description?: string;
    templateContent?: string;
    placeholders?: string[];
    category?: string;
    isActive?: boolean;
  }): Promise<any> {
    if (!this.apiContext) await this.init();
    const response = await this.apiContext!.post('/api/modules/documents/templates', {
      headers: this.getAuthHeaders(),
      data: { category: 'other', isActive: true, ...data },
    });
    return await response.json();
  }

  /**
   * Delete document template via API
   */
  async deleteDocumentTemplate(id: string): Promise<void> {
    if (!this.apiContext) await this.init();
    await this.apiContext!.delete(`/api/modules/documents/templates/${id}`, {
      headers: this.getAuthHeaders(),
    });
  }

  /**
   * Create task template via API
   */
  async createTaskTemplate(data: {
    title: string;
    description?: string;
    priority?: string;
    recurrencePattern?: object;
  }): Promise<any> {
    if (!this.apiContext) await this.init();
    const response = await this.apiContext!.post('/api/modules/tasks/templates', {
      headers: this.getAuthHeaders(),
      data,
    });
    return await response.json();
  }

  /**
   * Delete task template via API
   */
  async deleteTaskTemplate(id: string): Promise<void> {
    if (!this.apiContext) await this.init();
    await this.apiContext!.delete(`/api/modules/tasks/templates/${id}`, {
      headers: this.getAuthHeaders(),
    });
  }

  /**
   * Create email auto-reply template via API
   */
  async createAutoReplyTemplate(data: {
    name: string;
    triggerKeywords: string[];
    bodyTemplate: string;
    isActive?: boolean;
    category?: string;
    tone?: string;
    keywordMatchMode?: string;
  }): Promise<any> {
    if (!this.apiContext) await this.init();
    const response = await this.apiContext!.post('/api/modules/email-client/auto-reply-templates', {
      headers: this.getAuthHeaders(),
      data: {
        isActive: true,
        tone: 'formal',
        keywordMatchMode: 'any',
        matchSubjectOnly: false,
        ...data,
      },
    });
    return await response.json();
  }

  /**
   * Delete email auto-reply template via API
   */
  async deleteAutoReplyTemplate(id: string): Promise<void> {
    if (!this.apiContext) await this.init();
    await this.apiContext!.delete(`/api/modules/email-client/auto-reply-templates/${id}`, {
      headers: this.getAuthHeaders(),
    });
  }

  /**
   * Get company profile via API
   */
  async getCompanyProfile(): Promise<any> {
    if (!this.apiContext) await this.init();
    const response = await this.apiContext!.get('/api/company/profile', {
      headers: this.getAuthHeaders(),
    });
    return await response.json();
  }

  /**
   * Update company profile via API
   */
  async updateCompanyProfile(data: Record<string, string | undefined>): Promise<any> {
    if (!this.apiContext) await this.init();
    const response = await this.apiContext!.patch('/api/company/profile', {
      headers: this.getAuthHeaders(),
      data,
    });
    return await response.json();
  }

  /**
   * Get settlement settings via API
   */
  async getSettlementSettings(): Promise<any> {
    if (!this.apiContext) await this.init();
    const response = await this.apiContext!.get('/api/modules/settlements/settings', {
      headers: this.getAuthHeaders(),
    });
    return await response.json();
  }

  /**
   * Update settlement settings via API
   */
  async updateSettlementSettings(data: Record<string, unknown>): Promise<any> {
    if (!this.apiContext) await this.init();
    const response = await this.apiContext!.patch('/api/modules/settlements/settings', {
      headers: this.getAuthHeaders(),
      data,
    });
    return await response.json();
  }

  /**
   * Dispose API context
   */
  async dispose(): Promise<void> {
    if (this.apiContext) {
      await this.apiContext.dispose();
    }
  }
}

/**
 * Factory function to create API helper
 */
export const createAPIHelper = async (email?: string, password?: string): Promise<APIHelper> => {
  const helper = new APIHelper();
  await helper.init();

  if (email && password) {
    await helper.login(email, password);
  }

  return helper;
};
