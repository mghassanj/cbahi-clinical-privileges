-- AlterEnum: Add new values to PrivilegeCategory
-- Prisma needs this outside a transaction for PostgreSQL enum changes
ALTER TYPE "PrivilegeCategory" ADD VALUE IF NOT EXISTS 'ORTHODONTICS';
ALTER TYPE "PrivilegeCategory" ADD VALUE IF NOT EXISTS 'ENDODONTICS';
ALTER TYPE "PrivilegeCategory" ADD VALUE IF NOT EXISTS 'PERIODONTICS';
ALTER TYPE "PrivilegeCategory" ADD VALUE IF NOT EXISTS 'PROSTHODONTICS';
ALTER TYPE "PrivilegeCategory" ADD VALUE IF NOT EXISTS 'RADIOLOGY';
