import { z } from 'zod';

export const createWorkspaceSchema = z.object({
  name: z.string().min(2, 'Workspace name must be at least 2 characters').max(50, 'Workspace name too long'),
});

export const inviteMemberSchema = z.object({
  workspaceId: z.string().min(1),
  email: z.string().email('Invalid email address'),
  role: z.enum(['owner', 'member']).default('member'),
});

export const createProjectSchema = z.object({
  workspaceId: z.string().min(1),
  name: z.string().min(2, 'Project name must be at least 2 characters').max(80),
  description: z.string().max(500).optional().nullable(),
});

export const createRoomSchema = z.object({
  projectId: z.string().min(1),
  name: z.string().min(2, 'Room name must be at least 2 characters').max(80),
});

export const sendMessageSchema = z.object({
  roomId: z.string().min(1),
  content: z.string().min(1, 'Message cannot be empty').max(10000, 'Message exceeds 10,000 character limit'),
});

export const aiChatRequestSchema = z.object({
  roomId: z.string().min(1),
  prompt: z.string().min(1).max(8000, 'Prompt exceeds maximum length of 8,000 characters'),
  modelId: z.string().min(1),
  includeContext: z.boolean().default(true),
  stream: z.boolean().default(true),
});

export const aiDebateRequestSchema = z.object({
  roomId: z.string().min(1),
  prompt: z.string().min(10, 'Debate topic must be at least 10 characters').max(6000, 'Debate prompt exceeds 6,000 character limit'),
  templateId: z.enum(['opportunity_scan', 'red_team', 'feasibility_review']),
  modelIds: z.array(z.string()).min(2, 'Select at least 2 models').max(4, 'Maximum 4 models allowed per debate run'),
  synthesisModelId: z.string().min(1),
});

export const createIdeaSchema = z.object({
  projectId: z.string().min(1),
  sourceRoomId: z.string().optional().nullable(),
  sourceMessageId: z.string().optional().nullable(),
  title: z.string().min(2, 'Title must be at least 2 characters').max(150),
  description: z.string().min(5, 'Description must be at least 5 characters').max(5000),
  tags: z.array(z.string().max(30)).max(10).default([]),
  status: z.enum(['proposed', 'under_review', 'accepted', 'rejected', 'implemented']).default('proposed'),
});

export const updateIdeaStatusSchema = z.object({
  ideaId: z.string().min(1),
  status: z.enum(['proposed', 'under_review', 'accepted', 'rejected', 'implemented']),
});

export const voteIdeaSchema = z.object({
  ideaId: z.string().min(1),
  vote: z.union([z.literal(1), z.literal(0)]), // 1 to upvote, 0 to remove vote
});

export const commentIdeaSchema = z.object({
  ideaId: z.string().min(1),
  content: z.string().min(1, 'Comment cannot be empty').max(2000),
});

export const createActionItemSchema = z.object({
  projectId: z.string().min(1),
  title: z.string().min(2, 'Title must be at least 2 characters').max(150),
  description: z.string().max(2000).optional().nullable(),
  assigneeUserId: z.string().optional().nullable(),
  dueAt: z.string().datetime().optional().nullable(),
  status: z.enum(['open', 'in_progress', 'blocked', 'completed']).default('open'),
});

export const updateActionItemStatusSchema = z.object({
  actionItemId: z.string().min(1),
  status: z.enum(['open', 'in_progress', 'blocked', 'completed']),
});
