import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { verifyPatientResetToken, consumePatientResetToken } from '@/lib/resetToken';
import axios from 'axios';

/**
 * GET: Verify token validity on page load
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get('token');
  const email = searchParams.get('email');

  if (!token) {
    return NextResponse.json({ valid: false, error: 'No token provided' }, { status: 400 });
  }

  const result = verifyPatientResetToken(token);
  if (!result.valid) {
    return NextResponse.json({ valid: false, error: result.error }, { status: 400 });
  }

  if (email && result.email?.toLowerCase() !== email.toLowerCase()) {
    return NextResponse.json({ valid: false, error: 'Token does not match provided email' }, { status: 400 });
  }

  return NextResponse.json({ valid: true, email: result.email });
}

/**
 * POST: Reset and update patient password
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { token, email, password, confirmPassword } = body;

    if (!token) {
      return NextResponse.json(
        { error: 'Password reset token is required.' },
        { status: 400 }
      );
    }

    if (!password || password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters long.' },
        { status: 400 }
      );
    }

    if (password !== confirmPassword) {
      return NextResponse.json(
        { error: 'Passwords do not match.' },
        { status: 400 }
      );
    }

    // 1. Verify token authenticity, expiration, and role
    const verification = verifyPatientResetToken(token);
    if (!verification.valid || !verification.email) {
      return NextResponse.json(
        { error: verification.error || 'Invalid or expired password reset link.' },
        { status: 400 }
      );
    }

    const targetEmail = verification.email;
    if (email && targetEmail.toLowerCase() !== email.toLowerCase()) {
      return NextResponse.json(
        { error: 'Token does not match the provided email address.' },
        { status: 400 }
      );
    }

    // 2. Re-verify user in DB to ensure role is PATIENT
    const { data: dbUser } = await supabase
      .from('users')
      .select('id, email, role')
      .ilike('email', targetEmail)
      .maybeSingle();

    if (!dbUser || String(dbUser.role || '').toUpperCase() !== 'PATIENT') {
      return NextResponse.json(
        { error: 'Password reset via this link is only allowed for Patient accounts.' },
        { status: 403 }
      );
    }

    // 3. Update password in auth.users via backend service
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';
    const apiUrl = backendUrl.endsWith('/api/v1') ? backendUrl : `${backendUrl}/api/v1`;

    try {
      await axios.post(`${apiUrl}/auth/force-reset-password`, {
        email: targetEmail,
        new_password: password,
      });
    } catch (backendErr: any) {
      console.error('[Reset Password] Backend update failed:', backendErr.response?.data || backendErr.message);
      return NextResponse.json(
        { error: backendErr.response?.data?.detail || 'Failed to update account password. Please try again.' },
        { status: 500 }
      );
    }

    // 4. Mark token as consumed so it cannot be used again
    consumePatientResetToken(token);

    return NextResponse.json({
      success: true,
      message: 'Your password has been reset successfully! You can now log in.',
    });
  } catch (err: any) {
    console.error('[Reset Password] Unexpected error:', err);
    return NextResponse.json(
      { error: err.message || 'An unexpected error occurred while resetting password.' },
      { status: 500 }
    );
  }
}
