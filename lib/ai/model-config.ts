import { ModelOption } from '@/types';

export const ALLOWED_MODELS: ModelOption[] = [
  {
    id: 'openai/gpt-4o-mini',
    name: 'GPT-4o Mini',
    provider: 'OpenAI',
    description: 'Fast, intelligent, and highly cost-efficient flagship model for team brainstorming.',
    contextWindow: 128000,
    isDebateRecommended: true,
  },
  {
    id: 'google/gemini-2.5-flash',
    name: 'Gemini 2.5 Flash',
    provider: 'Google',
    description: 'High-speed reasoning model with deep context understanding and rapid throughput.',
    contextWindow: 1000000,
    isDebateRecommended: true,
  },
  {
    id: 'meta-llama/llama-3.3-70b-instruct',
    name: 'Llama 3.3 70B',
    provider: 'Meta',
    description: 'Premier open-weights model fine-tuned for critical analysis and structured debates.',
    contextWindow: 128000,
    isDebateRecommended: true,
  },
  {
    id: 'deepseek/deepseek-chat',
    name: 'DeepSeek V3',
    provider: 'DeepSeek',
    description: 'High-leverage analytical reasoning model with strong technical problem solving.',
    contextWindow: 64000,
    isDebateRecommended: true,
  },
  {
    id: 'openai/gpt-4o',
    name: 'GPT-4o',
    provider: 'OpenAI',
    description: 'Omni model for complex strategic synthesis and multi-domain problem decomposition.',
    contextWindow: 128000,
    isDebateRecommended: false,
  },
];

export const DEFAULT_MODEL_ID =
  process.env.OPENROUTER_DEFAULT_MODEL || 'openai/gpt-4o-mini';

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
