'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Idea, Project, IdeaStatus } from '@/types';
import { IdeaCard } from '@/components/ideas/IdeaCard';
import { Lightbulb, Filter, Search, Tag } from 'lucide-react';

export default function IdeasPage() {
  const params = useParams();
  const workspaceId = params.workspaceId as string;

  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | IdeaStatus>('all');

  useEffect(() => {
    // Load workspace projects
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

  const fetchIdeas = async (projId: string) => {
    if (!projId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/ideas?projectId=${projId}`);
      const data = await res.json();
      if (data.ideas) {
        setIdeas(data.ideas);
      }
    } catch (err) {
      console.error('Failed to load ideas:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedProjectId) {
      fetchIdeas(selectedProjectId);
    }
  }, [selectedProjectId]);

  const handleVote = async (ideaId: string, currentVoted: boolean) => {
    try {
      const res = await fetch('/api/ideas/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ideaId, vote: currentVoted ? 0 : 1 }),
      });
      const data = await res.json();
      if (data.success) {
        setIdeas((prev) =>
          prev.map((i) =>
            i.id === ideaId
              ? { ...i, votes_count: data.votesCount, user_voted: data.userVoted }
              : i
          )
        );
      }
    } catch (err) {
      console.error('Failed to vote:', err);
    }
  };

  const handleUpdateStatus = async (ideaId: string, status: IdeaStatus) => {
    try {
      await fetch('/api/ideas', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ideaId, status }),
      });
      fetchIdeas(selectedProjectId);
    } catch (err) {
      console.error('Failed to update status:', err);
    }
  };

  const filteredIdeas = ideas.filter((idea) => {
    const matchesStatus = statusFilter === 'all' ? true : idea.status === statusFilter;
    const matchesSearch =
      searchQuery === '' ||
      idea.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      idea.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      idea.tags?.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesStatus && matchesSearch;
  });

  return (
    <div className="flex-1 overflow-y-auto p-6 max-w-6xl mx-auto w-full space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-white flex items-center space-x-2">
            <Lightbulb className="w-5 h-5 text-amber-400" />
            <span>Workspace Ideas Repository</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Browse, discuss, and vote on synthesized concepts, product hypotheses, and architectural ideas.
          </p>
        </div>

        {/* Project Selector */}
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

      {/* Filter and Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative flex-1 min-w-[240px] max-w-md">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search ideas by title, keyword, or tag..."
            className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3.5 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500"
          />
        </div>

        <div className="flex items-center space-x-1 bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs">
          {(['all', 'proposed', 'under_review', 'accepted', 'rejected', 'implemented'] as const).map(
            (s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-2.5 py-1 rounded-lg font-medium capitalize transition-colors ${
                  statusFilter === s
                    ? 'bg-slate-800 text-slate-100 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {s.replace('_', ' ')}
              </button>
            )
          )}
        </div>
      </div>

      {/* Ideas Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 h-44 animate-pulse"
            />
          ))}
        </div>
      ) : filteredIdeas.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center text-xs text-slate-400">
          No ideas found matching the current search criteria.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredIdeas.map((idea) => (
            <IdeaCard
              key={idea.id}
              idea={idea}
              onVote={handleVote}
              onUpdateStatus={handleUpdateStatus}
            />
          ))}
        </div>
      )}
    </div>
  );
}
