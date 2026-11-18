import { SupabaseClient } from '@supabase/supabase-js';

export interface AuthContext {
  user: {
    id: string;
    email?: string;
  };
  memberRole?: 'owner' | 'member';
}

export class AuthorizationError extends Error {
  public statusCode: number;
  constructor(message: string, statusCode = 403) {
    super(message);
    this.name = 'AuthorizationError';
    this.statusCode = statusCode;
  }
}

/**
 * Ensures request has an authenticated session.
 */
export async function requireAuth(supabase: SupabaseClient): Promise<{ id: string; email?: string }> {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) {
    throw new AuthorizationError('Authentication required. Please sign in.', 401);
  }
  return { id: user.id, email: user.email };
}

/**
 * Checks if user is an active member of the workspace.
 */
export async function verifyWorkspaceMembership(
  supabase: SupabaseClient,
  workspaceId: string,
  userId: string
): Promise<{ role: 'owner' | 'member' }> {
  const { data, error } = await supabase
    .from('workspace_members')
    .select('role')
    .eq('workspace_id', workspaceId)
    .eq('user_id', userId)
    .maybeSingle();

  if (error || !data) {
    throw new AuthorizationError('Access denied: You are not a member of this workspace.', 403);
  }

  return { role: data.role as 'owner' | 'member' };
}

/**
 * Checks if user is an owner of the workspace.
 */
export async function verifyWorkspaceOwner(
  supabase: SupabaseClient,
  workspaceId: string,
  userId: string
): Promise<void> {
  const { role } = await verifyWorkspaceMembership(supabase, workspaceId, userId);
  if (role !== 'owner') {
    throw new AuthorizationError('Forbidden: Only workspace owners can perform this action.', 403);
  }
}

/**
 * Verifies that the user has access to the given project via their workspace membership.
 */
export async function verifyProjectAccess(
  supabase: SupabaseClient,
  projectId: string,
  userId: string
): Promise<{ workspaceId: string; role: 'owner' | 'member' }> {
  const { data: project, error: projError } = await supabase
    .from('projects')
    .select('workspace_id')
    .eq('id', projectId)
    .maybeSingle();

  if (projError || !project) {
    throw new AuthorizationError('Project not found or inaccessible.', 404);
  }

  const { role } = await verifyWorkspaceMembership(supabase, project.workspace_id, userId);
  return { workspaceId: project.workspace_id, role };
}

/**
 * Verifies that the user has access to the given room via project and workspace.
 */
export async function verifyRoomAccess(
  supabase: SupabaseClient,
  roomId: string,
  userId: string
): Promise<{ roomId: string; projectId: string; workspaceId: string; role: 'owner' | 'member' }> {
  const { data: room, error: roomError } = await supabase
    .from('rooms')
    .select('id, project_id, projects(workspace_id)')
    .eq('id', roomId)
    .maybeSingle();

  if (roomError || !room || !room.projects) {
    throw new AuthorizationError('Discussion room not found or inaccessible.', 404);
  }

  const workspaceId = (room.projects as any).workspace_id;
  const { role } = await verifyWorkspaceMembership(supabase, workspaceId, userId);

  return {
    roomId: room.id,
    projectId: room.project_id,
    workspaceId,
    role,
  };
}
