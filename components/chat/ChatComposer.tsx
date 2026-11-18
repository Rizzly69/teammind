'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Send, Sparkles, Swords, Bot, Users } from 'lucide-react';
import { ALLOWED_MODELS, DEFAULT_MODEL_ID } from '@/lib/ai/model-config';

interface ChatComposerProps {
  onSendMessage: (content: string) => Promise<void>;
  onAskAI: (prompt: string, modelId: string) => Promise<void>;
  onOpenDebate: (initialPrompt?: string) => void;
  isSending?: boolean;
}

export function ChatComposer({
  onSendMessage,
  onAskAI,
  onOpenDebate,
  isSending,
}: ChatComposerProps) {
  const [content, setContent] = useState('');
  const [selectedModelId, setSelectedModelId] = useState(DEFAULT_MODEL_ID);
  const [mode, setMode] = useState<'ai' | 'team'>('ai');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = content.trim();
    if (!trimmed || isSending) return;

    setContent('');

    if (mode === 'ai') {
      await onAskAI(trimmed, selectedModelId);
    } else {
      await onSendMessage(trimmed);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="border-t border-slate-800 bg-slate-900/90 backdrop-blur p-3 shrink-0">
      <div className="max-w-4xl mx-auto space-y-2">
        {/* Mode Selector and Model Dropdown */}
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center space-x-1.5 bg-slate-950 p-1 rounded-lg border border-slate-800">
            <button
              type="button"
              onClick={() => setMode('ai')}
              className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-md font-medium transition-colors ${
                mode === 'ai'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Bot className="w-3.5 h-3.5" />
              <span>Consult AI Model</span>
            </button>

            <button
              type="button"
              onClick={() => setMode('team')}
              className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-md font-medium transition-colors ${
                mode === 'team'
                  ? 'bg-slate-700 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Team Message</span>
            </button>
          </div>

          <div className="flex items-center space-x-2">
            {mode === 'ai' && (
              <div className="flex items-center space-x-1.5 bg-slate-950 px-2 py-1 rounded-lg border border-slate-800 text-slate-300">
                <span className="text-slate-400">Model:</span>
                <select
                  value={selectedModelId}
                  onChange={(e) => setSelectedModelId(e.target.value)}
                  className="bg-transparent font-medium focus:outline-none cursor-pointer pr-1"
                >
                  {ALLOWED_MODELS.map((m) => (
                    <option key={m.id} value={m.id} className="bg-slate-900 text-slate-200">
                      {m.name} ({m.provider})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <button
              type="button"
              onClick={() => onOpenDebate(content)}
              className="flex items-center space-x-1.5 px-3 py-1 rounded-lg bg-purple-950/80 hover:bg-purple-900 text-purple-300 border border-purple-800/80 transition-colors font-medium text-xs shadow-sm"
              title="Challenge your idea across multiple models with automatic synthesis"
            >
              <Swords className="w-3.5 h-3.5 text-purple-400" />
              <span>Multi-Model Debate</span>
            </button>
          </div>
        </div>

        {/* Text Input & Submit */}
        <form onSubmit={handleSubmit} className="relative flex items-end">
          <textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={2}
            placeholder={
              mode === 'ai'
                ? 'Ask the AI model, brainstorm an approach, or analyze a challenge... (Enter to send, Shift+Enter for new line)'
                : 'Post a message to the room...'
            }
            className="w-full bg-slate-950/90 border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 resize-none pr-12"
          />

          <button
            type="submit"
            disabled={!content.trim() || isSending}
            className="absolute right-2 bottom-2.5 p-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:hover:bg-blue-600 text-white rounded-lg transition-colors shadow-sm"
            title="Send"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
