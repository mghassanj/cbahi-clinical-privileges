/**
 * Single Privilege Management API
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { z } from 'zod';
import { logger } from '@/lib/logger';

const updatePrivilegeSchema = z.object({
  code: z.string().min(1).max(20).optional(),
  nameEn: z.string().min(1).max(200).optional(),
  nameAr: z.string().min(1).max(200).optional(),
  category: z.enum([
    'CORE', 'RESTORATIVE', 'PEDIATRIC', 'ORTHODONTICS', 'ENDODONTICS',
    'PERIODONTICS', 'PROSTHODONTICS', 'ORAL_SURGERY', 'ORAL_MEDICINE',
    'RADIOLOGY', 'DIAGNOSTIC', 'PREVENTIVE', 'IMPLANT', 'COSMETIC', 'OTHER'
  ]).optional(),
  description: z.string().optional(),
  requiresSpecialQualification: z.boolean().optional(),
  isActive: z.boolean().optional(),
});

/**
 * GET /api/admin/privileges/[id]
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });

    if (user?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const privilege = await prisma.privilege.findUnique({
      where: { id },
      include: {
        _count: {
          select: { requestedPrivileges: true },
        },
      },
    });

    if (!privilege) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    return NextResponse.json(privilege);
  } catch (error) {
    logger.error('GET /api/admin/privileges/[id] error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/admin/privileges/[id]
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });

    if (user?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const validated = updatePrivilegeSchema.parse(body);

    // Check code uniqueness if changing
    if (validated.code) {
      const existing = await prisma.privilege.findFirst({
        where: { code: validated.code, id: { not: id } },
      });
      if (existing) {
        return NextResponse.json(
          { error: 'Privilege code already exists' },
          { status: 400 }
        );
      }
    }

    const privilege = await prisma.privilege.update({
      where: { id },
      data: validated,
    });

    return NextResponse.json(privilege);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.issues },
        { status: 400 }
      );
    }
    logger.error('PATCH /api/admin/privileges/[id] error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/privileges/[id]
 * Soft delete - sets isActive to false
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });

    if (user?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Check if privilege is in use
    const usageCount = await prisma.requestedPrivilege.count({
      where: { privilegeId: id },
    });

    if (usageCount > 0) {
      // Soft delete only
      await prisma.privilege.update({
        where: { id },
        data: { isActive: false },
      });
      return NextResponse.json({ message: 'Privilege deactivated (in use)' });
    }

    // Hard delete if not in use
    await prisma.privilege.delete({
      where: { id },
    });

    return NextResponse.json({ message: 'Privilege deleted' });
  } catch (error) {
    logger.error('DELETE /api/admin/privileges/[id] error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
