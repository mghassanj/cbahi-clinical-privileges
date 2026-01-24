/**
 * Test script for Jisr HR API connection
 * Run with: npx tsx scripts/test-jisr.ts
 */

import { JisrClient, JisrClientError } from '../src/lib/jisr';

const JISR_ACCESS_TOKEN = process.env.JISR_ACCESS_TOKEN || 'eyJhbGciOiJkaXIiLCJlbmMiOiJBMjU2R0NNIiwiemlwIjoiREVGIn0..Ga8-ySZ0y0aGlDUa.G1aea5V3GBFsxAcvWp4I4HbA7k93PbUTKE4bpOr_mOs5BFfCTRkTjiCOEoJ-tvQ2yMcslKFVNhuZMgIbgBXfcGRykWTpNDlYPIiq2-E3VGD8zpwG7CwkusW57DFVHB1DNE8ZgmFBw1_B3jahg1VfstGnweKBLcnqj17JliU60RddUDvF98ZrmtXjcXrEMfJ5wdTjd2AI_tpiJFHa367hfkJQjW4JpzQaTJMLab8xZkXKzswX1UQW32QVRC_AQmmGgFZJsPD2yWgmSxV1K7pWeRwDy1Q4ceCTkuy1kyAhlvKxcYtqTT-cxfFdFWhC4cSfQO-CZgdaqWHwXDo7BclLMXhYEnrwI2E5PSaNp5Rb2i_UGs0mHY20P_numlxx-kz-oPo5bootgOLhGn-sLVY8kP46I2Ux-Jx_jrxADePwAcZ2-zFKUJK-2BhZ0EtmDhZq8VURsb83gwnj03hx4g_nC7QXWy14rXX_Dc9Z_XBzHZoC8rj1lq6cR8mwBmFCOtch7tUSqHixkOJ1mYovxMi2eJO_9BkdEcfJ4PPzqooy-Lk2zTg5xibCUSZOaAlSeHbCMpbCJhv6KhD3bhgm_yBdQvcR1Xx2Knfdjcm-g1I3z5Vrzyksi9KElsl_4r8_Y5by6reaOxySlw0X2jY8re8P5KMiZMLsXx9e_ePt5iZ1oBmiutUZzcvuiktcQrtiDbj5cAZVHdCUhR708RinCFFmBI71wtxWzZsXsklJTxgfQuLFK2mHsJpMrtHzruPermKWoGnWmQ1p-JrJqLHbwnoj1ldbXWl1yD0owBZ9I6lABoVlcw3fOER3NcCV4P3VAfrBBAyNGimNwKm8PEKlOpub4SF1oGDO.40_Kc85TXkK6QSS7cDAATQ';
const JISR_COMPANY_SLUG = process.env.JISR_COMPANY_SLUG || 'tam';

async function testJisrConnection() {
  console.log('='.repeat(60));
  console.log('CBAHI - Jisr HR API Connection Test');
  console.log('='.repeat(60));
  console.log(`Company Slug: ${JISR_COMPANY_SLUG}`);
  console.log(`Token: ${JISR_ACCESS_TOKEN.substring(0, 50)}...`);
  console.log('');

  try {
    const client = new JisrClient({
      accessToken: JISR_ACCESS_TOKEN,
      companySlug: JISR_COMPANY_SLUG,
      locale: 'en',
    });

    // Test 1: Fetch Employees
    console.log('1. Fetching employees...');
    const employees = await client.getEmployees();
    console.log(`   ✅ Found ${employees.length} employees`);

    if (employees.length > 0) {
      console.log('');
      console.log('   First 5 employees:');
      console.log('   ' + '-'.repeat(56));
      employees.slice(0, 5).forEach((emp, i) => {
        console.log(`   ${i + 1}. ${emp.full_name} (${emp.full_name_ar || 'N/A'})`);
        console.log(`      ID: ${emp.id} | Employee #: ${emp.employee_number || 'N/A'}`);
        console.log(`      Email: ${emp.email || emp.work_email || 'N/A'}`);
        console.log(`      Department: ${emp.department_name || 'N/A'}`);
        console.log(`      Job Title: ${emp.job_title_name || 'N/A'}`);
        console.log(`      Status: ${emp.is_active ? 'Active' : 'Inactive'}`);
        console.log('');
      });

      // Test 2: Fetch first employee details
      const firstEmp = employees[0];
      console.log(`2. Fetching detailed info for employee ID ${firstEmp.id}...`);
      try {
        const details = await client.getEmployeeById(firstEmp.id);
        console.log(`   ✅ Retrieved details for ${details.full_name}`);
        console.log(`   Hire Date: ${details.hire_date || 'N/A'}`);
        console.log(`   Line Manager: ${details.line_manager_name || 'N/A'}`);
        console.log(`   Nationality: ${details.nationality_name || 'N/A'}`);
      } catch (error) {
        console.log(`   ⚠️ Could not fetch employee details: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    // Test 3: Fetch Departments
    console.log('');
    console.log('3. Fetching departments...');
    const departments = await client.getDepartments();
    console.log(`   ✅ Found ${departments.length} departments`);

    if (departments.length > 0) {
      console.log('');
      console.log('   Departments:');
      departments.slice(0, 10).forEach((dept, i) => {
        console.log(`   ${i + 1}. ${dept.name} ${dept.name_ar ? `(${dept.name_ar})` : ''}`);
        if (dept.manager_name) {
          console.log(`      Manager: ${dept.manager_name}`);
        }
        if (dept.employees_count) {
          console.log(`      Employees: ${dept.employees_count}`);
        }
      });
    }

    // Test 4: Fetch Locations
    console.log('');
    console.log('4. Fetching locations...');
    const locations = await client.getLocations();
    console.log(`   ✅ Found ${locations.length} locations`);

    if (locations.length > 0) {
      console.log('');
      console.log('   Locations:');
      locations.slice(0, 5).forEach((loc, i) => {
        console.log(`   ${i + 1}. ${loc.name} ${loc.name_ar ? `(${loc.name_ar})` : ''}`);
        console.log(`      Area: ${loc.area_name || 'N/A'} | Country: ${loc.country_name || 'N/A'}`);
      });
    }

    // Test 5: Fetch Job Titles
    console.log('');
    console.log('5. Fetching job titles...');
    const jobTitles = await client.getJobTitles();
    console.log(`   ✅ Found ${jobTitles.length} job titles`);

    if (jobTitles.length > 0) {
      console.log('');
      console.log('   First 10 job titles:');
      jobTitles.slice(0, 10).forEach((jt, i) => {
        console.log(`   ${i + 1}. ${jt.name} ${jt.name_ar ? `(${jt.name_ar})` : ''}`);
      });
    }

    console.log('');
    console.log('='.repeat(60));
    console.log('✅ All tests passed! Jisr API connection is working.');
    console.log('='.repeat(60));

  } catch (error) {
    console.log('');
    console.log('='.repeat(60));
    console.log('❌ Test failed!');
    console.log('='.repeat(60));

    if (error instanceof JisrClientError) {
      console.log(`Error: ${error.message}`);
      console.log(`Status: ${error.status || 'N/A'}`);
      console.log(`Code: ${error.code || 'N/A'}`);
      if (error.errors) {
        console.log('Details:', JSON.stringify(error.errors, null, 2));
      }
    } else if (error instanceof Error) {
      console.log(`Error: ${error.message}`);
      console.log(`Stack: ${error.stack}`);
    } else {
      console.log('Unknown error:', error);
    }

    process.exit(1);
  }
}

testJisrConnection();
