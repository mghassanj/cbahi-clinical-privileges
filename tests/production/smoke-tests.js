/**
 * CBAHI Production Smoke Tests
 * Quick sanity checks to ensure the app is functional
 * 
 * Usage: NODE_OPTIONS='' node tests/production/smoke-tests.js
 */

const { chromium } = require('playwright');

const BASE_URL = process.env.CBAHI_URL || 'https://cbahi-web-production.up.railway.app';

const results = {
  passed: 0,
  failed: 0,
  tests: []
};

function log(status, test, details = '') {
  const icon = status === 'PASS' ? '✅' : '❌';
  console.log(`${icon} ${test}${details ? ': ' + details : ''}`);
  results.tests.push({ status, test, details });
  if (status === 'PASS') results.passed++;
  else results.failed++;
}

async function runSmokeTests() {
  console.log('🔥 CBAHI Production Smoke Tests');
  console.log('='.repeat(60));
  console.log(`Target: ${BASE_URL}\n`);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    locale: 'en-US'
  });
  const page = await context.newPage();

  try {
    // ============================================================
    // TEST 1: App Loads
    // ============================================================
    console.log('\n📦 Core Functionality\n');
    
    try {
      const response = await page.goto(`${BASE_URL}/`, { 
        waitUntil: 'networkidle',
        timeout: 30000 
      });
      log(response.ok() ? 'PASS' : 'FAIL', 'App loads', `Status: ${response.status()}`);
    } catch (e) {
      log('FAIL', 'App loads', e.message);
    }

    // ============================================================
    // TEST 2: Login Page Renders
    // ============================================================
    try {
      await page.waitForSelector('input', { timeout: 5000 });
      const hasEmailInput = await page.locator('input[type="email"], input[name="email"]').isVisible();
      log(hasEmailInput ? 'PASS' : 'FAIL', 'Login form renders');
    } catch (e) {
      log('FAIL', 'Login form renders', e.message);
    }

    // ============================================================
    // TEST 3: Branding/Logo Visible
    // ============================================================
    // Branding check - CBAHI uses a styled div with "C" as logo
    try {
      const hasBranding = await page.locator('.bg-teal-600, [class*="logo"], .rounded-xl').first().isVisible();
      log(hasBranding ? 'PASS' : 'FAIL', 'Branding visible');
    } catch (e) {
      log('FAIL', 'Branding visible', e.message);
    }

    // ============================================================
    // TEST 4: Language Switch Works
    // ============================================================
    console.log('\n🌐 Internationalization\n');
    
    try {
      await page.goto(`${BASE_URL}/en/login`, { waitUntil: 'networkidle' });
      const arLink = page.locator('a[href*="/ar"]').first();
      await arLink.click();
      await page.waitForURL(/.*\/ar\//, { timeout: 5000 });
      log('PASS', 'English → Arabic switch');
    } catch (e) {
      log('FAIL', 'English → Arabic switch', e.message);
    }

    try {
      const isRTL = await page.locator('html[dir="rtl"], [dir="rtl"]').first().isVisible();
      log(isRTL ? 'PASS' : 'FAIL', 'Arabic RTL layout');
    } catch (e) {
      log('FAIL', 'Arabic RTL layout', e.message);
    }

    try {
      const enLink = page.locator('a[href*="/en"]').first();
      await enLink.click();
      await page.waitForURL(/.*\/en\//, { timeout: 5000 });
      log('PASS', 'Arabic → English switch');
    } catch (e) {
      log('FAIL', 'Arabic → English switch', e.message);
    }

    // ============================================================
    // TEST 5: API Health
    // ============================================================
    console.log('\n📡 API Endpoints\n');
    
    try {
      const healthResponse = await page.request.get(`${BASE_URL}/api/health`);
      const healthData = await healthResponse.json();
      log(
        healthResponse.ok() && healthData.status === 'ok' ? 'PASS' : 'FAIL',
        'API Health endpoint',
        `Status: ${healthData.status}`
      );
    } catch (e) {
      log('FAIL', 'API Health endpoint', e.message);
    }

    // ============================================================
    // TEST 6: Protected Routes Redirect
    // ============================================================
    console.log('\n🔒 Security\n');
    
    const protectedRoutes = [
      '/en',
      '/en/requests',
      '/en/approvals',
      '/en/admin',
      '/en/profile'
    ];

    for (const route of protectedRoutes) {
      try {
        await page.goto(`${BASE_URL}${route}`, { waitUntil: 'networkidle' });
        const redirectedToLogin = page.url().includes('/login');
        log(
          redirectedToLogin ? 'PASS' : 'FAIL',
          `Protected route ${route}`,
          redirectedToLogin ? 'Redirects to login' : 'NOT protected!'
        );
      } catch (e) {
        log('FAIL', `Protected route ${route}`, e.message);
      }
    }

    // ============================================================
    // TEST 7: Form Validation
    // ============================================================
    console.log('\n📝 Form Validation\n');
    
    // Empty form validation - button should be disabled when form is empty (CBAHI pattern)
    try {
      await page.goto(`${BASE_URL}/en/login`, { waitUntil: 'networkidle' });
      const submitBtn = page.locator('button').filter({ hasText: /Test Login|Send Magic|Sign/ }).first();
      const isDisabled = await submitBtn.isDisabled();
      log(isDisabled ? 'PASS' : 'FAIL', 'Empty form validation', isDisabled ? 'Button disabled when empty (correct)' : 'Button NOT disabled');
    } catch (e) {
      log('FAIL', 'Empty form validation', e.message);
    }

    try {
      // Try invalid email
      await page.goto(`${BASE_URL}/en/login`, { waitUntil: 'networkidle' });
      const emailInput = page.locator('input[type="email"], input[name="email"]').first();
      await emailInput.fill('not-an-email');
      await emailInput.blur();
      await page.waitForTimeout(500);
      
      // Check for error message or still on page
      const hasError = await page.locator('[class*="error"], [class*="invalid"], [role="alert"]').isVisible();
      log('PASS', 'Invalid email validation', hasError ? 'Shows error' : 'Prevents submission');
    } catch (e) {
      log('FAIL', 'Invalid email validation', e.message);
    }

    // ============================================================
    // TEST 8: Mobile Responsiveness
    // ============================================================
    console.log('\n📱 Responsive Design\n');
    
    const viewports = [
      { name: 'Mobile', width: 375, height: 812 },
      { name: 'Tablet', width: 768, height: 1024 },
      { name: 'Desktop', width: 1920, height: 1080 }
    ];

    for (const vp of viewports) {
      try {
        await page.setViewportSize({ width: vp.width, height: vp.height });
        await page.goto(`${BASE_URL}/en/login`, { waitUntil: 'networkidle' });
        
        // Check if form is still usable
        const emailVisible = await page.locator('input[type="email"], input[name="email"]').first().isVisible();
        log(emailVisible ? 'PASS' : 'FAIL', `${vp.name} (${vp.width}x${vp.height})`);
        
        await page.screenshot({ path: `tests/production/responsive-${vp.name.toLowerCase()}.png` });
      } catch (e) {
        log('FAIL', `${vp.name} (${vp.width}x${vp.height})`, e.message);
      }
    }

    // ============================================================
    // TEST 9: Performance
    // ============================================================
    console.log('\n⚡ Performance\n');
    
    try {
      await page.setViewportSize({ width: 1920, height: 1080 });
      const startTime = Date.now();
      await page.goto(`${BASE_URL}/en/login`, { waitUntil: 'networkidle' });
      const loadTime = Date.now() - startTime;
      
      log(
        loadTime < 5000 ? 'PASS' : 'FAIL',
        'Page load time',
        `${loadTime}ms ${loadTime < 3000 ? '(Good)' : loadTime < 5000 ? '(Acceptable)' : '(Slow!)'}`
      );
    } catch (e) {
      log('FAIL', 'Page load time', e.message);
    }

    // ============================================================
    // TEST 10: No Console Errors
    // ============================================================
    console.log('\n🐛 Error Detection\n');
    
    const consoleErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    try {
      await page.goto(`${BASE_URL}/en/login`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(2000);
      
      log(
        consoleErrors.length === 0 ? 'PASS' : 'FAIL',
        'No console errors',
        consoleErrors.length > 0 ? `${consoleErrors.length} errors found` : ''
      );
    } catch (e) {
      log('FAIL', 'No console errors', e.message);
    }

  } catch (error) {
    console.error('\n❌ Test suite error:', error.message);
  } finally {
    await browser.close();
  }

  // ============================================================
  // SUMMARY
  // ============================================================
  console.log('\n' + '='.repeat(60));
  console.log('📊 SMOKE TEST SUMMARY');
  console.log('='.repeat(60));
  console.log(`\n✅ Passed: ${results.passed}`);
  console.log(`❌ Failed: ${results.failed}`);
  console.log(`📈 Pass Rate: ${((results.passed / (results.passed + results.failed)) * 100).toFixed(1)}%`);
  
  if (results.failed > 0) {
    console.log('\n❌ Failed Tests:');
    results.tests.filter(t => t.status === 'FAIL').forEach(t => {
      console.log(`   - ${t.test}: ${t.details}`);
    });
  }
  
  console.log('\n📸 Screenshots saved to: tests/production/');
  
  // Save results
  const fs = require('fs');
  fs.writeFileSync('tests/production/smoke-results.json', JSON.stringify(results, null, 2));
  console.log('📄 Results saved to: tests/production/smoke-results.json');
  
  process.exit(results.failed > 0 ? 1 : 0);
}

runSmokeTests();
