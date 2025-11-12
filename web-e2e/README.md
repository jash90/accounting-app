# Accounting System - E2E Test Suite

Comprehensive Playwright E2E test suite for the Accounting System with RBAC (Role-Based Access Control).

## 📊 Test Coverage

### Test Statistics
- **Total Test Cases**: 127+
- **Test Files**: 5
- **Page Object Models**: 20+
- **Browsers**: Chromium, Firefox, WebKit
- **Coverage Areas**: Authentication, RBAC, Admin Workflows, Company Owner Workflows, Employee Workflows, Error Handling

### Test Suites

#### 1. Authentication Tests (`auth.spec.ts`) - 23 tests
- ✅ Login flows for all roles (Admin, Company Owner, Employee)
- ✅ Invalid credentials handling
- ✅ Token persistence and refresh
- ✅ Session management
- ✅ Logout functionality
- ✅ RBAC enforcement across all roles
- ✅ Multi-tenant data isolation
- ✅ Unauthorized access prevention

#### 2. Admin Workflow Tests (`admin-workflows.spec.ts`) - 30 tests
- ✅ User management (create, read, update, delete)
- ✅ Company management (CRUD operations)
- ✅ Module management (enable/disable for companies)
- ✅ User search and filtering
- ✅ Form validation
- ✅ Duplicate prevention
- ✅ Role-based user creation

#### 3. Company Owner Workflow Tests (`company-owner-workflows.spec.ts`) - 28 tests
- ✅ Employee management (invite, update, delete)
- ✅ Permission management (grant/revoke read, write, delete)
- ✅ Module access control
- ✅ Bulk permission operations
- ✅ Permission dependency validation
- ✅ Real-time permission updates
- ✅ Multi-tenant employee isolation

#### 4. Employee Workflow Tests (`employee-workflows.spec.ts`) - 16 tests
- ✅ Modules dashboard navigation
- ✅ Simple Text CRUD operations
- ✅ Permission-based access control
- ✅ Data isolation between companies
- ✅ Search and pagination
- ✅ Form validation
- ✅ Read-only vs read-write access

#### 5. Error Handling & Edge Cases (`error-handling.spec.ts`) - 30+ tests
- ✅ Form validation (email, password, required fields)
- ✅ API error handling (401, 403, 404, 500)
- ✅ Network timeout and retry logic
- ✅ Token expiration handling
- ✅ Concurrent request handling
- ✅ Empty states and large datasets
- ✅ Special characters and XSS prevention
- ✅ SQL injection prevention
- ✅ Unicode character support
- ✅ Browser navigation edge cases

## 🏗️ Architecture

### Page Object Model (POM) Structure

```
web-e2e/src/
├── pages/
│   ├── base/
│   │   └── BasePage.ts          # Base page with common methods
│   ├── components/
│   │   ├── NavigationComponent.ts
│   │   └── ToastComponent.ts
│   ├── auth/
│   │   ├── LoginPage.ts
│   │   └── UnauthorizedPage.ts
│   ├── admin/
│   │   ├── AdminDashboardPage.ts
│   │   ├── UsersListPage.ts
│   │   ├── UserFormPage.ts
│   │   ├── CompaniesListPage.ts
│   │   ├── CompanyFormPage.ts
│   │   └── ModulesListPage.ts
│   ├── company/
│   │   ├── CompanyDashboardPage.ts
│   │   ├── EmployeesListPage.ts
│   │   ├── EmployeePermissionsPage.ts
│   │   └── CompanyModulesListPage.ts
│   └── employee/
│       ├── ModulesDashboardPage.ts
│       ├── SimpleTextListPage.ts
│       └── SimpleTextFormPage.ts
├── fixtures/
│   ├── auth.fixtures.ts         # Authentication fixtures
│   └── data.fixtures.ts         # Test data generators
├── helpers/
│   ├── api.helpers.ts           # API helper functions
│   ├── wait.helpers.ts          # Advanced waiting strategies
│   └── test.helpers.ts          # General test utilities
└── tests/
    ├── auth.spec.ts
    ├── admin-workflows.spec.ts
    ├── company-owner-workflows.spec.ts
    ├── employee-workflows.spec.ts
    └── error-handling.spec.ts
```

### Design Patterns

1. **Page Object Model**: Separates test logic from page structure
2. **Test Fixtures**: Reusable pre-authenticated contexts
3. **Helper Utilities**: Common operations extracted to helpers
4. **Test Data Factory**: Dynamic test data generation
5. **Component-based POMs**: Shared components (Navigation, Toast)

