import { ModelOption } from '@/types';

export const ALLOWED_MODELS: ModelOption[] = [
  {
    id: 'anthropic/claude-3.5-sonnet',
    name: 'Claude 3.5 Sonnet',
    provider: 'Anthropic',
    description: 'Industry-leading reasoning, nuanced code analysis, and high-fidelity synthesis.',
    contextWindow: 200000,
    isDebateRecommended: true,
  },
  {
    id: 'openai/gpt-4o',
    name: 'GPT-4o',
    provider: 'OpenAI',
    description: 'Omni flagship model for cross-domain critical thinking and problem decomposition.',
    contextWindow: 128000,
    isDebateRecommended: true,
  },
  {
    id: 'google/gemini-2.0-flash-001',
    name: 'Gemini 2.0 Flash',
    provider: 'Google',
    description: 'Ultra-fast, high-throughput model with a massive context window and strong reasoning.',
    contextWindow: 1000000,
    isDebateRecommended: true,
  },
  {
    id: 'meta-llama/llama-3.3-70b-instruct',
    name: 'Llama 3.3 70B',
    provider: 'Meta',
    description: 'Premier open-weights model fine-tuned for structured instruction following and debate.',
    contextWindow: 128000,
    isDebateRecommended: true,
  },
  {
    id: 'deepseek/deepseek-chat',
    name: 'DeepSeek V3',
    provider: 'DeepSeek',
    description: 'Strong architectural efficiency with rigorous logical analysis.',
    contextWindow: 64000,
    isDebateRecommended: false,
  },
];

export const DEFAULT_MODEL_ID =
  process.env.OPENROUTER_DEFAULT_MODEL || 'anthropic/claude-3.5-sonnet';

export function getModelById(modelId: string): ModelOption | undefined {
  return ALLOWED_MODELS.find((m) => m.id === modelId);
}

export function isValidModelId(modelId: string): boolean {
  return ALLOWED_MODELS.some((m) => m.id === modelId);
}

export function validateModelList(modelIds: string[]): { valid: boolean; invalidIds: string[] } {
  const invalidIds = modelIds.filter((id) => !isValidModelId(id));
  return {
    valid: invalidIds.length === 0,
    invalidIds,
  };
}
