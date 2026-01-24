# CBAHI E2E Tests

End-to-end tests for the CBAHI Clinical Privileges Management System using Playwright.

## Directory Structure

```
e2e/
├── pages/              # Page Object Models
│   ├── BasePage.ts     # Base class with common functionality
│   ├── LoginPage.ts    # Authentication pages
│   ├── DashboardPage.ts
│   ├── RequestsPage.ts
│   ├── NewRequestPage.ts
│   ├── ApprovalsPage.ts
│   ├── ApprovalDetailPage.ts
│   └── AdminPage.ts    # Admin pages
├── fixtures/           # Test data and utilities
│   └── test-data.ts
├── auth/               # Authentication tests
│   └── login.spec.ts
├── requests/           # Request management tests
│   └── requests.spec.ts
├── approvals/          # Approval workflow tests
│   └── approvals.spec.ts
├── admin/              # Admin functionality tests
│   └── admin.spec.ts
├── global-setup.ts     # Pre-test setup
└── README.md
```

## Prerequisites

1. Install Playwright browsers:
   ```bash
   npx playwright install
   ```

2. Set up test environment:
   ```bash
   # Create test users in database (or enable TESTING_MODE)
   export TESTING_MODE=true
   ```

## Running Tests

### Run all tests
```bash
npm run test:e2e
# or
npx playwright test
```

### Run specific test file
```bash
npx playwright test e2e/auth/login.spec.ts
```

### Run tests in headed mode (see browser)
```bash
npx playwright test --headed
```

### Run tests in specific browser
```bash
npx playwright test --project=chromium
npx playwright test --project=firefox
npx playwright test --project=webkit
```

### Debug mode
```bash
npx playwright test --debug
```

### Run tests with UI
```bash
npx playwright test --ui
```

## Test Coverage

### Authentication (12 tests)
- Login form display
- Magic link flow
- Test credentials login (testing mode)
- Logout flow
- Language switching
- Protected routes

### Requests (15 tests)
- Requests list view
- Create new request wizard
- Request filtering
- Request details
- Draft save/submit
- Access control

### Approvals (18 tests)
- Approvals list view
- View toggle (table/kanban)
- Approval details
- Approve/Reject/Return actions
- Role-based access
- Escalation indicators

### Admin (16 tests)
- Admin dashboard
- User management
- Settings configuration
- Sync operations
- Access control

## Test Data

Test users are defined in `fixtures/test-data.ts`:

| Role | Email |
|------|-------|
| Employee | employee@test.cbahi.sa |
| Head of Section | hos@test.cbahi.sa |
| Head of Dept | hod@test.cbahi.sa |
| Committee | committee@test.cbahi.sa |
| Medical Director | director@test.cbahi.sa |
| Admin | admin@test.cbahi.sa |

**Note:** These users must exist in the database or TESTING_MODE must be enabled.

## Configuration

Configuration is in `playwright.config.ts`:

- **Base URL:** `http://localhost:3000` (or `PLAYWRIGHT_BASE_URL` env var)
- **Browsers:** Chrome, Firefox, Safari, Mobile Chrome, Mobile Safari
- **Screenshots:** Captured on failure
- **Videos:** Recorded on first retry
- **Traces:** Collected on first retry

## Writing New Tests

1. Create page object if needed in `e2e/pages/`
2. Export from `e2e/pages/index.ts`
3. Create test file in appropriate directory
4. Use page objects for all interactions

Example:
```typescript
import { test, expect } from '@playwright/test';
import { LoginPage, DashboardPage } from '../pages';

test('should do something', async ({ page }) => {
  const loginPage = new LoginPage(page);
  await loginPage.goto();
  // ... test steps
});
```

## Troubleshooting

### Tests fail with "Testing mode not enabled"
Enable testing mode:
```bash
export TESTING_MODE=true
```

### Tests fail with connection errors
Ensure the dev server is running:
```bash
npm run dev
```

### Tests are flaky
- Increase timeout in `playwright.config.ts`
- Add explicit waits in tests
- Check for animation/loading issues

## CI/CD Integration

Add to your CI pipeline:
```yaml
- name: Run E2E Tests
  run: |
    npm run build
    npm run test:e2e
  env:
    TESTING_MODE: true
    PLAYWRIGHT_BASE_URL: http://localhost:3000
```

## Reports

View HTML report after running tests:
```bash
npx playwright show-report
```

Reports are saved in `playwright-results/`.
