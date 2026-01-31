/**
 * CBAHI Clinical Privileges - Database Seed
 * 
 * Seeds:
 * 1. Approval requirements per CBAHI/MOH guidelines
 * 2. Committee members from TAM Dental roster
 * 
 * Run with: npx prisma db seed
 */

import { PrismaClient, UserRole, PractitionerType, DentalSpecialty, PrivilegeRequestType } from '@prisma/client';

const prisma = new PrismaClient();

// ============================================================================
// APPROVAL REQUIREMENTS (per MOH documents)
// ============================================================================

const approvalRequirements = [
  // ========== GP (General Practitioner) ==========
  {
    privilegeType: PrivilegeRequestType.CORE,
    practitionerType: PractitionerType.GP,
    sameSpecialty: true,
    requiredConsultants: 0,
    requiresCommittee: false,
    requiresMedicalDirector: false,
    autoApprove: true,
    descriptionEn: 'Core privileges are automatically granted to all GPs',
    descriptionAr: 'الامتيازات الأساسية تُمنح تلقائياً لجميع أطباء الأسنان العامين',
  },
  {
    privilegeType: PrivilegeRequestType.NON_CORE,
    practitionerType: PractitionerType.GP,
    sameSpecialty: false, // GPs don't have a specialty, so non-core is always "different"
    requiredConsultants: 2,
    requiresCommittee: true,
    requiresMedicalDirector: true,
    autoApprove: false,
    descriptionEn: 'Non-core privileges for GPs require 2 consultant approvals + committee review',
    descriptionAr: 'الامتيازات غير الأساسية لأطباء الأسنان العامين تتطلب موافقة استشاريين + مراجعة اللجنة',
  },
  {
    privilegeType: PrivilegeRequestType.EXTRA,
    practitionerType: PractitionerType.GP,
    sameSpecialty: false,
    requiredConsultants: 2,
    requiresCommittee: true,
    requiresMedicalDirector: true,
    autoApprove: false,
    descriptionEn: 'Additional privileges for GPs require 2 consultant approvals + committee review',
    descriptionAr: 'الامتيازات الإضافية لأطباء الأسنان العامين تتطلب موافقة استشاريين + مراجعة اللجنة',
  },

  // ========== SPECIALIST ==========
  {
    privilegeType: PrivilegeRequestType.CORE,
    practitionerType: PractitionerType.SPECIALIST,
    sameSpecialty: true,
    requiredConsultants: 0,
    requiresCommittee: false,
    requiresMedicalDirector: false,
    autoApprove: true,
    descriptionEn: 'Core privileges are automatically granted to all Specialists',
    descriptionAr: 'الامتيازات الأساسية تُمنح تلقائياً لجميع الأخصائيين',
  },
  {
    privilegeType: PrivilegeRequestType.NON_CORE,
    practitionerType: PractitionerType.SPECIALIST,
    sameSpecialty: true, // Same specialty = 1 consultant
    requiredConsultants: 1,
    requiresCommittee: false,
    requiresMedicalDirector: true,
    autoApprove: false,
    descriptionEn: 'Non-core privileges in same specialty require 1 consultant approval',
    descriptionAr: 'الامتيازات غير الأساسية في نفس التخصص تتطلب موافقة استشاري واحد',
  },
  {
    privilegeType: PrivilegeRequestType.NON_CORE,
    practitionerType: PractitionerType.SPECIALIST,
    sameSpecialty: false, // Different specialty = 2 consultants + committee
    requiredConsultants: 2,
    requiresCommittee: true,
    requiresMedicalDirector: true,
    autoApprove: false,
    descriptionEn: 'Non-core privileges in different specialty require 2 consultant approvals + committee review',
    descriptionAr: 'الامتيازات غير الأساسية في تخصص مختلف تتطلب موافقة استشاريين + مراجعة اللجنة',
  },
  {
    privilegeType: PrivilegeRequestType.EXTRA,
    practitionerType: PractitionerType.SPECIALIST,
    sameSpecialty: false, // Additional always requires committee
    requiredConsultants: 2,
    requiresCommittee: true,
    requiresMedicalDirector: true,
    autoApprove: false,
    descriptionEn: 'Additional privileges require 2 consultant approvals + committee review',
    descriptionAr: 'الامتيازات الإضافية تتطلب موافقة استشاريين + مراجعة اللجنة',
  },

  // ========== CONSULTANT ==========
  {
    privilegeType: PrivilegeRequestType.CORE,
    practitionerType: PractitionerType.CONSULTANT,
    sameSpecialty: true,
    requiredConsultants: 0,
    requiresCommittee: false,
    requiresMedicalDirector: false,
    autoApprove: true,
    descriptionEn: 'Core privileges are automatically granted to all Consultants',
    descriptionAr: 'الامتيازات الأساسية تُمنح تلقائياً لجميع الاستشاريين',
  },
  {
    privilegeType: PrivilegeRequestType.NON_CORE,
    practitionerType: PractitionerType.CONSULTANT,
    sameSpecialty: true, // Same specialty = 1 consultant
    requiredConsultants: 1,
    requiresCommittee: false,
    requiresMedicalDirector: true,
    autoApprove: false,
    descriptionEn: 'Non-core privileges in same specialty require 1 consultant approval',
    descriptionAr: 'الامتيازات غير الأساسية في نفس التخصص تتطلب موافقة استشاري واحد',
  },
  {
    privilegeType: PrivilegeRequestType.NON_CORE,
    practitionerType: PractitionerType.CONSULTANT,
    sameSpecialty: false, // Different specialty = 2 consultants + committee
    requiredConsultants: 2,
    requiresCommittee: true,
    requiresMedicalDirector: true,
    autoApprove: false,
    descriptionEn: 'Non-core privileges in different specialty require 2 consultant approvals + committee review',
    descriptionAr: 'الامتيازات غير الأساسية في تخصص مختلف تتطلب موافقة استشاريين + مراجعة اللجنة',
  },
  {
    privilegeType: PrivilegeRequestType.EXTRA,
    practitionerType: PractitionerType.CONSULTANT,
    sameSpecialty: false, // Additional always requires committee
    requiredConsultants: 2,
    requiresCommittee: true,
    requiresMedicalDirector: true,
    autoApprove: false,
    descriptionEn: 'Additional privileges require 2 consultant approvals + committee review',
    descriptionAr: 'الامتيازات الإضافية تتطلب موافقة استشاريين + مراجعة اللجنة',
  },
];

