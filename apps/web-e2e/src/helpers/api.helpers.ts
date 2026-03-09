import { request, type APIRequestContext, type APIResponse } from '@playwright/test';

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

  // ─── Internal request helpers ──────────────────────────────

  private async ensureInit(): Promise<void> {
    if (!this.apiContext) await this.init();
  }

  private getAuthHeaders(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.accessToken}`,
      'Content-Type': 'application/json',
    };
  }

  private async assertOk(response: APIResponse): Promise<void> {
    if (!response.ok()) {
      const body = await response.text().catch(() => '');
      throw new Error(`API ${response.status()} ${response.statusText()}: ${body}`);
    }
  }

  private async jsonOrThrow(response: APIResponse): Promise<any> {
    await this.assertOk(response);
    return response.json();
  }

  private async doGet(
    path: string,
    params?: Record<string, string | number | boolean | undefined>
  ): Promise<any> {
    await this.ensureInit();
    let url = path;
    if (params) {
      const query = new URLSearchParams();
      for (const [k, v] of Object.entries(params)) {
        if (v !== undefined) query.set(k, String(v));
      }
      const qs = query.toString();
      if (qs) url = `${path}?${qs}`;
    }
    const response = await this.apiContext!.get(url, { headers: this.getAuthHeaders() });
    return this.jsonOrThrow(response);
  }

  private async doPost(path: string, data?: unknown): Promise<any> {
    await this.ensureInit();
    const response = await this.apiContext!.post(path, {
      headers: this.getAuthHeaders(),
      data,
    });
    return this.jsonOrThrow(response);
  }

  private async doPatch(path: string, data?: unknown): Promise<any> {
    await this.ensureInit();
    const response = await this.apiContext!.patch(path, {
      headers: this.getAuthHeaders(),
      data,
    });
    return this.jsonOrThrow(response);
  }

  private async doDel(path: string): Promise<void> {
    await this.ensureInit();
    const response = await this.apiContext!.delete(path, { headers: this.getAuthHeaders() });
    await this.assertOk(response);
  }

  // ─── Auth ──────────────────────────────────────────────────

  async login(email: string, password: string): Promise<string> {
    await this.ensureInit();
    const response = await this.apiContext!.post('/api/auth/login', {
      data: { email, password },
    });
    const data = await this.jsonOrThrow(response);
    this.accessToken = data.access_token || data.accessToken;
    return this.accessToken;
  }

  // ─── Admin Users ───────────────────────────────────────────

  async createUser(data: {
    email: string;
    password: string;
    role: 'ADMIN' | 'COMPANY_OWNER' | 'EMPLOYEE';
    companyId?: number;
  }): Promise<any> {
    return this.doPost('/api/admin/users', data);
  }

  async getUserByEmail(email: string): Promise<any> {
    const users = await this.doGet('/api/admin/users');
    return users.find((u: any) => u.email === email);
  }

  async deleteUser(userId: number): Promise<void> {
    return this.doDel(`/api/admin/users/${userId}`);
  }

  // ─── Admin Companies ──────────────────────────────────────

  async createCompany(name: string, description?: string): Promise<any> {
    return this.doPost('/api/admin/companies', { name, description });
  }

  async getCompanyByName(name: string): Promise<any> {
    const companies = await this.doGet('/api/admin/companies');
    return companies.find((c: any) => c.name === name);
  }

  async deleteCompany(companyId: number): Promise<void> {
    return this.doDel(`/api/admin/companies/${companyId}`);
  }

  async enableModuleForCompany(companyId: number, moduleId: number): Promise<void> {
    await this.doPost(`/api/admin/companies/${companyId}/modules/${moduleId}`);
  }

  async disableModuleForCompany(companyId: number, moduleId: number): Promise<void> {
    return this.doDel(`/api/admin/companies/${companyId}/modules/${moduleId}`);
  }

  // ─── Company ──────────────────────────────────────────────

  async createEmployee(email: string, password: string): Promise<any> {
    return this.doPost('/api/company/employees', { email, password });
  }

  async grantPermission(
    employeeId: number,
    moduleId: number,
    permissions: { read?: boolean; write?: boolean; delete?: boolean }
  ): Promise<void> {
    await this.doPost(`/api/company/employees/${employeeId}/permissions`, {
      moduleId,
      ...permissions,
    });
  }

  async getCompanyProfile(): Promise<any> {
    return this.doGet('/api/company/profile');
  }

  async updateCompanyProfile(data: Record<string, string | undefined>): Promise<any> {
    return this.doPatch('/api/company/profile', data);
  }

  // ─── Tasks ────────────────────────────────────────────────

  async createTask(data: {
    title: string;
    description?: string;
    status?: string;
    priority?: string;
  }): Promise<any> {
    return this.doPost('/api/modules/tasks', data);
  }

  async getTasks(): Promise<any> {
    return this.doGet('/api/modules/tasks');
  }

  async updateTaskStatus(id: string, status: string, reason?: string): Promise<any> {
    const data: Record<string, string> = { status };
    if (reason) {
      if (status === 'BLOCKED') data.blockingReason = reason;
      if (status === 'CANCELLED') data.cancellationReason = reason;
    }
    return this.doPatch(`/api/modules/tasks/${id}`, data);
  }

  async deleteTask(id: string): Promise<void> {
    return this.doDel(`/api/modules/tasks/${id}`);
  }

  // ─── Task Templates ───────────────────────────────────────

  async createTaskTemplate(data: {
    title: string;
    description?: string;
    priority?: string;
    recurrencePattern?: object;
  }): Promise<any> {
    return this.doPost('/api/modules/tasks/templates', data);
  }

  async deleteTaskTemplate(id: string): Promise<void> {
    return this.doDel(`/api/modules/tasks/templates/${id}`);
  }

  // ─── Settlements ──────────────────────────────────────────

  async getSettlements(month: number, year: number): Promise<any> {
    return this.doGet('/api/modules/settlements', { month, year });
  }

  async getSettlement(id: string): Promise<any> {
    return this.doGet(`/api/modules/settlements/${id}`);
  }

  async initializeSettlementMonth(month: number, year: number): Promise<any> {
    return this.doPost('/api/modules/settlements/initialize', { month, year });
  }

  async updateSettlementStatus(id: string, status: string, notes?: string): Promise<any> {
    const data: Record<string, string> = { status };
    if (notes) data.notes = notes;
    return this.doPatch(`/api/modules/settlements/${id}/status`, data);
  }

  async updateSettlement(id: string, data: Record<string, unknown>): Promise<any> {
    return this.doPatch(`/api/modules/settlements/${id}`, data);
  }

  async addSettlementComment(settlementId: string, content: string): Promise<any> {
    return this.doPost(`/api/modules/settlements/${settlementId}/comments`, { content });
  }

  async getSettlementSettings(): Promise<any> {
    return this.doGet('/api/modules/settlements/settings');
  }

  async updateSettlementSettings(data: Record<string, unknown>): Promise<any> {
    return this.doPatch('/api/modules/settlements/settings', data);
  }

  // ─── Clients ──────────────────────────────────────────────

  async createClient(data: {
    name: string;
    nip?: string;
    email?: string;
    phone?: string;
    address?: string;
    vatStatus?: string;
  }): Promise<any> {
    return this.doPost('/api/modules/clients', data);
  }

  async getClients(params?: { search?: string; page?: number; limit?: number }): Promise<any> {
    return this.doGet('/api/modules/clients', params);
  }

  async deleteClient(id: string): Promise<void> {
    return this.doDel(`/api/modules/clients/${id}`);
  }

  // ─── Time Tracking ────────────────────────────────────────

  async createTimeEntry(data: {
    description: string;
    startTime: string;
    endTime?: string;
    clientId?: string;
    taskId?: string;
  }): Promise<any> {
    return this.doPost('/api/modules/time-tracking/entries', data);
  }

  async getTimeEntries(params?: { page?: number; limit?: number }): Promise<any> {
    return this.doGet('/api/modules/time-tracking/entries', params);
  }

  async deleteTimeEntry(id: string): Promise<void> {
    return this.doDel(`/api/modules/time-tracking/entries/${id}`);
  }

  // ─── Offers ───────────────────────────────────────────────

  async createOffer(data: {
    title: string;
    description?: string;
    clientId?: string;
    validUntil?: string;
  }): Promise<any> {
    return this.doPost('/api/modules/offers', data);
  }

  async deleteOffer(id: string): Promise<void> {
    return this.doDel(`/api/modules/offers/${id}`);
  }

  // ─── Offer Templates ─────────────────────────────────────

  async createOfferTemplate(data: {
    name: string;
    description?: string;
    content?: string;
  }): Promise<any> {
    return this.doPost('/api/modules/offers/templates', data);
  }

  async deleteOfferTemplate(id: string): Promise<void> {
    return this.doDel(`/api/modules/offers/templates/${id}`);
  }

  // ─── Leads ────────────────────────────────────────────────

  async createLead(data: {
    companyName: string;
    contactPerson?: string;
    email?: string;
    phone?: string;
    source?: string;
    status?: string;
  }): Promise<any> {
    return this.doPost('/api/modules/offers/leads', data);
  }

  async deleteLead(id: string): Promise<void> {
    return this.doDel(`/api/modules/offers/leads/${id}`);
  }

  // ─── Notifications ────────────────────────────────────────

  async getNotifications(params?: {
    page?: number;
    limit?: number;
    isRead?: boolean;
  }): Promise<any> {
    return this.doGet('/api/notifications', params);
  }

  async markNotificationRead(id: string): Promise<any> {
    return this.doPatch(`/api/notifications/${id}/read`);
  }

  async deleteNotification(id: string): Promise<void> {
    return this.doDel(`/api/notifications/${id}`);
  }

  // ─── Documents ────────────────────────────────────────────

  async createDocumentTemplate(data: {
    name: string;
    description?: string;
    templateContent?: string;
    placeholders?: string[];
    category?: string;
    isActive?: boolean;
  }): Promise<any> {
    return this.doPost('/api/modules/documents/templates', {
      category: 'other',
      isActive: true,
      ...data,
    });
  }

  async deleteDocumentTemplate(id: string): Promise<void> {
    return this.doDel(`/api/modules/documents/templates/${id}`);
  }

  async generateDocument(data: {
    templateId: string;
    clientId: string;
    variables?: Record<string, string>;
  }): Promise<any> {
    return this.doPost('/api/modules/documents/generated', data);
  }

  async deleteGeneratedDocument(id: string): Promise<void> {
    return this.doDel(`/api/modules/documents/generated/${id}`);
  }

  // ─── Email Auto-Reply Templates ───────────────────────────

  async createAutoReplyTemplate(data: {
    name: string;
    triggerKeywords: string[];
    bodyTemplate: string;
    isActive?: boolean;
    category?: string;
    tone?: string;
    keywordMatchMode?: string;
  }): Promise<any> {
    return this.doPost('/api/modules/email-client/auto-reply-templates', {
      isActive: true,
      tone: 'formal',
      keywordMatchMode: 'any',
      matchSubjectOnly: false,
      ...data,
    });
  }

  async deleteAutoReplyTemplate(id: string): Promise<void> {
    return this.doDel(`/api/modules/email-client/auto-reply-templates/${id}`);
  }

  // ─── AI Configuration ─────────────────────────────────────

  async getAiConfiguration(): Promise<any> {
    return this.doGet('/api/modules/ai-agent/config');
  }

  async updateAiConfiguration(data: Record<string, unknown>): Promise<any> {
    return this.doPatch('/api/modules/ai-agent/config', data);
  }

  // ─── Lifecycle ────────────────────────────────────────────

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
