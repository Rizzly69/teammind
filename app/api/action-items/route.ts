import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, isSupabaseConfigured } from '@/lib/supabase/server';
import { requireAuth, verifyProjectAccess } from '@/lib/permissions/workspace';
import { createActionItemSchema, updateActionItemStatusSchema } from '@/lib/validation/schemas';
import { getStore } from '@/lib/store/workspace-store';
import { getAuthorizedMemberById } from '@/lib/auth/authorized-members';
import { ActionItem } from '@/types';

export async function GET(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const user = await requireAuth(supabase);

    const projectId = req.nextUrl.searchParams.get('projectId');
    if (!projectId) {
      return NextResponse.json({ error: 'projectId is required' }, { status: 400 });
    }

    await verifyProjectAccess(supabase, projectId, user.id);

    if (!isSupabaseConfigured()) {
      const store = getStore();
      const items = store.actionItems
        .filter((a) => a.project_id === projectId)
        .map((a) => {
          const assignee = a.assignee_user_id ? getAuthorizedMemberById(a.assignee_user_id) : undefined;
          return {
            ...a,
            assignee_profile: assignee
              ? { id: assignee.id, display_name: assignee.name, avatar_url: null, created_at: '' }
              : undefined,
          };
        });
      return NextResponse.json({ actionItems: items });
    }

    const { data: items, error } = await supabase
      .from('action_items')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ actionItems: items || [] });
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

    if (!isSupabaseConfigured()) {
      const store = getStore();
      const newItem: ActionItem = {
        id: `task-${Date.now()}`,
        project_id: projectId,
        title,
        description: description || null,
        assignee_user_id: assigneeUserId || null,
        created_by: user.id,
        due_at: dueAt || null,
        status: status || 'open',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      store.actionItems.push(newItem);
      return NextResponse.json({ actionItem: newItem }, { status: 201 });
    }

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

    if (!isSupabaseConfigured()) {
      const store = getStore();
      const item = store.actionItems.find((a) => a.id === actionItemId);
      if (!item) {
        return NextResponse.json({ error: 'Action item not found' }, { status: 404 });
      }
      item.status = status;
      item.updated_at = new Date().toISOString();
      return NextResponse.json({ actionItem: item });
    }

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
