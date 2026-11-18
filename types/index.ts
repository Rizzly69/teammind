export type WorkspaceRole = 'owner' | 'member';

export interface Profile {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  created_at: string;
}

export interface Workspace {
  id: string;
  name: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface WorkspaceMember {
  id: string;
  workspace_id: string;
  user_id: string;
  role: WorkspaceRole;
  joined_at: string;
  profile?: Profile;
}

export interface Project {
  id: string;
  workspace_id: string;
  name: string;
  description: string | null;
  created_by: string;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Room {
  id: string;
  project_id: string;
  name: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export type SenderType = 'user' | 'assistant' | 'system';
export type MessageStatus = 'pending' | 'complete' | 'failed';

export interface Message {
  id: string;
  room_id: string;
  sender_user_id: string | null;
  sender_type: SenderType;
  model_id: string | null;
  content: string;
  status: MessageStatus;
  metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
  sender_profile?: Profile;
}

export type AIRunType = 'single' | 'debate' | 'synthesis';
export type AIRunStatus = 'queued' | 'running' | 'complete' | 'partial' | 'failed';

export interface AIRun {
  id: string;
  room_id: string;
  requested_by: string;
  run_type: AIRunType;
  status: AIRunStatus;
  prompt: string;
  model_ids: string[];
  usage_metadata: Record<string, any>;
  error_summary: string | null;
  created_at: string;
  completed_at: string | null;
  responses?: AIRunResponse[];
}

export interface AIRunResponse {
  id: string;
  ai_run_id: string;
  model_id: string;
  response: string | null;
  status: 'pending' | 'complete' | 'failed';
  input_tokens: number | null;
  output_tokens: number | null;
  latency_ms: number | null;
  error_message: string | null;
  created_at: string;
}

export type IdeaStatus = 'proposed' | 'under_review' | 'accepted' | 'rejected' | 'implemented';

export interface Idea {
  id: string;
  project_id: string;
  source_room_id: string | null;
  source_message_id: string | null;
  created_by: string;
  title: string;
  description: string;
  status: IdeaStatus;
  tags: string[];
  created_at: string;
  updated_at: string;
  author_profile?: Profile;
  votes_count?: number;
  user_voted?: boolean;
}

export interface IdeaComment {
  id: string;
  idea_id: string;
  user_id: string;
  content: string;
  created_at: string;
  updated_at: string;
  author_profile?: Profile;
}

export interface IdeaVote {
  id: string;
  idea_id: string;
  user_id: string;
  vote: number;
  created_at: string;
}

export type ActionItemStatus = 'open' | 'in_progress' | 'blocked' | 'completed';

export interface ActionItem {
  id: string;
  project_id: string;
  title: string;
  description: string | null;
  assignee_user_id: string | null;
  created_by: string;
  due_at: string | null;
  status: ActionItemStatus;
  created_at: string;
  updated_at: string;
  assignee_profile?: Profile;
}

export interface ProjectFile {
  id: string;
  project_id: string;
  uploaded_by: string;
  storage_path: string;
  file_name: string;
  mime_type: string;
  file_size: number;
  created_at: string;
  uploader_profile?: Profile;
}

export interface ModelOption {
  id: string;
  name: string;
  provider: string;
  description: string;
  contextWindow: number;
  isDebateRecommended?: boolean;
}

export type DebateTemplateId = 'opportunity_scan' | 'red_team' | 'feasibility_review';

export interface DebateTemplate {
  id: DebateTemplateId;
  name: string;
  description: string;
  systemPromptAddition: string;
}
