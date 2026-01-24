import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';
import { DashboardPage } from '../pages/DashboardPage';
import { TEST_USERS } from '../fixtures/test-data';

test.describe('Authentication - Login', () => {
  let loginPage: LoginPage;
  let dashboardPage: DashboardPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    dashboardPage = new DashboardPage(page);
    await loginPage.goto();
  });

  test('should display login form correctly', async () => {
    await loginPage.expectLoginFormVisible();
  });

  test('should display logo and branding', async () => {
    await expect(loginPage.logoImage).toBeVisible();
  });

  test('should display language switcher', async () => {
    await expect(loginPage.languageSwitcher).toBeVisible();
  });

  test('should show validation error for empty email', async ({ page }) => {
    await loginPage.submitButton.click();

    // Should show validation error
    const emailError = page.locator('[data-testid="email-error"], .text-error-600');
    await expect(emailError).toBeVisible();
  });

  test('should show validation error for invalid email format', async ({ page }) => {
    await loginPage.emailInput.fill('not-an-email');
    await loginPage.submitButton.click();

    const emailError = page.locator('[data-testid="email-error"], .text-error-600');
    await expect(emailError).toBeVisible();
  });

  test('should redirect to verify page after magic link request', async () => {
    await loginPage.requestMagicLink(TEST_USERS.employee.email);
    await loginPage.expectVerificationPage();
  });

  test('should show error for non-existent user', async () => {
    await loginPage.requestMagicLink(TEST_USERS.nonExistent.email);

    // Should either show error or redirect to error page
    const hasError = await loginPage.errorMessage.isVisible().catch(() => false);
    const onErrorPage = loginPage.page.url().includes('/login/error');

    expect(hasError || onErrorPage).toBe(true);
  });

  test.describe('Testing Mode Login', () => {
    test.skip(process.env.TESTING_MODE !== 'true', 'Testing mode not enabled');

    test('should login successfully with test credentials', async ({ page }) => {
      await loginPage.loginWithTestCredentials(
        TEST_USERS.employee.email,
        TEST_USERS.employee.password
      );

      await page.waitForURL(/.*(?:dashboard|\/en\/?$|\/ar\/?$)/);
      await dashboardPage.expectLoggedIn();
    });

    test('should login as admin and see admin menu', async ({ page }) => {
      await loginPage.loginWithTestCredentials(
        TEST_USERS.admin.email,
        TEST_USERS.admin.password
      );

      await page.waitForURL(/.*(?:dashboard|\/en\/?$|\/ar\/?$)/);
      await dashboardPage.expectRoleBasedContent('admin');
    });

    test('should login as approver and see approvals menu', async ({ page }) => {
      await loginPage.loginWithTestCredentials(
        TEST_USERS.headOfSection.email,
        TEST_USERS.headOfSection.password
      );

      await page.waitForURL(/.*(?:dashboard|\/en\/?$|\/ar\/?$)/);
      await dashboardPage.expectRoleBasedContent('approver');
    });

    test('should show error for inactive user', async () => {
      await loginPage.loginWithTestCredentials(
        TEST_USERS.inactive.email,
        TEST_USERS.inactive.password
      );

      await loginPage.expectErrorPage('UserInactive');
    });
  });
});

test.describe('Authentication - Logout', () => {
  test.skip(process.env.TESTING_MODE !== 'true', 'Testing mode not enabled');

  test('should logout successfully', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const dashboardPage = new DashboardPage(page);

    // Login first
    await loginPage.goto();
    await loginPage.loginWithTestCredentials(
      TEST_USERS.employee.email,
      TEST_USERS.employee.password
    );
    await page.waitForURL(/.*(?:dashboard|\/en\/?$|\/ar\/?$)/);

    // Logout
    await dashboardPage.logout();

    // Should be on login page
    await expect(page).toHaveURL(/.*\/login/);
  });

  test('should redirect to login when session expires', async ({ page, context }) => {
    const loginPage = new LoginPage(page);

    // Login first
    await loginPage.goto();
    await loginPage.loginWithTestCredentials(
      TEST_USERS.employee.email,
      TEST_USERS.employee.password
    );

    // Clear cookies to simulate session expiry
    await context.clearCookies();

    // Try to access protected page
    await page.goto('/en/requests');

    // Should redirect to login
    await expect(page).toHaveURL(/.*\/login/);
  });
});

test.describe('Authentication - Language Switching', () => {
  test('should switch from English to Arabic', async ({ page }) => {
    const loginPage = new LoginPage(page, 'en');
    await loginPage.goto();

    await loginPage.switchLanguage();

    // URL should contain /ar/
    await expect(page).toHaveURL(/.*\/ar\//);
  });

  test('should persist language preference', async ({ page }) => {
    // Start on Arabic
    const loginPage = new LoginPage(page, 'ar');
    await page.goto('/ar/login');

    // Navigate and check language persists
    await page.reload();
    await expect(page).toHaveURL(/.*\/ar\//);
  });
});

test.describe('Authentication - Protected Routes', () => {
  test('should redirect unauthenticated user from dashboard to login', async ({ page }) => {
    await page.goto('/en/');
    await expect(page).toHaveURL(/.*\/login/);
  });

  test('should redirect unauthenticated user from requests to login', async ({ page }) => {
    await page.goto('/en/requests');
    await expect(page).toHaveURL(/.*\/login/);
  });

  test('should redirect unauthenticated user from approvals to login', async ({ page }) => {
    await page.goto('/en/approvals');
    await expect(page).toHaveURL(/.*\/login/);
  });

  test('should redirect unauthenticated user from admin to login', async ({ page }) => {
    await page.goto('/en/admin');
    await expect(page).toHaveURL(/.*\/login/);
  });

  test('should redirect unauthenticated user from profile to login', async ({ page }) => {
    await page.goto('/en/profile');
    await expect(page).toHaveURL(/.*\/login/);
  });
});
