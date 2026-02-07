const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  const errors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  page.on('pageerror', err => errors.push(err.message));

  try {
    console.log('1. Logging in...');
    await page.goto('https://cbahi-web-production.up.railway.app/en/login');
    await page.waitForLoadState('networkidle');
    await page.fill('input', 'hr@tamdental.sa');
    await page.click('text=Test Login');
    await page.waitForTimeout(3000);
    console.log('   URL:', page.url());
    
    console.log('2. Going to requests...');
    await page.goto('https://cbahi-web-production.up.railway.app/en/requests');
    await page.waitForTimeout(5000);
    console.log('   URL:', page.url());
    await page.screenshot({ path: '/tmp/requests-after-sync.png', fullPage: true });
    
    // Check page content
    const pageText = await page.textContent('body');
    if (pageText.includes('error') || pageText.includes('Error')) {
      console.log('   ⚠️ Page contains error text');
    } else {
      console.log('   ✅ No error text found');
    }
    
    console.log('3. Going to approvals...');
    await page.goto('https://cbahi-web-production.up.railway.app/en/approvals');
    await page.waitForTimeout(5000);
    console.log('   URL:', page.url());
    await page.screenshot({ path: '/tmp/approvals-after-sync.png', fullPage: true });
    
    if (errors.length > 0) {
      console.log('\n=== CONSOLE ERRORS ===');
      errors.forEach(e => console.log(e));
    } else {
      console.log('\n✅ No console errors');
    }
    
  } catch (err) {
    console.error('Error:', err.message);
  }
  
  await browser.close();
})();
