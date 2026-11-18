import { Message, Idea, ActionItem, Project, Room, Workspace, ProjectFile } from '@/types';
import { AUTHORIZED_MEMBERS } from '@/lib/auth/authorized-members';

// Shared in-memory data store for standalone deployable operation
export const DEFAULT_WORKSPACE_ID = '00000000-0000-0000-0000-000000000001';
export const DEFAULT_PROJECT_ID = 'proj-core-brainstorm-01';
export const DEFAULT_ROOM_ID = 'room-main-session-01';

interface StoreData {
  workspaces: Workspace[];
  projects: Project[];
  rooms: Room[];
  messages: Message[];
  ideas: Idea[];
  actionItems: ActionItem[];
  files: ProjectFile[];
}

// Global persistent reference across hot reloads and routes
declare global {
  var __TEAMMIND_STORE__: StoreData | undefined;
}

function initializeStore(): StoreData {
  const now = new Date().toISOString();

  return {
    workspaces: [
      {
        id: DEFAULT_WORKSPACE_ID,
        name: 'TeamMind Collaborative Workspace',
        created_by: 'user-shivansh-uuid',
        created_at: now,
        updated_at: now,
      },
    ],
    projects: [
      {
        id: DEFAULT_PROJECT_ID,
        workspace_id: DEFAULT_WORKSPACE_ID,
        name: 'Product & AI Strategy 2026',
        description:
          'Core initiative for collaborative AI brainstorming, multi-model debates, and architecture development.',
        created_by: 'user-shivansh-uuid',
        archived_at: null,
        created_at: now,
        updated_at: now,
      },
    ],
    rooms: [
      {
        id: DEFAULT_ROOM_ID,
        project_id: DEFAULT_PROJECT_ID,
        name: 'General Brainstorming',
        created_by: 'user-shivansh-uuid',
        created_at: now,
        updated_at: now,
      },
    ],
    messages: [
      {
        id: 'msg-welcome-01',
        room_id: DEFAULT_ROOM_ID,
        sender_user_id: 'user-shivansh-uuid',
        sender_type: 'user',
        model_id: null,
        content:
          'Welcome team! We can use this room to discuss ideas together, consult OpenRouter models, and run multi-model debates.',
        status: 'complete',
        created_at: new Date(Date.now() - 3600000).toISOString(),
        updated_at: new Date(Date.now() - 3600000).toISOString(),
      },
      {
        id: 'msg-welcome-02',
        room_id: DEFAULT_ROOM_ID,
        sender_user_id: null,
        sender_type: 'assistant',
        model_id: 'anthropic/claude-3.5-sonnet',
        content:
          'Hello Dana, Shivansh, Lial, and Niya! I am connected to your workspace as your collaborative AI brainstorming partner. You can ask me questions directly, compare thoughts, or launch a Multi-Model Debate to stresstest your hypotheses.',
        status: 'complete',
        metadata: { latencyMs: 140, usage: { total_tokens: 285 } },
        created_at: new Date(Date.now() - 3500000).toISOString(),
        updated_at: new Date(Date.now() - 3500000).toISOString(),
      },
    ],
    ideas: [
      {
        id: 'idea-01',
        project_id: DEFAULT_PROJECT_ID,
        source_room_id: DEFAULT_ROOM_ID,
        source_message_id: 'msg-welcome-01',
        created_by: 'user-dana-uuid',
        title: 'Multi-Perspective AI Consensus Engine',
        description:
          'Run parallel queries against Claude, GPT-4o, and Gemini, then automatically synthesize consensus and critical disagreements before taking architecture decisions.',
        status: 'accepted',
        tags: ['ai', 'strategy', 'consensus'],
        created_at: new Date(Date.now() - 1800000).toISOString(),
        updated_at: new Date(Date.now() - 1800000).toISOString(),
        votes_count: 3,
        user_voted: true,
      },
    ],
    actionItems: [
      {
        id: 'task-01',
        project_id: DEFAULT_PROJECT_ID,
        title: 'Benchmark multi-model latency across OpenRouter providers',
        description: 'Measure p95 response time for Claude 3.5 Sonnet, GPT-4o, and Gemini 2.0 Flash.',
        assignee_user_id: 'user-shivansh-uuid',
        created_by: 'user-shivansh-uuid',
        due_at: new Date(Date.now() + 86400000 * 3).toISOString(),
        status: 'in_progress',
        created_at: new Date(Date.now() - 1800000).toISOString(),
        updated_at: new Date(Date.now() - 1800000).toISOString(),
      },
      {
        id: 'task-02',
        project_id: DEFAULT_PROJECT_ID,
        title: 'Review Red-Team debate prompt templates',
        description: 'Verify failure-mode prompts uncover non-obvious engineering bottlenecks.',
        assignee_user_id: 'user-niya-uuid',
        created_by: 'user-dana-uuid',
        due_at: new Date(Date.now() + 86400000 * 5).toISOString(),
        status: 'open',
        created_at: new Date(Date.now() - 1200000).toISOString(),
        updated_at: new Date(Date.now() - 1200000).toISOString(),
      },
    ],
    files: [
      {
        id: 'file-01',
        project_id: DEFAULT_PROJECT_ID,
        uploaded_by: 'user-lial-uuid',
        storage_path: 'projects/core/architecture-spec.md',
        file_name: 'architecture-spec.md',
        mime_type: 'text/markdown',
        file_size: 14320,
        created_at: new Date(Date.now() - 7200000).toISOString(),
      },
    ],
  };
}

export function getStore(): StoreData {
  if (!global.__TEAMMIND_STORE__) {
    global.__TEAMMIND_STORE__ = initializeStore();
  }
  return global.__TEAMMIND_STORE__;
}
