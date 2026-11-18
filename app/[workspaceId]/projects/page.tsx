'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Project, Room } from '@/types';
import {
  FolderKanban,
  Plus,
  MessagesSquare,
  ArrowRight,
  Clock,
  Sparkles,
  Users,
} from 'lucide-react';

interface ProjectWithRooms extends Project {
  rooms?: Room[];
}

export default function ProjectsPage() {
  const params = useParams();
  const router = useRouter();
  const workspaceId = params.workspaceId as string;

  const [projects, setProjects] = useState<ProjectWithRooms[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [projectName, setProjectName] = useState('');
  const [projectDesc, setProjectDesc] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/projects?workspaceId=${workspaceId}`);
      const data = await res.json();
      if (data.projects) {
        // Fetch rooms for each project
        const projsWithRooms = await Promise.all(
          data.projects.map(async (p: Project) => {
            try {
              const roomsRes = await fetch(`/api/rooms?projectId=${p.id}`);
              const roomsData = await roomsRes.json();
              return { ...p, rooms: roomsData.rooms || [] };
            } catch {
              return { ...p, rooms: [] };
            }
          })
        );
        setProjects(projsWithRooms);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load projects');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, [workspaceId]);

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectName.trim() || creating) return;

    setCreating(true);
    setError(null);
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspaceId,
          name: projectName.trim(),
          description: projectDesc.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to create project');
      }
      setProjectName('');
      setProjectDesc('');
      setShowCreateModal(false);
      fetchProjects();
    } catch (err: any) {
      setError(err.message || 'Failed to create project');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 max-w-6xl mx-auto w-full space-y-6">
      {/* Top Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-white flex items-center space-x-2">
            <FolderKanban className="w-5 h-5 text-blue-400" />
            <span>Workspace Projects</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Organize brainstorming streams, debate tracks, and knowledge repositories by initiative.
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-blue-600/20 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>New Project</span>
        </button>
      </div>

      {error && (
        <div className="p-3 bg-red-950/60 border border-red-800 rounded-xl text-xs text-red-300">
          {error}
        </div>
      )}

      {/* Projects Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2].map((i) => (
            <div
              key={i}
              className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 h-48 animate-pulse"
            />
          ))}
        </div>
      ) : projects.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center space-y-4">
          <div className="w-12 h-12 rounded-xl bg-slate-800 flex items-center justify-center mx-auto text-blue-400">
            <FolderKanban className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-semibold text-slate-200">No projects yet</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Create your first project to launch collaborative rooms, run multi-model debates, and
              save team knowledge.
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold inline-flex items-center space-x-2"
          >
            <Plus className="w-4 h-4" />
            <span>Create First Project</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {projects.map((project) => (
            <div
              key={project.id}
              className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl p-5 shadow-sm transition-all flex flex-col justify-between space-y-4"
            >
              <div>
                <div className="flex items-start justify-between">
                  <h3 className="text-base font-bold text-white tracking-tight">
                    {project.name}
                  </h3>
                  <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full border border-slate-700">
                    Active
                  </span>
                </div>

                {project.description && (
                  <p className="text-xs text-slate-400 mt-2 line-clamp-2 leading-relaxed">
                    {project.description}
                  </p>
                )}
              </div>

              {/* Discussion Rooms inside Project */}
              <div className="space-y-2 pt-2 border-t border-slate-800/80">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 flex items-center justify-between">
                  <span>Brainstorming Rooms</span>
                  <span className="text-slate-500 font-normal">
                    {project.rooms?.length || 0} room{project.rooms?.length !== 1 ? 's' : ''}
                  </span>
                </div>

                <div className="space-y-1.5">
                  {project.rooms && project.rooms.length > 0 ? (
                    project.rooms.map((room) => (
                      <button
                        key={room.id}
                        onClick={() =>
                          router.push(
                            `/${workspaceId}/projects/${project.id}/rooms/${room.id}`
                          )
                        }
                        className="w-full flex items-center justify-between p-2 rounded-xl bg-slate-950/70 hover:bg-blue-950/30 border border-slate-800/80 hover:border-blue-800/60 text-xs text-slate-200 group transition-all"
                      >
                        <div className="flex items-center space-x-2">
                          <MessagesSquare className="w-3.5 h-3.5 text-blue-400" />
                          <span className="font-medium">{room.name}</span>
                        </div>
                        <ArrowRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-blue-400 group-hover:translate-x-0.5 transition-all" />
                      </button>
                    ))
                  ) : (
                    <div className="text-xs text-slate-500 italic py-1">No rooms yet.</div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Project Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-white">Create New Project</h3>
            <form onSubmit={handleCreateProject} className="space-y-3.5">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">Project Name</label>
                <input
                  type="text"
                  required
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  placeholder="e.g. Q3 AI Integration Engine"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">Description (Optional)</label>
                <textarea
                  value={projectDesc}
                  onChange={(e) => setProjectDesc(e.target.value)}
                  placeholder="Scope, objectives, and success criteria..."
                  rows={3}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 resize-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-3 py-1.5 rounded-xl text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating || !projectName.trim()}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white rounded-xl text-xs font-semibold"
                >
                  {creating ? 'Creating...' : 'Create Project'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
