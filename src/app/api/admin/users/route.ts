import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'FORBIDDEN', message: 'Acesso negado' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const includeDeleted = searchParams.get('includeDeleted') === 'true';

    const users = await prisma.user.findMany({
      where: includeDeleted ? undefined : { deletedAt: null },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        uniqueCode: true,
        name: true,
        phone: true,
        role: true,
        createdAt: true,
        deletedAt: true,
      },
    });

    return NextResponse.json(users);
  } catch (error) {
    console.error('[UsersAPI] Erro ao buscar usuários', error);
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: 'Erro ao buscar usuários' },
      { status: 500 },
    );
  }
}
