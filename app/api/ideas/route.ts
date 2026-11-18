import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { requireAuth, verifyProjectAccess } from '@/lib/permissions/workspace';
import { createIdeaSchema, updateIdeaStatusSchema } from '@/lib/validation/schemas';

export async function GET(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const user = await requireAuth(supabase);

    const projectId = req.nextUrl.searchParams.get('projectId');
    if (!projectId) {
      return NextResponse.json({ error: 'projectId is required' }, { status: 400 });
    }

    await verifyProjectAccess(supabase, projectId, user.id);

    const { data: ideas, error } = await supabase
      .from('ideas')
      .select('*, idea_votes(user_id, vote)')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Transform vote counts and determine if current user voted
    const formattedIdeas = (ideas || []).map((idea: any) => {
      const votes = idea.idea_votes || [];
      const votesCount = votes.reduce((sum: number, v: any) => sum + (v.vote || 0), 0);
      const userVoted = votes.some((v: any) => v.user_id === user.id && v.vote > 0);

      const { idea_votes, ...rest } = idea;
      return {
        ...rest,
        votes_count: votesCount,
        user_voted: userVoted,
      };
    });

    return NextResponse.json({ ideas: formattedIdeas });
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
    const parse = createIdeaSchema.safeParse(body);

    if (!parse.success) {
      return NextResponse.json(
        { error: 'Invalid idea payload', details: parse.error.flatten() },
        { status: 400 }
      );
    }

    const { projectId, sourceRoomId, sourceMessageId, title, description, tags, status } = parse.data;
    await verifyProjectAccess(supabase, projectId, user.id);

    const { data: idea, error } = await supabase
      .from('ideas')
      .insert({
        project_id: projectId,
        source_room_id: sourceRoomId || null,
        source_message_id: sourceMessageId || null,
        created_by: user.id,
        title,
        description,
        tags,
        status,
      })
      .select('*')
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ idea: { ...idea, votes_count: 0, user_voted: false } }, { status: 201 });
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
    const parse = updateIdeaStatusSchema.safeParse(body);

    if (!parse.success) {
      return NextResponse.json(
        { error: 'Invalid update payload', details: parse.error.flatten() },
        { status: 400 }
      );
    }

    const { ideaId, status } = parse.data;

    // Fetch idea to check access
    const { data: existingIdea, error: fetchErr } = await supabase
      .from('ideas')
      .select('project_id')
      .eq('id', ideaId)
      .single();

    if (fetchErr || !existingIdea) {
      return NextResponse.json({ error: 'Idea not found' }, { status: 404 });
    }

    await verifyProjectAccess(supabase, existingIdea.project_id, user.id);

    const { data: updatedIdea, error: updateErr } = await supabase
      .from('ideas')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', ideaId)
      .select('*')
      .single();

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 500 });
    }

    return NextResponse.json({ idea: updatedIdea });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Unauthorized' },
      { status: error.statusCode || 401 }
    );
  }
}
