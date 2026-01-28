/**
 * CBAHI Visual Journey Test
 * Captures screenshots of all accessible pages for visual review
 * 
 * Usage: NODE_OPTIONS='' node tests/production/visual-journey-test.js
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const BASE_URL = process.env.CBAHI_URL || 'https://cbahi-web-production.up.railway.app';
const SCREENSHOT_DIR = 'tests/production/screenshots';

async function runVisualJourney() {
  console.log('📸 CBAHI Visual Journey Test');
  console.log('='.repeat(60));
  console.log(`Target: ${BASE_URL}\n`);

  // Create screenshot directory
  if (!fs.existsSync(SCREENSHOT_DIR)) {
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  }

  const browser = await chromium.launch({ headless: true });
  
  const screenshots = [];

  try {
    // ============================================================
    // DESKTOP VIEWS
    // ============================================================
    console.log('🖥️ Desktop Views (1920x1080)\n');
    
    const desktopContext = await browser.newContext({
      viewport: { width: 1920, height: 1080 }
    });
    const desktopPage = await desktopContext.newPage();

    const desktopPages = [
      { name: 'Login (EN)', url: '/en/login' },
      { name: 'Login (AR)', url: '/ar/login' },
      { name: 'Login Error', url: '/en/login/error?error=UserNotFound' },
      { name: 'Login Verify', url: '/en/login/verify' },
    ];

    for (const p of desktopPages) {
      try {
        await desktopPage.goto(`${BASE_URL}${p.url}`, { waitUntil: 'networkidle', timeout: 15000 });
        const filename = `desktop-${p.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}.png`;
        await desktopPage.screenshot({ 
          path: path.join(SCREENSHOT_DIR, filename),
          fullPage: true 
        });
        screenshots.push({ page: p.name, device: 'Desktop', file: filename });
        console.log(`   ✅ ${p.name}`);
      } catch (e) {
        console.log(`   ❌ ${p.name}: ${e.message.split('\n')[0]}`);
      }
    }

    await desktopContext.close();

    // ============================================================
    // MOBILE VIEWS
    // ============================================================
    console.log('\n📱 Mobile Views (375x812 - iPhone X)\n');
    
    const mobileContext = await browser.newContext({
      viewport: { width: 375, height: 812 },
      isMobile: true,
      hasTouch: true
    });
    const mobilePage = await mobileContext.newPage();

    const mobilePages = [
      { name: 'Login (EN)', url: '/en/login' },
      { name: 'Login (AR)', url: '/ar/login' },
    ];

    for (const p of mobilePages) {
      try {
        await mobilePage.goto(`${BASE_URL}${p.url}`, { waitUntil: 'networkidle', timeout: 15000 });
        const filename = `mobile-${p.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}.png`;
        await mobilePage.screenshot({ 
          path: path.join(SCREENSHOT_DIR, filename),
          fullPage: true 
        });
        screenshots.push({ page: p.name, device: 'Mobile', file: filename });
        console.log(`   ✅ ${p.name}`);
      } catch (e) {
        console.log(`   ❌ ${p.name}: ${e.message.split('\n')[0]}`);
      }
    }

    await mobileContext.close();

    // ============================================================
    // TABLET VIEWS
    // ============================================================
    console.log('\n📱 Tablet Views (768x1024 - iPad)\n');
    
    const tabletContext = await browser.newContext({
      viewport: { width: 768, height: 1024 },
      isMobile: true
    });
    const tabletPage = await tabletContext.newPage();

    const tabletPages = [
      { name: 'Login (EN)', url: '/en/login' },
    ];

    for (const p of tabletPages) {
      try {
        await tabletPage.goto(`${BASE_URL}${p.url}`, { waitUntil: 'networkidle', timeout: 15000 });
        const filename = `tablet-${p.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}.png`;
        await tabletPage.screenshot({ 
          path: path.join(SCREENSHOT_DIR, filename),
          fullPage: true 
        });
        screenshots.push({ page: p.name, device: 'Tablet', file: filename });
        console.log(`   ✅ ${p.name}`);
      } catch (e) {
        console.log(`   ❌ ${p.name}: ${e.message.split('\n')[0]}`);
      }
    }

    await tabletContext.close();

    // ============================================================
    // INTERACTION STATES
    // ============================================================
    console.log('\n🎯 Interaction States\n');
    
    const statesContext = await browser.newContext({
      viewport: { width: 1920, height: 1080 }
    });
    const statesPage = await statesContext.newPage();

    // Hover state
    try {
      await statesPage.goto(`${BASE_URL}/en/login`, { waitUntil: 'networkidle' });
      const langLink = statesPage.locator('a[href*="/ar"]').first();
      await langLink.hover();
      await statesPage.screenshot({ 
        path: path.join(SCREENSHOT_DIR, 'state-hover.png') 
      });
      screenshots.push({ page: 'Hover State', device: 'Desktop', file: 'state-hover.png' });
      console.log('   ✅ Hover state');
    } catch (e) {
      console.log(`   ❌ Hover state: ${e.message.split('\n')[0]}`);
    }

    // Focus state
    try {
      await statesPage.goto(`${BASE_URL}/en/login`, { waitUntil: 'networkidle' });
      const emailInput = statesPage.locator('input[type="email"], input[name="email"]').first();
      await emailInput.focus();
      await statesPage.screenshot({ 
        path: path.join(SCREENSHOT_DIR, 'state-focus.png') 
      });
      screenshots.push({ page: 'Focus State', device: 'Desktop', file: 'state-focus.png' });
      console.log('   ✅ Focus state');
    } catch (e) {
      console.log(`   ❌ Focus state: ${e.message.split('\n')[0]}`);
    }

    // Error state
    try {
      await statesPage.goto(`${BASE_URL}/en/login`, { waitUntil: 'networkidle' });
      const emailInput = statesPage.locator('input[type="email"], input[name="email"]').first();
      await emailInput.fill('invalid-email');
      await emailInput.blur();
      await statesPage.waitForTimeout(500);
      await statesPage.screenshot({ 
        path: path.join(SCREENSHOT_DIR, 'state-error.png') 
      });
      screenshots.push({ page: 'Error State', device: 'Desktop', file: 'state-error.png' });
      console.log('   ✅ Error state');
    } catch (e) {
      console.log(`   ❌ Error state: ${e.message.split('\n')[0]}`);
    }

    // Valid state
    try {
      await statesPage.goto(`${BASE_URL}/en/login`, { waitUntil: 'networkidle' });
      const emailInput = statesPage.locator('input[type="email"], input[name="email"]').first();
      await emailInput.fill('test@example.com');
      await statesPage.waitForTimeout(500);
      await statesPage.screenshot({ 
        path: path.join(SCREENSHOT_DIR, 'state-valid.png') 
      });
      screenshots.push({ page: 'Valid State', device: 'Desktop', file: 'state-valid.png' });
      console.log('   ✅ Valid state');
    } catch (e) {
      console.log(`   ❌ Valid state: ${e.message.split('\n')[0]}`);
    }

    await statesContext.close();

    // ============================================================
    // SUMMARY
    // ============================================================
    console.log('\n' + '='.repeat(60));
    console.log('📊 VISUAL JOURNEY SUMMARY');
    console.log('='.repeat(60));
    console.log(`\n📸 Screenshots captured: ${screenshots.length}`);
    console.log(`📁 Location: ${SCREENSHOT_DIR}/`);
    
    console.log('\n📋 Screenshot Index:');
    const byDevice = {};
    screenshots.forEach(s => {
      if (!byDevice[s.device]) byDevice[s.device] = [];
      byDevice[s.device].push(s);
    });
    
    Object.entries(byDevice).forEach(([device, shots]) => {
      console.log(`\n   ${device}:`);
      shots.forEach(s => {
        console.log(`   - ${s.page}: ${s.file}`);
      });
    });

    // Save manifest
    fs.writeFileSync(
      path.join(SCREENSHOT_DIR, 'manifest.json'),
      JSON.stringify({ screenshots, timestamp: new Date().toISOString() }, null, 2)
    );
    console.log(`\n📄 Manifest: ${SCREENSHOT_DIR}/manifest.json`);

  } catch (error) {
    console.error('❌ Test error:', error.message);
  } finally {
    await browser.close();
  }
}

runVisualJourney();
