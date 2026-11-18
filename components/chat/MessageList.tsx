'use client';

import React, { useEffect, useRef } from 'react';
import { Message } from '@/types';
import { MessageItem } from './MessageItem';
import { MessagesSquare, Sparkles } from 'lucide-react';

interface MessageListProps {
  messages: Message[];
  isLoading?: boolean;
  onSaveAsIdea?: (content: string, messageId: string) => void;
  onCreateActionItem?: (content: string) => void;
}

export function MessageList({
  messages,
  isLoading,
  onSaveAsIdea,
  onCreateActionItem,
}: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  if (messages.length === 0 && !isLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-400">
        <div className="w-14 h-14 rounded-2xl bg-slate-800/80 border border-slate-700/60 flex items-center justify-center mb-4 text-blue-400">
          <MessagesSquare className="w-7 h-7" />
        </div>
        <h3 className="text-base font-semibold text-slate-200 mb-1">
          Welcome to the Brainstorming Room
        </h3>
        <p className="text-sm text-slate-400 max-w-sm mb-4">
          Share your ideas, consult AI models via OpenRouter, or run a structured multi-model debate.
        </p>
        <div className="flex flex-wrap gap-2 justify-center max-w-md">
          <span className="text-xs bg-slate-800 text-slate-300 px-3 py-1 rounded-full border border-slate-700">
            💬 Realtime team chat
          </span>
          <span className="text-xs bg-slate-800 text-slate-300 px-3 py-1 rounded-full border border-slate-700">
            🤖 Single-model analysis
          </span>
          <span className="text-xs bg-slate-800 text-slate-300 px-3 py-1 rounded-full border border-slate-700">
            ⚔️ Multi-model critique
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2">
      {messages.map((message) => (
        <MessageItem
          key={message.id}
          message={message}
          onSaveAsIdea={onSaveAsIdea}
          onCreateActionItem={onCreateActionItem}
        />
      ))}

      {isLoading && (
        <div className="flex items-center space-x-3 my-4 bg-slate-900/40 p-4 rounded-xl border border-slate-800 animate-pulse">
          <div className="w-8 h-8 rounded-lg bg-blue-600/30 flex items-center justify-center text-blue-400">
            <Sparkles className="w-4 h-4 animate-spin" />
          </div>
          <div className="space-y-1.5 flex-1">
            <div className="h-3.5 bg-slate-700/50 rounded w-1/4"></div>
            <div className="h-3 bg-slate-800/60 rounded w-3/4"></div>
          </div>
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  );
}
