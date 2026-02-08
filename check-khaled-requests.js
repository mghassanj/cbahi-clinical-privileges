const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasourceUrl: process.env.DATABASE_URL,
});

async function main() {
  console.log('🔍 Checking Khaled\'s requests...\n');
  
  // Find users named Khaled
  const users = await prisma.user.findMany({
    where: {
      OR: [
        { nameEn: { contains: 'Khaled', mode: 'insensitive' } },
        { nameAr: { contains: 'خالد' } },
      ],
    },
    select: {
      id: true,
      nameEn: true,
      nameAr: true,
      email: true,
    },
  });
  
  console.log(`Found ${users.length} user(s) named Khaled:`);
  users.forEach(u => console.log(`  - ${u.nameEn} (${u.nameAr}) - ${u.email}`));
  
  if (users.length === 0) {
    console.log('\nNo users found.');
    return;
  }
  
  // Get requests for these users
  for (const user of users) {
    console.log(`\n${'='.repeat(80)}`);
    console.log(`Requests for: ${user.nameEn} (${user.nameAr})`);
    console.log('='.repeat(80));
    
    const requests = await prisma.privilegeRequest.findMany({
      where: { applicantId: user.id },
      include: {
        approvals: {
          include: {
            approver: {
              select: {
                nameEn: true,
                nameAr: true,
                role: true,
              },
            },
          },
          orderBy: { level: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    
    if (requests.length === 0) {
      console.log('  No requests found.');
      continue;
    }
    
    requests.forEach((req, idx) => {
      console.log(`\n${idx + 1}. Request ID: ${req.id}`);
      console.log(`   Status: ${req.status}`);
      console.log(`   Type: ${req.requestType}`);
      console.log(`   Created: ${req.createdAt.toISOString()}`);
      console.log(`   Completed: ${req.completedAt?.toISOString() || 'Not completed'}`);
      console.log(`   Approvals (${req.approvals.length}):`);
      
      if (req.approvals.length === 0) {
        console.log('     (none)');
      } else {
        req.approvals.forEach(a => {
          console.log(`     - Level ${a.level}: ${a.status} by ${a.approver.nameEn} (${a.approver.role})`);
          if (a.approvedAt) console.log(`       Approved at: ${a.approvedAt.toISOString()}`);
          if (a.comments) console.log(`       Comments: ${a.comments}`);
        });
      }
      
      // Check certificate eligibility
      const isApproved = req.status === 'APPROVED';
      const hasApproval = req.approvals.some(a => a.status === 'APPROVED');
      console.log(`\n   Certificate Section Shows: ${isApproved ? 'YES' : 'NO'} (status === APPROVED)`);
      console.log(`   Certificate Eligible: ${hasApproval ? 'YES' : 'NO'} (has >= 1 approval)`);
      
      if (isApproved && !hasApproval) {
        console.log('   ⚠️  BUG: Status is APPROVED but no approvals exist!');
      }
      if (!isApproved && hasApproval) {
        console.log('   ⚠️  ISSUE: Has approvals but status is not APPROVED');
      }
    });
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
