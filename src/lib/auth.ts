import { SignJWT, jwtVerify } from 'jose';
import bcrypt from 'bcryptjs';
import prisma from './prisma';
import { cookies } from 'next/headers';

const JWT_NAME = 'auth_token';
const JWT_ISSUER = 'web-ai-demo';
const JWT_AUDIENCE = 'web-ai-demo';
const JWT_EXPIRES = '7d';

function getSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET 未设置');
  return new TextEncoder().encode(secret);
}

export async function hashPassword(password: string) {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export async function createToken(payload: { sub: string; email: string }) {
  const token = await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setIssuer(JWT_ISSUER)
    .setAudience(JWT_AUDIENCE)
    .setExpirationTime(JWT_EXPIRES)
    .sign(getSecret());
  return token;
}

export async function readToken() {
  const cookieStore = await cookies();
  const token = cookieStore.get(JWT_NAME)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSecret(), { issuer: JWT_ISSUER, audience: JWT_AUDIENCE });
    return payload as { sub: string; email: string };
  } catch {
    return null;
  }
}

export async function setAuthCookie(token: string) {
  const cookieStore = await cookies();
  cookieStore.set(JWT_NAME, token, { httpOnly: true, sameSite: 'lax', path: '/', maxAge: 60 * 60 * 24 * 7 });
}

export async function clearAuthCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(JWT_NAME);
}

export async function requireUser() {
  const payload = await readToken();
  if (!payload) return null;
  const user = await prisma.user.findUnique({ where: { id: payload.sub } });
  return user;
}


