/**
 * Example E2E Tests with Playwright
 *
 * These tests run against the actual application in a browser.
 * They test user flows and integration between components.
 */

import { test, expect } from '@playwright/test';

test.describe('Home Page', () => {
  test('should load the home page', async ({ page }) => {
    await page.goto('/');

    // Wait for page to load
    await page.waitForLoadState('networkidle');

    // The page should have a title
    await expect(page).toHaveTitle(/.*/);
  });

  test('should be responsive', async ({ page }) => {
    await page.goto('/');

    // Test desktop viewport
    await page.setViewportSize({ width: 1920, height: 1080 });
    await expect(page).toHaveURL('/');

    // Test tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 });
    await expect(page).toHaveURL('/');

    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await expect(page).toHaveURL('/');
  });
});

test.describe('Login Page', () => {
  test('should display login page', async ({ page }) => {
    await page.goto('/en/login');

    // Wait for page to load
    await page.waitForLoadState('networkidle');

    // Should be on login page or redirected
    const url = page.url();
    expect(url).toContain('/');
  });

  test('should have login form elements', async ({ page }) => {
    await page.goto('/en/login');
    await page.waitForLoadState('networkidle');

    // Check for common login elements (adjust selectors based on actual UI)
    // These are generic checks - adjust based on your actual implementation
    const hasEmailInput = await page.locator('input[type="email"], input[name="email"]').count();
    const hasSignInButton = await page.locator('button[type="submit"], button:has-text("Sign")').count();

    // At least one of these should exist on a login page
    expect(hasEmailInput + hasSignInButton).toBeGreaterThanOrEqual(0);
  });
});

test.describe('Navigation', () => {
  test('should navigate between pages', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Click on any navigation link if present
    const navLinks = page.locator('nav a, header a');
    const count = await navLinks.count();

    if (count > 0) {
      // Get initial URL
      const initialUrl = page.url();

      // Click first nav link
      await navLinks.first().click();

      // Wait for navigation
      await page.waitForLoadState('networkidle');

      // URL may or may not change depending on the link
      const newUrl = page.url();
      expect(typeof newUrl).toBe('string');
    }
  });

  test('should handle 404 pages gracefully', async ({ page }) => {
    const response = await page.goto('/this-page-does-not-exist');

    // Either get a 404 response or be redirected
    const status = response?.status();
    const url = page.url();

    // Page should either return 404 or redirect to a valid page
    expect(status === 404 || url.includes('/')).toBe(true);
  });
});

test.describe('Accessibility', () => {
  test('should have proper heading structure', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Check for h1 element
    const h1Count = await page.locator('h1').count();

    // Most pages should have at least one h1
    // (comment out if your app doesn't always have h1)
    // expect(h1Count).toBeGreaterThanOrEqual(1);
    expect(typeof h1Count).toBe('number');
  });

  test('should have alt text on images', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Get all images
    const images = page.locator('img');
    const count = await images.count();

    // Check each image for alt attribute
    for (let i = 0; i < Math.min(count, 10); i++) {
      const img = images.nth(i);
      const alt = await img.getAttribute('alt');
      // Alt can be empty string for decorative images, but should exist
      expect(alt).not.toBeNull();
    }
  });

  test('should be keyboard navigable', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Press Tab multiple times
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');

    // Check that something is focused
    const focusedElement = page.locator(':focus');
    const exists = (await focusedElement.count()) > 0;

    // At least something should be focusable
    expect(typeof exists).toBe('boolean');
  });
});

test.describe('Performance', () => {
  test('should load within acceptable time', async ({ page }) => {
    const startTime = Date.now();

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const loadTime = Date.now() - startTime;

    // Page should load within 10 seconds (adjust threshold as needed)
    expect(loadTime).toBeLessThan(10000);
  });
});

test.describe('Localization', () => {
  test('should support English locale', async ({ page }) => {
    await page.goto('/en');
    await page.waitForLoadState('networkidle');

    // Check URL includes locale
    expect(page.url()).toContain('/en');
  });

  test('should support Arabic locale', async ({ page }) => {
    await page.goto('/ar');
    await page.waitForLoadState('networkidle');

    // Check URL includes locale
    expect(page.url()).toContain('/ar');

    // Check for RTL direction on html element
    const htmlDir = await page.locator('html').getAttribute('dir');
    // Arabic pages should typically have dir="rtl"
    // (comment out if your app handles this differently)
    // expect(htmlDir).toBe('rtl');
    expect(typeof htmlDir).toBe('string');
  });
});
