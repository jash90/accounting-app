import { defineConfig, devices } from '@playwright/test';
import { nxE2EPreset } from '@nx/playwright/preset';
import { workspaceRoot } from '@nx/devkit';

// For CI, you may want to set BASE_URL to the deployed application.
const baseURL = process.env['BASE_URL'] || 'http://localhost:4200';
const isCI = !!process.env.CI;

/**
 * Enhanced Playwright Configuration
 * Includes accessibility testing, improved reporting, and performance monitoring
 *
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  ...nxE2EPreset(__filename, { testDir: './src' }),

  // Test directory patterns
  testMatch: ['**/*.spec.ts', '**/*.test.ts'],

  // Global timeout settings
  timeout: 60000, // 60 seconds per test
  expect: {
    timeout: 10000, // 10 seconds for assertions
  },

  // Reporter configuration
  reporter: [
    ['list'], // Console output
    ['html', { outputFolder: 'playwright-report', open: 'never' }], // HTML report
    ['json', { outputFile: 'test-results/results.json' }], // JSON for CI
    ['junit', { outputFile: 'test-results/junit.xml' }], // JUnit for CI
  ],

  // Shared test settings
  use: {
    baseURL,

    // Trace and debugging
    trace: isCI ? 'retain-on-failure' : 'on-first-retry',
    screenshot: isCI ? 'only-on-failure' : 'off',
    video: isCI ? 'retain-on-failure' : 'off',

    // Browser context options
    viewport: { width: 1280, height: 720 },
    ignoreHTTPSErrors: true,

    // Collect network activity
    // launchOptions: {
    //   slowMo: 0, // Slow down operations by specified ms (useful for debugging)
    // },

    // Additional options
    actionTimeout: 15000, // 15 seconds for actions
    navigationTimeout: 30000, // 30 seconds for navigation
  },

  // Retry failed tests
  retries: isCI ? 2 : 0,

  // Parallel execution
  workers: isCI ? 2 : undefined, // Limit workers in CI
  fullyParallel: !isCI, // Run tests in parallel locally

  // Fail fast in CI
  maxFailures: isCI ? 10 : undefined,

  // Forbid test.only in CI
  forbidOnly: isCI,

  /* Run your local dev server before starting the tests */
  webServer: {
    command: 'npx nx run-many --target=serve --projects=api,web --parallel',
    url: 'http://localhost:4200',
    reuseExistingServer: !isCI,
    cwd: workspaceRoot,
    timeout: 120000, // 2 minutes to start servers
    stdout: 'pipe',
    stderr: 'pipe',
  },

  // Test projects for different browsers
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        // Enable accessibility tree snapshot
        // @ts-ignore
        contextOptions: {
          strictSelectors: false,
        },
      },
    },

    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },

    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },

    // Mobile browsers (uncomment to enable)
    /* {
      name: 'Mobile Chrome',
      use: {
        ...devices['Pixel 5'],
        hasTouch: true,
        isMobile: true,
      },
    },
    {
      name: 'Mobile Safari',
      use: {
        ...devices['iPhone 12'],
        hasTouch: true,
        isMobile: true,
      },
    }, */

    // Branded browsers (uncomment to enable)
    /* {
      name: 'Microsoft Edge',
      use: {
        ...devices['Desktop Edge'],
        channel: 'msedge'
      },
    },
    {
      name: 'Google Chrome',
      use: {
        ...devices['Desktop Chrome'],
        channel: 'chrome'
      },
    } */
  ],
});
