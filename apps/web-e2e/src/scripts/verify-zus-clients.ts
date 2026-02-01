import { chromium } from '@playwright/test';

async function verifyZusClients() {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  // Listen for API responses
  const clientsResponses: string[] = [];
  page.on('response', async (response) => {
    if (response.url().includes('/api/modules/clients')) {
      const status = response.status();
      try {
        const body = await response.json();
        clientsResponses.push(`Status: ${status}, Data count: ${body?.data?.length ?? 0}`);
        console.log(
          `[API Response] /clients - Status: ${status}, Clients: ${body?.data?.length ?? 0}`
        );
        if (body?.data?.length > 0) {
          console.log('  First client:', body.data[0].name);
        }
      } catch {
        clientsResponses.push(`Status: ${status}, Body: non-JSON`);
      }
    }
  });

  try {
    console.log('1. Opening login page...');
    await page.goto('http://localhost:4200/login');
    await page.waitForLoadState('networkidle');

    console.log('2. Logging in as admin...');
    await page.fill('input[name="email"]', 'admin@system.com');
    await page.fill('input[name="password"]', 'Admin123456!');
    await page.click('button[type="submit"]');

    // Wait for redirect after login (admin goes to /admin)
    await page.waitForURL('**/admin**', { timeout: 10000 });
    console.log('3. Login successful, redirected to admin panel');

    console.log('4. Navigating to ZUS contributions create page...');
    await page.goto('http://localhost:4200/admin/modules/zus/contributions/create');
    await page.waitForLoadState('networkidle');

    // Wait for API response
    console.log('5. Waiting for clients API response...');
    await page.waitForTimeout(3000);

    console.log('\n=== API Responses captured ===');
    clientsResponses.forEach((r) => console.log(`  ${r}`));
    console.log('================================\n');

    // Take screenshot
    await page.screenshot({ path: 'screenshots/zus-before-click.png', fullPage: true });

    // Find and interact with the client Select
    console.log('6. Looking for client select trigger...');

    // For shadcn Select, the trigger is a button element
    // Find by the placeholder text or form label
    const clientSelectTrigger = page.locator('button[role="combobox"]').first();

    const triggerText = await clientSelectTrigger.textContent();
    console.log(`7. Found select trigger with text: "${triggerText}"`);

    if (await clientSelectTrigger.isVisible()) {
      console.log('8. Clicking select trigger...');
      await clientSelectTrigger.click();

      // Wait for dropdown to open
      await page.waitForTimeout(500);

      // Take screenshot with dropdown open
      await page.screenshot({ path: 'screenshots/zus-dropdown-open.png', fullPage: true });

      // Check for SelectContent (portal mounted)
      const selectContent = page.locator('[role="listbox"]');
      const isContentVisible = await selectContent.isVisible();
      console.log(`9. Select content visible: ${isContentVisible}`);

      if (isContentVisible) {
        // Count options
        const options = selectContent.locator('[role="option"]');
        const count = await options.count();
        console.log(`10. Found ${count} options`);

        if (count > 0) {
          console.log('11. Listing all options:');
          for (let i = 0; i < count; i++) {
            const optionText = await options.nth(i).textContent();
            console.log(`    ${i + 1}. ${optionText}`);
          }

          // Select first client
          console.log('12. Selecting first client...');
          await options.first().click();
          await page.waitForTimeout(500);

          // Verify selection
          const newTriggerText = await clientSelectTrigger.textContent();
          console.log(`13. After selection, trigger text: "${newTriggerText}"`);

          await page.screenshot({ path: 'screenshots/zus-client-selected.png', fullPage: true });
        } else {
          console.log('No options found in the dropdown!');

          // Debug: Print the HTML content of the select
          const contentHTML = await selectContent.innerHTML();
          console.log('Dropdown HTML (first 500 chars):');
          console.log(contentHTML.substring(0, 500));
        }
      } else {
        console.log('Select content not visible after click!');
      }
    }

    console.log('\n✅ Verification complete!');
    console.log('Browser staying open for 20 seconds...');
    await page.waitForTimeout(20000);
  } catch (error) {
    console.error('Error:', error);
    await page.screenshot({ path: 'screenshots/zus-error.png', fullPage: true });
  } finally {
    await browser.close();
  }
}

verifyZusClients();
