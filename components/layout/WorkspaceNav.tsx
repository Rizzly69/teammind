'use client';

import React from 'react';
import Link from 'next/navigation';
import { usePathname, useRouter } from 'next/navigation';
import {
  Layers,
  FolderKanban,
  Lightbulb,
  CheckSquare,
  Settings,
  Plus,
  LogOut,
  Sparkles,
} from 'lucide-react';
import { Workspace } from '@/types';

interface WorkspaceNavProps {
  workspaces: Workspace[];
  activeWorkspaceId: string;
  userEmail?: string;
}

export function WorkspaceNav({
  workspaces,
  activeWorkspaceId,
  userEmail,
}: WorkspaceNavProps) {
  const pathname = usePathname();
  const router = useRouter();

  const activeWorkspace = workspaces.find((w) => w.id === activeWorkspaceId) || workspaces[0];

  const navLinks = [
    {
      name: 'Projects & Rooms',
      href: `/${activeWorkspaceId}/projects`,
      icon: FolderKanban,
      active: pathname.includes('/projects'),
    },
    {
      name: 'Ideas Repository',
      href: `/${activeWorkspaceId}/ideas`,
      icon: Lightbulb,
      active: pathname.includes('/ideas'),
    },
    {
      name: 'Action Items',
      href: `/${activeWorkspaceId}/action-items`,
      icon: CheckSquare,
      active: pathname.includes('/action-items'),
    },
    {
      name: 'Workspace Settings',
      href: `/${activeWorkspaceId}/settings`,
      icon: Settings,
      active: pathname.includes('/settings'),
    },
  ];

  const handleWorkspaceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const nextWsId = e.target.value;
    if (nextWsId === '__new__') {
      const name = prompt('Enter new workspace name:');
      if (name && name.trim()) {
        fetch('/api/workspaces', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: name.trim() }),
        })
          .then((res) => res.json())
          .then((data) => {
            if (data.workspace?.id) {
              router.push(`/${data.workspace.id}/projects`);
            }
          })
          .catch(console.error);
      }
    } else {
      router.push(`/${nextWsId}/projects`);
    }
  };

  return (
    <header className="border-b border-slate-800 bg-slate-900/95 backdrop-blur px-4 py-2.5 flex items-center justify-between sticky top-0 z-30">
      <div className="flex items-center space-x-6">
        {/* Brand */}
        <div className="flex items-center space-x-2 font-bold text-white tracking-tight text-lg">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
            <Sparkles className="w-4 h-4" />
          </div>
          <span>TeamMind</span>
        </div>

        {/* Workspace Switcher */}
        <div className="relative flex items-center bg-slate-950/80 border border-slate-700/80 rounded-lg px-2.5 py-1 text-sm text-slate-200">
          <Layers className="w-4 h-4 text-blue-400 mr-2 shrink-0" />
          <select
            value={activeWorkspaceId}
            onChange={handleWorkspaceChange}
            className="bg-transparent text-sm font-medium focus:outline-none cursor-pointer pr-4"
          >
            {workspaces.map((ws) => (
              <option key={ws.id} value={ws.id} className="bg-slate-900 text-slate-200">
                {ws.name}
              </option>
            ))}
            <option value="__new__" className="bg-slate-900 text-blue-400 font-medium">
              + Create Workspace...
            </option>
          </select>
        </div>

        {/* Navigation Tabs */}
        <nav className="hidden md:flex items-center space-x-1">
          {navLinks.map((link) => {
            const Icon = link.icon;
            return (
              <button
                key={link.name}
                onClick={() => router.push(link.href)}
                className={`flex items-center space-x-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  link.active
                    ? 'bg-slate-800 text-blue-400 border border-slate-700/70 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{link.name}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* User profile & actions */}
      <div className="flex items-center space-x-3">
        {userEmail && (
          <div className="text-xs text-slate-400 hidden sm:block">
            Signed in as <span className="text-slate-200 font-medium">{userEmail}</span>
          </div>
        )}
        <button
          onClick={async () => {
            await fetch('/api/auth/signout', { method: 'POST' }).catch(() => {});
            window.location.href = '/login';
          }}
          title="Sign out"
          className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-800/80 rounded-md transition-colors"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
}
