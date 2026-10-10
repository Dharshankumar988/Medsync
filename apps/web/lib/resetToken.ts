import crypto from 'node:crypto';

// In-memory set of consumed token nonces to prevent token reuse
const consumedNonces = new Set<string>();

const TOKEN_SECRET = 
  process.env.JWT_SECRET_KEY || 
  process.env.SUPABASE_JWT_SECRET || 
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 
  'medsync-patient-reset-secret-key-2026';

export interface TokenPayload {
  email: string;
  role: 'PATIENT';
  exp: number; // Unix timestamp in ms
  nonce: string;
}

/**
 * Creates a cryptographically signed password reset token for a patient.
 * Expiration: 1 hour (3600 seconds).
 */
export function createPatientResetToken(email: string): string {
  const payload: TokenPayload = {
    email: email.trim().toLowerCase(),
    role: 'PATIENT',
    exp: Date.now() + 60 * 60 * 1000, // 1 hour
    nonce: crypto.randomBytes(16).toString('hex'),
  };

  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto
    .createHmac('sha256', TOKEN_SECRET)
    .update(payloadB64)
    .digest('base64url');

  return `${payloadB64}.${signature}`;
}

/**
 * Validates a patient password reset token.
 * Verifies HMAC signature, role === 'PATIENT', expiration, and non-reuse.
 */
export function verifyPatientResetToken(token: string): {
  valid: boolean;
  email?: string;
  error?: string;
} {
  if (!token || !token.includes('.')) {
    return { valid: false, error: 'Malformed or missing reset token.' };
  }

  const [payloadB64, signature] = token.split('.');
  if (!payloadB64 || !signature) {
    return { valid: false, error: 'Invalid reset token format.' };
  }

  const expectedSignature = crypto
    .createHmac('sha256', TOKEN_SECRET)
    .update(payloadB64)
    .digest('base64url');

  if (signature !== expectedSignature) {
    return { valid: false, error: 'Invalid token signature or token has been tampered with.' };
  }

  try {
    const payload: TokenPayload = JSON.parse(
      Buffer.from(payloadB64, 'base64url').toString('utf-8')
    );

    if (payload.role !== 'PATIENT') {
      return { valid: false, error: 'Password reset is only authorized for Patient accounts.' };
    }

    if (Date.now() > payload.exp) {
      return { valid: false, error: 'Password reset link has expired. Please request a new link.' };
    }

    if (consumedNonces.has(payload.nonce)) {
      return { valid: false, error: 'This password reset link has already been used.' };
    }

    return { valid: true, email: payload.email };
  } catch (err) {
    return { valid: false, error: 'Failed to decode reset token.' };
  }
}

/**
 * Marks a token's nonce as consumed so it cannot be used a second time.
 */
export function consumePatientResetToken(token: string): boolean {
  try {
    const [payloadB64] = token.split('.');
    const payload: TokenPayload = JSON.parse(
      Buffer.from(payloadB64, 'base64url').toString('utf-8')
    );
    consumedNonces.add(payload.nonce);
    return true;
  } catch {
    return false;
  }
}
