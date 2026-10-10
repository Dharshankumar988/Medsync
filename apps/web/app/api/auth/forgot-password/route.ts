import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { createPatientResetToken } from '@/lib/resetToken';
import { sendPatientPasswordResetEmail } from '@/lib/email';

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

    // 1. Verify user exists in the database
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

    // 2. Strictly verify that the user is ONLY a PATIENT
    const userRole = String(dbUser.role || '').toUpperCase();
    if (userRole !== 'PATIENT') {
      return NextResponse.json(
        { 
          error: `Email password reset is only available for Patient accounts. Healthcare providers (${userRole}) must contact administrative support.` 
        },
        { status: 403 }
      );
    }

    // Also get patient profile name if available
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
      // Non-critical, fallback to 'Patient'
    }

    // 3. Generate secure reset token
    const token = createPatientResetToken(dbUser.email);

    // 4. Determine origin dynamically (supporting localhost, custom domains, or reverse proxies)
    const host = req.headers.get('host') || 'localhost:3000';
    const proto = req.headers.get('x-forwarded-proto') || (host.includes('localhost') ? 'http' : 'https');
    const origin = req.headers.get('origin') || `${proto}://${host}`;

    const resetLink = `${origin}/reset-password?token=${encodeURIComponent(token)}&email=${encodeURIComponent(dbUser.email)}`;

    // 5. Send email using Nodemailer
    const emailResult = await sendPatientPasswordResetEmail({
      toEmail: dbUser.email,
      patientName,
      resetLink,
    });

    if (!emailResult.success) {
      return NextResponse.json(
        { error: emailResult.error || 'Failed to send password reset email via Nodemailer.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Password reset link sent successfully! Please check your email.',
      previewUrl: emailResult.previewUrl || null,
      devResetLink: process.env.NODE_ENV !== 'production' ? resetLink : undefined,
    });
  } catch (err: any) {
    console.error('[Forgot Password] Unexpected error:', err);
    return NextResponse.json(
      { error: err.message || 'An unexpected error occurred.' },
      { status: 500 }
    );
  }
}
