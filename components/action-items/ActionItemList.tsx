'use client';

import React, { useState } from 'react';
import { ActionItem, ActionItemStatus } from '@/types';
import {
  CheckCircle2,
  Circle,
  AlertCircle,
  Clock,
  Plus,
  User,
  Calendar,
} from 'lucide-react';

interface ActionItemListProps {
  actionItems: ActionItem[];
  onUpdateStatus: (id: string, status: ActionItemStatus) => Promise<void>;
  onCreateItem: (item: {
    title: string;
    description?: string;
    status: ActionItemStatus;
    dueAt?: string;
  }) => Promise<void>;
}

const STATUS_ICONS: Record<ActionItemStatus, any> = {
  open: Circle,
  in_progress: Clock,
  blocked: AlertCircle,
  completed: CheckCircle2,
};

const STATUS_COLORS: Record<ActionItemStatus, { bg: string; text: string; border: string }> = {
  open: { bg: 'bg-slate-800/80', text: 'text-slate-400', border: 'border-slate-700' },
  in_progress: { bg: 'bg-blue-950/60', text: 'text-blue-400', border: 'border-blue-800/60' },
  blocked: { bg: 'bg-rose-950/60', text: 'text-rose-400', border: 'border-rose-800/60' },
  completed: { bg: 'bg-emerald-950/60', text: 'text-emerald-400', border: 'border-emerald-800/60' },
};

export function ActionItemList({
  actionItems,
  onUpdateStatus,
  onCreateItem,
}: ActionItemListProps) {
  const [filter, setFilter] = useState<'all' | ActionItemStatus>('all');
  const [showAddForm, setShowAddForm] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<ActionItemStatus>('open');
  const [dueDate, setDueDate] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const filteredItems = actionItems.filter((item) =>
    filter === 'all' ? true : item.status === filter
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await onCreateItem({
        title: title.trim(),
        description: description.trim() || undefined,
        status,
        dueAt: dueDate ? new Date(dueDate).toISOString() : undefined,
      });
      setTitle('');
      setDescription('');
      setDueDate('');
      setShowAddForm(false);
    } catch (err) {
      console.error('Failed to create action item:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Filter and Add button */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center space-x-1 bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs">
          {(['all', 'open', 'in_progress', 'blocked', 'completed'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`px-2.5 py-1 rounded-md font-medium capitalize transition-colors ${
                filter === s
                  ? 'bg-slate-800 text-slate-100 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {s.replace('_', ' ')}
            </button>
          ))}
        </div>

        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center space-x-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Action Item</span>
        </button>
      </div>

      {/* Add Item Form */}
      {showAddForm && (
        <form onSubmit={handleSubmit} className="bg-slate-900 border border-slate-700/80 rounded-xl p-4 space-y-3">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-300">
            Create Action Item
          </h4>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Action item title (e.g. Conduct user interviews for MVP)"
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500"
            required
          />
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Description or acceptance criteria..."
            rows={2}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 resize-none"
          />
          <div className="flex flex-wrap items-center gap-3">
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as ActionItemStatus)}
              className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none"
            >
              <option value="open">Open</option>
              <option value="in_progress">In Progress</option>
              <option value="blocked">Blocked</option>
              <option value="completed">Completed</option>
            </select>

            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-slate-300 focus:outline-none"
            />

            <div className="flex-1 flex justify-end space-x-2">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="px-3 py-1.5 rounded-lg text-xs text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !title.trim()}
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white rounded-lg text-xs font-semibold"
              >
                {isSubmitting ? 'Saving...' : 'Save Task'}
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Task List */}
      {filteredItems.length === 0 ? (
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-8 text-center text-slate-400 text-xs">
          No action items found matching this filter.
        </div>
      ) : (
        <div className="space-y-2">
          {filteredItems.map((item) => {
            const Icon = STATUS_ICONS[item.status] || Circle;
            const style = STATUS_COLORS[item.status] || STATUS_COLORS.open;

            return (
              <div
                key={item.id}
                className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 flex items-start space-x-3 hover:border-slate-700 transition-all"
              >
                {/* Status Toggle Button */}
                <button
                  onClick={() => {
                    const nextStatus: ActionItemStatus =
                      item.status === 'completed'
                        ? 'open'
                        : item.status === 'open'
                        ? 'in_progress'
                        : item.status === 'in_progress'
                        ? 'completed'
                        : 'open';
                    onUpdateStatus(item.id, nextStatus);
                  }}
                  className={`mt-0.5 p-1 rounded-lg ${style.text} hover:bg-slate-800 transition-colors`}
                  title={`Status: ${item.status}. Click to cycle.`}
                >
                  <Icon className="w-4 h-4" />
                </button>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-1">
                    <span
                      className={`text-xs font-semibold ${
                        item.status === 'completed' ? 'line-through text-slate-500' : 'text-slate-200'
                      }`}
                    >
                      {item.title}
                    </span>
                    <span
                      className={`text-[10px] font-medium px-2 py-0.5 rounded-full border uppercase tracking-wider ${style.bg} ${style.text} ${style.border}`}
                    >
                      {item.status.replace('_', ' ')}
                    </span>
                  </div>

                  {item.description && (
                    <p className="text-xs text-slate-400 mb-2 leading-relaxed">
                      {item.description}
                    </p>
                  )}

                  <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500">
                    {item.due_at && (
                      <div className="flex items-center space-x-1 text-slate-400">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>Due {new Date(item.due_at).toLocaleDateString()}</span>
                      </div>
                    )}
                    {item.assignee_profile && (
                      <div className="flex items-center space-x-1">
                        <User className="w-3.5 h-3.5" />
                        <span>{item.assignee_profile.display_name}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
