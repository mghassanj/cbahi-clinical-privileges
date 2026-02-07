const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  // Capture console errors
  const errors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.push(msg.text());
    }
  });
  page.on('pageerror', err => errors.push(err.message));

  try {
    // Go to login
    console.log('1. Going to login page...');
    await page.goto('https://cbahi-web-production.up.railway.app/en/login');
    await page.waitForLoadState('networkidle');
    
    // Enter email
    console.log('2. Entering email: hr@tamdental.sa');
    await page.fill('input', 'hr@tamdental.sa');
    
    // Click test login
    console.log('3. Clicking Test Login...');
    await page.click('text=Test Login');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);
    
    console.log('4. Current URL:', page.url());
    
    // Take screenshot of dashboard
    await page.screenshot({ path: '/tmp/cbahi-dashboard.png', fullPage: true });
    console.log('5. Dashboard screenshot saved');
    
    // Go to requests page
    console.log('6. Going to requests page...');
    await page.goto('https://cbahi-web-production.up.railway.app/en/requests');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    console.log('7. Requests page URL:', page.url());
    await page.screenshot({ path: '/tmp/cbahi-requests.png', fullPage: true });
    console.log('8. Requests screenshot saved');
    
    // Check for visible errors
    const errorElements = await page.$$('[class*="error"], [class*="Error"], .text-red, .text-destructive');
    if (errorElements.length > 0) {
      console.log('9. Found error elements on page!');
      for (const el of errorElements) {
        const text = await el.textContent();
        if (text && text.trim()) {
          console.log('   Error text:', text.trim().substring(0, 100));
        }
      }
    }
    
    // Go to approvals page
    console.log('10. Going to approvals page...');
    await page.goto('https://cbahi-web-production.up.railway.app/en/approvals');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    console.log('11. Approvals page URL:', page.url());
    await page.screenshot({ path: '/tmp/cbahi-approvals.png', fullPage: true });
    console.log('12. Approvals screenshot saved');
    
    // Print console errors
    if (errors.length > 0) {
      console.log('\n=== CONSOLE ERRORS ===');
      errors.forEach(e => console.log(e));
    } else {
      console.log('\nNo console errors detected.');
    }
    
  } catch (err) {
    console.error('Error:', err.message);
    await page.screenshot({ path: '/tmp/cbahi-error.png' });
  }
  
  await browser.close();
})();
