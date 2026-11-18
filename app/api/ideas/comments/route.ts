import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { requireAuth, verifyProjectAccess } from '@/lib/permissions/workspace';
import { commentIdeaSchema } from '@/lib/validation/schemas';

export async function GET(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const user = await requireAuth(supabase);

    const ideaId = req.nextUrl.searchParams.get('ideaId');
    if (!ideaId) {
      return NextResponse.json({ error: 'ideaId is required' }, { status: 400 });
    }

    const { data: idea, error: ideaErr } = await supabase
      .from('ideas')
      .select('project_id')
      .eq('id', ideaId)
      .single();

    if (ideaErr || !idea) {
      return NextResponse.json({ error: 'Idea not found' }, { status: 404 });
    }

    await verifyProjectAccess(supabase, idea.project_id, user.id);

    const { data: comments, error } = await supabase
      .from('idea_comments')
      .select('*, author_profile:profiles(id, display_name, avatar_url)')
      .eq('idea_id', ideaId)
      .order('created_at', { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ comments });
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
    const parse = commentIdeaSchema.safeParse(body);

    if (!parse.success) {
      return NextResponse.json(
        { error: 'Invalid comment payload', details: parse.error.flatten() },
        { status: 400 }
      );
    }

    const { ideaId, content } = parse.data;

    const { data: idea, error: ideaErr } = await supabase
      .from('ideas')
      .select('project_id')
      .eq('id', ideaId)
      .single();

    if (ideaErr || !idea) {
      return NextResponse.json({ error: 'Idea not found' }, { status: 404 });
    }

    await verifyProjectAccess(supabase, idea.project_id, user.id);

    const { data: comment, error } = await supabase
      .from('idea_comments')
      .insert({
        idea_id: ideaId,
        user_id: user.id,
        content,
      })
      .select('*')
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ comment }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Unauthorized' },
      { status: error.statusCode || 401 }
    );
  }
}
