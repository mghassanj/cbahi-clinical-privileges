const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const email = 'hr@tamdental.sa';
  
  console.log('Checking for user:', email);
  
  const user = await prisma.user.findUnique({ 
    where: { email },
    select: { id: true, email: true, name: true, role: true }
  });
  
  if (user) {
    console.log('✅ User found:', JSON.stringify(user, null, 2));
  } else {
    console.log('❌ User NOT found in database');
    
    // List similar emails
    const similar = await prisma.user.findMany({
      where: { email: { contains: 'tamdental' } },
      select: { email: true, name: true }
    });
    if (similar.length > 0) {
      console.log('Similar emails found:', JSON.stringify(similar, null, 2));
    }
  }
  
  const count = await prisma.user.count();
  console.log('Total users in database:', count);
  
  // Show first 5 users
  const sample = await prisma.user.findMany({ 
    take: 5, 
    select: { email: true, name: true, role: true } 
  });
  console.log('Sample users:', JSON.stringify(sample, null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
