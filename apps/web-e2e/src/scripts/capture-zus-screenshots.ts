import { chromium } from '@playwright/test';

const BASE_URL = process.env['BASE_URL'] || 'http://localhost:4200';
const SCREENSHOTS_DIR = './screenshots/zus-module';

async function captureScreenshots() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
  });
  const page = await context.newPage();

  console.log('📸 Starting ZUS Module Screenshot Capture...\n');

  try {
    // 1. Login
    console.log('1. Logging in...');
    await page.goto(`${BASE_URL}/login`);
    await page.waitForLoadState('networkidle');

    await page.fill(
      'input[name="email"]',
      process.env['SEED_OWNER_EMAIL'] || 'bartlomiej.zimny@onet.pl'
    );
    await page.fill('input[name="password"]', process.env['SEED_OWNER_PASSWORD'] || 'Owner123456!');
    await page.click('button[type="submit"]');

    await page.waitForURL(/\/company/, { timeout: 10000 });
    console.log('   ✓ Logged in successfully\n');

    // 2. ZUS Dashboard
    console.log('2. Capturing ZUS Dashboard...');
    await page.goto(`${BASE_URL}/company/modules/zus`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000); // Wait for animations
    await page.screenshot({
      path: `${SCREENSHOTS_DIR}/01-zus-dashboard.png`,
      fullPage: true,
    });
    console.log('   ✓ Saved: 01-zus-dashboard.png\n');

    // 3. ZUS Contributions List
    console.log('3. Capturing ZUS Contributions List...');
    await page.goto(`${BASE_URL}/company/modules/zus/contributions`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
    await page.screenshot({
      path: `${SCREENSHOTS_DIR}/02-zus-contributions-list.png`,
      fullPage: true,
    });
    console.log('   ✓ Saved: 02-zus-contributions-list.png\n');

    // 4. ZUS Create Contribution - Single Mode
    console.log('4. Capturing ZUS Create Contribution (Single Mode)...');
    await page.goto(`${BASE_URL}/company/modules/zus/contributions/create`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
    await page.screenshot({
      path: `${SCREENSHOTS_DIR}/03-zus-create-single.png`,
      fullPage: true,
    });
    console.log('   ✓ Saved: 03-zus-create-single.png\n');

    // 5. ZUS Create Contribution - Batch Mode
    console.log('5. Capturing ZUS Create Contribution (Batch Mode)...');
    const batchButton = page.getByRole('button', { name: /Generuj dla wszystkich/i });
    if (await batchButton.isVisible()) {
      await batchButton.click();
      await page.waitForTimeout(500);
      await page.screenshot({
        path: `${SCREENSHOTS_DIR}/04-zus-create-batch.png`,
        fullPage: true,
      });
      console.log('   ✓ Saved: 04-zus-create-batch.png\n');
    }

    // 6. ZUS Settings
    console.log('6. Capturing ZUS Settings...');
    await page.goto(`${BASE_URL}/company/modules/zus/settings`);
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('text=Stawki składek społecznych', { timeout: 10000 });
    await page.waitForTimeout(500);
    await page.screenshot({
      path: `${SCREENSHOTS_DIR}/05-zus-settings.png`,
      fullPage: true,
    });
    console.log('   ✓ Saved: 05-zus-settings.png\n');

    // 7. ZUS Settings - Scroll to show more content
    console.log('7. Capturing ZUS Settings (Scrolled)...');
    await page.evaluate(() => window.scrollTo(0, 600));
    await page.waitForTimeout(300);
    await page.screenshot({
      path: `${SCREENSHOTS_DIR}/06-zus-settings-scrolled.png`,
      fullPage: false,
    });
    console.log('   ✓ Saved: 06-zus-settings-scrolled.png\n');

    console.log('✅ All screenshots captured successfully!');
    console.log(`📁 Location: ${SCREENSHOTS_DIR}/`);
  } catch (error) {
    console.error('❌ Error capturing screenshots:', error);
    throw error;
  } finally {
    await browser.close();
  }
}

captureScreenshots().catch(console.error);
