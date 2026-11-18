import { NextRequest, NextResponse } from 'next/server';
import { getAuthorizedMemberByName } from '@/lib/auth/authorized-members';
import { DEFAULT_WORKSPACE_ID, DEFAULT_PROJECT_ID, DEFAULT_ROOM_ID } from '@/lib/store/workspace-store';

export async function POST(req: NextRequest) {
  try {
    const { name } = await req.json();

    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json(
        { error: 'Please enter your name to access TeamMind.' },
        { status: 400 }
      );
    }

    const member = getAuthorizedMemberByName(name);

    if (!member) {
      return NextResponse.json(
        {
          error:
            'Access restricted: Only authorized team members (Dana, Shivansh, Lial, Niya) can enter.',
        },
        { status: 403 }
      );
    }

    // Set cookie
    const response = NextResponse.json({
      success: true,
      member,
      redirectUrl: `/${DEFAULT_WORKSPACE_ID}/projects/${DEFAULT_PROJECT_ID}/rooms/${DEFAULT_ROOM_ID}`,
    });

    response.cookies.set('teammind_user', JSON.stringify(member), {
      path: '/',
      httpOnly: false, // Accessible to client for instant avatar/name sync
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });

    return response;
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Login failed' },
      { status: 500 }
    );
  }
}
