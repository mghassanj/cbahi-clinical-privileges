import { chromium, FullConfig } from '@playwright/test';

/**
 * Global setup for Playwright tests
 * Runs once before all tests
 */
async function globalSetup(config: FullConfig) {
  const { baseURL } = config.projects[0].use;

  console.log('Running global setup...');
  console.log(`Base URL: ${baseURL}`);

  // Verify the application is running
  const browser = await chromium.launch();
  const page = await browser.newPage();

  try {
    // Check health endpoint
    const response = await page.goto(`${baseURL}/api/health`);
    if (response?.status() !== 200) {
      throw new Error(`Health check failed with status ${response?.status()}`);
    }
    console.log('Health check passed');

    // Check login page is accessible
    await page.goto(`${baseURL}/en/login`);
    console.log('Login page accessible');
  } catch (error) {
    console.error('Global setup failed:', error);
    throw error;
  } finally {
    await browser.close();
  }

  console.log('Global setup complete');
}

export default globalSetup;
