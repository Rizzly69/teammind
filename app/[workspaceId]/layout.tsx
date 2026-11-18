import React from 'react';
import { cookies } from 'next/headers';
import { WorkspaceNav } from '@/components/layout/WorkspaceNav';
import { Workspace } from '@/types';
import { getStore, DEFAULT_WORKSPACE_ID } from '@/lib/store/workspace-store';

export const dynamic = 'force-dynamic';

export default async function WorkspaceLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ workspaceId: string }>;
}) {
  const { workspaceId } = await params;
  const cookieStore = await cookies();
  const userCookie = cookieStore.get('teammind_user');

  let userEmail = 'shivansh@teammind.ai';
  let userName = 'Shivansh';

  if (userCookie?.value) {
    try {
      const parsed = JSON.parse(userCookie.value);
      userEmail = parsed.email || userEmail;
      userName = parsed.name || userName;
    } catch {
      // ignore
    }
  }

  const store = getStore();
  const workspaces: Workspace[] = store.workspaces;

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col text-slate-100">
      <WorkspaceNav
        workspaces={workspaces}
        activeWorkspaceId={workspaceId || DEFAULT_WORKSPACE_ID}
        userEmail={`${userName} (${userEmail})`}
      />
      <main className="flex-1 flex flex-col min-h-0 overflow-hidden">{children}</main>
    </div>
  );
}
