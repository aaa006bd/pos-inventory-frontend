import { User, Tenant } from './db';

const JWT_SECRET = process.env.JWT_SECRET || 'inventory-secret-key-2024';

export interface TokenPayload {
  email: string;
  sub: number;
  role: string;
  tenantId: number;
  iat: number;
  exp: number;
}

function base64Encode(str: string): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let result = '';
  let i = 0;
  
  while (i < str.length) {
    const a = str.charCodeAt(i++);
    const b = i < str.length ? str.charCodeAt(i++) : 0;
    const c = i < str.length ? str.charCodeAt(i++) : 0;
    
    const triplet = (a << 16) | (b << 8) | c;
    
    result += chars[(triplet >> 18) & 0x3f];
    result += chars[(triplet >> 12) & 0x3f];
    result += i > str.length + 1 ? '=' : chars[(triplet >> 6) & 0x3f];
    result += i > str.length ? '=' : chars[triplet & 0x3f];
  }
  
  return result;
}

function base64Decode(str: string): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let result = '';
  let i = 0;
  
  str = str.replace(/=/g, '');
  
  while (i < str.length) {
    const a = chars.indexOf(str[i++]);
    const b = i < str.length ? chars.indexOf(str[i++]) : 0;
    const c = i < str.length ? chars.indexOf(str[i++]) : 0;
    const d = i < str.length ? chars.indexOf(str[i++]) : 0;
    
    const triplet = (a << 18) | (b << 12) | (c << 6) | d;
    
    result += String.fromCharCode((triplet >> 16) & 0xff);
    if (c !== -1) result += String.fromCharCode((triplet >> 8) & 0xff);
    if (d !== -1) result += String.fromCharCode(triplet & 0xff);
  }
  
  return result;
}

export function generateToken(user: User, tenant: Tenant): string {
  const header = { alg: 'HS256', typ: 'JWT' };
  const payload: Omit<TokenPayload, 'iat' | 'exp'> = {
    email: user.email,
    sub: user.id,
    role: user.role,
    tenantId: tenant.id,
  };
  
  const now = Math.floor(Date.now() / 1000);
  const fullPayload = {
    ...payload,
    iat: now,
    exp: now + (7 * 24 * 60 * 60),
  };
  
  const headerB64 = base64Encode(JSON.stringify(header));
  const payloadB64 = base64Encode(JSON.stringify(fullPayload));
  const signature = base64Encode(JWT_SECRET + '.' + headerB64 + '.' + payloadB64);
  
  return `${headerB64}.${payloadB64}.${signature}`;
}

export function verifyToken(token: string): TokenPayload | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    
    const [headerB64, payloadB64, signature] = parts;
    const expectedSignature = base64Encode(JWT_SECRET + '.' + headerB64 + '.' + payloadB64);
    
    if (signature !== expectedSignature) return null;
    
    const payload = JSON.parse(base64Decode(payloadB64)) as TokenPayload;
    
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;
    
    return payload;
  } catch {
    return null;
  }
}

export function hashPassword(password: string): string {
  return password;
}

export function verifyPassword(password: string, hash: string): boolean {
  return password === hash;
}
