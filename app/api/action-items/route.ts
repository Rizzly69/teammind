import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { requireAuth, verifyProjectAccess } from '@/lib/permissions/workspace';
import { createActionItemSchema, updateActionItemStatusSchema } from '@/lib/validation/schemas';

export async function GET(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const user = await requireAuth(supabase);

    const projectId = req.nextUrl.searchParams.get('projectId');
    if (!projectId) {
      return NextResponse.json({ error: 'projectId is required' }, { status: 400 });
    }

    await verifyProjectAccess(supabase, projectId, user.id);

    const { data: items, error } = await supabase
      .from('action_items')
      .select('*, assignee_profile:profiles!action_items_assignee_user_id_fkey(id, display_name, avatar_url)')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });

    if (error) {
      const { data: fallbackItems, error: fallbackErr } = await supabase
        .from('action_items')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

      if (fallbackErr) {
        return NextResponse.json({ error: fallbackErr.message }, { status: 500 });
      }
      return NextResponse.json({ actionItems: fallbackItems });
    }

    return NextResponse.json({ actionItems: items });
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
    const parse = createActionItemSchema.safeParse(body);

    if (!parse.success) {
      return NextResponse.json(
        { error: 'Invalid action item payload', details: parse.error.flatten() },
        { status: 400 }
      );
    }

    const { projectId, title, description, assigneeUserId, dueAt, status } = parse.data;
    await verifyProjectAccess(supabase, projectId, user.id);

    const { data: item, error } = await supabase
      .from('action_items')
      .insert({
        project_id: projectId,
        title,
        description: description || null,
        assignee_user_id: assigneeUserId || null,
        due_at: dueAt || null,
        status,
        created_by: user.id,
      })
      .select('*')
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ actionItem: item }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Unauthorized' },
      { status: error.statusCode || 401 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const user = await requireAuth(supabase);

    const body = await req.json();
    const parse = updateActionItemStatusSchema.safeParse(body);

    if (!parse.success) {
      return NextResponse.json(
        { error: 'Invalid update payload', details: parse.error.flatten() },
        { status: 400 }
      );
    }

    const { actionItemId, status } = parse.data;

    const { data: item, error: fetchErr } = await supabase
      .from('action_items')
      .select('project_id')
      .eq('id', actionItemId)
      .single();

    if (fetchErr || !item) {
      return NextResponse.json({ error: 'Action item not found' }, { status: 404 });
    }

    await verifyProjectAccess(supabase, item.project_id, user.id);

    const { data: updatedItem, error: updateErr } = await supabase
      .from('action_items')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', actionItemId)
      .select('*')
      .single();

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 500 });
    }

    return NextResponse.json({ actionItem: updatedItem });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Unauthorized' },
      { status: error.statusCode || 401 }
    );
  }
}
