import { expect, Page } from '@playwright/test';

import { BasePage } from '../base/BasePage';
import { ToastComponent } from '../components/ToastComponent';

/**
 * CompanyProfilePage - Page Object for Company Profile page
 */
export class CompanyProfilePage extends BasePage {
  readonly toast: ToastComponent;

  // Page selectors
  private readonly pageTitle = 'h1:has-text("Profil firmy")';
  private readonly submitButton =
    'button[type="submit"]:has-text("Zapisz profil"), button:has-text("Zapisz profil")';

  // Section titles
  private readonly basicDataSection = 'text=Dane podstawowe';
  private readonly ownerDataSection = 'text=Dane właściciela';
  private readonly addressSection = 'text=Adres';
  private readonly bankDataSection = 'text=Kontakt i dane bankowe';
  private readonly communicationSection = 'text=Komunikacja';

  constructor(page: Page) {
    super(page);
    this.toast = new ToastComponent(page);
  }

  override async goto(_path?: string): Promise<void> {
    await super.goto('/company/profile');
    await this.waitForPageLoad();
  }

  async expectToBeOnPage(): Promise<void> {
    await this.expectVisible(this.pageTitle);
  }

  async expectAllSections(): Promise<void> {
    await this.expectVisible(this.basicDataSection);
    await this.expectVisible(this.ownerDataSection);
    await this.expectVisible(this.addressSection);
    await this.expectVisible(this.bankDataSection);
    await this.expectVisible(this.communicationSection);
  }

  async fillBasicData(data: { nip?: string; regon?: string; krs?: string }): Promise<void> {
    if (data.nip !== undefined) {
      await this.page.locator('input[placeholder="1234567890"]').clear();
      await this.page.locator('input[placeholder="1234567890"]').fill(data.nip);
    }
    if (data.regon !== undefined) {
      await this.page.locator('input[placeholder="12345678901234"]').clear();
      await this.page.locator('input[placeholder="12345678901234"]').fill(data.regon);
    }
    if (data.krs !== undefined) {
      await this.page.locator('input[placeholder="0000000000"]').clear();
      await this.page.locator('input[placeholder="0000000000"]').fill(data.krs);
    }
  }

  async fillOwnerData(data: {
    firstName?: string;
    lastName?: string;
    ownerName?: string;
    email?: string;
    phone?: string;
  }): Promise<void> {
    if (data.firstName !== undefined) {
      await this.page.locator('input[placeholder="Jan"]').fill(data.firstName);
    }
    if (data.lastName !== undefined) {
      await this.page.locator('input[placeholder="Kowalski"]').fill(data.lastName);
    }
    if (data.ownerName !== undefined) {
      await this.page.locator('input[placeholder="Jan Kowalski"]').fill(data.ownerName);
    }
    if (data.email !== undefined) {
      await this.page.locator('input[placeholder="jan@firma.pl"]').fill(data.email);
    }
    if (data.phone !== undefined) {
      await this.page.locator('input[placeholder="+48 123 456 789"]').first().fill(data.phone);
    }
  }

  async fillAddress(data: {
    street?: string;
    buildingNumber?: string;
    postalCode?: string;
    city?: string;
  }): Promise<void> {
    if (data.street !== undefined) {
      await this.page.locator('input[placeholder="ul. Przykładowa"]').fill(data.street);
    }
    if (data.buildingNumber !== undefined) {
      await this.page.locator('input[placeholder="1"]').first().fill(data.buildingNumber);
    }
    if (data.postalCode !== undefined) {
      await this.page.locator('input[placeholder="00-000"]').fill(data.postalCode);
    }
    if (data.city !== undefined) {
      await this.page.locator('input[placeholder="Warszawa"]').fill(data.city);
    }
  }

  async fillBankData(data: { bankAccount?: string; bankName?: string }): Promise<void> {
    if (data.bankAccount !== undefined) {
      await this.page.locator('input[placeholder*="PL00"]').fill(data.bankAccount);
    }
    if (data.bankName !== undefined) {
      await this.page.locator('input[placeholder="PKO Bank Polski"]').fill(data.bankName);
    }
  }

  async fillCommunication(data: {
    emailSignature?: string;
    documentFooter?: string;
  }): Promise<void> {
    if (data.emailSignature !== undefined) {
      await this.page.locator('textarea').first().fill(data.emailSignature);
    }
    if (data.documentFooter !== undefined) {
      await this.page.locator('textarea').last().fill(data.documentFooter);
    }
  }

  async saveProfile(): Promise<void> {
    await this.click(this.submitButton);
    await this.waitForPageLoad();
  }

  async expectNipValidationError(): Promise<void> {
    await expect(this.page.locator('text=Nieprawidłowy NIP')).toBeVisible();
  }

  async expectRegonValidationError(): Promise<void> {
    await expect(this.page.locator('text=Nieprawidłowy REGON')).toBeVisible();
  }
}
