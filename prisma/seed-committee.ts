/**
 * CBAHI Clinical Privileges - Committee Member Seed
 * 
 * Seeds the privileges committee members from TAM Dental roster
 * Run with: npx prisma db seed
 */

import { PrismaClient, UserRole, UserStatus } from '@prisma/client';

const prisma = new PrismaClient();

const committeeMembers = [
  {
    email: "rayanhb@gmail.com",
    nameEn: "Dr. Rayan Bahbri",
    nameAr: "د.ريان باهبري",
    specialty: "Endodontics",
    role: UserRole.MEDICAL_DIRECTOR,
    isCommitteeMember: true,
    isChair: true,
  },
  {
    email: "adhamniyazi@gmail.com",
    nameEn: "Dr. Adham Niazi",
    nameAr: "د.أدهم نيازي",
    specialty: "Prosthodontics",
    role: UserRole.HEAD_OF_DEPT,
    isCommitteeMember: true,
  },
  {
    email: "ammar.asali@gmail.com",
    nameEn: "Dr. Ammar Asali",
    nameAr: "د.عمار عسلي",
    specialty: "Pedodontics",
    role: UserRole.COMMITTEE_MEMBER,
    isCommitteeMember: true,
  },
  {
    email: "r.mashat@gmail.com",
    nameEn: "Dr. Reem Al-Mashat",
    nameAr: "د.ريم المشاط",
    specialty: "Pedodontics",
    role: UserRole.COMMITTEE_MEMBER,
    isCommitteeMember: true,
  },
  {
    email: "drlindamirza2008@gmail.com",
    nameEn: "Dr. Linda Mirza",
    nameAr: "د.ليندا مرزا",
    specialty: "Pedodontics",
    role: UserRole.COMMITTEE_MEMBER,
    isCommitteeMember: true,
  },
  {
    email: "ghoneimsalma@gmail.com",
    nameEn: "Dr. Salma Ghoneim",
    nameAr: "د.سلمى غنيم",
    specialty: "Orthodontics",
    role: UserRole.COMMITTEE_MEMBER,
    isCommitteeMember: true,
  },
  {
    email: "j_dareen@hotmail.com",
    nameEn: "Dr. Dareen Al-Jahni",
    nameAr: "د.دارين الجهني",
    specialty: "Orthodontics",
    role: UserRole.COMMITTEE_MEMBER,
    isCommitteeMember: true,
  },
  {
    email: "obasri@gmail.com",
    nameEn: "Dr. Hamad Al-Qahtani",
    nameAr: "د.حمد القحطاني",
    specialty: "Orthodontics",
    role: UserRole.COMMITTEE_MEMBER,
    isCommitteeMember: true,
  },
  {
    email: "dr.roaa.alshafei@gmail.com",
    nameEn: "Dr. Roaa Al-Shafei",
    nameAr: "د. رؤى الشافعي",
    specialty: "Restorative",
    role: UserRole.COMMITTEE_MEMBER,
    isCommitteeMember: true,
  },
  {
    email: "sisajini@kau.edu.sa",
    nameEn: "Dr. Sharah Sajini",
    nameAr: "د.شارة سجيني",
    specialty: "Restorative",
    role: UserRole.COMMITTEE_MEMBER,
    isCommitteeMember: true,
  },
  {
    email: "alharbi.mohammed@hotmail.com",
    nameEn: "Dr. Mohammed Al-Harbi",
    nameAr: "د. محمد الحربي",
    specialty: "Endodontics",
    role: UserRole.COMMITTEE_MEMBER,
    isCommitteeMember: true,
  },
  {
    email: "yalnowailaty@kau.edu.sa",
    nameEn: "Dr. Yousef Al-Nowailaty",
    nameAr: "د.يوسف النويلاتي",
    specialty: "Endodontics",
    role: UserRole.COMMITTEE_MEMBER,
    isCommitteeMember: true,
  },
  {
    email: "rayan.asali@gmail.com",
    nameEn: "Dr. Rayan Asali",
    nameAr: "د.ريان عسلي",
    specialty: "Prosthodontics",
    role: UserRole.COMMITTEE_MEMBER,
    isCommitteeMember: true,
  },
  {
    email: "dr.badr.othman@gmail.com",
    nameEn: "Dr. Badr Othman",
    nameAr: "د. بدر عثمان",
    specialty: "Periodontics",
    role: UserRole.COMMITTEE_MEMBER,
    isCommitteeMember: true,
    additionalSpecialties: ["Prosthodontics", "Implants"],
  },
  {
    email: "dr.reemo@live.com",
    nameEn: "Dr. Reem Al-Ali",
    nameAr: "د. ريم العلي",
    specialty: "Periodontics",
    role: UserRole.COMMITTEE_MEMBER,
    isCommitteeMember: true,
  },
  {
    email: "mawardino80@yahoo.com",
    nameEn: "Dr. Hani Mawardi",
    nameAr: "د. هاني ماوردي",
    specialty: "Periodontics",
    role: UserRole.COMMITTEE_MEMBER,
    isCommitteeMember: true,
  },
  {
    email: "dralghamdimy@gmail.com",
    nameEn: "Dr. Mohammed Al-Ghamdi",
    nameAr: "د.محمد الغامدي",
    specialty: "Oral Surgery",
    role: UserRole.COMMITTEE_MEMBER,
    isCommitteeMember: true,
    additionalSpecialties: ["Implants Surgical"],
  },
  {
    email: "basem.t.jamal@gmail.com",
    nameEn: "Dr. Basem Jamal",
    nameAr: "د. باسم جمال",
    specialty: "Oral Surgery",
    role: UserRole.COMMITTEE_MEMBER,
    isCommitteeMember: true,
    additionalSpecialties: ["Implants Surgical"],
  },
  {
    email: "mnadershah@gmail.com",
    nameEn: "Dr. Mohammed Nader Shah",
    nameAr: "د.محمد نادر شاه",
    specialty: "Oral Surgery",
    role: UserRole.COMMITTEE_MEMBER,
    isCommitteeMember: true,
  },
  {
    email: "soha.albeirouti@gmail.com",
    nameEn: "Dr. Soha Al-Beirouti",
    nameAr: "د. سها البيروتي",
    specialty: "Advanced General Dentistry",
    role: UserRole.COMMITTEE_MEMBER,
    isCommitteeMember: true,
  },
];

