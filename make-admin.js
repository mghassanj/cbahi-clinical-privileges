const { PrismaClient, UserRole } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const email = 'hr@tamdental.sa';
  
  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true, nameEn: true, role: true }
  });
  
  if (!user) {
    console.log('❌ User not found:', email);
    return;
  }
  
  console.log('Found user:', user.nameEn, '| Current role:', user.role);
  
  if (user.role === 'ADMIN') {
    console.log('✅ User is already an ADMIN');
    return;
  }
  
  const updated = await prisma.user.update({
    where: { email },
    data: { role: UserRole.ADMIN },
    select: { id: true, email: true, nameEn: true, role: true }
  });
  
  console.log('✅ Updated to ADMIN:', updated.nameEn, '| New role:', updated.role);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
