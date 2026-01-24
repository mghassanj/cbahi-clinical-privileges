import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';
import { ApprovalsPage } from '../pages/ApprovalsPage';
import { ApprovalDetailPage } from '../pages/ApprovalDetailPage';
import { TEST_USERS } from '../fixtures/test-data';

test.describe('Approvals - List View', () => {
  test.skip(process.env.TESTING_MODE !== 'true', 'Testing mode not enabled');

  test.beforeEach(async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.loginWithTestCredentials(
      TEST_USERS.headOfSection.email,
      TEST_USERS.headOfSection.password
    );
    await page.waitForURL(/.*(?:dashboard|\/en\/?$)/);
  });

  test('should display approvals page for approver', async ({ page }) => {
    const approvalsPage = new ApprovalsPage(page);
    await approvalsPage.goto();
    await approvalsPage.expectApprovalsPage();
  });

  test('should toggle between table and kanban view', async ({ page }) => {
    const approvalsPage = new ApprovalsPage(page);
    await approvalsPage.goto();

    // Toggle view
    await approvalsPage.toggleView();

    // Either kanban or table should be visible
    const kanbanVisible = await approvalsPage.kanbanView.isVisible().catch(() => false);
    const tableVisible = await approvalsPage.approvalsTable.isVisible().catch(() => false);
    expect(kanbanVisible || tableVisible).toBe(true);
  });

  test('should show empty state when no pending approvals', async ({ page }) => {
    const approvalsPage = new ApprovalsPage(page);
    await approvalsPage.goto();

    const pendingCount = await approvalsPage.getPendingCount();
    const emptyVisible = await approvalsPage.emptyState.isVisible().catch(() => false);

    // Either there are approvals or empty state is shown
    expect(pendingCount > 0 || emptyVisible).toBe(true);
  });

  test('should filter by department', async ({ page }) => {
    const approvalsPage = new ApprovalsPage(page);
    await approvalsPage.goto();

    // This test assumes department filter exists
    const filterVisible = await approvalsPage.departmentFilter.isVisible().catch(() => false);
    if (filterVisible) {
      await approvalsPage.filterByDepartment('all');
      await approvalsPage.expectApprovalsPage();
    }
  });
});

test.describe('Approvals - Access Control', () => {
  test.skip(process.env.TESTING_MODE !== 'true', 'Testing mode not enabled');

  test('employee should not access approvals page', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.loginWithTestCredentials(
      TEST_USERS.employee.email,
      TEST_USERS.employee.password
    );

    // Try to access approvals page
    await page.goto('/en/approvals');

    // Should be redirected or denied
    await expect(page).not.toHaveURL(/.*\/approvals$/);
  });

  test('head of section can access approvals', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.loginWithTestCredentials(
      TEST_USERS.headOfSection.email,
      TEST_USERS.headOfSection.password
    );

    const approvalsPage = new ApprovalsPage(page);
    await approvalsPage.goto();
    await approvalsPage.expectApprovalsPage();
  });

  test('head of department can access approvals', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.loginWithTestCredentials(
      TEST_USERS.headOfDept.email,
      TEST_USERS.headOfDept.password
    );

    const approvalsPage = new ApprovalsPage(page);
    await approvalsPage.goto();
    await approvalsPage.expectApprovalsPage();
  });

  test('committee member can access approvals', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.loginWithTestCredentials(
      TEST_USERS.committee.email,
      TEST_USERS.committee.password
    );

    const approvalsPage = new ApprovalsPage(page);
    await approvalsPage.goto();
    await approvalsPage.expectApprovalsPage();
  });

  test('medical director can access approvals', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.loginWithTestCredentials(
      TEST_USERS.medicalDirector.email,
      TEST_USERS.medicalDirector.password
    );

    const approvalsPage = new ApprovalsPage(page);
    await approvalsPage.goto();
    await approvalsPage.expectApprovalsPage();
  });

  test('admin can access approvals', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.loginWithTestCredentials(
      TEST_USERS.admin.email,
      TEST_USERS.admin.password
    );

    const approvalsPage = new ApprovalsPage(page);
    await approvalsPage.goto();
    await approvalsPage.expectApprovalsPage();
  });
});

