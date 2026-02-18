
// scripts/generate-prod-cert.ts
import { PrismaClient } from '@prisma/client';
import {
  createCertificateGenerator,
  RequestForCertificate,
} from '../src/lib/pdf/certificate-generator';
import { writeFileSync } from 'fs';
import { join } from 'path';

async function main() {
  const requestId = process.argv[2];
  if (!requestId) {
    console.error('Usage: ts-node scripts/generate-prod-cert.ts <request_id>');
    process.exit(1);
  }

  console.log(`Fetching data for request: ${requestId}...`);
  const prisma = new PrismaClient();

  try {
    await prisma.$connect();
    const privilegeRequest = await prisma.privilegeRequest.findUnique({
      where: { id: requestId },
      include: {
        applicant: {
          select: {
            id: true,
            nameEn: true,
            nameAr: true,
            employeeCode: true,
            scfhsNo: true,
            departmentEn: true,
            departmentAr: true,
            jobTitleEn: true,
            jobTitleAr: true,
          },
        },
        requestedPrivileges: {
          include: {
            privilege: {
              select: {
                id: true,
                code: true,
                nameEn: true,
                nameAr: true,
                category: true,
              },
            },
          },
        },
        approvals: {
          include: {
            approver: {
              select: {
                id: true,
                nameEn: true,
                nameAr: true,
                role: true,
                jobTitleEn: true,
                jobTitleAr: true,
              },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!privilegeRequest) {
      console.error(`Request with ID ${requestId} not found.`);
      return;
    }

    if (privilegeRequest.status !== 'APPROVED') {
      console.warn(`Request ${requestId} is not in APPROVED status (current: ${privilegeRequest.status}). Generating anyway for testing.`);
    }

    // Transform the data to match the RequestForCertificate type
    const requestData: RequestForCertificate = {
      id: privilegeRequest.id,
      type: privilegeRequest.type,
      requestType: privilegeRequest.requestType,
      hospitalCenter: privilegeRequest.hospitalCenter,
      status: privilegeRequest.status,
      createdAt: privilegeRequest.createdAt,
      completedAt: privilegeRequest.completedAt,
      applicant: {
        ...privilegeRequest.applicant,
        nameAr: '',
        departmentAr: '',
        jobTitleAr: '',
      },
      requestedPrivileges: privilegeRequest.requestedPrivileges.map((rp: any) => ({
        ...rp,
        privilege: {
          ...rp.privilege,
          nameAr: '',
        },
      })),
      approvals: privilegeRequest.approvals.map((a: any) => ({
        ...a,
        approver: {
          ...a.approver,
          nameAr: '',
          jobTitleAr: '',
        },
      })),
    };

    console.log('Generating certificate PDF...');
    const generator = createCertificateGenerator({ validityYears: 2 });
    const result = await generator.generateCertificate(requestData);

    if (result.success && result.pdfBuffer) {
      const outputPath = join('/tmp', `certificate-${requestId}.pdf`);
      writeFileSync(outputPath, result.pdfBuffer);
      console.log(`✅ Certificate successfully generated and saved to: ${outputPath}`);
      console.log(`   Certificate Number: ${result.certificateNumber}`);
    } else {
      console.error('❌ Certificate generation failed:', result.error);
    }
  } catch (error) {
    console.error('An error occurred:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
