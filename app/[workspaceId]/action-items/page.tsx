'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { ActionItem, Project, ActionItemStatus } from '@/types';
import { ActionItemList } from '@/components/action-items/ActionItemList';
import { CheckSquare } from 'lucide-react';

export default function ActionItemsPage() {
  const params = useParams();
  const workspaceId = params.workspaceId as string;

  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [actionItems, setActionItems] = useState<ActionItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/projects?workspaceId=${workspaceId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.projects && data.projects.length > 0) {
          setProjects(data.projects);
          setSelectedProjectId(data.projects[0].id);
        }
      })
      .catch(console.error);
  }, [workspaceId]);

  const fetchTasks = async (projId: string) => {
    if (!projId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/action-items?projectId=${projId}`);
      const data = await res.json();
      if (data.actionItems) {
        setActionItems(data.actionItems);
      }
    } catch (err) {
      console.error('Failed to load tasks:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedProjectId) {
      fetchTasks(selectedProjectId);
    }
  }, [selectedProjectId]);

  const handleUpdateStatus = async (id: string, status: ActionItemStatus) => {
    try {
      await fetch('/api/action-items', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actionItemId: id, status }),
      });
      fetchTasks(selectedProjectId);
    } catch (err) {
      console.error('Failed to update task:', err);
    }
  };

  const handleCreateItem = async (item: {
    title: string;
    description?: string;
    status: ActionItemStatus;
    dueAt?: string;
  }) => {
    await fetch('/api/action-items', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...item, projectId: selectedProjectId }),
    });
    fetchTasks(selectedProjectId);
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 max-w-5xl mx-auto w-full space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-white flex items-center space-x-2">
            <CheckSquare className="w-5 h-5 text-emerald-400" />
            <span>Workspace Action Items</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Track implementation milestones, assigned responsibilities, and team deliverables.
          </p>
        </div>

        {projects.length > 0 && (
          <div className="flex items-center space-x-2 bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-300">
            <span className="text-slate-500">Project:</span>
            <select
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              className="bg-transparent font-medium focus:outline-none cursor-pointer pr-2 text-slate-100"
            >
              {projects.map((p) => (
                <option key={p.id} value={p.id} className="bg-slate-900 text-slate-200">
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 h-16 animate-pulse" />
          ))}
        </div>
      ) : (
        <ActionItemList
          actionItems={actionItems}
          onUpdateStatus={handleUpdateStatus}
          onCreateItem={handleCreateItem}
        />
      )}
    </div>
  );
}