## 🚀 Getting Started

### Prerequisites

1. **Node.js** (v18+)
2. **pnpm** package manager
3. **PostgreSQL** database running (via Docker Compose)
4. **Seeded database** with test data

### Installation

```bash
# Install dependencies (if not already done)
pnpm install

# Install Playwright browsers
npx playwright install

# Install Playwright system dependencies (Linux only)
npx playwright install-deps
```

### Database Setup

```bash
# Start PostgreSQL database
docker-compose up -d

# Seed database with test data
npm run seed
```

The seed script creates:
- **Admin**: admin@system.com / Admin123!
- **Company A Owner**: owner.a@company.com / Owner123!
- **Company A Employees**:
  - employee1.a@company.com / Employee123! (read + write permissions)
  - employee2.a@company.com / Employee123! (read-only)
- **Company B Owner**: owner.b@company.com / Owner123!
- **Company B Employee**: employee1.b@company.com / Employee123! (full permissions)

## 🧪 Running Tests

### Run All Tests

```bash
# Run all E2E tests (starts API + Web automatically)
npm run test:e2e

# Or using pnpm
pnpm test:e2e

# Or directly with Playwright
npx playwright test
```

### Run Specific Test Suites

```bash
# Run authentication tests only
npx playwright test auth.spec.ts

# Run admin workflow tests
npx playwright test admin-workflows.spec.ts

# Run company owner workflow tests
npx playwright test company-owner-workflows.spec.ts

# Run employee workflow tests
npx playwright test employee-workflows.spec.ts

# Run error handling tests
npx playwright test error-handling.spec.ts
```

### Run Tests in Specific Browser

```bash
# Run in Chromium only
npx playwright test --project=chromium

# Run in Firefox only
npx playwright test --project=firefox

# Run in WebKit only
npx playwright test --project=webkit
```

### Run Tests in UI Mode

```bash
# Interactive UI mode for debugging
npx playwright test --ui

# Debug specific test
npx playwright test --debug auth.spec.ts
```

### Run Tests in Headed Mode

```bash
# See browser during test execution
npx playwright test --headed

# Slow down test execution (in ms)
npx playwright test --headed --slow-mo=1000
```

## 📊 Test Reports

### HTML Report

After running tests, view the HTML report:

```bash
npx playwright show-report playwright-report
```

The report includes:
- Test execution summary
- Screenshots on failure
- Videos on failure (in CI)
- Trace files for debugging
- Performance metrics

### CI/CD Reports

The following reports are generated for CI/CD:
- **HTML**: `playwright-report/index.html`
- **JSON**: `test-results/results.json`
- **JUnit XML**: `test-results/junit.xml`

## 🔧 Configuration

### Environment Variables

```bash
# Base URL (default: http://localhost:4200)
BASE_URL=http://localhost:4200

# CI mode (affects retries, parallel execution)
CI=true
```

### Playwright Configuration

Edit `playwright.config.ts` to customize:
- **Timeout settings**: Global timeout, action timeout
- **Retry logic**: Number of retries on failure
- **Parallel execution**: Number of workers
- **Reporter options**: Report formats and output
- **Browser projects**: Enable/disable browsers

### Running Tests with Different Configurations

```bash
# Run with custom base URL
BASE_URL=http://staging.example.com npx playwright test

# Run in CI mode (with retries)
CI=true npx playwright test

# Run with specific timeout
npx playwright test --timeout=120000
```

## 🐛 Debugging Tests

### Debug Mode

```bash
# Run tests in debug mode
npx playwright test --debug

# Debug specific test
npx playwright test --debug auth.spec.ts:10
```

### Trace Viewer

```bash
# View trace for failed test
npx playwright show-trace test-results/.../trace.zip

# Trace includes:
# - DOM snapshots
# - Network activity
# - Console logs
# - Test steps
```

### Verbose Logging

```bash
# Enable verbose logging
DEBUG=pw:api npx playwright test
```

### Inspector

Use Playwright Inspector to step through tests:
- Set breakpoints with `await page.pause()`
- Inspect element selectors
- View page state at each step

## 📝 Writing New Tests

### Creating a New Test File

```typescript
import { test, expect } from '../fixtures/auth.fixtures';
import { LoginPage } from '../pages/auth/LoginPage';

test.describe('My New Feature Tests', () => {
  test('should do something', async ({ page }) => {
    const loginPage = new LoginPage(page);

    await loginPage.goto();
    await loginPage.loginAsAdmin();

    // Your test assertions
    await expect(page).toHaveURL('/admin');
  });
});
```