async function seedCommitteeMembers() {
  console.log('🌱 Seeding committee members...');

  for (const member of committeeMembers) {
    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: member.email },
    });

    if (existingUser) {
      // Update existing user with committee role
      await prisma.user.update({
        where: { email: member.email },
        data: {
          role: member.role,
          // Note: specialty and isCommitteeMember fields need to be added to schema
        },
      });
      console.log(`✅ Updated: ${member.nameEn} (${member.email})`);
    } else {
      console.log(`⚠️ User not found in Jisr sync: ${member.email}`);
      // Optionally create a placeholder user
      // This would require a jisrEmployeeId which we don't have
    }
  }

  console.log('✅ Committee members seeded successfully!');
}

// Approval requirements based on document
const approvalRequirements = [
  // GP - Core
  { practitionerType: 'GP', privilegeType: 'CORE', sameSpecialty: true, requiredConsultants: 0, requiresCommittee: false, autoApprove: true },
  // GP - Non-Core Different Specialty
  { practitionerType: 'GP', privilegeType: 'NON_CORE', sameSpecialty: false, requiredConsultants: 2, requiresCommittee: true, autoApprove: false },
  // GP - Additional
  { practitionerType: 'GP', privilegeType: 'EXTRA', sameSpecialty: false, requiredConsultants: 2, requiresCommittee: true, autoApprove: false },
  
  // Specialist/Consultant - Core
  { practitionerType: 'SPECIALIST', privilegeType: 'CORE', sameSpecialty: true, requiredConsultants: 0, requiresCommittee: false, autoApprove: true },
  // Specialist/Consultant - Non-Core Same Specialty
  { practitionerType: 'SPECIALIST', privilegeType: 'NON_CORE', sameSpecialty: true, requiredConsultants: 1, requiresCommittee: false, autoApprove: false },
  // Specialist/Consultant - Non-Core Different Specialty
  { practitionerType: 'SPECIALIST', privilegeType: 'NON_CORE', sameSpecialty: false, requiredConsultants: 2, requiresCommittee: true, autoApprove: false },
  // Specialist/Consultant - Additional
  { practitionerType: 'SPECIALIST', privilegeType: 'EXTRA', sameSpecialty: false, requiredConsultants: 2, requiresCommittee: true, autoApprove: false },
];

async function main() {
  try {
    await seedCommitteeMembers();
    console.log('\n📋 Approval Requirements (for reference):');
    console.table(approvalRequirements);
  } catch (error) {
    console.error('Error seeding:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main();
