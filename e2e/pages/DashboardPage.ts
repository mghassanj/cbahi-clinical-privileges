import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * Dashboard Page Object for main dashboard functionality
 */
export class DashboardPage extends BasePage {
  readonly welcomeMessage: Locator;
  readonly userMenu: Locator;
  readonly userMenuDropdown: Locator;
  readonly navigationSidebar: Locator;
  readonly mainContent: Locator;
  readonly statsCards: Locator;
  readonly newRequestButton: Locator;
  readonly logoutButton: Locator;
  readonly notificationBell: Locator;
  readonly languageSwitcher: Locator;

  constructor(page: Page, locale: 'en' | 'ar' = 'en') {
    super(page, locale);
    this.welcomeMessage = page.locator('[data-testid="welcome-message"], h1, h2').first();
    this.userMenu = page.locator('[data-testid="user-menu"], .user-menu').first();
    this.userMenuDropdown = page.locator('[data-testid="user-menu-dropdown"]');
    this.navigationSidebar = page.locator('aside, nav').first();
    this.mainContent = page.locator('main').first();
    this.statsCards = page.locator('[data-testid="stats-card"], .stats-card');
    this.newRequestButton = page.locator('a[href*="/requests/new"], button:has-text("New Request"), button:has-text("طلب جديد")');
    this.logoutButton = page.locator('button:has-text("Logout"), button:has-text("تسجيل الخروج")');
    this.notificationBell = page.locator('[data-testid="notification-bell"], .notification-bell');
    this.languageSwitcher = page.locator('[data-testid="language-switcher"]');
  }

  /**
   * Navigate to dashboard
   */
  async goto() {
    await this.page.goto(this.getLocalizedUrl('/'));
    await this.waitForPageLoad();
  }

  /**
   * Verify user is logged in and dashboard is displayed
   */
  async expectLoggedIn(userName?: string) {
    await expect(this.mainContent).toBeVisible();
    await expect(this.navigationSidebar).toBeVisible();

    if (userName) {
      // User name might be in various places
      const userNameVisible = await this.page.locator(`text=${userName}`).isVisible().catch(() => false);
      expect(userNameVisible).toBe(true);
    }
  }

  /**
   * Navigate to a page using sidebar
   */
  async navigateTo(menuItem: string) {
    const link = this.navigationSidebar.getByRole('link', { name: menuItem });
    await link.click();
    await this.waitForPageLoad();
  }

  /**
   * Navigate to requests page
   */
  async goToRequests() {
    await this.navigateTo(this.locale === 'ar' ? 'الطلبات' : 'Requests');
    await expect(this.page).toHaveURL(/.*\/requests/);
  }

  /**
   * Navigate to approvals page
   */
  async goToApprovals() {
    await this.navigateTo(this.locale === 'ar' ? 'الموافقات' : 'Approvals');
    await expect(this.page).toHaveURL(/.*\/approvals/);
  }

  /**
   * Navigate to admin page
   */
  async goToAdmin() {
    await this.navigateTo(this.locale === 'ar' ? 'الإدارة' : 'Admin');
    await expect(this.page).toHaveURL(/.*\/admin/);
  }

  /**
   * Create new request
   */
  async clickNewRequest() {
    await this.newRequestButton.click();
    await expect(this.page).toHaveURL(/.*\/requests\/new/);
  }

  /**
   * Open user menu
   */
  async openUserMenu() {
    await this.userMenu.click();
  }

  /**
   * Logout from the system
   */
  async logout() {
    await this.openUserMenu();
    await this.logoutButton.click();
    await expect(this.page).toHaveURL(/.*\/login/);
  }

  /**
   * Get statistics from dashboard cards
   */
  async getStatistics(): Promise<{ [key: string]: string }> {
    const stats: { [key: string]: string } = {};
    const cards = await this.statsCards.all();

    for (const card of cards) {
      const label = await card.locator('.stat-label, h3, p').first().textContent();
      const value = await card.locator('.stat-value, .text-2xl, .font-bold').first().textContent();
      if (label && value) {
        stats[label.trim()] = value.trim();
      }
    }

    return stats;
  }

  /**
   * Verify dashboard content based on user role
   */
  async expectRoleBasedContent(role: 'employee' | 'approver' | 'admin') {
    if (role === 'employee') {
      await expect(this.newRequestButton).toBeVisible();
    }

    if (role === 'approver') {
      const approvalsLink = this.navigationSidebar.locator('a[href*="/approvals"]');
      await expect(approvalsLink).toBeVisible();
    }

    if (role === 'admin') {
      const adminLink = this.navigationSidebar.locator('a[href*="/admin"]');
      await expect(adminLink).toBeVisible();
    }
  }
}
