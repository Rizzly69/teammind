import { describe, it, expect } from 'vitest';
import {
  createWorkspaceSchema,
  inviteMemberSchema,
  createProjectSchema,
  createRoomSchema,
  sendMessageSchema,
  aiChatRequestSchema,
  aiDebateRequestSchema,
  createIdeaSchema,
  voteIdeaSchema,
  createActionItemSchema,
} from '@/lib/validation/schemas';

describe('Validation Schemas & Input Constraints', () => {
  it('Validates workspace creation payload', () => {
    expect(createWorkspaceSchema.safeParse({ name: 'Acme Corp' }).success).toBe(true);
    expect(createWorkspaceSchema.safeParse({ name: 'A' }).success).toBe(false); // too short
  });

  it('Validates invitation email format and role enum', () => {
    const valid = inviteMemberSchema.safeParse({
      workspaceId: '123e4567-e89b-12d3-a456-426614174000',
      email: 'alice@company.com',
      role: 'member',
    });
    expect(valid.success).toBe(true);

    const invalidEmail = inviteMemberSchema.safeParse({
      workspaceId: '123e4567-e89b-12d3-a456-426614174000',
      email: 'not-an-email',
      role: 'member',
    });
    expect(invalidEmail.success).toBe(false);
  });

  it('Enforces message character limits (max 10,000 characters)', () => {
    const valid = sendMessageSchema.safeParse({
      roomId: '123e4567-e89b-12d3-a456-426614174000',
      content: 'Here is our brainstorming update',
    });
    expect(valid.success).toBe(true);

    const tooLong = sendMessageSchema.safeParse({
      roomId: '123e4567-e89b-12d3-a456-426614174000',
      content: 'a'.repeat(10001),
    });
    expect(tooLong.success).toBe(false);
  });

  it('Enforces debate parameters: at least 2 models, max 4 models', () => {
    const valid = aiDebateRequestSchema.safeParse({
      roomId: '123e4567-e89b-12d3-a456-426614174000',
      prompt: 'Should we replace REST with gRPC for internal service communications?',
      templateId: 'red_team',
      modelIds: ['anthropic/claude-3.5-sonnet', 'openai/gpt-4o'],
      synthesisModelId: 'anthropic/claude-3.5-sonnet',
    });
    expect(valid.success).toBe(true);

    // Only 1 model -> should fail
    const tooFew = aiDebateRequestSchema.safeParse({
      roomId: '123e4567-e89b-12d3-a456-426614174000',
      prompt: 'Should we replace REST with gRPC for internal service communications?',
      templateId: 'red_team',
      modelIds: ['anthropic/claude-3.5-sonnet'],
      synthesisModelId: 'anthropic/claude-3.5-sonnet',
    });
    expect(tooFew.success).toBe(false);

    // 5 models -> should fail (capped at 4)
    const tooMany = aiDebateRequestSchema.safeParse({
      roomId: '123e4567-e89b-12d3-a456-426614174000',
      prompt: 'Should we replace REST with gRPC for internal service communications?',
      templateId: 'red_team',
      modelIds: ['m1', 'm2', 'm3', 'm4', 'm5'],
      synthesisModelId: 'm1',
    });
    expect(tooMany.success).toBe(false);
  });

  it('11. Enforces vote values (1 to upvote, 0 to cancel/remove)', () => {
    const voteUp = voteIdeaSchema.safeParse({
      ideaId: '123e4567-e89b-12d3-a456-426614174000',
      vote: 1,
    });
    expect(voteUp.success).toBe(true);

    const voteRemove = voteIdeaSchema.safeParse({
      ideaId: '123e4567-e89b-12d3-a456-426614174000',
      vote: 0,
    });
    expect(voteRemove.success).toBe(true);

    // Invalid arbitrary vote number (e.g. attempting to cast +10 votes)
    const invalidVote = voteIdeaSchema.safeParse({
      ideaId: '123e4567-e89b-12d3-a456-426614174000',
      vote: 10,
    });
    expect(invalidVote.success).toBe(false);
  });
});
