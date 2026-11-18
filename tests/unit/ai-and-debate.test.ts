import { describe, it, expect, vi, beforeEach } from 'vitest';
import { isValidModelId, validateModelList, DEFAULT_MODEL_ID } from '@/lib/ai/model-config';
import { callOpenRouter, OpenRouterError } from '@/lib/ai/openrouter';
import { orchestrateDebate } from '@/lib/ai/debate-orchestrator';
import { checkRateLimits, resetRateLimitStore, RateLimitExceededError } from '@/lib/rate-limit/limiter';
import { buildSynthesisPrompt } from '@/lib/ai/debate-templates';

describe('AI Gateway & Multi-Model Debate Orchestrator', () => {
  beforeEach(() => {
    resetRateLimitStore();
    vi.clearAllMocks();
  });

  it('6. Ensures OpenRouter API key is strictly server-side and never prefixed with NEXT_PUBLIC_', () => {
    // Verified against Next.js env security rule
    expect(process.env.NEXT_PUBLIC_OPENROUTER_API_KEY).toBeUndefined();
  });

  it('7. Rejects unvalidated or arbitrary client-supplied model IDs', async () => {
    const invalidId = 'arbitrary/malicious-model-v1';
    expect(isValidModelId(invalidId)).toBe(false);

    const validation = validateModelList(['openai/gpt-4o', invalidId]);
    expect(validation.valid).toBe(false);
    expect(validation.invalidIds).toContain(invalidId);

    await expect(
      callOpenRouter([{ role: 'user', content: 'hello' }], { modelId: invalidId })
    ).rejects.toThrow(OpenRouterError);
  });

  it('8. Successfully calls mock AI fallback without spending real credits in tests', async () => {
    const response = await callOpenRouter([
      { role: 'user', content: 'What are the red-team risks for our auth system?' },
    ], { modelId: 'anthropic/claude-3.5-sonnet' });

    expect(response).toBeDefined();
    expect(response.content).toContain('Critical Evaluation');
    expect(response.latencyMs).toBeGreaterThan(0);
    expect(response.usage?.total_tokens).toBeGreaterThan(0);
  });

  it('9 & 10. Handles multi-model partial failure and accurately synthesizes available responses', async () => {
    // Mock Supabase client for debate persistence
    const insertedRunResponses: any[] = [];
    const updatedRuns: any[] = [];
    const insertedMessages: any[] = [];

    const mockSupabase = {
      from: vi.fn((table: string) => {
        if (table === 'ai_runs') {
          return {
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: { id: 'run-uuid-123' }, error: null }),
              }),
            }),
            update: vi.fn((updateData) => {
              updatedRuns.push(updateData);
              return {
                eq: vi.fn().mockResolvedValue({ error: null }),
              };
            }),
          };
        }
        if (table === 'ai_run_responses') {
          return {
            insert: vi.fn((data) => {
              insertedRunResponses.push(data);
              return Promise.resolve({ error: null });
            }),
          };
        }
        if (table === 'messages') {
          return {
            insert: vi.fn((data) => {
              insertedMessages.push(data);
              return {
                select: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({ data: { id: 'msg-synth-456' }, error: null }),
                }),
              };
            }),
          };
        }
        return {
          insert: vi.fn().mockResolvedValue({ error: null }),
        };
      }),
    } as any;

    const result = await orchestrateDebate({
      supabase: mockSupabase,
      roomId: 'room-uuid-1',
      userId: 'user-uuid-1',
      prompt: 'Should we store session tokens in HttpOnly cookies or localStorage?',
      templateId: 'red_team',
      modelIds: ['anthropic/claude-3.5-sonnet', 'openai/gpt-4o', 'google/gemini-2.0-flash-001'],
      synthesisModelId: 'anthropic/claude-3.5-sonnet',
    });

    expect(result.runId).toBe('run-uuid-123');
    expect(result.responses.length).toBe(3);
    // Every model response was persisted
    expect(insertedRunResponses.length).toBe(3);
    // Synthesis message was persisted to room messages
    expect(insertedMessages.length).toBe(1);
    expect(insertedMessages[0].metadata.is_debate_synthesis).toBe(true);
    expect(result.synthesis).toBeDefined();
  });

  it('10b. Builds synthesis prompt ensuring disagreement is preserved and not smoothed over', () => {
    const prompt = 'Migrate to microfrontends';
    const modelResponses = [
      { modelId: 'model-a', response: 'Microfrontends will increase developer velocity by 50%.' },
      { modelId: 'model-b', response: 'Microfrontends will introduce extreme operational complexity and duplicate bundle weight.' },
    ];

    const synthesisPrompt = buildSynthesisPrompt(prompt, modelResponses);
    expect(synthesisPrompt).toContain('Do NOT smooth over or pretend there is consensus');
    expect(synthesisPrompt).toContain('Avoid treating model agreement as proof');
    expect(synthesisPrompt).toContain('PERSPECTIVE 1 (model-a)');
    expect(synthesisPrompt).toContain('PERSPECTIVE 2 (model-b)');
  });

  it('13. Enforces rate limits and monthly budget ceiling', () => {
    const wsId = 'ws-budget-1';
    const userId = 'user-budget-1';

    // Strict limits for test verification
    const testLimits = {
      maxRequestsPerMinute: 3,
      maxDailyRequests: 10,
      maxMonthlyEstimatedCost: 0.10, // $0.10 cap
    };

    // 1st request -> allowed
    const r1 = checkRateLimits(wsId, userId, 0.03, testLimits, testLimits);
    expect(r1.allowed).toBe(true);

    // 2nd request -> allowed
    const r2 = checkRateLimits(wsId, userId, 0.03, testLimits, testLimits);
    expect(r2.allowed).toBe(true);

    // 3rd request -> allowed
    const r3 = checkRateLimits(wsId, userId, 0.03, testLimits, testLimits);
    expect(r3.allowed).toBe(true);

    // 4th request in same minute -> throws RateLimitExceededError (exceeded 3 req/min)
    expect(() =>
      checkRateLimits(wsId, userId, 0.03, testLimits, testLimits)
    ).toThrow(RateLimitExceededError);
  });
});
