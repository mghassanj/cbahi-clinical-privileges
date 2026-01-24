import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * Admin Pages Object for administration functionality
 */
export class AdminPage extends BasePage {
  // Dashboard
  readonly statsCards: Locator;
  readonly syncButton: Locator;
  readonly lastSyncTime: Locator;
  readonly usersLink: Locator;
  readonly settingsLink: Locator;

  constructor(page: Page, locale: 'en' | 'ar' = 'en') {
    super(page, locale);
    this.statsCards = page.locator('[data-testid="stats-card"], .stats-card');
    this.syncButton = page.locator('button:has-text("Sync"), button:has-text("مزامنة")');
    this.lastSyncTime = page.locator('[data-testid="last-sync"], .last-sync');
    this.usersLink = page.locator('a[href*="/admin/users"]');
    this.settingsLink = page.locator('a[href*="/admin/settings"]');
  }

  /**
   * Navigate to admin dashboard
   */
  async goto() {
    await this.page.goto(this.getLocalizedUrl('/admin'));
    await this.waitForPageLoad();
  }

  /**
   * Verify admin page is displayed
   */
  async expectAdminPage() {
    await expect(this.page).toHaveURL(/.*\/admin/);
    await expect(this.statsCards.first()).toBeVisible();
  }

  /**
   * Trigger manual sync
   */
  async triggerSync() {
    await this.syncButton.click();
    await this.waitForPageLoad();
  }

  /**
   * Navigate to users management
   */
  async goToUsers() {
    await this.usersLink.click();
    await expect(this.page).toHaveURL(/.*\/admin\/users/);
  }

  /**
   * Navigate to settings
   */
  async goToSettings() {
    await this.settingsLink.click();
    await expect(this.page).toHaveURL(/.*\/admin\/settings/);
  }
}

/**
 * Admin Users Page Object
 */
export class AdminUsersPage extends BasePage {
  readonly usersTable: Locator;
  readonly userRows: Locator;
  readonly searchInput: Locator;
  readonly roleFilter: Locator;
  readonly statusFilter: Locator;
  readonly departmentFilter: Locator;
  readonly roleModal: Locator;
  readonly roleSelect: Locator;
  readonly saveRoleButton: Locator;
  readonly cancelButton: Locator;

  constructor(page: Page, locale: 'en' | 'ar' = 'en') {
    super(page, locale);
    this.usersTable = page.locator('table, [data-testid="users-table"]');
    this.userRows = page.locator('tbody tr, [data-testid="user-row"]');
    this.searchInput = page.locator('input[type="search"], input[placeholder*="Search"]');
    this.roleFilter = page.locator('select[name="role"], [data-testid="role-filter"]');
    this.statusFilter = page.locator('select[name="status"], [data-testid="status-filter"]');
    this.departmentFilter = page.locator('select[name="department"], [data-testid="department-filter"]');
    this.roleModal = page.locator('[data-testid="role-modal"], [role="dialog"]');
    this.roleSelect = page.locator('select[name="newRole"], [data-testid="role-select"]');
    this.saveRoleButton = page.locator('button:has-text("Save"), button:has-text("حفظ")');
    this.cancelButton = page.locator('button:has-text("Cancel"), button:has-text("إلغاء")');
  }

  /**
   * Navigate to users page
   */
  async goto() {
    await this.page.goto(this.getLocalizedUrl('/admin/users'));
    await this.waitForPageLoad();
  }

  /**
   * Verify users page is displayed
   */
  async expectUsersPage() {
    await expect(this.page).toHaveURL(/.*\/admin\/users/);
    await expect(this.usersTable).toBeVisible();
  }

  /**
   * Get user count
   */
  async getUserCount(): Promise<number> {
    return await this.userRows.count();
  }

  /**
   * Search for user
   */
  async searchUser(query: string) {
    await this.searchInput.fill(query);
    await this.page.keyboard.press('Enter');
    await this.waitForPageLoad();
  }

  /**
   * Filter by role
   */
  async filterByRole(role: string) {
    await this.roleFilter.selectOption(role);
    await this.waitForPageLoad();
  }

  /**
   * Filter by status
   */
  async filterByStatus(status: 'ACTIVE' | 'INACTIVE' | 'all') {
    await this.statusFilter.selectOption(status);
    await this.waitForPageLoad();
  }

  /**
   * Click on user row to edit role
   */
  async openRoleEditor(index: number) {
    const row = this.userRows.nth(index);
    const editButton = row.locator('button:has-text("Edit"), button:has-text("تعديل")');
    await editButton.click();
    await expect(this.roleModal).toBeVisible();
  }

  /**
   * Change user role
   */
  async changeRole(userIndex: number, newRole: string) {
    await this.openRoleEditor(userIndex);
    await this.roleSelect.selectOption(newRole);
    await this.saveRoleButton.click();
    await this.waitForPageLoad();
  }

  /**
   * Get user role from row
   */
  async getUserRole(index: number): Promise<string> {
    const row = this.userRows.nth(index);
    const roleCell = row.locator('[data-testid="role-cell"], .role-badge');
    return await roleCell.textContent() || '';
  }
}

/**
 * Admin Settings Page Object
 */
export class AdminSettingsPage extends BasePage {
  readonly tabs: Locator;
  readonly generalTab: Locator;
  readonly jisrTab: Locator;
  readonly emailTab: Locator;
  readonly googleTab: Locator;
  readonly escalationTab: Locator;
  readonly saveButton: Locator;
  readonly testConnectionButton: Locator;

  constructor(page: Page, locale: 'en' | 'ar' = 'en') {
    super(page, locale);
    this.tabs = page.locator('[role="tablist"] button, .tabs button');
    this.generalTab = page.locator('button:has-text("General"), button:has-text("عام")');
    this.jisrTab = page.locator('button:has-text("Jisr")');
    this.emailTab = page.locator('button:has-text("Email"), button:has-text("البريد")');
    this.googleTab = page.locator('button:has-text("Google")');
    this.escalationTab = page.locator('button:has-text("Escalation"), button:has-text("التصعيد")');
    this.saveButton = page.locator('button:has-text("Save"), button:has-text("حفظ")');
    this.testConnectionButton = page.locator('button:has-text("Test"), button:has-text("اختبار")');
  }

  /**
   * Navigate to settings page
   */
  async goto() {
    await this.page.goto(this.getLocalizedUrl('/admin/settings'));
    await this.waitForPageLoad();
  }

  /**
   * Verify settings page is displayed
   */
  async expectSettingsPage() {
    await expect(this.page).toHaveURL(/.*\/admin\/settings/);
    await expect(this.tabs.first()).toBeVisible();
  }

  /**
   * Switch to a tab
   */
  async switchTab(tabName: 'general' | 'jisr' | 'email' | 'google' | 'escalation') {
    const tabMap = {
      general: this.generalTab,
      jisr: this.jisrTab,
      email: this.emailTab,
      google: this.googleTab,
      escalation: this.escalationTab,
    };
    await tabMap[tabName].click();
    await this.waitForPageLoad();
  }

  /**
   * Save current settings
   */
  async saveSettings() {
    await this.saveButton.click();
    await this.waitForPageLoad();
  }

  /**
   * Test integration connection
   */
  async testConnection() {
    await this.testConnectionButton.click();
    await this.waitForPageLoad();
  }
}
