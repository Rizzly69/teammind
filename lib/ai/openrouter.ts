import { getModelById, isValidModelId, DEFAULT_MODEL_ID } from './model-config';

export interface OpenRouterMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface OpenRouterResponse {
  content: string;
  model: string;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
  latencyMs: number;
}

export class OpenRouterError extends Error {
  public statusCode: number;
  public isRetryable: boolean;

  constructor(message: string, statusCode = 500, isRetryable = false) {
    super(message);
    this.name = 'OpenRouterError';
    this.statusCode = statusCode;
    this.isRetryable = isRetryable;
  }
}

/**
 * Checks if mock mode should be used (e.g. during test runs or if API key is not configured)
 */
export function isMockAIEnabled(): boolean {
  const rawKey = process.env.OPENROUTER_API_KEY;
  if (!rawKey) return process.env.NODE_ENV === 'test';
  const key = rawKey.trim().replace(/^["']|["']$/g, '');
  return (
    process.env.NODE_ENV === 'test' ||
    !key ||
    key.includes('placeholder') ||
    key === ''
  );
}

/**
 * Generates an intelligent mocked response for testing and offline environments.
 */
function generateMockResponse(modelId: string, messages: OpenRouterMessage[]): string {
  const lastUserMsg = [...messages].reverse().find((m) => m.role === 'user')?.content || 'the idea';
  const modelName = getModelById(modelId)?.name || modelId;

  if (lastUserMsg.toLowerCase().includes('red-team') || lastUserMsg.toLowerCase().includes('critique')) {
    return `### [${modelName}] Critical Evaluation & Risk Analysis\n\n1. **Core Vulnerabilities**:\n   - Dependent on assumed user adoption speed.\n   - Latency overhead with multi-step pipelines.\n\n2. **Operational Failure Modes**:\n   - Incomplete state synchronization across edge devices.\n   - Unhandled rate throttling from upstream dependencies.\n\n3. **Mitigation Recommendation**:\n   - Implement defensive circuit breakers and strict fallback boundaries.`;
  }

  if (lastUserMsg.toLowerCase().includes('feasibility') || lastUserMsg.toLowerCase().includes('practical')) {
    return `### [${modelName}] Feasibility Assessment\n\n- **Technical Feasibility**: High. The architecture is modular and uses proven standard protocols.\n- **Operational Feasibility**: Medium. Requires structured monitoring and database indexing.\n- **Missing Information**: Quantitative metrics on expected peak concurrent users.`;
  }

  return `### Analysis from ${modelName}\n\nRegarding: "${lastUserMsg.slice(0, 80)}${lastUserMsg.length > 80 ? '...' : ''}"\n\n**Key Perspectives**:\n1. **Strategic Viability**: Strong value proposition with clear team collaboration workflows.\n2. **Architecture**: Decoupling client state from server authorization guarantees RLS boundaries.\n3. **Next Action**: Align on user story priorities and validate multi-model critique edge cases.`;
}

/**
 * Calls OpenRouter chat completion endpoint.
 */
export async function callOpenRouter(
  messages: OpenRouterMessage[],
  options: {
    modelId?: string;
    temperature?: number;
    maxTokens?: number;
    timeoutMs?: number;
    retries?: number;
  } = {}
): Promise<OpenRouterResponse> {
  const modelId = options.modelId || DEFAULT_MODEL_ID;

  if (!isValidModelId(modelId)) {
    throw new OpenRouterError(
      `Invalid or unapproved model ID: "${modelId}". Please choose an approved model from the allowlist.`,
      400,
      false
    );
  }

  const startTime = Date.now();

  // Test / Mock mode path
  if (isMockAIEnabled()) {
    const latency = 120 + Math.floor(Math.random() * 80);
    const mockContent = generateMockResponse(modelId, messages);
    return {
      content: mockContent,
      model: modelId,
      usage: {
        prompt_tokens: 150,
        completion_tokens: 280,
        total_tokens: 430,
      },
      latencyMs: latency,
    };
  }

  const apiKey = (process.env.OPENROUTER_API_KEY || '').trim().replace(/^["']|["']$/g, '');
  const timeoutMs = options.timeoutMs || 45000;
  const maxRetries = options.retries ?? 1;

  let attempt = 0;
  let lastError: Error | null = null;

  while (attempt <= maxRetries) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'HTTP-Referer': process.env.APP_URL || 'https://teammind.local',
          'X-Title': 'TeamMind AI Workspace',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: modelId,
          messages,
          temperature: options.temperature ?? 0.7,
          max_tokens: options.maxTokens ?? 650,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorBody = await response.text();
        const status = response.status;
        const isRetryable = status === 429 || status >= 500;

        if (status === 401) {
          throw new OpenRouterError('OpenRouter authentication failed: Invalid or missing API key.', 401, false);
        } else if (status === 429) {
          throw new OpenRouterError('OpenRouter rate limit reached. Please retry in a few moments.', 429, true);
        } else if (status >= 500) {
          throw new OpenRouterError(`Model provider error (${status}): ${errorBody}`, status, true);
        } else {
          throw new OpenRouterError(`OpenRouter request failed (${status}): ${errorBody}`, status, false);
        }
      }

      const json = await response.json();
      const content = json.choices?.[0]?.message?.content || '';
      const usage = json.usage;

      return {
        content,
        model: modelId,
        usage,
        latencyMs: Date.now() - startTime,
      };
    } catch (err: any) {
      clearTimeout(timeoutId);
      lastError = err;

      if (err.name === 'AbortError') {
        throw new OpenRouterError(
          `Request to model "${modelId}" timed out after ${timeoutMs / 1000}s.`,
          504,
          true
        );
      }

      if (err instanceof OpenRouterError && !err.isRetryable) {
        throw err;
      }

      attempt++;
      if (attempt <= maxRetries) {
        await new Promise((res) => setTimeout(res, 1000 * attempt));
      }
    }
  }

  throw (
    lastError ||
    new OpenRouterError(`Failed to receive response from model "${modelId}".`, 502, false)
  );
}
