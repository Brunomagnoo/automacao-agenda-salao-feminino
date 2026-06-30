import { createToken } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { compare } from 'bcryptjs';
import { NextRequest, NextResponse } from 'next/server';

import { z } from 'zod';

const LoginSchema = z.object({
  phone: z.string().min(1, 'Telefone é obrigatório'),
  password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
});

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.json();
    const parseResult = LoginSchema.safeParse(rawBody);

    if (!parseResult.success) {
      return NextResponse.json({ error: 'Dados inválidos ou malformados' }, { status: 400 });
    }

    const { phone, password } = parseResult.data;

    // Clean phone: remove non-digits and leading country code 55
    const cleanPhone = phone.replace(/\D/g, '').replace(/^55/, '');

    if (!cleanPhone) {
      return NextResponse.json({ error: 'Telefone inválido' }, { status: 400 });
    }

    // Find user by phone
    const user = await prisma.user.findUnique({
      where: { phone: cleanPhone },
    });

    if (!user || user.deletedAt) {
      return NextResponse.json({ error: 'Telefone ou senha incorretos' }, { status: 401 });
    }

    // Validate password
    const isValid = await compare(password, user.passwordHash);

    if (!isValid) {
      return NextResponse.json({ error: 'Telefone ou senha incorretos' }, { status: 401 });
    }

    // Create JWT token
    const token = await createToken({
      userId: user.id,
      role: user.role as 'CLIENT' | 'ADMIN',
      uniqueCode: user.uniqueCode,
    });

    // Build response with user data
    const response = NextResponse.json({
      user: {
        id: user.id,
        uniqueCode: user.uniqueCode,
        name: user.name,
        phone: user.phone,
        role: user.role,
      },
    });

    // Set httpOnly cookie
    response.cookies.set('beauty-salon-token', token, {
      httpOnly: true,
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
    });

    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
