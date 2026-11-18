import { SupabaseClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { getAuthorizedMemberById, getAuthorizedMemberByName } from '@/lib/auth/authorized-members';
import { getStore, DEFAULT_WORKSPACE_ID } from '@/lib/store/workspace-store';

export interface AuthContext {
  user: {
    id: string;
    email?: string;
    name?: string;
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
 * Ensures request has an authenticated session via either teammind_user cookie or Supabase.
 */
export async function requireAuth(
  supabase?: SupabaseClient
): Promise<{ id: string; email?: string; name?: string; role?: 'owner' | 'member' }> {
  // 1. Check teammind_user cookie first
  try {
    const cookieStore = await cookies();
    const userCookie = cookieStore.get('teammind_user');
    if (userCookie?.value) {
      const parsed = JSON.parse(userCookie.value);
      if (parsed && parsed.id) {
        return {
          id: parsed.id,
          email: parsed.email,
          name: parsed.name,
          role: parsed.role || 'member',
        };
      }
    }
  } catch {
    // cookies() unavailable in unit test or non-request context
  }

  // 2. Check Supabase auth if client provided
  if (supabase && typeof supabase.auth?.getUser === 'function') {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();
    if (!error && user) {
      return { id: user.id, email: user.email, name: user.user_metadata?.full_name };
    }
  }

  throw new AuthorizationError('Authentication required. Please enter your name to access.', 401);
}

/**
 * Checks if user is an active member of the workspace.
 */
export async function verifyWorkspaceMembership(
  supabase: SupabaseClient,
  workspaceId: string,
  userId: string
): Promise<{ role: 'owner' | 'member' }> {
  // 1. Check if Supabase client provided and returns membership
  if (supabase && typeof supabase.from === 'function') {
    const { data, error } = await supabase
      .from('workspace_members')
      .select('role')
      .eq('workspace_id', workspaceId)
      .eq('user_id', userId)
      .maybeSingle();

    if (!error && data) {
      return { role: data.role as 'owner' | 'member' };
    }
  }

  // 2. Check authorized team member IDs
  const member = getAuthorizedMemberById(userId);
  if (member) {
    return { role: member.role };
  }

  // 3. Default store membership check
  const store = getStore();
  const ws = store.workspaces.find((w) => w.id === workspaceId);
  if (ws && (ws.created_by === userId || ws.id === DEFAULT_WORKSPACE_ID)) {
    return { role: ws.created_by === userId ? 'owner' : 'member' };
  }

  throw new AuthorizationError('Access denied: You are not an authorized member of this workspace.', 403);
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
 * Verifies project access.
 */
export async function verifyProjectAccess(
  supabase: SupabaseClient,
  projectId: string,
  userId: string
): Promise<{ workspaceId: string; role: 'owner' | 'member' }> {
  if (supabase && typeof supabase.from === 'function') {
    const { data: project, error: projError } = await supabase
      .from('projects')
      .select('workspace_id')
      .eq('id', projectId)
      .maybeSingle();

    if (!projError && project) {
      const { role } = await verifyWorkspaceMembership(supabase, project.workspace_id, userId);
      return { workspaceId: project.workspace_id, role };
    }
  }

  const store = getStore();
  const proj = store.projects.find((p) => p.id === projectId);
  if (proj) {
    const { role } = await verifyWorkspaceMembership(supabase, proj.workspace_id, userId);
    return { workspaceId: proj.workspace_id, role };
  }

  throw new AuthorizationError('Project not found or inaccessible.', 404);
}

/**
 * Verifies room access.
 */
export async function verifyRoomAccess(
  supabase: SupabaseClient,
  roomId: string,
  userId: string
): Promise<{ roomId: string; projectId: string; workspaceId: string; role: 'owner' | 'member' }> {
  if (supabase && typeof supabase.from === 'function') {
    const { data: dbRoom, error: roomError } = await supabase
      .from('rooms')
      .select('id, project_id, projects(workspace_id)')
      .eq('id', roomId)
      .maybeSingle();

    if (!roomError && dbRoom && dbRoom.projects) {
      const workspaceId = (dbRoom.projects as any).workspace_id;
      const { role } = await verifyWorkspaceMembership(supabase, workspaceId, userId);
      return {
        roomId: dbRoom.id,
        projectId: dbRoom.project_id,
        workspaceId,
        role,
      };
    }
  }

  const store = getStore();
  const room = store.rooms.find((r) => r.id === roomId);
  if (room) {
    const proj = store.projects.find((p) => p.id === room.project_id);
    const workspaceId = proj ? proj.workspace_id : DEFAULT_WORKSPACE_ID;
    const { role } = await verifyWorkspaceMembership(supabase, workspaceId, userId);
    return { roomId: room.id, projectId: room.project_id, workspaceId, role };
  }

  throw new AuthorizationError('Discussion room not found or inaccessible.', 404);
}
