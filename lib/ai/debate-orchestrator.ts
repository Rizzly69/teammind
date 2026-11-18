import { SupabaseClient } from '@supabase/supabase-js';
import { callOpenRouter, OpenRouterResponse } from './openrouter';
import { getDebateTemplate, buildSynthesisPrompt } from './debate-templates';
import { DebateTemplateId, AIRunStatus } from '@/types';

export interface RunDebateParams {
  supabase: SupabaseClient;
  roomId: string;
  userId: string;
  prompt: string;
  templateId: DebateTemplateId;
  modelIds: string[];
  synthesisModelId: string;
}

export interface ModelExecutionResult {
  modelId: string;
  response: string | null;
  status: 'complete' | 'failed';
  inputTokens?: number;
  outputTokens?: number;
  latencyMs?: number;
  errorMessage?: string;
}

export async function orchestrateDebate({
  supabase,
  roomId,
  userId,
  prompt,
  templateId,
  modelIds,
  synthesisModelId,
}: RunDebateParams): Promise<{
  runId: string;
  status: AIRunStatus;
  responses: ModelExecutionResult[];
  synthesis: string | null;
  synthesisMessageId: string | null;
}> {
  const template = getDebateTemplate(templateId);

  // 1. Create AI Run entry in database
  const { data: aiRun, error: runError } = await supabase
    .from('ai_runs')
    .insert({
      room_id: roomId,
      requested_by: userId,
      run_type: 'debate',
      status: 'running',
      prompt,
      model_ids: modelIds,
      usage_metadata: { template: templateId, synthesisModel: synthesisModelId },
    })
    .select('id')
    .single();

  if (runError || !aiRun) {
    throw new Error(`Failed to initialize debate record: ${runError?.message || 'Database error'}`);
  }

  const runId = aiRun.id;

  // 2. Launch independent model queries in bounded parallel execution
  const modelPromises = modelIds.map(async (modelId): Promise<ModelExecutionResult> => {
    try {
      const res = await callOpenRouter(
        [
          { role: 'system', content: template.systemPromptAddition },
          { role: 'user', content: prompt },
        ],
        { modelId, temperature: 0.7 }
      );

      // Save individual response row
      await supabase.from('ai_run_responses').insert({
        ai_run_id: runId,
        model_id: modelId,
        response: res.content,
        status: 'complete',
        input_tokens: res.usage?.prompt_tokens ?? null,
        output_tokens: res.usage?.completion_tokens ?? null,
        latency_ms: res.latencyMs,
      });

      return {
        modelId,
        response: res.content,
        status: 'complete',
        inputTokens: res.usage?.prompt_tokens,
        outputTokens: res.usage?.completion_tokens,
        latencyMs: res.latencyMs,
      };
    } catch (err: any) {
      const errorMsg = err.message || 'Model execution failed';

      await supabase.from('ai_run_responses').insert({
        ai_run_id: runId,
        model_id: modelId,
        response: null,
        status: 'failed',
        error_message: errorMsg,
      });

      return {
        modelId,
        response: null,
        status: 'failed',
        errorMessage: errorMsg,
      };
    }
  });

  const executedResponses = await Promise.all(modelPromises);

  // Filter successful responses
  const successfulResponses = executedResponses.filter(
    (r): r is ModelExecutionResult & { response: string } => r.status === 'complete' && !!r.response
  );

  let runStatus: AIRunStatus = 'complete';
  if (successfulResponses.length === 0) {
    runStatus = 'failed';
  } else if (successfulResponses.length < modelIds.length) {
    runStatus = 'partial';
  }

  let synthesisText: string | null = null;
  let synthesisMessageId: string | null = null;

  // 3. Synthesis stage (if at least one model succeeded)
  if (successfulResponses.length > 0) {
    try {
      const synthPrompt = buildSynthesisPrompt(prompt, successfulResponses);

      const synthResult = await callOpenRouter(
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

      synthesisText = synthResult.content;

      // Persist synthesis message to room
      const { data: savedMsg } = await supabase
        .from('messages')
        .insert({
          room_id: roomId,
          sender_user_id: null,
          sender_type: 'assistant',
          model_id: synthesisModelId,
          content: synthesisText,
          status: 'complete',
          metadata: {
            is_debate_synthesis: true,
            run_id: runId,
            template: templateId,
            participating_models: modelIds,
            successful_models: successfulResponses.map((r) => r.modelId),
          },
        })
        .select('id')
        .single();

      if (savedMsg) {
        synthesisMessageId = savedMsg.id;
      }
    } catch (synthErr: any) {
      // If synthesis model specifically failed, mark run partial or report error
      runStatus = 'partial';
      synthesisText = `*Synthesis could not be completed automatically: ${synthErr.message}*`;
    }
  }

  // 4. Update AI run final status
  await supabase
    .from('ai_runs')
    .update({
      status: runStatus,
      completed_at: new Date().toISOString(),
      error_summary:
        runStatus === 'failed'
          ? 'All model executions failed.'
          : runStatus === 'partial'
          ? 'Some model perspectives failed to return.'
          : null,
    })
    .eq('id', runId);

  return {
    runId,
    status: runStatus,
    responses: executedResponses,
    synthesis: synthesisText,
    synthesisMessageId,
  };
}
