/**
 * CBAHI Production Accessibility Tests
 * WCAG 2.1 AA Compliance Testing
 * 
 * Usage: NODE_OPTIONS='' node tests/production/accessibility-test.js
 */

const { chromium } = require('playwright');
const { AxeBuilder } = require('@axe-core/playwright');

const BASE_URL = process.env.CBAHI_URL || 'https://cbahi-web-production.up.railway.app';

async function runAccessibilityTests() {
  console.log('♿ CBAHI Accessibility Tests');
  console.log('='.repeat(60));
  console.log(`Target: ${BASE_URL}\n`);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  });
  const page = await context.newPage();

  const reports = [];

  try {
    // ============================================================
    // TEST 1: Login Page (English)
    // ============================================================
    console.log('📄 Testing: Login Page (English)\n');
    await page.goto(`${BASE_URL}/en/login`, { waitUntil: 'networkidle' });
    
    const loginResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'best-practice'])
      .analyze();
    
    reports.push({
      page: 'Login (EN)',
      violations: loginResults.violations.length,
      incomplete: loginResults.incomplete.length,
      passes: loginResults.passes.length,
      details: loginResults.violations
    });

    console.log(`   Violations: ${loginResults.violations.length}`);
    console.log(`   Incomplete: ${loginResults.incomplete.length}`);
    console.log(`   Passes: ${loginResults.passes.length}`);

    if (loginResults.violations.length > 0) {
      console.log('\n   🔴 Violations:');
      loginResults.violations.forEach((v, i) => {
        console.log(`   ${i + 1}. [${v.impact}] ${v.id}: ${v.description}`);
        console.log(`      Affected: ${v.nodes.length} element(s)`);
        console.log(`      Help: ${v.helpUrl}`);
      });
    }

    // ============================================================
    // TEST 2: Login Page (Arabic)
    // ============================================================
    console.log('\n📄 Testing: Login Page (Arabic)\n');
    await page.goto(`${BASE_URL}/ar/login`, { waitUntil: 'networkidle' });
    
    const loginArResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze();
    
    reports.push({
      page: 'Login (AR)',
      violations: loginArResults.violations.length,
      incomplete: loginArResults.incomplete.length,
      passes: loginArResults.passes.length,
      details: loginArResults.violations
    });

    console.log(`   Violations: ${loginArResults.violations.length}`);
    console.log(`   Incomplete: ${loginArResults.incomplete.length}`);
    console.log(`   Passes: ${loginArResults.passes.length}`);

    if (loginArResults.violations.length > 0) {
      console.log('\n   🔴 Violations:');
      loginArResults.violations.slice(0, 5).forEach((v, i) => {
        console.log(`   ${i + 1}. [${v.impact}] ${v.id}: ${v.description}`);
      });
    }

    // ============================================================
    // TEST 3: Keyboard Navigation
    // ============================================================
    console.log('\n⌨️  Testing: Keyboard Navigation\n');
    await page.goto(`${BASE_URL}/en/login`, { waitUntil: 'networkidle' });
    
    // Tab through focusable elements
    const focusableElements = [];
    for (let i = 0; i < 10; i++) {
      await page.keyboard.press('Tab');
      const activeElement = await page.evaluate(() => {
        const el = document.activeElement;
        return {
          tag: el.tagName,
          type: el.type,
          text: el.textContent?.substring(0, 30),
          hasFocus: document.hasFocus()
        };
      });
      focusableElements.push(activeElement);
    }
    
    const hasFocusIndicators = focusableElements.some(el => el.tag !== 'BODY');
    console.log(`   Focusable elements found: ${focusableElements.filter(el => el.tag !== 'BODY').length}`);
    console.log(`   Tab navigation: ${hasFocusIndicators ? '✅' : '❌'}`);

    // ============================================================
    // TEST 4: Color Contrast (Manual check via screenshot)
    // ============================================================
    console.log('\n🎨 Capturing for Color Contrast Review\n');
    await page.screenshot({ path: 'tests/production/a11y-contrast.png', fullPage: true });
    console.log('   Screenshot saved: tests/production/a11y-contrast.png');

    // ============================================================
    // SUMMARY
    // ============================================================
    console.log('\n' + '='.repeat(60));
    console.log('📊 ACCESSIBILITY SUMMARY');
    console.log('='.repeat(60));
    
    const totalViolations = reports.reduce((sum, r) => sum + r.violations, 0);
    const totalPasses = reports.reduce((sum, r) => sum + r.passes, 0);
    
    console.log('\n📄 By Page:');
    reports.forEach(r => {
      const icon = r.violations === 0 ? '✅' : '⚠️';
      console.log(`   ${icon} ${r.page}: ${r.violations} violations, ${r.passes} passes`);
    });
    
    console.log(`\n📈 Overall:`);
    console.log(`   Total Violations: ${totalViolations}`);
    console.log(`   Total Passes: ${totalPasses}`);
    console.log(`   Compliance: ${totalViolations === 0 ? '✅ WCAG 2.1 AA Compliant' : '⚠️ Needs Fixes'}`);

    // Severity breakdown
    const allViolations = reports.flatMap(r => r.details);
    const critical = allViolations.filter(v => v.impact === 'critical').length;
    const serious = allViolations.filter(v => v.impact === 'serious').length;
    const moderate = allViolations.filter(v => v.impact === 'moderate').length;
    const minor = allViolations.filter(v => v.impact === 'minor').length;
    
    if (totalViolations > 0) {
      console.log(`\n   By Severity:`);
      if (critical > 0) console.log(`   🔴 Critical: ${critical}`);
      if (serious > 0) console.log(`   🟠 Serious: ${serious}`);
      if (moderate > 0) console.log(`   🟡 Moderate: ${moderate}`);
      if (minor > 0) console.log(`   🟢 Minor: ${minor}`);
    }

    // Save detailed report
    const fs = require('fs');
    fs.writeFileSync('tests/production/a11y-report.json', JSON.stringify(reports, null, 2));
    console.log('\n📄 Full report: tests/production/a11y-report.json');

    return totalViolations === 0;

  } catch (error) {
    console.error('❌ Test error:', error.message);
    return false;
  } finally {
    await browser.close();
  }
}

runAccessibilityTests().then(passed => {
  process.exit(passed ? 0 : 1);
});
