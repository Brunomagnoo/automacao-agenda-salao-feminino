// ============================================
// Authentication Utilities - Beauty Salon
// ============================================

import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';

if (!process.env.JWT_SECRET) {
  throw new Error('CRITICAL: JWT_SECRET environment variable is not set.');
}
const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET);

const TOKEN_NAME = 'beauty-salon-token';

export interface JWTPayload {
  userId: string;
  role: 'CLIENT' | 'ADMIN';
  uniqueCode: string;
}

/**
 * Creates a JWT token for authenticated users
 */
export async function createToken(payload: JWTPayload): Promise<string> {
  return await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(JWT_SECRET);
}

/**
 * Verifies and decodes a JWT token
 */
export async function verifyToken(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as unknown as JWTPayload;
  } catch {
    return null;
  }
}

/**
 * Gets the current authenticated user from cookies (Server Components)
 */
export async function getCurrentUser(): Promise<JWTPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(TOKEN_NAME)?.value;
  if (!token) return null;
  return verifyToken(token);
}

/**
 * Token cookie name for client-side usage
 */
export const TOKEN_COOKIE_NAME = TOKEN_NAME;