// ============================================================================
// COMMITTEE MEMBERS (from TAM Dental roster)
// ============================================================================

interface CommitteeMember {
  email: string;
  nameEn: string;
  nameAr: string;
  specialty: DentalSpecialty;
  additionalSpecialties?: DentalSpecialty[];
  role: UserRole;
  isCommitteeMember: boolean;
  isCommitteeChair: boolean;
  canApprovePrivileges: boolean;
  practitionerType: PractitionerType;
}

const committeeMembers: CommitteeMember[] = [
  {
    email: "rayanhb@gmail.com",
    nameEn: "Dr. Rayan Bahbri",
    nameAr: "د.ريان باهبري",
    specialty: DentalSpecialty.ENDODONTICS,
    role: UserRole.MEDICAL_DIRECTOR,
    isCommitteeMember: true,
    isCommitteeChair: true,
    canApprovePrivileges: true,
    practitionerType: PractitionerType.CONSULTANT,
  },
  {
    email: "adhamniyazi@gmail.com",
    nameEn: "Dr. Adham Niazi",
    nameAr: "د.أدهم نيازي",
    specialty: DentalSpecialty.PROSTHODONTICS,
    role: UserRole.HEAD_OF_DEPT,
    isCommitteeMember: true,
    isCommitteeChair: false,
    canApprovePrivileges: true,
    practitionerType: PractitionerType.CONSULTANT,
  },
  {
    email: "ammar.asali@gmail.com",
    nameEn: "Dr. Ammar Asali",
    nameAr: "د.عمار عسلي",
    specialty: DentalSpecialty.PEDODONTICS,
    role: UserRole.COMMITTEE_MEMBER,
    isCommitteeMember: true,
    isCommitteeChair: false,
    canApprovePrivileges: true,
    practitionerType: PractitionerType.CONSULTANT,
  },
  {
    email: "r.mashat@gmail.com",
    nameEn: "Dr. Reem Al-Mashat",
    nameAr: "د.ريم المشاط",
    specialty: DentalSpecialty.PEDODONTICS,
    role: UserRole.COMMITTEE_MEMBER,
    isCommitteeMember: true,
    isCommitteeChair: false,
    canApprovePrivileges: true,
    practitionerType: PractitionerType.CONSULTANT,
  },
  {
    email: "drlindamirza2008@gmail.com",
    nameEn: "Dr. Linda Mirza",
    nameAr: "د.ليندا مرزا",
    specialty: DentalSpecialty.PEDODONTICS,
    role: UserRole.COMMITTEE_MEMBER,
    isCommitteeMember: true,
    isCommitteeChair: false,
    canApprovePrivileges: true,
    practitionerType: PractitionerType.CONSULTANT,
  },
  {
    email: "ghoneimsalma@gmail.com",
    nameEn: "Dr. Salma Ghoneim",
    nameAr: "د.سلمى غنيم",
    specialty: DentalSpecialty.ORTHODONTICS,
    role: UserRole.COMMITTEE_MEMBER,
    isCommitteeMember: true,
    isCommitteeChair: false,
    canApprovePrivileges: true,
    practitionerType: PractitionerType.CONSULTANT,
  },
  {
    email: "j_dareen@hotmail.com",
    nameEn: "Dr. Dareen Al-Jahni",
    nameAr: "د.دارين الجهني",
    specialty: DentalSpecialty.ORTHODONTICS,
    role: UserRole.COMMITTEE_MEMBER,
    isCommitteeMember: true,
    isCommitteeChair: false,
    canApprovePrivileges: true,
    practitionerType: PractitionerType.CONSULTANT,
  },
  {
    email: "obasri@gmail.com",
    nameEn: "Dr. Hamad Al-Qahtani",
    nameAr: "د.حمد القحطاني",
    specialty: DentalSpecialty.ORTHODONTICS,
    role: UserRole.COMMITTEE_MEMBER,
    isCommitteeMember: true,
    isCommitteeChair: false,
    canApprovePrivileges: true,
    practitionerType: PractitionerType.CONSULTANT,
  },
  {
    email: "dr.roaa.alshafei@gmail.com",
    nameEn: "Dr. Roaa Al-Shafei",
    nameAr: "د. رؤى الشافعي",
    specialty: DentalSpecialty.RESTORATIVE,
    role: UserRole.COMMITTEE_MEMBER,
    isCommitteeMember: true,
    isCommitteeChair: false,
    canApprovePrivileges: true,
    practitionerType: PractitionerType.CONSULTANT,
  },
  {
    email: "sisajini@kau.edu.sa",
    nameEn: "Dr. Sharah Sajini",
    nameAr: "د.شارة سجيني",
    specialty: DentalSpecialty.RESTORATIVE,
    role: UserRole.COMMITTEE_MEMBER,
    isCommitteeMember: true,
    isCommitteeChair: false,
    canApprovePrivileges: true,
    practitionerType: PractitionerType.CONSULTANT,
  },
  {
    email: "alharbi.mohammed@hotmail.com",
    nameEn: "Dr. Mohammed Al-Harbi",
    nameAr: "د. محمد الحربي",
    specialty: DentalSpecialty.ENDODONTICS,
    role: UserRole.COMMITTEE_MEMBER,
    isCommitteeMember: true,
    isCommitteeChair: false,
    canApprovePrivileges: true,
    practitionerType: PractitionerType.CONSULTANT,
  },
  {
    email: "yalnowailaty@kau.edu.sa",
    nameEn: "Dr. Yousef Al-Nowailaty",
    nameAr: "د.يوسف النويلاتي",
    specialty: DentalSpecialty.ENDODONTICS,
    role: UserRole.COMMITTEE_MEMBER,
    isCommitteeMember: true,
    isCommitteeChair: false,
    canApprovePrivileges: true,
    practitionerType: PractitionerType.CONSULTANT,
  },
  {
    email: "rayan.asali@gmail.com",
    nameEn: "Dr. Rayan Asali",
    nameAr: "د.ريان عسلي",
    specialty: DentalSpecialty.PROSTHODONTICS,
    role: UserRole.COMMITTEE_MEMBER,
    isCommitteeMember: true,
    isCommitteeChair: false,
    canApprovePrivileges: true,
    practitionerType: PractitionerType.CONSULTANT,
  },
  {
    email: "dr.badr.othman@gmail.com",
    nameEn: "Dr. Badr Othman",
    nameAr: "د. بدر عثمان",
    specialty: DentalSpecialty.PERIODONTICS,
    additionalSpecialties: [DentalSpecialty.PROSTHODONTICS, DentalSpecialty.IMPLANTS],
    role: UserRole.COMMITTEE_MEMBER,
    isCommitteeMember: true,
    isCommitteeChair: false,
    canApprovePrivileges: true,
    practitionerType: PractitionerType.CONSULTANT,
  },
  {
    email: "dr.reemo@live.com",
    nameEn: "Dr. Reem Al-Ali",
    nameAr: "د. ريم العلي",
    specialty: DentalSpecialty.PERIODONTICS,
    role: UserRole.COMMITTEE_MEMBER,
    isCommitteeMember: true,
    isCommitteeChair: false,
    canApprovePrivileges: true,
    practitionerType: PractitionerType.CONSULTANT,
  },
  {
    email: "mawardino80@yahoo.com",
    nameEn: "Dr. Hani Mawardi",
    nameAr: "د. هاني ماوردي",
    specialty: DentalSpecialty.PERIODONTICS,
    role: UserRole.COMMITTEE_MEMBER,
    isCommitteeMember: true,
    isCommitteeChair: false,
    canApprovePrivileges: true,
    practitionerType: PractitionerType.CONSULTANT,
  },
  {
    email: "dralghamdimy@gmail.com",
    nameEn: "Dr. Mohammed Al-Ghamdi",
    nameAr: "د.محمد الغامدي",
    specialty: DentalSpecialty.ORAL_SURGERY,
    additionalSpecialties: [DentalSpecialty.IMPLANTS],
    role: UserRole.COMMITTEE_MEMBER,
    isCommitteeMember: true,
    isCommitteeChair: false,
    canApprovePrivileges: true,
    practitionerType: PractitionerType.CONSULTANT,
  },
  {
    email: "basem.t.jamal@gmail.com",
    nameEn: "Dr. Basem Jamal",
    nameAr: "د. باسم جمال",
    specialty: DentalSpecialty.ORAL_SURGERY,
    additionalSpecialties: [DentalSpecialty.IMPLANTS],
    role: UserRole.COMMITTEE_MEMBER,
    isCommitteeMember: true,
    isCommitteeChair: false,
    canApprovePrivileges: true,
    practitionerType: PractitionerType.CONSULTANT,
  },
  {
    email: "mnadershah@gmail.com",
    nameEn: "Dr. Mohammed Nader Shah",
    nameAr: "د.محمد نادر شاه",
    specialty: DentalSpecialty.ORAL_SURGERY,
    role: UserRole.COMMITTEE_MEMBER,
    isCommitteeMember: true,
    isCommitteeChair: false,
    canApprovePrivileges: true,
    practitionerType: PractitionerType.CONSULTANT,
  },
  {
    email: "soha.albeirouti@gmail.com",
    nameEn: "Dr. Soha Al-Beirouti",
    nameAr: "د. سها البيروتي",
    specialty: DentalSpecialty.ADVANCED_GENERAL,
    role: UserRole.COMMITTEE_MEMBER,
    isCommitteeMember: true,
    isCommitteeChair: false,
    canApprovePrivileges: true,
    practitionerType: PractitionerType.CONSULTANT,
  },
];

