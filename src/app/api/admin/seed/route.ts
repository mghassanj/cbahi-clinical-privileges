/**
 * CBAHI Admin Seed API
 * 
 * POST /api/admin/seed - Seeds approval requirements and committee members
 * Protected by ADMIN_SECRET environment variable
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { 
  UserRole, 
  PractitionerType, 
  DentalSpecialty, 
  PrivilegeRequestType,
  PrivilegeCategory,
} from "@prisma/client";
import { dentalPrivileges } from "@/data/privileges";
import { PrivilegeCategory as TSPrivilegeCategory } from "@/data/privileges";

// ============================================================================
// Approval Requirements (per CBAHI/MOH documents)
// ============================================================================

const approvalRequirements = [
  // GP - Core
  { privilegeType: PrivilegeRequestType.CORE, practitionerType: PractitionerType.GP, sameSpecialty: true, requiredConsultants: 0, requiresCommittee: false, requiresMedicalDirector: false, autoApprove: true, descriptionEn: 'Core privileges auto-approved for GPs', descriptionAr: 'الامتيازات الأساسية تُمنح تلقائياً' },
  // GP - Non-Core
  { privilegeType: PrivilegeRequestType.NON_CORE, practitionerType: PractitionerType.GP, sameSpecialty: false, requiredConsultants: 2, requiresCommittee: true, requiresMedicalDirector: true, autoApprove: false, descriptionEn: 'Non-core for GPs: 2 consultants + committee', descriptionAr: 'غير أساسية للأطباء: استشاريين + لجنة' },
  // GP - Extra
  { privilegeType: PrivilegeRequestType.EXTRA, practitionerType: PractitionerType.GP, sameSpecialty: false, requiredConsultants: 2, requiresCommittee: true, requiresMedicalDirector: true, autoApprove: false, descriptionEn: 'Additional for GPs: 2 consultants + committee', descriptionAr: 'إضافية للأطباء: استشاريين + لجنة' },
  
  // Specialist - Core
  { privilegeType: PrivilegeRequestType.CORE, practitionerType: PractitionerType.SPECIALIST, sameSpecialty: true, requiredConsultants: 0, requiresCommittee: false, requiresMedicalDirector: false, autoApprove: true, descriptionEn: 'Core privileges auto-approved', descriptionAr: 'الامتيازات الأساسية تُمنح تلقائياً' },
  // Specialist - Non-Core Same
  { privilegeType: PrivilegeRequestType.NON_CORE, practitionerType: PractitionerType.SPECIALIST, sameSpecialty: true, requiredConsultants: 1, requiresCommittee: false, requiresMedicalDirector: true, autoApprove: false, descriptionEn: 'Non-core same specialty: 1 consultant', descriptionAr: 'غير أساسية نفس التخصص: استشاري واحد' },
  // Specialist - Non-Core Different
  { privilegeType: PrivilegeRequestType.NON_CORE, practitionerType: PractitionerType.SPECIALIST, sameSpecialty: false, requiredConsultants: 2, requiresCommittee: true, requiresMedicalDirector: true, autoApprove: false, descriptionEn: 'Non-core different specialty: 2 consultants + committee', descriptionAr: 'غير أساسية تخصص مختلف: استشاريين + لجنة' },
  // Specialist - Extra
  { privilegeType: PrivilegeRequestType.EXTRA, practitionerType: PractitionerType.SPECIALIST, sameSpecialty: false, requiredConsultants: 2, requiresCommittee: true, requiresMedicalDirector: true, autoApprove: false, descriptionEn: 'Additional: 2 consultants + committee', descriptionAr: 'إضافية: استشاريين + لجنة' },
  
  // Consultant - Core
  { privilegeType: PrivilegeRequestType.CORE, practitionerType: PractitionerType.CONSULTANT, sameSpecialty: true, requiredConsultants: 0, requiresCommittee: false, requiresMedicalDirector: false, autoApprove: true, descriptionEn: 'Core privileges auto-approved', descriptionAr: 'الامتيازات الأساسية تُمنح تلقائياً' },
  // Consultant - Non-Core Same
  { privilegeType: PrivilegeRequestType.NON_CORE, practitionerType: PractitionerType.CONSULTANT, sameSpecialty: true, requiredConsultants: 1, requiresCommittee: false, requiresMedicalDirector: true, autoApprove: false, descriptionEn: 'Non-core same specialty: 1 consultant', descriptionAr: 'غير أساسية نفس التخصص: استشاري واحد' },
  // Consultant - Non-Core Different
  { privilegeType: PrivilegeRequestType.NON_CORE, practitionerType: PractitionerType.CONSULTANT, sameSpecialty: false, requiredConsultants: 2, requiresCommittee: true, requiresMedicalDirector: true, autoApprove: false, descriptionEn: 'Non-core different specialty: 2 consultants + committee', descriptionAr: 'غير أساسية تخصص مختلف: استشاريين + لجنة' },
  // Consultant - Extra
  { privilegeType: PrivilegeRequestType.EXTRA, practitionerType: PractitionerType.CONSULTANT, sameSpecialty: false, requiredConsultants: 2, requiresCommittee: true, requiresMedicalDirector: true, autoApprove: false, descriptionEn: 'Additional: 2 consultants + committee', descriptionAr: 'إضافية: استشاريين + لجنة' },
];

// ============================================================================
// Committee Members (from TAM Dental roster)
// ============================================================================

const committeeMembers = [
  { email: "rayanhb@gmail.com", nameEn: "Dr. Rayan Bahbri", nameAr: "د.ريان باهبري", specialty: DentalSpecialty.ENDODONTICS, role: UserRole.MEDICAL_DIRECTOR, isChair: true },
  { email: "adhamniyazi@gmail.com", nameEn: "Dr. Adham Niazi", nameAr: "د.أدهم نيازي", specialty: DentalSpecialty.PROSTHODONTICS, role: UserRole.HEAD_OF_DEPT, isChair: false },
  { email: "ammar.asali@gmail.com", nameEn: "Dr. Ammar Asali", nameAr: "د.عمار عسلي", specialty: DentalSpecialty.PEDODONTICS, role: UserRole.COMMITTEE_MEMBER, isChair: false },
  { email: "r.mashat@gmail.com", nameEn: "Dr. Reem Al-Mashat", nameAr: "د.ريم المشاط", specialty: DentalSpecialty.PEDODONTICS, role: UserRole.COMMITTEE_MEMBER, isChair: false },
  { email: "drlindamirza2008@gmail.com", nameEn: "Dr. Linda Mirza", nameAr: "د.ليندا مرزا", specialty: DentalSpecialty.PEDODONTICS, role: UserRole.COMMITTEE_MEMBER, isChair: false },
  { email: "ghoneimsalma@gmail.com", nameEn: "Dr. Salma Ghoneim", nameAr: "د.سلمى غنيم", specialty: DentalSpecialty.ORTHODONTICS, role: UserRole.COMMITTEE_MEMBER, isChair: false },
  { email: "j_dareen@hotmail.com", nameEn: "Dr. Dareen Al-Jahni", nameAr: "د.دارين الجهني", specialty: DentalSpecialty.ORTHODONTICS, role: UserRole.COMMITTEE_MEMBER, isChair: false },
  { email: "obasri@gmail.com", nameEn: "Dr. Hamad Al-Qahtani", nameAr: "د.حمد القحطاني", specialty: DentalSpecialty.ORTHODONTICS, role: UserRole.COMMITTEE_MEMBER, isChair: false },
  { email: "dr.roaa.alshafei@gmail.com", nameEn: "Dr. Roaa Al-Shafei", nameAr: "د. رؤى الشافعي", specialty: DentalSpecialty.RESTORATIVE, role: UserRole.COMMITTEE_MEMBER, isChair: false },
  { email: "sisajini@kau.edu.sa", nameEn: "Dr. Sharah Sajini", nameAr: "د.شارة سجيني", specialty: DentalSpecialty.RESTORATIVE, role: UserRole.COMMITTEE_MEMBER, isChair: false },
  { email: "alharbi.mohammed@hotmail.com", nameEn: "Dr. Mohammed Al-Harbi", nameAr: "د. محمد الحربي", specialty: DentalSpecialty.ENDODONTICS, role: UserRole.COMMITTEE_MEMBER, isChair: false },
  { email: "yalnowailaty@kau.edu.sa", nameEn: "Dr. Yousef Al-Nowailaty", nameAr: "د.يوسف النويلاتي", specialty: DentalSpecialty.ENDODONTICS, role: UserRole.COMMITTEE_MEMBER, isChair: false },
  { email: "rayan.asali@gmail.com", nameEn: "Dr. Rayan Asali", nameAr: "د.ريان عسلي", specialty: DentalSpecialty.PROSTHODONTICS, role: UserRole.COMMITTEE_MEMBER, isChair: false },
  { email: "dr.badr.othman@gmail.com", nameEn: "Dr. Badr Othman", nameAr: "د. بدر عثمان", specialty: DentalSpecialty.PERIODONTICS, role: UserRole.COMMITTEE_MEMBER, isChair: false },
  { email: "dr.reemo@live.com", nameEn: "Dr. Reem Al-Ali", nameAr: "د. ريم العلي", specialty: DentalSpecialty.PERIODONTICS, role: UserRole.COMMITTEE_MEMBER, isChair: false },
  { email: "mawardino80@yahoo.com", nameEn: "Dr. Hani Mawardi", nameAr: "د. هاني ماوردي", specialty: DentalSpecialty.PERIODONTICS, role: UserRole.COMMITTEE_MEMBER, isChair: false },
  { email: "dralghamdimy@gmail.com", nameEn: "Dr. Mohammed Al-Ghamdi", nameAr: "د.محمد الغامدي", specialty: DentalSpecialty.ORAL_SURGERY, role: UserRole.COMMITTEE_MEMBER, isChair: false },
  { email: "basem.t.jamal@gmail.com", nameEn: "Dr. Basem Jamal", nameAr: "د. باسم جمال", specialty: DentalSpecialty.ORAL_SURGERY, role: UserRole.COMMITTEE_MEMBER, isChair: false },
  { email: "mnadershah@gmail.com", nameEn: "Dr. Mohammed Nader Shah", nameAr: "د.محمد نادر شاه", specialty: DentalSpecialty.ORAL_SURGERY, role: UserRole.COMMITTEE_MEMBER, isChair: false },
  { email: "soha.albeirouti@gmail.com", nameEn: "Dr. Soha Al-Beirouti", nameAr: "د. سها البيروتي", specialty: DentalSpecialty.ADVANCED_GENERAL, role: UserRole.COMMITTEE_MEMBER, isChair: false },
];

// ============================================================================
// POST Handler
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    // Check admin secret
    const authHeader = request.headers.get("authorization");
    const adminSecret = process.env.ADMIN_SECRET;
    
    if (adminSecret && authHeader !== `Bearer ${adminSecret}`) {
      return NextResponse.json(
        { error: "Unauthorized", message: "Invalid admin secret" },
        { status: 401 }
      );
    }

    const results = {
      privileges: { created: 0, updated: 0 },
      approvalRequirements: { created: 0, updated: 0 },
      committeeMembers: { updated: 0, notFound: 0, notFoundEmails: [] as string[] },
    };

    // 0. Seed privilege catalog from dentalPrivileges
    const categoryMap: Record<string, PrivilegeCategory> = {
      [TSPrivilegeCategory.CORE]: PrivilegeCategory.CORE,
      [TSPrivilegeCategory.RESTORATIVE]: PrivilegeCategory.RESTORATIVE,
      [TSPrivilegeCategory.PEDIATRIC]: PrivilegeCategory.PEDIATRIC,
      [TSPrivilegeCategory.ORTHODONTICS]: PrivilegeCategory.ORTHODONTICS,
      [TSPrivilegeCategory.ENDODONTICS]: PrivilegeCategory.ENDODONTICS,
      [TSPrivilegeCategory.PERIODONTICS]: PrivilegeCategory.PERIODONTICS,
      [TSPrivilegeCategory.PROSTHODONTICS]: PrivilegeCategory.PROSTHODONTICS,
      [TSPrivilegeCategory.ORAL_SURGERY]: PrivilegeCategory.ORAL_SURGERY,
      [TSPrivilegeCategory.ORAL_MEDICINE]: PrivilegeCategory.ORAL_MEDICINE,
      [TSPrivilegeCategory.RADIOLOGY]: PrivilegeCategory.RADIOLOGY,
    };

    for (const priv of dentalPrivileges) {
      const prismaCategory = categoryMap[priv.category] || PrivilegeCategory.OTHER;
      const isCore = priv.category === TSPrivilegeCategory.CORE;
      
      const existing = await prisma.privilege.findUnique({
        where: { code: priv.code },
      });

      if (existing) {
        await prisma.privilege.update({
          where: { code: priv.code },
          data: {
            nameEn: priv.nameEn,
            nameAr: priv.nameAr,
            category: prismaCategory,
            requiresSpecialQualification: priv.requiresSpecialQualification,
            description: priv.description,
            isCore,
            isActive: true,
          },
        });
        results.privileges.updated++;
      } else {
        await prisma.privilege.create({
          data: {
            code: priv.code,
            nameEn: priv.nameEn,
            nameAr: priv.nameAr,
            category: prismaCategory,
            requiresSpecialQualification: priv.requiresSpecialQualification,
            description: priv.description,
            isCore,
            isActive: true,
          },
        });
        results.privileges.created++;
      }
    }

    // 1. Seed approval requirements
    for (const req of approvalRequirements) {
      try {
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
        results.approvalRequirements.created++;
      } catch {
        results.approvalRequirements.updated++;
      }
    }

    // 2. Update committee members
    for (const member of committeeMembers) {
      const existingUser = await prisma.user.findUnique({
        where: { email: member.email },
      });

      if (existingUser) {
        await prisma.user.update({
          where: { email: member.email },
          data: {
            role: member.role,
            practitionerType: PractitionerType.CONSULTANT,
            specialty: member.specialty,
            isCommitteeMember: true,
            isCommitteeChair: member.isChair,
            canApprovePrivileges: true,
            nameAr: existingUser.nameAr || member.nameAr,
          },
        });
        results.committeeMembers.updated++;
      } else {
        results.committeeMembers.notFound++;
        results.committeeMembers.notFoundEmails.push(member.email);
      }
    }

    return NextResponse.json({
      success: true,
      message: "Seed completed successfully",
      results,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Seed error:", error);
    return NextResponse.json(
      { 
        error: "Seed failed", 
        message: error instanceof Error ? error.message : "Unknown error" 
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: "POST to this endpoint to run seed",
    required: "Authorization: Bearer <ADMIN_SECRET>",
  });
}
