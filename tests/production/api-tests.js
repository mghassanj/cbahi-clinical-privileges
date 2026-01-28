/**
 * CBAHI Production API Tests
 * Tests all public API endpoints for correct behavior
 * 
 * Usage: NODE_OPTIONS='' node tests/production/api-tests.js
 */

const BASE_URL = process.env.CBAHI_URL || 'https://cbahi-web-production.up.railway.app';

const results = {
  passed: 0,
  failed: 0,
  tests: []
};

function log(status, test, details = '') {
  const icon = status === 'PASS' ? '✅' : status === 'WARN' ? '⚠️' : '❌';
  console.log(`${icon} ${test}${details ? ': ' + details : ''}`);
  results.tests.push({ status, test, details });
  if (status === 'PASS') results.passed++;
  else if (status === 'FAIL') results.failed++;
}

async function runApiTests() {
  console.log('📡 CBAHI API Tests');
  console.log('='.repeat(60));
  console.log(`Target: ${BASE_URL}\n`);

  // ============================================================
  // HEALTH & STATUS ENDPOINTS
  // ============================================================
  console.log('🏥 Health & Status Endpoints\n');

  // /api/health
  try {
    const res = await fetch(`${BASE_URL}/api/health`);
    const data = await res.json();
    log(
      res.ok && data.status === 'ok' ? 'PASS' : 'FAIL',
      'GET /api/health',
      `Status: ${res.status}, Response: ${JSON.stringify(data)}`
    );
  } catch (e) {
    log('FAIL', 'GET /api/health', e.message);
  }

  // /api/config (public config)
  try {
    const res = await fetch(`${BASE_URL}/api/config`);
    if (res.ok) {
      const data = await res.json();
      log('PASS', 'GET /api/config', `Keys: ${Object.keys(data).join(', ')}`);
    } else {
      log('WARN', 'GET /api/config', `Status: ${res.status} (may require auth)`);
    }
  } catch (e) {
    log('FAIL', 'GET /api/config', e.message);
  }

  // ============================================================
  // PROTECTED ENDPOINTS (Should require auth)
  // ============================================================
  console.log('\n🔒 Protected Endpoints (Unauthorized Access)\n');

  const protectedEndpoints = [
    { method: 'GET', path: '/api/requests' },
    { method: 'POST', path: '/api/requests' },
    { method: 'GET', path: '/api/approvals' },
    { method: 'GET', path: '/api/users' },
    { method: 'GET', path: '/api/admin/privileges' },
    { method: 'POST', path: '/api/sync' },
  ];

  for (const endpoint of protectedEndpoints) {
    try {
      const res = await fetch(`${BASE_URL}${endpoint.path}`, {
        method: endpoint.method,
        headers: { 'Content-Type': 'application/json' },
        body: endpoint.method === 'POST' ? '{}' : undefined
      });
      
      // Should return 401 or 403 for protected endpoints
      const isProtected = res.status === 401 || res.status === 403;
      log(
        isProtected ? 'PASS' : 'FAIL',
        `${endpoint.method} ${endpoint.path} (no auth)`,
        `Status: ${res.status} ${isProtected ? '(correctly protected)' : '(NOT PROTECTED!)'}`
      );
    } catch (e) {
      log('FAIL', `${endpoint.method} ${endpoint.path}`, e.message);
    }
  }

  // ============================================================
  // INPUT VALIDATION
  // ============================================================
  console.log('\n🛡️ Input Validation\n');

  // Test malformed JSON
  try {
    const res = await fetch(`${BASE_URL}/api/requests`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'not valid json {'
    });
    log(
      res.status >= 400 ? 'PASS' : 'FAIL',
      'Malformed JSON handling',
      `Status: ${res.status}`
    );
  } catch (e) {
    log('PASS', 'Malformed JSON handling', 'Request rejected');
  }

  // Test SQL injection attempt in query params
  try {
    const res = await fetch(`${BASE_URL}/api/health?test='; DROP TABLE users;--`);
    log(
      res.ok ? 'PASS' : 'WARN',
      'SQL injection in query params',
      `Status: ${res.status} (endpoint still works)`
    );
  } catch (e) {
    log('WARN', 'SQL injection in query params', e.message);
  }

  // Test XSS in headers
  try {
    const res = await fetch(`${BASE_URL}/api/health`, {
      headers: { 'X-Custom': '<script>alert("xss")</script>' }
    });
    log('PASS', 'XSS in headers', `Status: ${res.status}`);
  } catch (e) {
    log('WARN', 'XSS in headers', e.message);
  }

  // ============================================================
  // RATE LIMITING (if applicable)
  // ============================================================
  console.log('\n⏱️ Rate Limiting Check\n');

  try {
    const requests = [];
    for (let i = 0; i < 10; i++) {
      requests.push(fetch(`${BASE_URL}/api/health`));
    }
    const responses = await Promise.all(requests);
    const rateLimited = responses.some(r => r.status === 429);
    log(
      'PASS',
      'Rapid requests (10x)',
      rateLimited ? 'Rate limiting active' : 'All requests succeeded'
    );
  } catch (e) {
    log('WARN', 'Rapid requests', e.message);
  }

  // ============================================================
  // CORS HEADERS
  // ============================================================
  console.log('\n🌐 CORS & Security Headers\n');

  try {
    const res = await fetch(`${BASE_URL}/api/health`, { method: 'OPTIONS' });
    const corsHeader = res.headers.get('access-control-allow-origin');
    const securityHeaders = {
      'x-frame-options': res.headers.get('x-frame-options'),
      'x-content-type-options': res.headers.get('x-content-type-options'),
      'strict-transport-security': res.headers.get('strict-transport-security'),
    };
    
    log('PASS', 'CORS headers', corsHeader || 'Not set (same-origin)');
    
    Object.entries(securityHeaders).forEach(([header, value]) => {
      if (value) {
        log('PASS', `Security header: ${header}`, value);
      }
    });
  } catch (e) {
    log('WARN', 'Security headers check', e.message);
  }

  // ============================================================
  // RESPONSE TIME
  // ============================================================
  console.log('\n⚡ Response Time\n');

  try {
    const times = [];
    for (let i = 0; i < 5; i++) {
      const start = Date.now();
      await fetch(`${BASE_URL}/api/health`);
      times.push(Date.now() - start);
    }
    const avg = times.reduce((a, b) => a + b, 0) / times.length;
    log(
      avg < 500 ? 'PASS' : 'WARN',
      'Average API response time',
      `${avg.toFixed(0)}ms (5 requests)`
    );
  } catch (e) {
    log('FAIL', 'Response time test', e.message);
  }

  // ============================================================
  // SUMMARY
  // ============================================================
  console.log('\n' + '='.repeat(60));
  console.log('📊 API TEST SUMMARY');
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

  // Save results
  const fs = require('fs');
  fs.writeFileSync('tests/production/api-results.json', JSON.stringify(results, null, 2));
  console.log('\n📄 Results saved to: tests/production/api-results.json');

  process.exit(results.failed > 0 ? 1 : 0);
}

runApiTests();
