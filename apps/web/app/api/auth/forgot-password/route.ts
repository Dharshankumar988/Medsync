import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { createPatientResetToken } from '@/lib/resetToken';
import { sendPatientPasswordResetEmail } from '@/lib/email';
import axios from 'axios';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const email = body?.email?.trim()?.toLowerCase();

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { error: 'Please provide a valid email address.' },
        { status: 400 }
      );
    }

    // Try FastAPI Python backend first for Python SMTP authorized handling
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';
    const apiUrl = backendUrl.endsWith('/api/v1') ? backendUrl : `${backendUrl}/api/v1`;

    try {
      const backendRes = await axios.post(`${apiUrl}/auth/forgot-password`, { email });
      if (backendRes.data && backendRes.data.data) {
        const payload = backendRes.data.data;
        return NextResponse.json({
          success: true,
          action: payload.action,
          role: payload.role,
          redirectUrl: payload.redirect_url,
          message: payload.message,
          previewUrl: payload.preview_url || null,
          devResetLink: payload.preview_url || undefined,
        });
      }
    } catch (backendErr: any) {
      if (backendErr.response) {
        // Backend actively returned an error (e.g. 403 Forbidden for Admin or 404 Not Found)
        const errorDetail = backendErr.response.data?.detail || backendErr.response.data?.message;
        const statusCode = backendErr.response.status || 400;
        return NextResponse.json(
          { error: errorDetail || 'Unable to process request.' },
          { status: statusCode }
        );
      }
      // If backend network error/unreachable, continue with local fallback handler
      console.warn('[Forgot Password] Backend service unreachable, using local Next.js auth logic:', backendErr.message);
    }

    // Fallback: Verify user exists in the Supabase database
    const { data: dbUser, error: queryError } = await supabase
      .from('users')
      .select('id, email, role, status')
      .ilike('email', email)
      .maybeSingle();

    if (queryError) {
      console.error('[Forgot Password] Database query error:', queryError);
      return NextResponse.json(
        { error: 'Unable to process request. Please try again later.' },
        { status: 500 }
      );
    }

    if (!dbUser) {
      return NextResponse.json(
        { error: 'No account registered with this email address.' },
        { status: 404 }
      );
    }

    const userRole = String(dbUser.role || '').toUpperCase();

    // 1. Admin Role -> Strictly Denied
    if (userRole === 'ADMIN') {
      return NextResponse.json(
        { 
          error: 'Password reset is not permitted for Administrator accounts. Please contact system security.' 
        },
        { status: 403 }
      );
    }

    // 2. Doctor or Pharmacy Role -> Direct redirect to provider reset password page (always up)
    if (userRole === 'DOCTOR' || userRole === 'PHARMACY' || userRole === 'HOSPITAL') {
      return NextResponse.json({
        success: true,
        action: 'REDIRECT',
        role: userRole,
        redirectUrl: `/provider-reset-password?email=${encodeURIComponent(dbUser.email)}`,
        message: `Redirecting ${userRole.toLowerCase()} to provider password reset...`,
      });
    }

    // 3. Patient Role -> Generate 5-minute token and send email
    if (userRole === 'PATIENT') {
      let patientName = 'Patient';
      try {
        const { data: patientProfile } = await supabase
          .from('patients')
          .select('full_name')
          .eq('user_id', dbUser.id)
          .maybeSingle();
        if (patientProfile?.full_name) {
          patientName = patientProfile.full_name;
        }
      } catch {
        // Fallback to 'Patient'
      }

      // Generate secure reset token (5-minute expiration)
      const token = createPatientResetToken(dbUser.email);

      const host = req.headers.get('host') || 'localhost:3000';
      const proto = req.headers.get('x-forwarded-proto') || (host.includes('localhost') ? 'http' : 'https');
      const origin = req.headers.get('origin') || `${proto}://${host}`;

      const resetLink = `${origin}/patient/reset-password?token=${encodeURIComponent(token)}&email=${encodeURIComponent(dbUser.email)}`;

      const emailResult = await sendPatientPasswordResetEmail({
        toEmail: dbUser.email,
        patientName,
        resetLink,
      });

      if (!emailResult.success) {
        return NextResponse.json(
          { error: emailResult.error || 'Failed to send password reset email via SMTP.' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        action: 'EMAIL_SENT',
        role: 'PATIENT',
        message: 'Password reset link sent successfully! Please check your email.',
        previewUrl: emailResult.previewUrl || null,
        devResetLink: process.env.NODE_ENV !== 'production' ? resetLink : undefined,
      });
    }

    return NextResponse.json(
      { error: 'Unsupported account role for password reset.' },
      { status: 400 }
    );
  } catch (err: any) {
    console.error('[Forgot Password] Unexpected error:', err);
    return NextResponse.json(
      { error: err.message || 'An unexpected error occurred.' },
      { status: 500 }
    );
  }
}
