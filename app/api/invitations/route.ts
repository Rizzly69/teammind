import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { requireAuth, verifyWorkspaceOwner } from '@/lib/permissions/workspace';
import { inviteMemberSchema } from '@/lib/validation/schemas';
import crypto from 'crypto';

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const user = await requireAuth(supabase);

    const body = await req.json();
    const parse = inviteMemberSchema.safeParse(body);

    if (!parse.success) {
      return NextResponse.json(
        { error: 'Invalid invitation payload', details: parse.error.flatten() },
        { status: 400 }
      );
    }

    const { workspaceId, email, role } = parse.data;

    // Only workspace owners can invite members
    await verifyWorkspaceOwner(supabase, workspaceId, user.id);

    // Generate unique invitation token
    const token = crypto.randomBytes(24).toString('hex');

    const { data: invitation, error } = await supabase
      .from('workspace_invitations')
      .insert({
        workspace_id: workspaceId,
        email,
        role,
        invited_by: user.id,
        token,
      })
      .select('*')
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const inviteLink = `${process.env.APP_URL || 'http://localhost:3000'}/invite/${token}`;

    return NextResponse.json({
      success: true,
      invitation: {
        ...invitation,
        inviteLink,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Unauthorized' },
      { status: error.statusCode || 401 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const user = await requireAuth(supabase);

    const { token } = await req.json();
    if (!token) {
      return NextResponse.json({ error: 'Missing invitation token' }, { status: 400 });
    }

    // Retrieve invitation
    const { data: invite, error: fetchErr } = await supabase
      .from('workspace_invitations')
      .select('*')
      .eq('token', token)
      .eq('status', 'pending')
      .single();

    if (fetchErr || !invite) {
      return NextResponse.json(
        { error: 'Invitation is invalid, expired, or has already been used.' },
        { status: 404 }
      );
    }

    // Check expiration
    if (new Date(invite.expires_at).getTime() < Date.now()) {
      return NextResponse.json({ error: 'Invitation has expired.' }, { status: 410 });
    }

    // Add user as member to workspace
    const { error: joinError } = await supabase.from('workspace_members').upsert({
      workspace_id: invite.workspace_id,
      user_id: user.id,
      role: invite.role,
    });

    if (joinError) {
      return NextResponse.json({ error: joinError.message }, { status: 500 });
    }

    // Mark invitation accepted
    await supabase
      .from('workspace_invitations')
      .update({ status: 'accepted' })
      .eq('id', invite.id);

    return NextResponse.json({
      success: true,
      workspaceId: invite.workspace_id,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Error processing invitation' },
      { status: error.statusCode || 500 }
    );
  }
}
