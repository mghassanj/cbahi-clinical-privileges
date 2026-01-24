import { Page, Locator, expect } from '@playwright/test';

/**
 * Base Page Object for common functionality
 */
export class BasePage {
  readonly page: Page;
  readonly loadingSpinner: Locator;
  readonly errorToast: Locator;
  readonly successToast: Locator;
  readonly locale: 'en' | 'ar';

  constructor(page: Page, locale: 'en' | 'ar' = 'en') {
    this.page = page;
    this.locale = locale;
    this.loadingSpinner = page.locator('[data-testid="loading-spinner"], .animate-spin');
    this.errorToast = page.locator('[data-testid="error-toast"], [role="alert"]');
    this.successToast = page.locator('[data-testid="success-toast"]');
  }

  /**
   * Wait for page to fully load
   */
  async waitForPageLoad() {
    await this.page.waitForLoadState('networkidle');
    // Wait for any loading spinners to disappear
    await expect(this.loadingSpinner.first()).not.toBeVisible({ timeout: 15000 }).catch(() => {
      // Spinner might not exist, which is fine
    });
  }

  /**
   * Verify no error messages are displayed
   */
  async expectNoErrors() {
    const errorVisible = await this.errorToast.isVisible().catch(() => false);
    expect(errorVisible).toBe(false);
  }

  /**
   * Verify success message is displayed
   */
  async expectSuccessMessage(message?: string) {
    await expect(this.successToast).toBeVisible({ timeout: 5000 });
    if (message) {
      await expect(this.successToast).toContainText(message);
    }
  }

  /**
   * Get localized URL
   */
  getLocalizedUrl(path: string): string {
    return `/${this.locale}${path}`;
  }

  /**
   * Navigate to a page with locale prefix
   */
  async goto(path: string) {
    await this.page.goto(this.getLocalizedUrl(path));
    await this.waitForPageLoad();
  }

  /**
   * Check if user is authenticated by looking for dashboard elements
   */
  async isAuthenticated(): Promise<boolean> {
    try {
      await this.page.waitForSelector('[data-testid="user-menu"], .user-menu', { timeout: 3000 });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Take screenshot with descriptive name
   */
  async takeScreenshot(name: string) {
    await this.page.screenshot({ path: `playwright-results/screenshots/${name}.png` });
  }
}
