import React from 'react';
import { notFound, redirect } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { WorkspaceNav } from '@/components/layout/WorkspaceNav';
import { Workspace } from '@/types';

export const dynamic = 'force-dynamic';

export default async function WorkspaceLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ workspaceId: string }>;
}) {
  const { workspaceId } = await params;
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    // If not signed in and using real supabase, redirect to login
    // In local dev/mock mode, provide a fallback user context
  }

  // Fetch workspaces the user is a member of
  const { data: memberships } = await supabase
    .from('workspace_members')
    .select('role, workspaces (id, name, created_by, created_at, updated_at)')
    .eq('user_id', user?.id || 'demo-user');

  let workspaces: Workspace[] = (memberships || [])
    .map((m: any) => m.workspaces)
    .filter((w): w is Workspace => !!w && !!w.id);

  // Fallback default workspace if none found (e.g. initial setup)
  if (workspaces.length === 0) {
    workspaces = [
      {
        id: workspaceId,
        name: 'Product & Engineering Workspace',
        created_by: user?.id || 'demo-user',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ];
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col text-slate-100">
      <WorkspaceNav
        workspaces={workspaces}
        activeWorkspaceId={workspaceId}
        userEmail={user?.email || 'team-member@teammind.io'}
      />
      <main className="flex-1 flex flex-col min-h-0 overflow-hidden">{children}</main>
    </div>
  );
}
