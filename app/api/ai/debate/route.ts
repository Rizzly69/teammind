import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { requireAuth, verifyRoomAccess } from '@/lib/permissions/workspace';
import { aiDebateRequestSchema } from '@/lib/validation/schemas';
import { validateModelList, isValidModelId } from '@/lib/ai/model-config';
import { orchestrateDebate } from '@/lib/ai/debate-orchestrator';
import { checkRateLimits } from '@/lib/rate-limit/limiter';

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const user = await requireAuth(supabase);

    const body = await req.json();
    const parseResult = aiDebateRequestSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Invalid debate parameters', details: parseResult.error.flatten() },
        { status: 400 }
      );
    }

    const { roomId, prompt, templateId, modelIds, synthesisModelId } = parseResult.data;

    // Validate model selection
    const { valid, invalidIds } = validateModelList(modelIds);
    if (!valid) {
      return NextResponse.json(
        { error: `Invalid model IDs selected: ${invalidIds.join(', ')}` },
        { status: 400 }
      );
    }

    if (!isValidModelId(synthesisModelId)) {
      return NextResponse.json(
        { error: `Invalid synthesis model ID: ${synthesisModelId}` },
        { status: 400 }
      );
    }

    // Verify user has access to room & workspace
    const { workspaceId } = await verifyRoomAccess(supabase, roomId, user.id);

    // Rate limiting with higher weight for multi-model runs
    checkRateLimits(workspaceId, user.id, 0.04);

    // Record user's debate initiation message in room
    await supabase.from('messages').insert({
      room_id: roomId,
      sender_user_id: user.id,
      sender_type: 'user',
      content: `**[Initiated Multi-Model Debate: ${templateId.replace('_', ' ').toUpperCase()}]**\n\n${prompt}`,
      status: 'complete',
    });

    // Execute debate orchestration
    const debateOutcome = await orchestrateDebate({
      supabase,
      roomId,
      userId: user.id,
      prompt,
      templateId,
      modelIds,
      synthesisModelId,
    });

    return NextResponse.json({
      success: true,
      data: debateOutcome,
    });
  } catch (error: any) {
    const status = error.statusCode || 500;
    return NextResponse.json(
      { error: error.message || 'Failed to complete multi-model debate' },
      { status }
    );
  }
}
