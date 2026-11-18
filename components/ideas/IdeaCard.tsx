'use client';

import React, { useState } from 'react';
import { Idea, IdeaComment, IdeaStatus } from '@/types';
import {
  ThumbsUp,
  MessageSquare,
  Tag,
  Clock,
  Send,
  CheckCircle,
  Clock3,
  XCircle,
  HelpCircle,
  Rocket,
} from 'lucide-react';

interface IdeaCardProps {
  idea: Idea;
  onVote: (ideaId: string, currentVoted: boolean) => Promise<void>;
  onUpdateStatus: (ideaId: string, status: IdeaStatus) => Promise<void>;
}

const STATUS_CONFIG: Record<
  IdeaStatus,
  { label: string; bg: string; text: string; border: string; icon: any }
> = {
  proposed: {
    label: 'Proposed',
    bg: 'bg-blue-950/60',
    text: 'text-blue-400',
    border: 'border-blue-800/60',
    icon: HelpCircle,
  },
  under_review: {
    label: 'Under Review',
    bg: 'bg-amber-950/60',
    text: 'text-amber-400',
    border: 'border-amber-800/60',
    icon: Clock3,
  },
  accepted: {
    label: 'Accepted',
    bg: 'bg-emerald-950/60',
    text: 'text-emerald-400',
    border: 'border-emerald-800/60',
    icon: CheckCircle,
  },
  rejected: {
    label: 'Rejected',
    bg: 'bg-rose-950/60',
    text: 'text-rose-400',
    border: 'border-rose-800/60',
    icon: XCircle,
  },
  implemented: {
    label: 'Implemented',
    bg: 'bg-purple-950/60',
    text: 'text-purple-400',
    border: 'border-purple-800/60',
    icon: Rocket,
  },
};

export function IdeaCard({ idea, onVote, onUpdateStatus }: IdeaCardProps) {
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<IdeaComment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loadingComments, setLoadingComments] = useState(false);
  const [submittingComment, setSubmittingComment] = useState(false);

  const statusInfo = STATUS_CONFIG[idea.status] || STATUS_CONFIG.proposed;
  const StatusIcon = statusInfo.icon;

  const toggleComments = async () => {
    if (!showComments && comments.length === 0) {
      setLoadingComments(true);
      try {
        const res = await fetch(`/api/ideas/comments?ideaId=${idea.id}`);
        const data = await res.json();
        if (data.comments) {
          setComments(data.comments);
        }
      } catch (err) {
        console.error('Failed to load comments:', err);
      } finally {
        setLoadingComments(false);
      }
    }
    setShowComments(!showComments);
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || submittingComment) return;

    setSubmittingComment(true);
    try {
      const res = await fetch('/api/ideas/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ideaId: idea.id, content: newComment.trim() }),
      });
      const data = await res.json();
      if (data.comment) {
        setComments([...comments, data.comment]);
        setNewComment('');
      }
    } catch (err) {
      console.error('Failed to submit comment:', err);
    } finally {
      setSubmittingComment(false);
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm hover:border-slate-700 transition-all flex flex-col space-y-3">
      {/* Top Header: Status & Vote */}
      <div className="flex items-center justify-between">
        {/* Status Dropdown */}
        <div className="relative">
          <select
            value={idea.status}
            onChange={(e) => onUpdateStatus(idea.id, e.target.value as IdeaStatus)}
            className={`appearance-none text-xs font-semibold px-2.5 py-1 rounded-full border ${statusInfo.bg} ${statusInfo.text} ${statusInfo.border} cursor-pointer focus:outline-none pr-6`}
          >
            <option value="proposed" className="bg-slate-900 text-slate-200">Proposed</option>
            <option value="under_review" className="bg-slate-900 text-slate-200">Under Review</option>
            <option value="accepted" className="bg-slate-900 text-slate-200">Accepted</option>
            <option value="rejected" className="bg-slate-900 text-slate-200">Rejected</option>
            <option value="implemented" className="bg-slate-900 text-slate-200">Implemented</option>
          </select>
        </div>

        {/* Upvote Button (1 vote per user toggle) */}
        <button
          onClick={() => onVote(idea.id, !!idea.user_voted)}
          className={`flex items-center space-x-1.5 px-3 py-1 rounded-lg text-xs font-semibold border transition-all ${
            idea.user_voted
              ? 'bg-blue-600 border-blue-500 text-white shadow-sm'
              : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
          }`}
          title={idea.user_voted ? 'Remove your upvote' : 'Vote for this idea'}
        >
          <ThumbsUp className={`w-3.5 h-3.5 ${idea.user_voted ? 'fill-current' : ''}`} />
          <span>{idea.votes_count || 0}</span>
        </button>
      </div>

      {/* Idea Title & Description */}
      <div>
        <h4 className="text-sm font-semibold text-slate-100 mb-1">{idea.title}</h4>
        <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap">
          {idea.description}
        </p>
      </div>

      {/* Tags */}
      {idea.tags && idea.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-1">
          {idea.tags.map((tag) => (
            <span
              key={tag}
              className="text-[11px] bg-slate-800/80 text-slate-400 px-2 py-0.5 rounded-md border border-slate-700/60"
            >
              #{tag}
            </span>
          ))}
        </div>
      )}

      {/* Footer Info & Comments Toggle */}
      <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-500">
        <div className="flex items-center space-x-2">
          <Clock className="w-3.5 h-3.5" />
          <span>{new Date(idea.created_at).toLocaleDateString()}</span>
        </div>

        <button
          onClick={toggleComments}
          className="flex items-center space-x-1 text-slate-400 hover:text-slate-200 transition-colors"
        >
          <MessageSquare className="w-3.5 h-3.5" />
          <span>{showComments ? 'Hide comments' : 'Comments'}</span>
        </button>
      </div>

      {/* Comments Drawer */}
      {showComments && (
        <div className="pt-2 space-y-2 border-t border-slate-800/70">
          {loadingComments ? (
            <div className="text-xs text-slate-500 text-center py-2">Loading comments...</div>
          ) : comments.length === 0 ? (
            <div className="text-xs text-slate-500 text-center py-1">No comments yet. Start the discussion!</div>
          ) : (
            <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
              {comments.map((c) => (
                <div key={c.id} className="bg-slate-950 p-2 rounded-lg text-xs border border-slate-800/80">
                  <div className="flex items-center justify-between text-[10px] text-slate-500 mb-0.5">
                    <span className="font-semibold text-slate-300">
                      {c.author_profile?.display_name || 'Member'}
                    </span>
                    <span>{new Date(c.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <div className="text-slate-300">{c.content}</div>
                </div>
              ))}
            </div>
          )}

          {/* Comment Form */}
          <form onSubmit={handleAddComment} className="flex items-center space-x-2 pt-1">
            <input
              type="text"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Add your thoughts or feedback..."
              className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
            <button
              type="submit"
              disabled={!newComment.trim() || submittingComment}
              className="p-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white rounded-lg transition-colors"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
