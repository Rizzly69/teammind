'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Message, Idea, ActionItem, DebateTemplateId } from '@/types';
import { MessageList } from '@/components/chat/MessageList';
import { ChatComposer } from '@/components/chat/ChatComposer';
import { DebateModal } from '@/components/debate/DebateModal';
import { IdeaCard } from '@/components/ideas/IdeaCard';
import { ActionItemList } from '@/components/action-items/ActionItemList';
import { DocumentPanel } from '@/components/files/DocumentPanel';
import { createClient } from '@/lib/supabase/client';
import {
  MessagesSquare,
  PanelRightClose,
  PanelRightOpen,
  FolderKanban,
  Lightbulb,
  CheckSquare,
  FileText,
  X,
  Sparkles,
} from 'lucide-react';

export default function RoomPage() {
  const params = useParams();
  const router = useRouter();
  const workspaceId = params.workspaceId as string;
  const projectId = params.projectId as string;
  const roomId = params.roomId as string;

  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [showDebateModal, setShowDebateModal] = useState(false);
  const [debateInitialPrompt, setDebateInitialPrompt] = useState('');
  const [rightPanelTab, setRightPanelTab] = useState<'ideas' | 'tasks' | 'docs'>('ideas');
  const [showRightPanel, setShowRightPanel] = useState(true);

  // Ideas state for right panel
  const [projectIdeas, setProjectIdeas] = useState<Idea[]>([]);
  // Action items for right panel
  const [actionItems, setActionItems] = useState<ActionItem[]>([]);

  // "Save as Idea" Modal
  const [showIdeaModal, setShowIdeaModal] = useState(false);
  const [ideaTitle, setIdeaTitle] = useState('');
  const [ideaDesc, setIdeaDesc] = useState('');
  const [ideaTags, setIdeaTags] = useState('');
  const [sourceMessageId, setSourceMessageId] = useState<string | null>(null);

  // Fetch initial messages
  const fetchMessages = async () => {
    try {
      const res = await fetch(`/api/rooms/${roomId}/messages`);
      const data = await res.json();
      if (data.messages) {
        setMessages(data.messages);
      }
    } catch (err) {
      console.error('Failed to load messages:', err);
    } finally {
      setLoadingMessages(false);
    }
  };

  // Fetch project ideas
  const fetchIdeas = async () => {
    try {
      const res = await fetch(`/api/ideas?projectId=${projectId}`);
      const data = await res.json();
      if (data.ideas) {
        setProjectIdeas(data.ideas);
      }
    } catch (err) {
      console.error('Failed to load ideas:', err);
    }
  };

  // Fetch project action items
  const fetchTasks = async () => {
    try {
      const res = await fetch(`/api/action-items?projectId=${projectId}`);
      const data = await res.json();
      if (data.actionItems) {
        setActionItems(data.actionItems);
      }
    } catch (err) {
      console.error('Failed to load tasks:', err);
    }
  };

  useEffect(() => {
    fetchMessages();
    fetchIdeas();
    fetchTasks();

    // Supabase Realtime message subscription
    const supabase = createClient();
    const channel = supabase
      .channel(`room:${roomId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `room_id=eq.${roomId}`,
        },
        (payload) => {
          const newMsg = payload.new as Message;
          setMessages((prev) => {
            if (prev.some((m) => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId, projectId]);

  // Send team message
  const handleSendMessage = async (content: string) => {
    setIsSending(true);
    try {
      const res = await fetch(`/api/rooms/${roomId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      });
      const data = await res.json();
      if (data.message) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === data.message.id)) return prev;
          return [...prev, data.message];
        });
      }
    } catch (err) {
      console.error('Send message failed:', err);
    } finally {
      setIsSending(false);
    }
  };

  // Consult single AI model
  const handleAskAI = async (prompt: string, modelId: string) => {
    setIsSending(true);
    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomId,
          prompt,
          modelId,
          includeContext: true,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'AI generation failed');
      } else if (data.message) {
        fetchMessages();
      }
    } catch (err: any) {
      alert(err.message || 'AI request failed');
    } finally {
      setIsSending(false);
    }
  };

  // Multi-model debate run
  const handleRunDebate = async (params: {
    prompt: string;
    templateId: DebateTemplateId;
    modelIds: string[];
    synthesisModelId: string;
  }) => {
    setIsSending(true);
    try {
      const res = await fetch('/api/ai/debate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomId,
          prompt: params.prompt,
          templateId: params.templateId,
          modelIds: params.modelIds,
          synthesisModelId: params.synthesisModelId,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to complete debate run');
      }
      fetchMessages();
    } finally {
      setIsSending(false);
    }
  };

  // Save as Idea handler
  const handleOpenIdeaModal = (content: string, messageId: string) => {
    setSourceMessageId(messageId);
    setIdeaTitle(content.slice(0, 60));
    setIdeaDesc(content);
    setShowIdeaModal(true);
  };

  const handleSaveIdea = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ideaTitle.trim() || !ideaDesc.trim()) return;

    try {
      const tagsArray = ideaTags
        .split(',')
        .map((t) => t.trim().toLowerCase())
        .filter(Boolean);

      const res = await fetch('/api/ideas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          sourceRoomId: roomId,
          sourceMessageId,
          title: ideaTitle.trim(),
          description: ideaDesc.trim(),
          tags: tagsArray,
        }),
      });
      const data = await res.json();
      if (data.idea) {
        fetchIdeas();
        setShowIdeaModal(false);
        setRightPanelTab('ideas');
        setShowRightPanel(true);
      }
    } catch (err) {
      console.error('Failed to save idea:', err);
    }
  };

  // Vote on idea
  const handleVoteIdea = async (ideaId: string, currentVoted: boolean) => {
    try {
      const res = await fetch('/api/ideas/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ideaId, vote: currentVoted ? 0 : 1 }),
      });
      const data = await res.json();
      if (data.success) {
        setProjectIdeas((prev) =>
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

  // Update idea status
  const handleUpdateIdeaStatus = async (ideaId: string, status: any) => {
    try {
      await fetch('/api/ideas', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ideaId, status }),
      });
      fetchIdeas();
    } catch (err) {
      console.error('Failed to update status:', err);
    }
  };

  // Action items update & create
  const handleUpdateTaskStatus = async (actionItemId: string, status: any) => {
    try {
      await fetch('/api/action-items', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actionItemId, status }),
      });
      fetchTasks();
    } catch (err) {
      console.error('Failed to update task:', err);
    }
  };

  const handleCreateTask = async (task: any) => {
    await fetch('/api/action-items', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...task, projectId }),
    });
    fetchTasks();
  };

  return (
    <div className="flex-1 flex overflow-hidden">
      {/* Center Chat View */}
      <div className="flex-1 flex flex-col min-w-0 bg-slate-950">
        {/* Room Header */}
        <div className="border-b border-slate-800 px-4 py-3 flex items-center justify-between bg-slate-900/60">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-blue-600/20 text-blue-400 flex items-center justify-center border border-blue-500/20">
              <MessagesSquare className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white tracking-tight flex items-center space-x-2">
                <span>Discussion Room</span>
                <span className="text-[11px] bg-slate-800 text-slate-400 font-normal px-2 py-0.5 rounded-full border border-slate-700">
                  Shared Session
                </span>
              </h2>
              <div className="text-[11px] text-slate-400">
                Messages and model responses are visible to all workspace members in real time.
              </div>
            </div>
          </div>

          <button
            onClick={() => setShowRightPanel(!showRightPanel)}
            className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors border border-slate-800"
            title={showRightPanel ? 'Collapse right context panel' : 'Open project context'}
          >
            {showRightPanel ? (
              <>
                <PanelRightClose className="w-4 h-4" />
                <span className="hidden sm:inline">Hide Context</span>
              </>
            ) : (
              <>
                <PanelRightOpen className="w-4 h-4" />
                <span className="hidden sm:inline">Project Context</span>
              </>
            )}
          </button>
        </div>

        {/* Message Stream */}
        <MessageList
          messages={messages}
          isLoading={loadingMessages || isSending}
          onSaveAsIdea={handleOpenIdeaModal}
          onCreateActionItem={(content) => {
            handleCreateTask({ title: content.slice(0, 100), status: 'open' });
            setRightPanelTab('tasks');
            setShowRightPanel(true);
          }}
        />

        {/* Composer */}
        <ChatComposer
          onSendMessage={handleSendMessage}
          onAskAI={handleAskAI}
          onOpenDebate={(initPrompt) => {
            setDebateInitialPrompt(initPrompt || '');
            setShowDebateModal(true);
          }}
          isSending={isSending}
        />
      </div>

      {/* Right Collapsible Panel: Project Knowledge Context */}
      {showRightPanel && (
        <aside className="w-80 md:w-96 border-l border-slate-800 bg-slate-900/90 flex flex-col shrink-0">
          {/* Tabs */}
          <div className="grid grid-cols-3 border-b border-slate-800 text-xs font-medium text-center bg-slate-950/60">
            <button
              onClick={() => setRightPanelTab('ideas')}
              className={`py-3 flex items-center justify-center space-x-1.5 border-b-2 transition-colors ${
                rightPanelTab === 'ideas'
                  ? 'border-blue-500 text-blue-400 font-semibold bg-slate-900/40'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Lightbulb className="w-3.5 h-3.5" />
              <span>Ideas ({projectIdeas.length})</span>
            </button>

            <button
              onClick={() => setRightPanelTab('tasks')}
              className={`py-3 flex items-center justify-center space-x-1.5 border-b-2 transition-colors ${
                rightPanelTab === 'tasks'
                  ? 'border-blue-500 text-blue-400 font-semibold bg-slate-900/40'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <CheckSquare className="w-3.5 h-3.5" />
              <span>Tasks ({actionItems.length})</span>
            </button>

            <button
              onClick={() => setRightPanelTab('docs')}
              className={`py-3 flex items-center justify-center space-x-1.5 border-b-2 transition-colors ${
                rightPanelTab === 'docs'
                  ? 'border-blue-500 text-blue-400 font-semibold bg-slate-900/40'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Docs</span>
            </button>
          </div>

          {/* Tab Content */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {rightPanelTab === 'ideas' && (
              <div className="space-y-3">
                {projectIdeas.length === 0 ? (
                  <div className="text-center py-8 text-xs text-slate-500">
                    No ideas saved in this project yet. Use &quot;Save as Idea&quot; on any discussion message.
                  </div>
                ) : (
                  projectIdeas.map((idea) => (
                    <IdeaCard
                      key={idea.id}
                      idea={idea}
                      onVote={handleVoteIdea}
                      onUpdateStatus={handleUpdateIdeaStatus}
                    />
                  ))
                )}
              </div>
            )}

            {rightPanelTab === 'tasks' && (
              <ActionItemList
                actionItems={actionItems}
                onUpdateStatus={handleUpdateTaskStatus}
                onCreateItem={handleCreateTask}
              />
            )}

            {rightPanelTab === 'docs' && <DocumentPanel projectId={projectId} />}
          </div>
        </aside>
      )}

      {/* Multi-Model Debate Modal */}
      <DebateModal
        isOpen={showDebateModal}
        onClose={() => setShowDebateModal(false)}
        onRunDebate={handleRunDebate}
        initialPrompt={debateInitialPrompt}
      />

      {/* Save as Idea Modal */}
      {showIdeaModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                <Lightbulb className="w-4 h-4 text-amber-400" />
                <span>Save to Project Ideas</span>
              </h3>
              <button
                onClick={() => setShowIdeaModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveIdea} className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">Idea Title</label>
                <input
                  type="text"
                  required
                  value={ideaTitle}
                  onChange={(e) => setIdeaTitle(e.target.value)}
                  placeholder="Concise idea headline"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">Description</label>
                <textarea
                  required
                  value={ideaDesc}
                  onChange={(e) => setIdeaDesc(e.target.value)}
                  rows={4}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500 resize-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">
                  Tags (comma separated)
                </label>
                <input
                  type="text"
                  value={ideaTags}
                  onChange={(e) => setIdeaTags(e.target.value)}
                  placeholder="architecture, frontend, latency"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowIdeaModal(false)}
                  className="px-3 py-1.5 rounded-xl text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold"
                >
                  Save Idea
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
