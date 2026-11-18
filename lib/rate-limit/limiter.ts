export interface RateLimitConfig {
  maxRequestsPerMinute: number;
  maxDailyRequests: number;
  maxMonthlyEstimatedCost: number; // in USD
}

export const DEFAULT_WORKSPACE_LIMITS: RateLimitConfig = {
  maxRequestsPerMinute: 30,
  maxDailyRequests: 300,
  maxMonthlyEstimatedCost: 50.0,
};

export const DEFAULT_USER_LIMITS: RateLimitConfig = {
  maxRequestsPerMinute: 15,
  maxDailyRequests: 150,
  maxMonthlyEstimatedCost: 25.0,
};

// In-memory sliding window cache for rate limiting
// For high scale, this can also sync to Redis or Supabase table
interface RequestRecord {
  timestamps: number[];
  estimatedCostMonth: number;
  lastResetMonth: number;
}

const workspaceUsageStore = new Map<string, RequestRecord>();
const userUsageStore = new Map<string, RequestRecord>();

export class RateLimitExceededError extends Error {
  public statusCode: number;
  constructor(message: string) {
    super(message);
    this.name = 'RateLimitExceededError';
    this.statusCode = 429;
  }
}

/**
 * Checks rate limits and budget for a user and workspace.
 */
export function checkRateLimits(
  workspaceId: string,
  userId: string,
  estimatedCost = 0.01,
  wsConfig = DEFAULT_WORKSPACE_LIMITS,
  userConfig = DEFAULT_USER_LIMITS
): { allowed: boolean; remainingRequests: number } {
  const now = Date.now();
  const oneMinuteAgo = now - 60 * 1000;
  const currentMonth = new Date().getMonth();

  // Helper to check and update window
  const updateUsage = (
    store: Map<string, RequestRecord>,
    key: string,
    limits: RateLimitConfig,
    scopeName: string
  ): number => {
    let record = store.get(key);
    if (!record) {
      record = { timestamps: [], estimatedCostMonth: 0, lastResetMonth: currentMonth };
      store.set(key, record);
    }

    // Reset monthly budget if month rolled over
    if (record.lastResetMonth !== currentMonth) {
      record.estimatedCostMonth = 0;
      record.lastResetMonth = currentMonth;
    }

    // Filter out timestamps older than 1 minute
    record.timestamps = record.timestamps.filter((ts) => ts > oneMinuteAgo);

    if (record.timestamps.length >= limits.maxRequestsPerMinute) {
      throw new RateLimitExceededError(
        `Rate limit exceeded: ${scopeName} has reached the maximum of ${limits.maxRequestsPerMinute} AI requests per minute. Please wait a moment.`
      );
    }

    if (record.estimatedCostMonth + estimatedCost > limits.maxMonthlyEstimatedCost) {
      throw new RateLimitExceededError(
        `Budget limit reached: ${scopeName} has reached the monthly AI budget limit of \$${limits.maxMonthlyEstimatedCost.toFixed(2)}.`
      );
    }

    // Record this request
    record.timestamps.push(now);
    record.estimatedCostMonth += estimatedCost;

    return limits.maxRequestsPerMinute - record.timestamps.length;
  };

  const wsRemaining = updateUsage(workspaceUsageStore, workspaceId, wsConfig, 'Workspace');
  const userRemaining = updateUsage(userUsageStore, userId, userConfig, 'User account');

  return {
    allowed: true,
    remainingRequests: Math.min(wsRemaining, userRemaining),
  };
}

/**
 * Reset rate limit stores (useful in unit testing)
 */
export function resetRateLimitStore() {
  workspaceUsageStore.clear();
  userUsageStore.clear();
}