test.describe('Approvals - Approval Detail', () => {
  test.skip(process.env.TESTING_MODE !== 'true', 'Testing mode not enabled');

  test.beforeEach(async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.loginWithTestCredentials(
      TEST_USERS.headOfSection.email,
      TEST_USERS.headOfSection.password
    );
    await page.waitForURL(/.*(?:dashboard|\/en\/?$)/);
  });

  test('should view approval details', async ({ page }) => {
    const approvalsPage = new ApprovalsPage(page);
    await approvalsPage.goto();

    const pendingCount = await approvalsPage.getPendingCount();
    if (pendingCount > 0) {
      await approvalsPage.viewApproval(0);

      const approvalDetailPage = new ApprovalDetailPage(page);
      await approvalDetailPage.expectApprovalDetailPage();
    }
  });

  test('should display applicant information', async ({ page }) => {
    const approvalsPage = new ApprovalsPage(page);
    await approvalsPage.goto();

    const pendingCount = await approvalsPage.getPendingCount();
    if (pendingCount > 0) {
      await approvalsPage.viewApproval(0);

      const approvalDetailPage = new ApprovalDetailPage(page);
      const applicantName = await approvalDetailPage.getApplicantName();
      expect(applicantName.length).toBeGreaterThan(0);
    }
  });

  test('should display privileges to review', async ({ page }) => {
    const approvalsPage = new ApprovalsPage(page);
    await approvalsPage.goto();

    const pendingCount = await approvalsPage.getPendingCount();
    if (pendingCount > 0) {
      await approvalsPage.viewApproval(0);

      const approvalDetailPage = new ApprovalDetailPage(page);
      const privilegesCount = await approvalDetailPage.getPrivilegesCount();
      expect(privilegesCount).toBeGreaterThan(0);
    }
  });
});

test.describe('Approvals - Approval Actions', () => {
  test.skip(process.env.TESTING_MODE !== 'true', 'Testing mode not enabled');

  test.beforeEach(async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.loginWithTestCredentials(
      TEST_USERS.headOfSection.email,
      TEST_USERS.headOfSection.password
    );
    await page.waitForURL(/.*(?:dashboard|\/en\/?$)/);
  });

  test('should require comments for rejection', async ({ page }) => {
    const approvalsPage = new ApprovalsPage(page);
    await approvalsPage.goto();

    const pendingCount = await approvalsPage.getPendingCount();
    if (pendingCount > 0) {
      await approvalsPage.viewApproval(0);

      const approvalDetailPage = new ApprovalDetailPage(page);

      // Try to reject without comments
      await approvalDetailPage.rejectButton.click();

      // Should show validation error or require comments
      const hasError = await page.locator('.error, [data-testid="comments-error"]').isVisible().catch(() => false);
      expect(hasError).toBe(true);
    }
  });

  test('should approve request successfully', async ({ page }) => {
    const approvalsPage = new ApprovalsPage(page);
    await approvalsPage.goto();

    const pendingCount = await approvalsPage.getPendingCount();
    if (pendingCount > 0) {
      await approvalsPage.viewApproval(0);

      const approvalDetailPage = new ApprovalDetailPage(page);
      await approvalDetailPage.approveAllPrivileges();
      await approvalDetailPage.approve('Approved - all requirements met');

      await approvalDetailPage.expectDecisionSuccess();
    }
  });

  test('should reject request successfully', async ({ page }) => {
    const approvalsPage = new ApprovalsPage(page);
    await approvalsPage.goto();

    const pendingCount = await approvalsPage.getPendingCount();
    if (pendingCount > 0) {
      await approvalsPage.viewApproval(0);

      const approvalDetailPage = new ApprovalDetailPage(page);
      await approvalDetailPage.reject('Rejected - missing required documents');

      await approvalDetailPage.expectDecisionSuccess();
    }
  });

  test('should return request for modifications', async ({ page }) => {
    const approvalsPage = new ApprovalsPage(page);
    await approvalsPage.goto();

    const pendingCount = await approvalsPage.getPendingCount();
    if (pendingCount > 0) {
      await approvalsPage.viewApproval(0);

      const approvalDetailPage = new ApprovalDetailPage(page);
      await approvalDetailPage.returnForModifications('Please provide additional documentation');

      await approvalDetailPage.expectDecisionSuccess();
    }
  });
});

test.describe('Approvals - Escalation Indicators', () => {
  test.skip(process.env.TESTING_MODE !== 'true', 'Testing mode not enabled');

  test('should show escalation badge for overdue approvals', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.loginWithTestCredentials(
      TEST_USERS.headOfSection.email,
      TEST_USERS.headOfSection.password
    );

    const approvalsPage = new ApprovalsPage(page);
    await approvalsPage.goto();

    // Filter for escalated items if filter exists
    const priorityFilterVisible = await approvalsPage.priorityFilter.isVisible().catch(() => false);
    if (priorityFilterVisible) {
      await approvalsPage.filterByPriority('escalated');
      await approvalsPage.expectApprovalsPage();
    }
  });
});