// ============================================================================
// SEED FUNCTIONS
// ============================================================================

async function seedApprovalRequirements() {
  console.log('🌱 Seeding approval requirements...');

  for (const req of approvalRequirements) {
    await prisma.approvalRequirement.upsert({
      where: {
        privilegeType_practitionerType_sameSpecialty: {
          privilegeType: req.privilegeType,
          practitionerType: req.practitionerType,
          sameSpecialty: req.sameSpecialty,
        },
      },
      update: req,
      create: req,
    });
  }

  console.log(`✅ Seeded ${approvalRequirements.length} approval requirements`);
}

async function seedCommitteeMembers() {
  console.log('🌱 Updating committee members...');

  let updated = 0;
  let notFound = 0;

  for (const member of committeeMembers) {
    // Try to find existing user by email
    const existingUser = await prisma.user.findUnique({
      where: { email: member.email },
    });

    if (existingUser) {
      // Update existing user with committee info
      await prisma.user.update({
        where: { email: member.email },
        data: {
          role: member.role,
          practitionerType: member.practitionerType,
          specialty: member.specialty,
          additionalSpecialties: member.additionalSpecialties || [],
          isCommitteeMember: member.isCommitteeMember,
          isCommitteeChair: member.isCommitteeChair,
          canApprovePrivileges: member.canApprovePrivileges,
          // Also update names if they were missing
          nameAr: existingUser.nameAr || member.nameAr,
        },
      });
      console.log(`  ✅ Updated: ${member.nameEn}`);
      updated++;
    } else {
      console.log(`  ⚠️ Not found in Jisr sync: ${member.email} (${member.nameEn})`);
      notFound++;
    }
  }

  console.log(`✅ Committee members: ${updated} updated, ${notFound} not found`);
  
  if (notFound > 0) {
    console.log('\n⚠️ Note: Users not found need to be synced from Jisr first.');
    console.log('   Run the Jisr sync, then re-run this seed.');
  }
}

async function main() {
  console.log('🚀 CBAHI Clinical Privileges - Database Seed\n');
  console.log('=' .repeat(50));
  
  try {
    await seedApprovalRequirements();
    console.log('');
    await seedCommitteeMembers();
    
    console.log('\n' + '='.repeat(50));
    console.log('✅ Seed completed successfully!');
    
    // Print summary
    const approvalReqCount = await prisma.approvalRequirement.count();
    const committeeCount = await prisma.user.count({
      where: { isCommitteeMember: true },
    });
    
    console.log(`\n📊 Summary:`);
    console.log(`   - Approval Requirements: ${approvalReqCount}`);
    console.log(`   - Committee Members: ${committeeCount}`);
    
  } catch (error) {
    console.error('\n❌ Seed failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main();
