import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { hash } from 'bcryptjs';
import { randomBytes } from 'crypto';
import { NextResponse } from 'next/server';
import { z } from 'zod';

const BRAZIL_PHONE_REGEX = /^([1-9]{1}[1-9]{1})(9\d{8}|\d{8})$/;

const PatchUserSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  phone: z
    .string()
    .transform((val) => val.replace(/\D/g, '').replace(/^55/, ''))
    .refine((d) => BRAZIL_PHONE_REGEX.test(d), { message: 'Número de celular inválido' })
    .optional(),
  role: z.enum(['CLIENT', 'ADMIN']).optional(),
  resetPassword: z.boolean().optional(),
});

const USER_SAFE_SELECT = {
  id: true,
  uniqueCode: true,
  name: true,
  phone: true,
  role: true,
  createdAt: true,
  deletedAt: true,
} as const;

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'FORBIDDEN', message: 'Acesso negado' }, { status: 403 });
    }

    const { id } = await params;
    const rawBody = await req.json();
    const parseResult = PatchUserSchema.safeParse(rawBody);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'BAD_REQUEST', message: 'Dados inválidos', details: parseResult.error.format() },
        { status: 400 },
      );
    }

    const { name, phone, role, resetPassword } = parseResult.data;

    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name;
    if (phone !== undefined) updateData.phone = phone;
    if (role !== undefined) updateData.role = role;

    // Password reset: generate a secure random temporary password
    let tempPassword: string | undefined;
    if (resetPassword) {
      tempPassword = randomBytes(8).toString('hex'); // e.g. "a3f9c2b1d4e5f678"
      updateData.passwordHash = await hash(tempPassword, 12);
    }

    // Use explicit select to NEVER return passwordHash
    const updatedUser = await prisma.user.update({
      where: { id },
      data: updateData,
      select: USER_SAFE_SELECT,
    });

    return NextResponse.json({
      success: true,
      user: updatedUser,
      ...(tempPassword ? { tempPassword } : {}),
    });
  } catch (error) {
    console.error('[UserPatchAPI] Erro', error instanceof Error ? error.message : '');
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: 'Erro ao atualizar usuário' },
      { status: 500 },
    );
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'FORBIDDEN', message: 'Acesso negado' }, { status: 403 });
    }

    const { id } = await params;

    // Prevent self-deletion
    if (user.userId === id) {
      return NextResponse.json(
        { error: 'BAD_REQUEST', message: 'Não é possível excluir a própria conta' },
        { status: 400 },
      );
    }

    const { searchParams } = new URL(req.url);
    const hardDelete = searchParams.get('hardDelete') === 'true';

    if (hardDelete) {
      // Hard delete: delete all appointments first, then the user
      await prisma.$transaction([
        prisma.appointment.deleteMany({ where: { userId: id } }),
        prisma.user.delete({ where: { id } }),
      ]);
      return NextResponse.json({ success: true, method: 'HARD_DELETE' });
    } else {
      // Soft delete: just set deletedAt
      await prisma.user.update({
        where: { id },
        data: { deletedAt: new Date() },
        select: { id: true },
      });
      return NextResponse.json({ success: true, method: 'SOFT_DELETE' });
    }
  } catch (error) {
    console.error('[UserDeleteAPI] Erro', error instanceof Error ? error.message : '');
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: 'Erro ao excluir usuário' },
      { status: 500 },
    );
  }
}
