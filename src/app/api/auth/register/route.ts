import { prisma } from '@/lib/prisma';
import { hash } from 'bcryptjs';
import { NextRequest, NextResponse } from 'next/server';

import { z } from 'zod';

const RegisterSchema = z.object({
  name: z.string().min(2, 'Nome deve ter no mínimo 2 caracteres'),
  phone: z.string().min(1, 'Telefone é obrigatório'),
  password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
});

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.json();
    const parseResult = RegisterSchema.safeParse(rawBody);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Dados inválidos ou malformados', details: parseResult.error.format() },
        { status: 400 },
      );
    }

    const { name, phone, password } = parseResult.data;

    // Clean phone: remove non-digits and leading country code 55
    const cleanPhone = phone.replace(/\D/g, '').replace(/^55/, '');

    if (!cleanPhone) {
      return NextResponse.json({ error: 'Telefone inválido' }, { status: 400 });
    }

    // Check if phone already exists
    const existingUser = await prisma.user.findUnique({
      where: { phone: cleanPhone },
    });

    if (existingUser) {
      return NextResponse.json({ error: 'Este telefone já está cadastrado' }, { status: 409 });
    }

    // Generate unique code
    const userCount = await prisma.user.count();
    const uniqueCode = 'BS-' + String(userCount + 1).padStart(4, '0');

    // Hash password
    const passwordHash = await hash(password, 10);

    // Create user
    const user = await prisma.user.create({
      data: {
        name,
        phone: cleanPhone,
        passwordHash,
        uniqueCode,
        role: 'CLIENT',
      },
    });

    return NextResponse.json(
      {
        user: {
          id: user.id,
          uniqueCode: user.uniqueCode,
          name: user.name,
          phone: user.phone,
          role: user.role,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    console.error('Register error:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