### Using Pre-authenticated Fixtures

```typescript
test('admin can view users', async ({ authenticatedAdminPage }) => {
  // Already logged in as admin
  await authenticatedAdminPage.goto('/admin/users');
  await expect(authenticatedAdminPage).toHaveURL('/admin/users');
});
```

### Creating Test Data

```typescript
import { TestDataFactory } from '../fixtures/data.fixtures';

const userData = TestDataFactory.createUserData('EMPLOYEE');
// { email: 'test.employee.123@test.com', password: 'TestPass123!', role: 'EMPLOYEE' }

const companyData = TestDataFactory.createCompanyData();
// { name: 'Test Company 123', description: '...' }

const textData = TestDataFactory.createSimpleTextData();
// { title: 'Test Text 123', content: '...' }
```

### Creating a New Page Object

```typescript
import { Page } from '@playwright/test';
import { BasePage } from '../base/BasePage';

export class MyNewPage extends BasePage {
  // Selectors
  private readonly myButton = 'button:has-text("Click Me")';

  constructor(page: Page) {
    super(page);
  }

  async goto(): Promise<void> {
    await super.goto('/my-route');
  }

  async clickMyButton(): Promise<void> {
    await this.click(this.myButton);
  }
}
```

## 🎯 Best Practices

### Test Organization
- ✅ Group related tests in `describe` blocks
- ✅ Use descriptive test names that explain intent
- ✅ Keep tests independent and isolated
- ✅ Clean up test data after tests (where applicable)

### Selectors
- ✅ Prefer `data-testid` attributes
- ✅ Use role-based selectors (`getByRole`)
- ✅ Use text-based selectors as fallback
- ✅ Avoid CSS/XPath selectors when possible

### Assertions
- ✅ Use Playwright's auto-waiting assertions
- ✅ Assert on visible elements before interaction
- ✅ Use specific assertions (`toHaveText` vs `toContainText`)
- ✅ Add meaningful error messages to assertions

### Performance
- ✅ Use parallel execution for independent tests
- ✅ Minimize navigation between tests
- ✅ Use pre-authenticated fixtures
- ✅ Avoid unnecessary `waitForTimeout`

### Maintenance
- ✅ Keep Page Objects updated with UI changes
- ✅ Extract common operations to helpers
- ✅ Document complex test scenarios
- ✅ Review and update selectors regularly

## 🔄 CI/CD Integration

### GitHub Actions Example

```yaml
name: E2E Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: pnpm install

      - name: Install Playwright browsers
        run: npx playwright install --with-deps

      - name: Start database
        run: docker-compose up -d

      - name: Seed database
        run: npm run seed

      - name: Run E2E tests
        run: CI=true npm run test:e2e

      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: playwright-report
          path: playwright-report/
```

## 📞 Troubleshooting

### Common Issues

#### Tests fail with "Target closed" error
**Solution**: Ensure API and Web servers are running. Check `webServer` config in `playwright.config.ts`.

#### Tests fail with timeout errors
**Solution**: Increase timeout in config or use `test.setTimeout()`. Check network/server performance.

#### Authentication tests fail
**Solution**: Verify database is seeded. Check test credentials in `auth.fixtures.ts`.

#### Selector not found errors
**Solution**: Update selectors in Page Objects. Use Playwright Inspector to find correct selectors.

#### Tests pass locally but fail in CI
**Solution**: Check CI environment variables. Ensure database seeding works in CI. Review CI-specific config.

## 🤝 Contributing

### Adding New Tests

1. Identify the feature to test
2. Create or update Page Objects
3. Write test cases with clear descriptions
4. Run tests locally to verify
5. Update this README if needed

### Updating Page Objects

1. Update selectors in Page Object file
2. Run affected tests to verify
3. Update test assertions if needed
4. Document breaking changes

## 📚 Additional Resources

- [Playwright Documentation](https://playwright.dev/docs/intro)
- [Playwright Best Practices](https://playwright.dev/docs/best-practices)
- [Playwright API Reference](https://playwright.dev/docs/api/class-playwright)
- [Project Architecture Documentation](../ARCHITECTURE.md)

## 📄 License

This test suite is part of the Accounting System project.

---

**Created with**: Playwright 1.56.1
**Last Updated**: 2025-01-11
**Maintainer**: Development Team
