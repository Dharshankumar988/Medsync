import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { verifyPatientResetToken, consumePatientResetToken } from '@/lib/resetToken';
import axios from 'axios';

/**
 * GET: Verify token validity on page load (strict 5-minute timeout)
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get('token');
  const email = searchParams.get('email');

  if (!token) {
    return NextResponse.json({ valid: false, error: 'No password reset token provided.' }, { status: 400 });
  }

  // 1. Check with FastAPI Python backend first
  const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';
  const apiUrl = backendUrl.endsWith('/api/v1') ? backendUrl : `${backendUrl}/api/v1`;

  try {
    const backendRes = await axios.get(`${apiUrl}/auth/verify-patient-token`, {
      params: { token, email: email || undefined },
    });
    if (backendRes.data && backendRes.data.data) {
      return NextResponse.json({
        valid: true,
        email: backendRes.data.data.email,
        remaining_seconds: backendRes.data.data.remaining_seconds,
      });
    }
  } catch (backendErr: any) {
    if (backendErr.response) {
      const status = backendErr.response.status || 404;
      const errorDetail = backendErr.response.data?.detail || backendErr.response.data?.message;
      return NextResponse.json({ valid: false, error: errorDetail }, { status });
    }
  }

  // Fallback: Local cryptographic check
  const result = verifyPatientResetToken(token);
  if (!result.valid) {
    return NextResponse.json({ valid: false, error: result.error }, { status: 404 });
  }

  if (email && result.email?.toLowerCase() !== email.toLowerCase()) {
    return NextResponse.json({ valid: false, error: 'Token does not match provided email' }, { status: 400 });
  }

  return NextResponse.json({ valid: true, email: result.email });
}

/**
 * POST: Reset and update patient password (strict 5-minute timeout)
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

    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';
    const apiUrl = backendUrl.endsWith('/api/v1') ? backendUrl : `${backendUrl}/api/v1`;

    // 1. Try FastAPI Python backend endpoint
    try {
      const backendRes = await axios.post(`${apiUrl}/auth/patient-reset-password`, {
        token,
        email,
        password,
        confirm_password: confirmPassword,
      });

      consumePatientResetToken(token);

      return NextResponse.json({
        success: true,
        message: backendRes.data?.message || 'Your password has been reset successfully! You can now log in.',
      });
    } catch (backendErr: any) {
      if (backendErr.response && backendErr.response.status !== 500) {
        return NextResponse.json(
          { error: backendErr.response.data?.detail || backendErr.response.data?.message },
          { status: backendErr.response.status }
        );
      }
    }

    // 2. Fallback: Local verification and direct force-reset
    const verification = verifyPatientResetToken(token);
    if (!verification.valid || !verification.email) {
      return NextResponse.json(
        { error: verification.error || 'Password reset link has expired after 5 minutes.' },
        { status: 404 }
      );
    }

    const targetEmail = verification.email;
    if (email && targetEmail.toLowerCase() !== email.toLowerCase()) {
      return NextResponse.json(
        { error: 'Token does not match the provided email address.' },
        { status: 400 }
      );
    }

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

    await axios.post(`${apiUrl}/auth/force-reset-password`, {
      email: targetEmail,
      new_password: password,
    });

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
