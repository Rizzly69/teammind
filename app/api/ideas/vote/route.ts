import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { requireAuth, verifyProjectAccess } from '@/lib/permissions/workspace';
import { voteIdeaSchema } from '@/lib/validation/schemas';

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const user = await requireAuth(supabase);

    const body = await req.json();
    const parse = voteIdeaSchema.safeParse(body);

    if (!parse.success) {
      return NextResponse.json(
        { error: 'Invalid vote payload', details: parse.error.flatten() },
        { status: 400 }
      );
    }

    const { ideaId, vote } = parse.data;

    // Check project access
    const { data: idea, error: ideaErr } = await supabase
      .from('ideas')
      .select('project_id')
      .eq('id', ideaId)
      .single();

    if (ideaErr || !idea) {
      return NextResponse.json({ error: 'Idea not found' }, { status: 404 });
    }

    await verifyProjectAccess(supabase, idea.project_id, user.id);

    if (vote === 0) {
      // Remove vote
      await supabase
        .from('idea_votes')
        .delete()
        .eq('idea_id', ideaId)
        .eq('user_id', user.id);
    } else {
      // Cast upvote (enforcing unique constraint)
      const { error: voteErr } = await supabase.from('idea_votes').upsert({
        idea_id: ideaId,
        user_id: user.id,
        vote: 1,
      });

      if (voteErr) {
        return NextResponse.json({ error: voteErr.message }, { status: 500 });
      }
    }

    // Return new vote count
    const { data: votes } = await supabase
      .from('idea_votes')
      .select('vote')
      .eq('idea_id', ideaId);

    const totalVotes = (votes || []).reduce((sum, v) => sum + v.vote, 0);

    return NextResponse.json({
      success: true,
      votesCount: totalVotes,
      userVoted: vote === 1,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Unauthorized' },
      { status: error.statusCode || 401 }
    );
  }
}
