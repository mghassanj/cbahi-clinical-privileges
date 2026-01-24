/**
 * Privilege Catalog Management API
 * Admin-only endpoints for managing the privilege catalog
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { z } from 'zod';
import { Prisma, PrivilegeCategory } from '@prisma/client';
import { logger } from '@/lib/logger';

// Validation schemas
const createPrivilegeSchema = z.object({
  code: z.string().min(1).max(20),
  nameEn: z.string().min(1).max(200),
  nameAr: z.string().min(1).max(200),
  category: z.enum([
    'CORE', 'RESTORATIVE', 'PEDIATRIC', 'ORTHODONTIC', 'ENDODONTIC',
    'PERIODONTIC', 'PROSTHODONTIC', 'ORAL_SURGERY', 'ORAL_MEDICINE',
    'DIAGNOSTIC', 'PREVENTIVE', 'IMPLANT', 'COSMETIC', 'OTHER'
  ]),
  description: z.string().optional(),
  requiresSpecialQualification: z.boolean().default(false),
  isActive: z.boolean().default(true),
});

/**
 * GET /api/admin/privileges
 * List all privileges with optional filtering
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check admin role
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });

    if (user?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const isActive = searchParams.get('isActive');
    const search = searchParams.get('search');

    const where: Prisma.PrivilegeWhereInput = {};

    if (category) {
      where.category = category as PrivilegeCategory;
    }

    if (isActive !== null) {
      where.isActive = isActive === 'true';
    }

    if (search) {
      where.OR = [
        { code: { contains: search, mode: 'insensitive' } },
        { nameEn: { contains: search, mode: 'insensitive' } },
        { nameAr: { contains: search, mode: 'insensitive' } },
      ];
    }

    const privileges = await prisma.privilege.findMany({
      where,
      orderBy: [{ category: 'asc' }, { code: 'asc' }],
    });

    // Get usage statistics
    const stats = await prisma.privilege.groupBy({
      by: ['category'],
      _count: { id: true },
    });

    return NextResponse.json({
      privileges,
      statistics: {
        total: privileges.length,
        active: privileges.filter(p => p.isActive).length,
        byCategory: stats.reduce((acc, s) => ({ ...acc, [s.category]: s._count.id }), {}),
      },
    });
  } catch (error) {
    logger.error('GET /api/admin/privileges error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/privileges
 * Create a new privilege
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check admin role
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });

    if (user?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const validated = createPrivilegeSchema.parse(body);

    // Check for duplicate code
    const existing = await prisma.privilege.findUnique({
      where: { code: validated.code },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'Privilege code already exists' },
        { status: 400 }
      );
    }

    const privilege = await prisma.privilege.create({
      data: validated,
    });

    return NextResponse.json(privilege, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.issues },
        { status: 400 }
      );
    }
    logger.error('POST /api/admin/privileges error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
