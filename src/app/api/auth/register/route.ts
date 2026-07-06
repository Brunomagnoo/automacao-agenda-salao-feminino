import { prisma } from '@/lib/prisma';
import { hash } from 'bcryptjs';
import { randomBytes } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const BRAZIL_PHONE_REGEX = /^([1-9]{1}[1-9]{1})(9\d{8}|\d{8})$/;

const RegisterSchema = z.object({
  name: z.string().min(2, 'Nome deve ter no mínimo 2 caracteres').max(100),
  phone: z
    .string()
    .transform((val) => val.replace(/\D/g, '').replace(/^55/, ''))
    .refine((digits) => BRAZIL_PHONE_REGEX.test(digits), {
      message: 'Número de celular inválido. Informe DDD + número (ex: 11987654321)',
    }),
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
    // `phone` is already cleaned and validated by the Zod schema transform

    // Check if phone already exists
    const existingUser = await prisma.user.findUnique({
      where: { phone },
    });

    if (existingUser) {
      return NextResponse.json({ error: 'Este telefone já está cadastrado' }, { status: 409 });
    }

    // Hash password
    const passwordHash = await hash(password, 10);

    // B-01 FIX: Create user first with a temporary unique code to avoid race condition.
    // Then update with a uniqueCode derived from the stable DB-generated cuid.
    const tempCode = `TEMP-${randomBytes(4).toString('hex')}`;
    const user = await prisma.user.create({
      data: {
        name,
        phone,
        passwordHash,
        uniqueCode: tempCode,
        role: 'CLIENT',
      },
    });

    // Derive stable uniqueCode from the cuid — no race condition possible
    const uniqueCode = `BS-${user.id.slice(-6).toUpperCase()}`;
    await prisma.user.update({
      where: { id: user.id },
      data: { uniqueCode },
    });

    return NextResponse.json(
      {
        user: {
          id: user.id,
          uniqueCode,
          name: user.name,
          phone: user.phone,
          role: user.role,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    console.error('[Register] Erro:', error instanceof Error ? error.message : '');
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
