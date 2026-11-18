'use client';

import React from 'react';
import { Message } from '@/types';
import { Bot, User, Lightbulb, CheckSquare, Sparkles } from 'lucide-react';
import { getModelById } from '@/lib/ai/model-config';
import { getAuthorizedMemberById, getAuthorizedMemberByName } from '@/lib/auth/authorized-members';

interface MessageItemProps {
  message: Message;
  onSaveAsIdea?: (content: string, messageId: string) => void;
  onCreateActionItem?: (content: string) => void;
}

export function MessageItem({ message, onSaveAsIdea, onCreateActionItem }: MessageItemProps) {
  const isAssistant = message.sender_type === 'assistant';
  const isSystem = message.sender_type === 'system';
  const isDebateSynthesis = message.metadata?.is_debate_synthesis;

  const model = message.model_id ? getModelById(message.model_id) : null;
  const modelDisplayName = model ? `${model.name} (${model.provider})` : message.model_id;

  const member =
    (message.sender_user_id ? getAuthorizedMemberById(message.sender_user_id) : null) ||
    (message.sender_profile?.display_name
      ? getAuthorizedMemberByName(message.sender_profile.display_name)
      : null);

  const timestamp = new Date(message.created_at).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  if (isSystem) {
    return (
      <div className="flex items-center justify-center my-3">
        <div className="bg-slate-800/80 border border-slate-700/60 rounded-full px-4 py-1 text-xs text-slate-300 flex items-center space-x-2">
          <Sparkles className="w-3.5 h-3.5 text-blue-400" />
          <span>{message.content}</span>
          <span className="text-slate-500">{timestamp}</span>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`group flex items-start space-x-3 my-4 ${
        isAssistant ? 'bg-slate-900/60 p-4 rounded-xl border border-slate-800' : ''
      }`}
    >
      {/* Avatar Icon */}
      <div
        className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 font-bold text-xs ${
          isAssistant
            ? isDebateSynthesis
              ? 'bg-gradient-to-tr from-purple-600 to-indigo-600 text-white shadow-md shadow-purple-500/20'
              : 'bg-indigo-600 text-white'
            : member
            ? `${member.avatarColor} text-white shadow-sm`
            : 'bg-slate-700 text-slate-200'
        }`}
      >
        {isAssistant ? (
          isDebateSynthesis ? (
            <Sparkles className="w-4 h-4" />
          ) : (
            <Bot className="w-4 h-4" />
          )
        ) : member ? (
          <span>{member.name[0]}</span>
        ) : (
          <User className="w-4 h-4" />
        )}
      </div>

      {/* Message Content & Header */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center space-x-2 mb-1">
          <span className="text-sm font-semibold text-slate-200">
            {isAssistant
              ? isDebateSynthesis
                ? 'Multi-Model Synthesis'
                : modelDisplayName || 'AI Assistant'
              : member
              ? member.name
              : message.sender_profile?.display_name || 'Team Member'}
          </span>

          {!isAssistant && member && (
            <span
              className={`text-[10px] font-medium px-2 py-0.2 rounded-full border ${
                member.role === 'owner'
                  ? 'bg-blue-950/80 text-blue-400 border-blue-800/60'
                  : 'bg-slate-800 text-slate-300 border-slate-700'
              }`}
            >
              {member.role === 'owner' ? 'Owner' : 'Team'}
            </span>
          )}

          {isAssistant && model && (
            <span className="text-[11px] bg-blue-950/80 text-blue-400 border border-blue-800/60 px-2 py-0.5 rounded-full font-mono">
              {model.provider}
            </span>
          )}

          {isDebateSynthesis && (
            <span className="text-[11px] bg-purple-950/80 text-purple-400 border border-purple-800/60 px-2 py-0.5 rounded-full font-semibold uppercase tracking-wider">
              Consensus & Contradictions
            </span>
          )}

          <span className="text-xs text-slate-500">{timestamp}</span>
        </div>

        {/* Text */}
        <div className="text-sm text-slate-300 whitespace-pre-wrap leading-relaxed space-y-2">
          {message.content}
        </div>

        {/* Model Execution Metadata */}
        {message.metadata?.latencyMs && (
          <div className="mt-2 text-[11px] text-slate-500 flex items-center space-x-3">
            <span>Latency: {message.metadata.latencyMs}ms</span>
            {message.metadata?.usage?.total_tokens && (
              <span>Tokens: {message.metadata.usage.total_tokens}</span>
            )}
          </div>
        )}

        {/* Action Toolbar on Hover */}
        <div className="mt-2 flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
          {onSaveAsIdea && (
            <button
              onClick={() => onSaveAsIdea(message.content, message.id)}
              className="flex items-center space-x-1 text-xs text-slate-400 hover:text-amber-400 bg-slate-800/80 hover:bg-slate-800 px-2 py-1 rounded transition-colors"
              title="Save this thought as a Project Idea"
            >
              <Lightbulb className="w-3.5 h-3.5" />
              <span>Save as Idea</span>
            </button>
          )}

          {onCreateActionItem && (
            <button
              onClick={() => onCreateActionItem(message.content)}
              className="flex items-center space-x-1 text-xs text-slate-400 hover:text-emerald-400 bg-slate-800/80 hover:bg-slate-800 px-2 py-1 rounded transition-colors"
              title="Convert this point to an Action Item"
            >
              <CheckSquare className="w-3.5 h-3.5" />
              <span>Convert to Task</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
