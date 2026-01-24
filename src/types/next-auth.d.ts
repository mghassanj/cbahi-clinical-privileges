/**
 * CBAHI NextAuth Type Declarations
 *
 * Extends NextAuth's default types to include our custom user fields
 */

import { UserRole, UserStatus } from "@prisma/client";
import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  /**
   * Extended Session interface with custom user fields
   */
  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      nameAr?: string | null;
      photoUrl?: string | null;
      role: UserRole;
      status: UserStatus;
      departmentId?: number | null;
      departmentEn?: string | null;
      departmentAr?: string | null;
      jobTitleEn?: string | null;
      jobTitleAr?: string | null;
      jisrEmployeeId: number;
      isActive: boolean;
    };
  }

  /**
   * Extended User interface for NextAuth callbacks
   */
  interface User {
    id: string;
    email: string;
    name: string;
    nameAr?: string | null;
    photoUrl?: string | null;
    role: UserRole;
    status: UserStatus;
    departmentId?: number | null;
    departmentEn?: string | null;
    departmentAr?: string | null;
    jobTitleEn?: string | null;
    jobTitleAr?: string | null;
    jisrEmployeeId: number;
    isActive: boolean;
  }
}

declare module "next-auth/jwt" {
  /**
   * Extended JWT interface with custom user fields
   */
  interface JWT {
    id: string;
    email: string;
    name: string;
    nameAr?: string | null;
    photoUrl?: string | null;
    role: UserRole;
    status: UserStatus;
    departmentId?: number | null;
    departmentEn?: string | null;
    departmentAr?: string | null;
    jobTitleEn?: string | null;
    jobTitleAr?: string | null;
    jisrEmployeeId: number;
    isActive: boolean;
  }
}
