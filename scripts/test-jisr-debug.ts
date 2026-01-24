/**
 * Debug script for Jisr HR API - shows raw responses
 * Run with: npx tsx scripts/test-jisr-debug.ts
 */

const JISR_ACCESS_TOKEN = 'eyJhbGciOiJkaXIiLCJlbmMiOiJBMjU2R0NNIiwiemlwIjoiREVGIn0..Ga8-ySZ0y0aGlDUa.G1aea5V3GBFsxAcvWp4I4HbA7k93PbUTKE4bpOr_mOs5BFfCTRkTjiCOEoJ-tvQ2yMcslKFVNhuZMgIbgBXfcGRykWTpNDlYPIiq2-E3VGD8zpwG7CwkusW57DFVHB1DNE8ZgmFBw1_B3jahg1VfstGnweKBLcnqj17JliU60RddUDvF98ZrmtXjcXrEMfJ5wdTjd2AI_tpiJFHa367hfkJQjW4JpzQaTJMLab8xZkXKzswX1UQW32QVRC_AQmmGgFZJsPD2yWgmSxV1K7pWeRwDy1Q4ceCTkuy1kyAhlvKxcYtqTT-cxfFdFWhC4cSfQO-CZgdaqWHwXDo7BclLMXhYEnrwI2E5PSaNp5Rb2i_UGs0mHY20P_numlxx-kz-oPo5bootgOLhGn-sLVY8kP46I2Ux-Jx_jrxADePwAcZ2-zFKUJK-2BhZ0EtmDhZq8VURsb83gwnj03hx4g_nC7QXWy14rXX_Dc9Z_XBzHZoC8rj1lq6cR8mwBmFCOtch7tUSqHixkOJ1mYovxMi2eJO_9BkdEcfJ4PPzqooy-Lk2zTg5xibCUSZOaAlSeHbCMpbCJhv6KhD3bhgm_yBdQvcR1Xx2Knfdjcm-g1I3z5Vrzyksi9KElsl_4r8_Y5by6reaOxySlw0X2jY8re8P5KMiZMLsXx9e_ePt5iZ1oBmiutUZzcvuiktcQrtiDbj5cAZVHdCUhR708RinCFFmBI71wtxWzZsXsklJTxgfQuLFK2mHsJpMrtHzruPermKWoGnWmQ1p-JrJqLHbwnoj1ldbXWl1yD0owBZ9I6lABoVlcw3fOER3NcCV4P3VAfrBBAyNGimNwKm8PEKlOpub4SF1oGDO.40_Kc85TXkK6QSS7cDAATQ';
const JISR_COMPANY_SLUG = 'tam';
const BASE_URL = 'https://api.jisr.net/v2';

async function makeRequest(endpoint: string) {
  const url = `${BASE_URL}${endpoint}?slug=${JISR_COMPANY_SLUG}`;

  console.log(`\nRequesting: ${url}`);

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Cookie': `access_token=${JISR_ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'locale': 'en',
      'slug': JISR_COMPANY_SLUG,
    },
  });

  console.log(`Status: ${response.status} ${response.statusText}`);

  const text = await response.text();

  try {
    const json = JSON.parse(text);
    return json;
  } catch {
    return { raw: text };
  }
}

async function debug() {
  console.log('='.repeat(60));
  console.log('Jisr API Debug - Raw Responses');
  console.log('='.repeat(60));

  // Test different endpoints
  const endpoints = [
    '/employees/get_all',
    '/employees',
    '/departments',
    '/organizations/countries',
    '/job_titles/',
  ];

  for (const endpoint of endpoints) {
    console.log('\n' + '─'.repeat(60));
    console.log(`Testing: ${endpoint}`);
    console.log('─'.repeat(60));

    try {
      const result = await makeRequest(endpoint);
      console.log('Response:');
      console.log(JSON.stringify(result, null, 2).substring(0, 2000));
      if (JSON.stringify(result).length > 2000) {
        console.log('... (truncated)');
      }
    } catch (error) {
      console.log('Error:', error instanceof Error ? error.message : error);
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('Debug complete');
  console.log('='.repeat(60));
}

debug();
