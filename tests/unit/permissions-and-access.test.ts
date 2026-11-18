import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  requireAuth,
  verifyWorkspaceMembership,
  verifyWorkspaceOwner,
  verifyProjectAccess,
  verifyRoomAccess,
  AuthorizationError,
} from '@/lib/permissions/workspace';

describe('Permissions & Authorization Model (Cross-Workspace Security)', () => {
  const mockSupabase = {
    auth: {
      getUser: vi.fn(),
    },
    from: vi.fn(),
  } as any;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('1. Throws 401 when no session exists in requireAuth', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: new Error('No session'),
    });

    await expect(requireAuth(mockSupabase)).rejects.toThrow(AuthorizationError);
    await expect(requireAuth(mockSupabase)).rejects.toThrow(/Authentication required/);
  });

  it('2. Verifies valid workspace membership for member user', async () => {
    mockSupabase.from.mockReturnValueOnce({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValueOnce({
        data: { role: 'member' },
        error: null,
      }),
    });

    const result = await verifyWorkspaceMembership(
      mockSupabase,
      'workspace-1',
      'user-member'
    );
    expect(result.role).toBe('member');
  });

  it('3. Denies cross-workspace access when user is not a workspace member', async () => {
    // User tries accessing Workspace B while belonging only to Workspace A
    mockSupabase.from.mockReturnValueOnce({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValueOnce({
        data: null,
        error: null,
      }),
    });

    await expect(
      verifyWorkspaceMembership(mockSupabase, 'workspace-B', 'user-A')
    ).rejects.toThrow(AuthorizationError);
  });

  it('4. Denies non-owner from performing owner-only actions', async () => {
    mockSupabase.from.mockReturnValueOnce({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValueOnce({
        data: { role: 'member' }, // only a member, not owner
        error: null,
      }),
    });

    await expect(
      verifyWorkspaceOwner(mockSupabase, 'workspace-1', 'user-member')
    ).rejects.toThrow(/Only workspace owners/);
  });

  it('5. Project permission check denies access if project belongs to another workspace', async () => {
    // Project lookup returns workspace-2
    mockSupabase.from.mockReturnValueOnce({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValueOnce({
        data: { workspace_id: 'workspace-2' },
        error: null,
      }),
    });

    // Membership check for user in workspace-2 returns null (unauthorized)
    mockSupabase.from.mockReturnValueOnce({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValueOnce({
        data: null,
        error: null,
      }),
    });

    await expect(
      verifyProjectAccess(mockSupabase, 'proj-123', 'user-from-workspace-1')
    ).rejects.toThrow(AuthorizationError);
  });

  it('6. Room permission check denies access to rooms outside user workspace', async () => {
    // Room lookup
    mockSupabase.from.mockReturnValueOnce({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValueOnce({
        data: { id: 'room-1', project_id: 'proj-1', projects: { workspace_id: 'workspace-unauthorized' } },
        error: null,
      }),
    });

    // User is not a member of workspace-unauthorized
    mockSupabase.from.mockReturnValueOnce({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValueOnce({
        data: null,
        error: null,
      }),
    });

    await expect(
      verifyRoomAccess(mockSupabase, 'room-1', 'attacker-user')
    ).rejects.toThrow(AuthorizationError);
  });
});
