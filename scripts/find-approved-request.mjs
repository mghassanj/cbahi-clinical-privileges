import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const approvedRequest = await prisma.privilegeRequest.findFirst({
    where: { status: "APPROVED" },
    select: { id: true }
  });
  
  if (approvedRequest) {
    console.log(`FOUND_REQUEST_ID:${approvedRequest.id}`);
  } else {
    console.log("NO_APPROVED_REQUESTS_FOUND");
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
