import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { requireAuth, verifyWorkspaceMembership } from '@/lib/permissions/workspace';
import { createProjectSchema } from '@/lib/validation/schemas';

export async function GET(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const user = await requireAuth(supabase);

    const workspaceId = req.nextUrl.searchParams.get('workspaceId');
    if (!workspaceId) {
      return NextResponse.json({ error: 'workspaceId is required' }, { status: 400 });
    }

    await verifyWorkspaceMembership(supabase, workspaceId, user.id);

    const { data: projects, error } = await supabase
      .from('projects')
      .select('*')
      .eq('workspace_id', workspaceId)
      .is('archived_at', null)
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ projects });
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
    const parse = createProjectSchema.safeParse(body);

    if (!parse.success) {
      return NextResponse.json(
        { error: 'Invalid project payload', details: parse.error.flatten() },
        { status: 400 }
      );
    }

    const { workspaceId, name, description } = parse.data;
    await verifyWorkspaceMembership(supabase, workspaceId, user.id);

    const { data: project, error } = await supabase
      .from('projects')
      .insert({
        workspace_id: workspaceId,
        name,
        description: description || null,
        created_by: user.id,
      })
      .select('*')
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Automatically create a default general brainstorming room for the project
    await supabase.from('rooms').insert({
      project_id: project.id,
      name: 'General Brainstorm',
      created_by: user.id,
    });

    return NextResponse.json({ project }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Unauthorized' },
      { status: error.statusCode || 401 }
    );
  }
}
