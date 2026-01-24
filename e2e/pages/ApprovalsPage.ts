import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * Approvals Page Object for approval workflow
 */
export class ApprovalsPage extends BasePage {
  readonly approvalsTable: Locator;
  readonly approvalRows: Locator;
  readonly kanbanView: Locator;
  readonly tableView: Locator;
  readonly viewToggle: Locator;
  readonly statusFilter: Locator;
  readonly departmentFilter: Locator;
  readonly priorityFilter: Locator;
  readonly emptyState: Locator;
  readonly pendingCount: Locator;

  constructor(page: Page, locale: 'en' | 'ar' = 'en') {
    super(page, locale);
    this.approvalsTable = page.locator('table, [data-testid="approvals-table"]');
    this.approvalRows = page.locator('tbody tr, [data-testid="approval-row"]');
    this.kanbanView = page.locator('[data-testid="kanban-view"], .kanban-board');
    this.tableView = page.locator('[data-testid="table-view"]');
    this.viewToggle = page.locator('[data-testid="view-toggle"]');
    this.statusFilter = page.locator('select[name="status"], [data-testid="status-filter"]');
    this.departmentFilter = page.locator('select[name="department"], [data-testid="department-filter"]');
    this.priorityFilter = page.locator('select[name="priority"], [data-testid="priority-filter"]');
    this.emptyState = page.locator('[data-testid="empty-state"], .empty-state');
    this.pendingCount = page.locator('[data-testid="pending-count"], .pending-badge');
  }

  /**
   * Navigate to approvals page
   */
  async goto() {
    await this.page.goto(this.getLocalizedUrl('/approvals'));
    await this.waitForPageLoad();
  }

  /**
   * Verify approvals page is displayed
   */
  async expectApprovalsPage() {
    await expect(this.page).toHaveURL(/.*\/approvals/);
    const tableVisible = await this.approvalsTable.isVisible().catch(() => false);
    const kanbanVisible = await this.kanbanView.isVisible().catch(() => false);
    const emptyVisible = await this.emptyState.isVisible().catch(() => false);
    expect(tableVisible || kanbanVisible || emptyVisible).toBe(true);
  }

  /**
   * Get pending approvals count
   */
  async getPendingCount(): Promise<number> {
    const count = await this.approvalRows.count();
    return count;
  }

  /**
   * Click on an approval to view details
   */
  async viewApproval(index: number) {
    await this.approvalRows.nth(index).click();
    await expect(this.page).toHaveURL(/.*\/approvals\/.+/);
  }

  /**
   * Toggle between table and kanban view
   */
  async toggleView() {
    await this.viewToggle.click();
    await this.waitForPageLoad();
  }

  /**
   * Filter by department
   */
  async filterByDepartment(department: string) {
    await this.departmentFilter.selectOption(department);
    await this.waitForPageLoad();
  }

  /**
   * Filter by priority
   */
  async filterByPriority(priority: 'normal' | 'high' | 'urgent' | 'escalated') {
    await this.priorityFilter.selectOption(priority);
    await this.waitForPageLoad();
  }

  /**
   * Verify empty state
   */
  async expectEmptyState() {
    await expect(this.emptyState).toBeVisible();
  }

  /**
   * Get applicant name from row
   */
  async getApplicantName(index: number): Promise<string> {
    const row = this.approvalRows.nth(index);
    const nameCell = row.locator('td:first-child, [data-testid="applicant-name"]');
    return await nameCell.textContent() || '';
  }

  /**
   * Check if request is escalated
   */
  async isEscalated(index: number): Promise<boolean> {
    const row = this.approvalRows.nth(index);
    const escalationBadge = row.locator('[data-testid="escalation-badge"], .escalation-indicator');
    return await escalationBadge.isVisible();
  }
}
