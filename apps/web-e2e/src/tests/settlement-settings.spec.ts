/* eslint-disable playwright/expect-expect, playwright/no-skipped-test */
import { expect, test } from '../fixtures/auth.fixtures';
import { SettlementsPage } from '../pages/modules/SettlementsPage';

const BASE_PATH = '/company/modules/settlements';

test.describe('Settlement Settings - Page', () => {
  test('should display settings page header', async ({ authenticatedCompanyOwnerPage }) => {
    const page = new SettlementsPage(authenticatedCompanyOwnerPage);
    await page.gotoSettings(BASE_PATH);
    await page.expectToBeOnSettingsPage();
  });

  test('should display all 3 sections', async ({ authenticatedCompanyOwnerPage }) => {
    const page = new SettlementsPage(authenticatedCompanyOwnerPage);
    await page.gotoSettings(BASE_PATH);
    await page.expectAllSettingsSections();
  });
});

test.describe('Settlement Settings - Default Values', () => {
  test('should change default priority to Wysoki', async ({ authenticatedCompanyOwnerPage }) => {
    const page = new SettlementsPage(authenticatedCompanyOwnerPage);
    await page.gotoSettings(BASE_PATH);

    await page.setDefaultPriority('1');
    await page.saveSettings();

    // Verify priority saved — reopen and check
    await page.gotoSettings(BASE_PATH);
    await expect(authenticatedCompanyOwnerPage.locator('#defaultPriority')).toContainText('Wysoki');
  });

  test('should set deadline day and save', async ({ authenticatedCompanyOwnerPage }) => {
    const page = new SettlementsPage(authenticatedCompanyOwnerPage);
    await page.gotoSettings(BASE_PATH);

    await page.setDeadlineDay('15');
    await page.saveSettings();

    // Reload and verify the value persisted
    await page.gotoSettings(BASE_PATH);
    await expect(authenticatedCompanyOwnerPage.locator('#defaultDeadlineDay')).toHaveValue('15');
  });
});

test.describe('Settlement Settings - Notifications', () => {
  test('should toggle status notifications switch', async ({ authenticatedCompanyOwnerPage }) => {
    const page = new SettlementsPage(authenticatedCompanyOwnerPage);
    await page.gotoSettings(BASE_PATH);

    // Read current state
    const switchEl = authenticatedCompanyOwnerPage.locator('#notifyOnStatusChange');
    const isChecked = await switchEl.isChecked().catch(() =>
      authenticatedCompanyOwnerPage
        .locator('#notifyOnStatusChange[data-state="checked"]')
        .count()
        .then((c) => c > 0)
    );

    await page.toggleNotifyOnStatusChange();
    await page.saveSettings();

    // Verify it toggled (state changed)
    await page.gotoSettings(BASE_PATH);
    const newState = await authenticatedCompanyOwnerPage
      .locator('#notifyOnStatusChange[data-state="checked"]')
      .count()
      .then((c) => c > 0);
    expect(newState).toBe(!isChecked);
  });

  test('should toggle deadline notifications switch', async ({ authenticatedCompanyOwnerPage }) => {
    const page = new SettlementsPage(authenticatedCompanyOwnerPage);
    await page.gotoSettings(BASE_PATH);

    const switchEl = authenticatedCompanyOwnerPage.locator(
      '#notifyOnDeadlineApproaching[data-state="checked"]'
    );
    const wasChecked = (await switchEl.count()) > 0;

    await page.toggleNotifyOnDeadlineApproaching();
    await page.saveSettings();

    await page.gotoSettings(BASE_PATH);
    const nowChecked =
      (await authenticatedCompanyOwnerPage
        .locator('#notifyOnDeadlineApproaching[data-state="checked"]')
        .count()) > 0;
    expect(nowChecked).toBe(!wasChecked);
  });

  test('should set deadline warning days', async ({ authenticatedCompanyOwnerPage }) => {
    const page = new SettlementsPage(authenticatedCompanyOwnerPage);
    await page.gotoSettings(BASE_PATH);

    // Ensure notifications are on (so warning days input is visible)
    const deadlineSwitch = authenticatedCompanyOwnerPage.locator(
      '#notifyOnDeadlineApproaching[data-state="checked"]'
    );
    const isOn = (await deadlineSwitch.count()) > 0;
    if (!isOn) {
      await page.toggleNotifyOnDeadlineApproaching();
    }

    await page.setWarningDays('5');
    await page.saveSettings();

    await page.gotoSettings(BASE_PATH);
    await expect(authenticatedCompanyOwnerPage.locator('#deadlineWarningDays')).toHaveValue('5');
  });
});

test.describe('Settlement Settings - Status Email Dialog', () => {
  test('should show email dialog when changing to MISSING_INVOICE status', async ({
    authenticatedCompanyOwnerPage,
  }) => {
    const page = new SettlementsPage(authenticatedCompanyOwnerPage);
    await page.gotoList(BASE_PATH);

    // Need at least one settlement with email configured
    const rowCount = await page.getTableRowCount();
    if (rowCount === 0) {
      test.skip();
      return;
    }

    await page.triggerMissingInvoiceStatus();
    await page.expectEmailDialog();
  });

  test('should cancel status change from email dialog', async ({
    authenticatedCompanyOwnerPage,
  }) => {
    const page = new SettlementsPage(authenticatedCompanyOwnerPage);
    await page.gotoList(BASE_PATH);

    const rowCount = await page.getTableRowCount();
    if (rowCount === 0) {
      test.skip();
      return;
    }

    await page.triggerMissingInvoiceStatus();
    await page.expectEmailDialog();
    await page.clickCancelStatusChange();

    // Dialog should close
    await expect(authenticatedCompanyOwnerPage.locator('[role="alertdialog"]')).not.toBeVisible();
  });

  test('should change status only without email', async ({ authenticatedCompanyOwnerPage }) => {
    const page = new SettlementsPage(authenticatedCompanyOwnerPage);
    await page.gotoList(BASE_PATH);

    const rowCount = await page.getTableRowCount();
    if (rowCount === 0) {
      test.skip();
      return;
    }

    await page.triggerMissingInvoiceStatus();
    await page.expectEmailDialog();
    await page.clickChangeStatusOnly();

    // Dialog should close
    await expect(authenticatedCompanyOwnerPage.locator('[role="alertdialog"]')).not.toBeVisible();
  });

  test('should send email and change status', async ({ authenticatedCompanyOwnerPage }) => {
    const page = new SettlementsPage(authenticatedCompanyOwnerPage);
    await page.gotoList(BASE_PATH);

    const rowCount = await page.getTableRowCount();
    if (rowCount === 0) {
      test.skip();
      return;
    }

    await page.triggerMissingInvoiceStatus();
    await page.expectEmailDialog();
    // Click "Send email and change status"
    await page.clickSendEmailAndChangeStatus();

    // Dialog should close after action
    await expect(authenticatedCompanyOwnerPage.locator('[role="alertdialog"]')).not.toBeVisible();
  });
});
