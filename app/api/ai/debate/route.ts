import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, isSupabaseConfigured } from '@/lib/supabase/server';
import { requireAuth, verifyRoomAccess } from '@/lib/permissions/workspace';
import { aiDebateRequestSchema } from '@/lib/validation/schemas';
import { validateModelList, isValidModelId } from '@/lib/ai/model-config';
import { orchestrateDebate } from '@/lib/ai/debate-orchestrator';
import { checkRateLimits } from '@/lib/rate-limit/limiter';
import { getStore } from '@/lib/store/workspace-store';
import { callOpenRouter } from '@/lib/ai/openrouter';
import { getDebateTemplate, buildSynthesisPrompt } from '@/lib/ai/debate-templates';
import { Message } from '@/types';

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

    const store = getStore();

    // 1. Record user debate initiation message in room
    const introContent = `**[Initiated Multi-Model Debate: ${templateId.replace('_', ' ').toUpperCase()}]**\n\n${prompt}`;
    if (isSupabaseConfigured()) {
      await supabase.from('messages').insert({
        room_id: roomId,
        sender_user_id: user.id,
        sender_type: 'user',
        content: introContent,
        status: 'complete',
      });
    } else {
      store.messages.push({
        id: `msg-${Date.now()}-debate-intro`,
        room_id: roomId,
        sender_user_id: user.id,
        sender_type: 'user',
        model_id: null,
        content: introContent,
        status: 'complete',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        sender_profile: {
          id: user.id,
          display_name: user.name || 'Team Member',
          avatar_url: null,
          created_at: '',
        },
      });
    }

    // 2. If Supabase is configured, use full database orchestrator
    if (isSupabaseConfigured()) {
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
    }

    // 3. Standalone fast in-memory execution
    const template = getDebateTemplate(templateId);
    const modelPromises = modelIds.map(async (modelId) => {
      try {
        const res = await callOpenRouter(
          [
            { role: 'system', content: template.systemPromptAddition },
            { role: 'user', content: prompt },
          ],
          { modelId, temperature: 0.7 }
        );
        return {
          modelId,
          response: res.content,
          status: 'complete' as const,
          latencyMs: res.latencyMs,
          outputTokens: res.usage?.completion_tokens,
        };
      } catch (err: any) {
        return {
          modelId,
          response: null,
          status: 'failed' as const,
          errorMessage: err.message,
        };
      }
    });

    const responses = await Promise.all(modelPromises);
    const successful = responses.filter(
      (r): r is typeof r & { response: string } => r.status === 'complete' && !!r.response
    );

    let synthesisText = '';
    if (successful.length > 0) {
      const synthPrompt = buildSynthesisPrompt(prompt, successful);
      const synthRes = await callOpenRouter(
        [
          {
            role: 'system',
            content:
              'You are an impartial, highly analytical synthesis expert. Compare perspectives with intellectual humility, surface disagreements clearly, and synthesize actionable next steps.',
          },
          { role: 'user', content: synthPrompt },
        ],
        { modelId: synthesisModelId, temperature: 0.5 }
      );
      synthesisText = synthRes.content;

      // Add synthesis message to room
      const synthMsg: Message = {
        id: `msg-${Date.now()}-synth`,
        room_id: roomId,
        sender_user_id: null,
        sender_type: 'assistant',
        model_id: synthesisModelId,
        content: synthesisText,
        status: 'complete',
        metadata: {
          is_debate_synthesis: true,
          template: templateId,
          participating_models: modelIds,
          successful_models: successful.map((r) => r.modelId),
        },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      store.messages.push(synthMsg);
    }

    return NextResponse.json({
      success: true,
      data: {
        runId: `run-${Date.now()}`,
        status: successful.length === modelIds.length ? 'complete' : 'partial',
        responses,
        synthesis: synthesisText,
      },
    });
  } catch (error: any) {
    const status = error.statusCode || 500;
    return NextResponse.json(
      { error: error.message || 'Failed to complete multi-model debate' },
      { status }
    );
  }
}
