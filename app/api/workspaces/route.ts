import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { requireAuth } from '@/lib/permissions/workspace';
import { createWorkspaceSchema } from '@/lib/validation/schemas';

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();
    const user = await requireAuth(supabase);

    // Get all workspaces the user is a member of
    const { data: memberships, error } = await supabase
      .from('workspace_members')
      .select('role, joined_at, workspaces (id, name, created_by, created_at, updated_at)')
      .eq('user_id', user.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const workspaces = (memberships || [])
      .map((m: any) => ({
        ...m.workspaces,
        role: m.role,
        joined_at: m.joined_at,
      }))
      .filter((w) => !!w && !!w.id);

    return NextResponse.json({ workspaces });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Unauthorized' },
      { status: error.statusCode || 401 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const user = await requireAuth(supabase);

    const body = await req.json();
    const parse = createWorkspaceSchema.safeParse(body);

    if (!parse.success) {
      return NextResponse.json(
        { error: 'Invalid workspace parameters', details: parse.error.flatten() },
        { status: 400 }
      );
    }

    const { name } = parse.data;

    // 1. Insert workspace
    const { data: workspace, error: wsError } = await supabase
      .from('workspaces')
      .insert({
        name,
        created_by: user.id,
      })
      .select('*')
      .single();

    if (wsError || !workspace) {
      return NextResponse.json(
        { error: wsError?.message || 'Failed to create workspace' },
        { status: 500 }
      );
    }

    // 2. Add creator as workspace owner
    const { error: memberError } = await supabase.from('workspace_members').insert({
      workspace_id: workspace.id,
      user_id: user.id,
      role: 'owner',
    });

    if (memberError) {
      return NextResponse.json(
        { error: memberError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ workspace: { ...workspace, role: 'owner' } }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Unauthorized' },
      { status: error.statusCode || 401 }
    );
  }
}
