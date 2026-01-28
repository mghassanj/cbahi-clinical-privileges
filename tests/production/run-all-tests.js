#!/usr/bin/env node
/**
 * CBAHI Production Test Runner
 * Runs all production tests and generates a comprehensive report
 * 
 * Usage: NODE_OPTIONS='' node tests/production/run-all-tests.js
 */

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const BASE_URL = process.env.CBAHI_URL || 'https://cbahi-web-production.up.railway.app';

console.log(`
╔═══════════════════════════════════════════════════════════════╗
║           CBAHI Production Test Suite                         ║
║           Clinical Privileges Management System               ║
╚═══════════════════════════════════════════════════════════════╝
`);
console.log(`🎯 Target: ${BASE_URL}`);
console.log(`📅 Date: ${new Date().toISOString()}\n`);

const results = {
  timestamp: new Date().toISOString(),
  target: BASE_URL,
  suites: []
};

async function runTest(name, script) {
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`🧪 Running: ${name}`);
  console.log('═'.repeat(60) + '\n');

  const startTime = Date.now();
  
  try {
    const output = execSync(
      `NODE_OPTIONS='' node ${script}`,
      { 
        cwd: path.dirname(script).replace('/production', '').replace('production', ''),
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'pipe'],
        timeout: 120000
      }
    );
    
    const duration = Date.now() - startTime;
    console.log(output);
    
    // Parse pass/fail from output
    const passMatch = output.match(/Passed:\s*(\d+)/);
    const failMatch = output.match(/Failed:\s*(\d+)/);
    
    results.suites.push({
      name,
      status: 'completed',
      passed: passMatch ? parseInt(passMatch[1]) : 0,
      failed: failMatch ? parseInt(failMatch[1]) : 0,
      duration: duration
    });
    
    return true;
  } catch (error) {
    const duration = Date.now() - startTime;
    
    // Even if exit code is non-zero, capture output
    if (error.stdout) {
      console.log(error.stdout);
    }
    if (error.stderr) {
      console.error(error.stderr);
    }
    
    const passMatch = (error.stdout || '').match(/Passed:\s*(\d+)/);
    const failMatch = (error.stdout || '').match(/Failed:\s*(\d+)/);
    
    results.suites.push({
      name,
      status: 'completed_with_failures',
      passed: passMatch ? parseInt(passMatch[1]) : 0,
      failed: failMatch ? parseInt(failMatch[1]) : 0,
      duration: duration,
      error: error.message.split('\n')[0]
    });
    
    return false;
  }
}

async function main() {
  const testDir = __dirname;
  
  // Run tests in order
  await runTest('🔥 Smoke Tests', path.join(testDir, 'smoke-tests.js'));
  await runTest('📡 API Tests', path.join(testDir, 'api-tests.js'));
  await runTest('♿ Accessibility Tests', path.join(testDir, 'accessibility-test.js'));
  await runTest('📸 Visual Journey', path.join(testDir, 'visual-journey-test.js'));

  // Generate summary
  console.log(`\n${'═'.repeat(60)}`);
  console.log('📊 FINAL TEST REPORT');
  console.log('═'.repeat(60) + '\n');

  let totalPassed = 0;
  let totalFailed = 0;
  let totalDuration = 0;

  console.log('Suite Results:');
  console.log('─'.repeat(60));
  
  results.suites.forEach(suite => {
    const icon = suite.failed === 0 ? '✅' : '⚠️';
    console.log(`${icon} ${suite.name}`);
    console.log(`   Passed: ${suite.passed} | Failed: ${suite.failed} | Duration: ${(suite.duration/1000).toFixed(1)}s`);
    
    totalPassed += suite.passed;
    totalFailed += suite.failed;
    totalDuration += suite.duration;
  });

  console.log('─'.repeat(60));
  console.log(`\n📈 Overall Results:`);
  console.log(`   Total Passed: ${totalPassed}`);
  console.log(`   Total Failed: ${totalFailed}`);
  console.log(`   Pass Rate: ${((totalPassed / (totalPassed + totalFailed)) * 100).toFixed(1)}%`);
  console.log(`   Total Duration: ${(totalDuration/1000).toFixed(1)}s`);

  // Issues to fix
  if (totalFailed > 0) {
    console.log(`\n⚠️ Issues Found:`);
    results.suites.filter(s => s.failed > 0).forEach(s => {
      console.log(`   - ${s.name}: ${s.failed} issue(s)`);
    });
  }

  // Save comprehensive report
  results.summary = {
    totalPassed,
    totalFailed,
    passRate: ((totalPassed / (totalPassed + totalFailed)) * 100).toFixed(1) + '%',
    totalDuration: totalDuration
  };

  fs.writeFileSync(
    path.join(testDir, 'full-report.json'),
    JSON.stringify(results, null, 2)
  );

  console.log(`\n📄 Full report saved: tests/production/full-report.json`);
  console.log(`📸 Screenshots: tests/production/screenshots/`);
  
  // Exit with appropriate code
  process.exit(totalFailed > 0 ? 1 : 0);
}

main().catch(error => {
  console.error('❌ Test runner error:', error);
  process.exit(1);
});
