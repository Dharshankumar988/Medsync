import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import axios from 'axios';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password, confirmPassword } = body;

    const targetEmail = email?.trim()?.toLowerCase();

    if (!targetEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(targetEmail)) {
      return NextResponse.json(
        { error: 'Please provide a valid email address.' },
        { status: 400 }
      );
    }

    if (!password || password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters long.' },
        { status: 400 }
      );
    }

    if (confirmPassword && password !== confirmPassword) {
      return NextResponse.json(
        { error: 'Passwords do not match.' },
        { status: 400 }
      );
    }

    // Forward to FastAPI Python backend
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';
    const apiUrl = backendUrl.endsWith('/api/v1') ? backendUrl : `${backendUrl}/api/v1`;

    try {
      const response = await axios.post(`${apiUrl}/auth/provider-reset-password`, {
        email: targetEmail,
        new_password: password,
        confirm_password: confirmPassword,
      });

      return NextResponse.json({
        success: true,
        message: response.data?.message || 'Password reset successfully! You can now log in.',
      });
    } catch (backendErr: any) {
      if (backendErr.response) {
        return NextResponse.json(
          { error: backendErr.response.data?.detail || backendErr.response.data?.message },
          { status: backendErr.response.status }
        );
      }
    }

    // Fallback: Verify role in database directly
    const { data: dbUser } = await supabase
      .from('users')
      .select('id, email, role')
      .ilike('email', targetEmail)
      .maybeSingle();

    if (!dbUser) {
      return NextResponse.json(
        { error: 'No account found with this email address.' },
        { status: 404 }
      );
    }

    const userRole = String(dbUser.role || '').toUpperCase();
    if (userRole === 'ADMIN') {
      return NextResponse.json(
        { error: 'Password reset is not permitted for Administrator accounts.' },
        { status: 403 }
      );
    }

    if (userRole === 'PATIENT') {
      return NextResponse.json(
        { error: 'Patient accounts must use the verified 5-minute email reset link. Direct reset is disallowed.' },
        { status: 403 }
      );
    }

    // Force reset via backend force-reset endpoint
    await axios.post(`${apiUrl}/auth/force-reset-password`, {
      email: targetEmail,
      new_password: password,
    });

    return NextResponse.json({
      success: true,
      message: `${userRole.charAt(0) + userRole.slice(1).toLowerCase()} password has been updated successfully! You can now log in.`,
    });
  } catch (err: any) {
    console.error('[Provider Reset Password] Error:', err);
    return NextResponse.json(
      { error: err.message || 'An unexpected error occurred while resetting password.' },
      { status: 500 }
    );
  }
}
