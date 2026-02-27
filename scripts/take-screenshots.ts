import * as fs from 'fs';
import * as path from 'path';

import { chromium } from 'playwright';

const BASE_URL = 'http://localhost:4200';
const EMAIL = 'nowak@biuro-nowak.pl';
const PASSWORD = 'Demo12345678!';
const SCREENSHOTS_DIR = path.join(process.cwd(), 'screenshots');

const pages = [
  { url: '/company', name: '01-dashboard.png' },
  { url: '/company/modules/clients', name: '02-clients-dashboard.png' },
  { url: '/company/modules/tasks', name: '03-tasks-dashboard.png' },
  { url: '/company/modules/time-tracking', name: '04-time-tracking-dashboard.png' },
  { url: '/company/modules/settlements', name: '05-settlements-dashboard.png' },
  { url: '/company/modules/documents', name: '06-documents-dashboard.png' },
  { url: '/company/modules/offers', name: '07-offers-dashboard.png' },
  { url: '/company/modules/email-client', name: '08-email-client.png' },
  { url: '/company/modules/ai-agent', name: '09-ai-agent-dashboard.png' },
];

async function main() {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  const page = await context.newPage();

  console.log('Navigating to login page...');
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle' });

  console.log('Filling login form...');
  await page.fill('input[type="email"], input[name="email"], input[placeholder*="mail"]', EMAIL);
  await page.fill(
    'input[type="password"], input[name="password"], input[placeholder*="assword"]',
    PASSWORD
  );
  await page.click('button[type="submit"]');

  console.log('Waiting for redirect after login...');
  await page.waitForURL('**/company**', { timeout: 15000 });
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1500);

  for (const { url, name } of pages) {
    console.log(`Navigating to ${url}...`);
    await page.goto(`${BASE_URL}${url}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000); // wait for charts/data to render

    // Expand the nested scrollable container so fullPage captures all content
    await page.evaluate(() => {
      // Outer shell: remove h-screen + overflow-hidden
      const shell = document.querySelector('div.flex.h-screen');
      if (shell) {
        (shell as HTMLElement).style.height = 'auto';
        (shell as HTMLElement).style.overflow = 'visible';
      }
      // Right column wrapper: remove overflow-hidden
      const rightCol = shell?.querySelector(':scope > div.flex-1');
      if (rightCol) {
        (rightCol as HTMLElement).style.overflow = 'visible';
      }
      // Main content: remove overflow-y-auto, let it expand
      const main = document.querySelector('main');
      if (main) {
        main.style.overflow = 'visible';
        main.style.height = 'auto';
      }
    });

    const screenshotPath = path.join(SCREENSHOTS_DIR, name);
    await page.screenshot({ path: screenshotPath, fullPage: true });
    console.log(`  ✓ Saved ${name}`);
  }

  await browser.close();
  console.log('\nAll screenshots saved to:', SCREENSHOTS_DIR);
}

main().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
