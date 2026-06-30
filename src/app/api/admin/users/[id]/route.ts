import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { hash } from 'bcryptjs';

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'FORBIDDEN', message: 'Acesso negado' }, { status: 403 });
    }

    const { id } = await params;
    const data = await req.json();

    const updateData: any = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.phone !== undefined) updateData.phone = data.phone;
    if (data.role !== undefined) updateData.role = data.role;
    
    // Password reset
    if (data.resetPassword) {
      updateData.passwordHash = await hash('123456', 12);
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ success: true, user: updatedUser });
  } catch (error) {
    console.error('[UserPatchAPI] Erro', error);
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
      return NextResponse.json({ error: 'BAD_REQUEST', message: 'Não é possível excluir a própria conta' }, { status: 400 });
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
      });
      return NextResponse.json({ success: true, method: 'SOFT_DELETE' });
    }
  } catch (error) {
    console.error('[UserDeleteAPI] Erro', error);
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: 'Erro ao excluir usuário' },
      { status: 500 },
    );
  }
}
