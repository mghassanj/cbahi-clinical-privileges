import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * Requests Page Object for privilege request management
 */
export class RequestsPage extends BasePage {
  readonly requestsTable: Locator;
  readonly requestRows: Locator;
  readonly newRequestButton: Locator;
  readonly statusFilter: Locator;
  readonly searchInput: Locator;
  readonly paginationNext: Locator;
  readonly paginationPrev: Locator;
  readonly emptyState: Locator;

  constructor(page: Page, locale: 'en' | 'ar' = 'en') {
    super(page, locale);
    this.requestsTable = page.locator('table, [data-testid="requests-table"]');
    this.requestRows = page.locator('tbody tr, [data-testid="request-row"]');
    this.newRequestButton = page.locator('a[href*="/requests/new"], button:has-text("New Request"), button:has-text("طلب جديد")');
    this.statusFilter = page.locator('select[name="status"], [data-testid="status-filter"]');
    this.searchInput = page.locator('input[type="search"], input[placeholder*="Search"], input[placeholder*="بحث"]');
    this.paginationNext = page.locator('[data-testid="pagination-next"], button:has-text("Next")');
    this.paginationPrev = page.locator('[data-testid="pagination-prev"], button:has-text("Previous")');
    this.emptyState = page.locator('[data-testid="empty-state"], .empty-state');
  }

  /**
   * Navigate to requests list
   */
  async goto() {
    await this.page.goto(this.getLocalizedUrl('/requests'));
    await this.waitForPageLoad();
  }

  /**
   * Verify requests page is displayed
   */
  async expectRequestsPage() {
    await expect(this.page).toHaveURL(/.*\/requests/);
    // Either table or empty state should be visible
    const tableVisible = await this.requestsTable.isVisible().catch(() => false);
    const emptyVisible = await this.emptyState.isVisible().catch(() => false);
    expect(tableVisible || emptyVisible).toBe(true);
  }

  /**
   * Get number of requests displayed
   */
  async getRequestCount(): Promise<number> {
    const count = await this.requestRows.count();
    return count;
  }

  /**
   * Click on a request row to view details
   */
  async viewRequest(index: number) {
    await this.requestRows.nth(index).click();
    await expect(this.page).toHaveURL(/.*\/requests\/.+/);
  }

  /**
   * Filter requests by status
   */
  async filterByStatus(status: 'DRAFT' | 'PENDING' | 'IN_REVIEW' | 'APPROVED' | 'REJECTED' | 'all') {
    await this.statusFilter.selectOption(status);
    await this.waitForPageLoad();
  }

  /**
   * Search requests
   */
  async search(query: string) {
    await this.searchInput.fill(query);
    await this.page.keyboard.press('Enter');
    await this.waitForPageLoad();
  }

  /**
   * Create new request
   */
  async clickNewRequest() {
    await this.newRequestButton.click();
    await expect(this.page).toHaveURL(/.*\/requests\/new/);
  }

  /**
   * Go to next page
   */
  async nextPage() {
    await this.paginationNext.click();
    await this.waitForPageLoad();
  }

  /**
   * Verify empty state is shown
   */
  async expectEmptyState() {
    await expect(this.emptyState).toBeVisible();
  }

  /**
   * Get request status from a row
   */
  async getRequestStatus(index: number): Promise<string> {
    const row = this.requestRows.nth(index);
    const statusBadge = row.locator('[data-testid="status-badge"], .status-badge, .badge');
    return await statusBadge.textContent() || '';
  }
}
