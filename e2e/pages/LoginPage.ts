import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * Login Page Object for authentication flows
 */
export class LoginPage extends BasePage {
  readonly emailInput: Locator;
  readonly submitButton: Locator;
  readonly errorMessage: Locator;
  readonly testModeCredentialsInput: Locator;
  readonly logoImage: Locator;
  readonly languageSwitcher: Locator;

  constructor(page: Page, locale: 'en' | 'ar' = 'en') {
    super(page, locale);
    this.emailInput = page.locator('input[type="email"], input[name="email"]');
    this.submitButton = page.locator('button[type="submit"]');
    this.errorMessage = page.locator('[data-testid="login-error"], .text-error-600, .text-red-600');
    this.testModeCredentialsInput = page.locator('input[name="password"], input[type="password"]');
    this.logoImage = page.locator('[data-testid="logo"], .logo');
    this.languageSwitcher = page.locator('[data-testid="language-switcher"]');
  }

  /**
   * Navigate to login page
   */
  async goto() {
    await this.page.goto(this.getLocalizedUrl('/login'));
    await this.waitForPageLoad();
  }

  /**
   * Request magic link (production mode)
   */
  async requestMagicLink(email: string) {
    await this.emailInput.fill(email);
    await this.submitButton.click();
  }

  /**
   * Login with test credentials (testing mode only)
   */
  async loginWithTestCredentials(email: string, password: string = 'test') {
    await this.emailInput.fill(email);

    // In testing mode, password field should be visible
    if (await this.testModeCredentialsInput.isVisible()) {
      await this.testModeCredentialsInput.fill(password);
    }

    await this.submitButton.click();
  }

  /**
   * Verify login form is displayed correctly
   */
  async expectLoginFormVisible() {
    await expect(this.emailInput).toBeVisible();
    await expect(this.submitButton).toBeVisible();
    await expect(this.submitButton).toBeEnabled();
  }

  /**
   * Verify error message is displayed
   */
  async expectLoginError(expectedMessage?: string) {
    await expect(this.errorMessage).toBeVisible({ timeout: 5000 });
    if (expectedMessage) {
      await expect(this.errorMessage).toContainText(expectedMessage);
    }
  }

  /**
   * Verify redirected to verification page
   */
  async expectVerificationPage() {
    await expect(this.page).toHaveURL(/.*\/login\/verify/);
  }

  /**
   * Switch language
   */
  async switchLanguage() {
    await this.languageSwitcher.click();
  }

  /**
   * Verify error page is displayed
   */
  async expectErrorPage(errorType?: string) {
    await expect(this.page).toHaveURL(/.*\/login\/error/);
    if (errorType) {
      await expect(this.page).toHaveURL(new RegExp(`error=${errorType}`));
    }
  }
}
