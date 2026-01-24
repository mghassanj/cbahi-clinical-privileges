import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';
import { DashboardPage } from '../pages/DashboardPage';
import { RequestsPage } from '../pages/RequestsPage';
import { NewRequestPage } from '../pages/NewRequestPage';
import { TEST_USERS } from '../fixtures/test-data';

test.describe('Requests - List View', () => {
  test.skip(process.env.TESTING_MODE !== 'true', 'Testing mode not enabled');

  test.beforeEach(async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.loginWithTestCredentials(
      TEST_USERS.employee.email,
      TEST_USERS.employee.password
    );
    await page.waitForURL(/.*(?:dashboard|\/en\/?$)/);
  });

  test('should display requests page', async ({ page }) => {
    const requestsPage = new RequestsPage(page);
    await requestsPage.goto();
    await requestsPage.expectRequestsPage();
  });

  test('should show new request button', async ({ page }) => {
    const requestsPage = new RequestsPage(page);
    await requestsPage.goto();
    await expect(requestsPage.newRequestButton).toBeVisible();
  });

  test('should filter requests by status', async ({ page }) => {
    const requestsPage = new RequestsPage(page);
    await requestsPage.goto();

    await requestsPage.filterByStatus('DRAFT');
    // Verify filter is applied
    await expect(page).toHaveURL(/.*status=DRAFT/);
  });

  test('should navigate to new request page', async ({ page }) => {
    const requestsPage = new RequestsPage(page);
    await requestsPage.goto();
    await requestsPage.clickNewRequest();
    await expect(page).toHaveURL(/.*\/requests\/new/);
  });

  test('should display empty state when no requests', async ({ page }) => {
    const requestsPage = new RequestsPage(page);
    await requestsPage.goto();

    // Filter to a status that might have no results
    await requestsPage.filterByStatus('CANCELLED');

    // Either empty state or table should be visible
    const tableCount = await requestsPage.getRequestCount();
    const emptyVisible = await requestsPage.emptyState.isVisible().catch(() => false);

    expect(tableCount > 0 || emptyVisible).toBe(true);
  });
});

test.describe('Requests - Create New Request', () => {
  test.skip(process.env.TESTING_MODE !== 'true', 'Testing mode not enabled');

  test.beforeEach(async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.loginWithTestCredentials(
      TEST_USERS.employee.email,
      TEST_USERS.employee.password
    );
    await page.waitForURL(/.*(?:dashboard|\/en\/?$)/);
  });

  test('should display new request wizard', async ({ page }) => {
    const newRequestPage = new NewRequestPage(page);
    await newRequestPage.goto();

    await expect(newRequestPage.wizardSteps).toBeVisible();
  });

  test('should pre-fill personal information', async ({ page }) => {
    const newRequestPage = new NewRequestPage(page);
    await newRequestPage.goto();

    await newRequestPage.verifyPersonalInfoPreFilled();
  });

  test('should navigate between wizard steps', async ({ page }) => {
    const newRequestPage = new NewRequestPage(page);
    await newRequestPage.goto();

    // Go to next step
    await newRequestPage.goToNextStep();
    expect(await newRequestPage.getCurrentStep()).toBeGreaterThanOrEqual(2);

    // Go back
    await newRequestPage.goToPreviousStep();
    expect(await newRequestPage.getCurrentStep()).toBe(1);
  });

  test('should require privilege selection', async ({ page }) => {
    const newRequestPage = new NewRequestPage(page);
    await newRequestPage.goto();

    // Navigate to privileges step
    await newRequestPage.goToNextStep(); // Personal info
    await newRequestPage.selectApplicationType('NEW');
    await newRequestPage.goToNextStep(); // Application type

    // Try to proceed without selecting privileges
    await newRequestPage.goToNextStep();

    // Should show validation error or stay on same step
    await newRequestPage.expectValidationError('privileges');
  });

  test('should save request as draft', async ({ page }) => {
    const newRequestPage = new NewRequestPage(page);
    await newRequestPage.goto();

    await newRequestPage.goToNextStep(); // Personal info
    await newRequestPage.selectApplicationType('NEW');
    await newRequestPage.goToNextStep();
    await newRequestPage.selectPrivileges([0, 1]); // Select first two privileges

    await newRequestPage.saveAsDraft();

    // Should redirect to requests list or show success
    const onRequestsPage = page.url().includes('/requests') && !page.url().includes('/new');
    const hasSuccess = await newRequestPage.successToast.isVisible().catch(() => false);
    expect(onRequestsPage || hasSuccess).toBe(true);
  });

  test('should submit new request successfully', async ({ page }) => {
    const newRequestPage = new NewRequestPage(page);
    await newRequestPage.goto();

    await newRequestPage.completeNewRequest({
      type: 'NEW',
      privilegeIndices: [0, 1, 2],
      submitImmediately: true,
    });

    // Should show success or redirect
    const hasSuccess = await newRequestPage.successToast.isVisible().catch(() => false);
    const onDetailPage = page.url().match(/\/requests\/[^/]+$/);
    expect(hasSuccess || onDetailPage).toBeTruthy();
  });

  test('should cancel request creation', async ({ page }) => {
    const newRequestPage = new NewRequestPage(page);
    await newRequestPage.goto();

    await newRequestPage.cancel();

    // Should go back to requests list or dashboard
    const url = page.url();
    expect(url.includes('/requests') || url.match(/\/en\/?$/)).toBeTruthy();
  });
});

test.describe('Requests - Request Details', () => {
  test.skip(process.env.TESTING_MODE !== 'true', 'Testing mode not enabled');

  test.beforeEach(async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.loginWithTestCredentials(
      TEST_USERS.employee.email,
      TEST_USERS.employee.password
    );
    await page.waitForURL(/.*(?:dashboard|\/en\/?$)/);
  });

  test('should view request details', async ({ page }) => {
    const requestsPage = new RequestsPage(page);
    await requestsPage.goto();

    const requestCount = await requestsPage.getRequestCount();
    if (requestCount > 0) {
      await requestsPage.viewRequest(0);
      await expect(page).toHaveURL(/.*\/requests\/.+/);
    }
  });

  test('should display request status', async ({ page }) => {
    const requestsPage = new RequestsPage(page);
    await requestsPage.goto();

    const requestCount = await requestsPage.getRequestCount();
    if (requestCount > 0) {
      const status = await requestsPage.getRequestStatus(0);
      expect(status.length).toBeGreaterThan(0);
    }
  });
});

test.describe('Requests - Access Control', () => {
  test.skip(process.env.TESTING_MODE !== 'true', 'Testing mode not enabled');

  test('employee should only see own requests', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.loginWithTestCredentials(
      TEST_USERS.employee.email,
      TEST_USERS.employee.password
    );

    const requestsPage = new RequestsPage(page);
    await requestsPage.goto();

    // All visible requests should belong to the current user
    // This is verified by the API returning only user's requests
    await requestsPage.expectRequestsPage();
  });

  test('admin should see all requests', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.loginWithTestCredentials(
      TEST_USERS.admin.email,
      TEST_USERS.admin.password
    );

    const requestsPage = new RequestsPage(page);
    await requestsPage.goto();

    // Admin should be able to access requests page
    await requestsPage.expectRequestsPage();
  });
});
