import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';
import { AdminPage, AdminUsersPage, AdminSettingsPage } from '../pages/AdminPage';
import { TEST_USERS } from '../fixtures/test-data';

test.describe('Admin - Dashboard', () => {
  test.skip(process.env.TESTING_MODE !== 'true', 'Testing mode not enabled');

  test.beforeEach(async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.loginWithTestCredentials(
      TEST_USERS.admin.email,
      TEST_USERS.admin.password
    );
    await page.waitForURL(/.*(?:dashboard|\/en\/?$)/);
  });

  test('should display admin dashboard', async ({ page }) => {
    const adminPage = new AdminPage(page);
    await adminPage.goto();
    await adminPage.expectAdminPage();
  });

  test('should display system statistics', async ({ page }) => {
    const adminPage = new AdminPage(page);
    await adminPage.goto();

    await expect(adminPage.statsCards.first()).toBeVisible();
  });

  test('should show sync button', async ({ page }) => {
    const adminPage = new AdminPage(page);
    await adminPage.goto();

    await expect(adminPage.syncButton).toBeVisible();
  });

  test('should navigate to users management', async ({ page }) => {
    const adminPage = new AdminPage(page);
    await adminPage.goto();
    await adminPage.goToUsers();

    await expect(page).toHaveURL(/.*\/admin\/users/);
  });

  test('should navigate to settings', async ({ page }) => {
    const adminPage = new AdminPage(page);
    await adminPage.goto();
    await adminPage.goToSettings();

    await expect(page).toHaveURL(/.*\/admin\/settings/);
  });
});

test.describe('Admin - Access Control', () => {
  test.skip(process.env.TESTING_MODE !== 'true', 'Testing mode not enabled');

  test('employee should not access admin pages', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.loginWithTestCredentials(
      TEST_USERS.employee.email,
      TEST_USERS.employee.password
    );

    await page.goto('/en/admin');

    // Should be redirected
    await expect(page).not.toHaveURL(/.*\/admin$/);
  });

  test('approver should not access admin pages', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.loginWithTestCredentials(
      TEST_USERS.headOfSection.email,
      TEST_USERS.headOfSection.password
    );

    await page.goto('/en/admin');

    // Should be redirected
    await expect(page).not.toHaveURL(/.*\/admin$/);
  });

  test('admin should access all admin pages', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.loginWithTestCredentials(
      TEST_USERS.admin.email,
      TEST_USERS.admin.password
    );

    // Admin dashboard
    await page.goto('/en/admin');
    await expect(page).toHaveURL(/.*\/admin/);

    // Users page
    await page.goto('/en/admin/users');
    await expect(page).toHaveURL(/.*\/admin\/users/);

    // Settings page
    await page.goto('/en/admin/settings');
    await expect(page).toHaveURL(/.*\/admin\/settings/);
  });
});

test.describe('Admin - User Management', () => {
  test.skip(process.env.TESTING_MODE !== 'true', 'Testing mode not enabled');

  test.beforeEach(async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.loginWithTestCredentials(
      TEST_USERS.admin.email,
      TEST_USERS.admin.password
    );
    await page.waitForURL(/.*(?:dashboard|\/en\/?$)/);
  });

  test('should display users list', async ({ page }) => {
    const usersPage = new AdminUsersPage(page);
    await usersPage.goto();
    await usersPage.expectUsersPage();
  });

  test('should show user count', async ({ page }) => {
    const usersPage = new AdminUsersPage(page);
    await usersPage.goto();

    const userCount = await usersPage.getUserCount();
    expect(userCount).toBeGreaterThan(0);
  });

  test('should search for users', async ({ page }) => {
    const usersPage = new AdminUsersPage(page);
    await usersPage.goto();

    await usersPage.searchUser('admin');

    // Search should execute without errors
    await usersPage.expectUsersPage();
  });

  test('should filter users by role', async ({ page }) => {
    const usersPage = new AdminUsersPage(page);
    await usersPage.goto();

    await usersPage.filterByRole('ADMIN');

    // Filter should apply without errors
    await usersPage.expectUsersPage();
  });

  test('should filter users by status', async ({ page }) => {
    const usersPage = new AdminUsersPage(page);
    await usersPage.goto();

    await usersPage.filterByStatus('ACTIVE');

    // Filter should apply without errors
    await usersPage.expectUsersPage();
  });

  test('should open role editor modal', async ({ page }) => {
    const usersPage = new AdminUsersPage(page);
    await usersPage.goto();

    const userCount = await usersPage.getUserCount();
    if (userCount > 0) {
      await usersPage.openRoleEditor(0);
      await expect(usersPage.roleModal).toBeVisible();
    }
  });
});

test.describe('Admin - Settings', () => {
  test.skip(process.env.TESTING_MODE !== 'true', 'Testing mode not enabled');

  test.beforeEach(async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.loginWithTestCredentials(
      TEST_USERS.admin.email,
      TEST_USERS.admin.password
    );
    await page.waitForURL(/.*(?:dashboard|\/en\/?$)/);
  });

  test('should display settings page', async ({ page }) => {
    const settingsPage = new AdminSettingsPage(page);
    await settingsPage.goto();
    await settingsPage.expectSettingsPage();
  });

  test('should display settings tabs', async ({ page }) => {
    const settingsPage = new AdminSettingsPage(page);
    await settingsPage.goto();

    await expect(settingsPage.generalTab).toBeVisible();
  });

  test('should switch between tabs', async ({ page }) => {
    const settingsPage = new AdminSettingsPage(page);
    await settingsPage.goto();

    // Switch to Jisr tab
    await settingsPage.switchTab('jisr');
    // Page should update without errors
    await settingsPage.expectSettingsPage();

    // Switch to Email tab
    await settingsPage.switchTab('email');
    await settingsPage.expectSettingsPage();
  });

  test('should show test connection button', async ({ page }) => {
    const settingsPage = new AdminSettingsPage(page);
    await settingsPage.goto();

    await settingsPage.switchTab('jisr');

    await expect(settingsPage.testConnectionButton).toBeVisible();
  });
});

test.describe('Admin - Sync Operations', () => {
  test.skip(process.env.TESTING_MODE !== 'true', 'Testing mode not enabled');

  test.beforeEach(async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.loginWithTestCredentials(
      TEST_USERS.admin.email,
      TEST_USERS.admin.password
    );
    await page.waitForURL(/.*(?:dashboard|\/en\/?$)/);
  });

  test('should display last sync time', async ({ page }) => {
    const adminPage = new AdminPage(page);
    await adminPage.goto();

    await expect(adminPage.lastSyncTime).toBeVisible();
  });

  test('should trigger manual sync', async ({ page }) => {
    const adminPage = new AdminPage(page);
    await adminPage.goto();

    await adminPage.triggerSync();

    // Should show success message or sync in progress
    await adminPage.waitForPageLoad();
  });
});
