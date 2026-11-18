'use client';

import React, { useState } from 'react';
import { X, Swords, Check, Sparkles, AlertCircle } from 'lucide-react';
import { DebateTemplateId } from '@/types';
import { DEBATE_TEMPLATES } from '@/lib/ai/debate-templates';
import { ALLOWED_MODELS, DEFAULT_MODEL_ID } from '@/lib/ai/model-config';

interface DebateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRunDebate: (params: {
    prompt: string;
    templateId: DebateTemplateId;
    modelIds: string[];
    synthesisModelId: string;
  }) => Promise<void>;
  initialPrompt?: string;
}

export function DebateModal({
  isOpen,
  onClose,
  onRunDebate,
  initialPrompt = '',
}: DebateModalProps) {
  const [prompt, setPrompt] = useState(initialPrompt);
  const [templateId, setTemplateId] = useState<DebateTemplateId>('red_team');
  const [selectedModelIds, setSelectedModelIds] = useState<string[]>([
    'openai/gpt-4o-mini',
    'google/gemini-2.5-flash',
    'meta-llama/llama-3.3-70b-instruct',
  ]);
  const [synthesisModelId, setSynthesisModelId] = useState<string>(DEFAULT_MODEL_ID);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const toggleModel = (id: string) => {
    if (selectedModelIds.includes(id)) {
      if (selectedModelIds.length <= 2) {
        setError('At least 2 models are required for an effective multi-model debate.');
        return;
      }
      setError(null);
      setSelectedModelIds(selectedModelIds.filter((m) => m !== id));
    } else {
      if (selectedModelIds.length >= 4) {
        setError('Maximum 4 models allowed per debate run to manage latency and cost.');
        return;
      }
      setError(null);
      setSelectedModelIds([...selectedModelIds, id]);
    }
  };

  const handleStart = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || prompt.trim().length < 10) {
      setError('Please provide a substantive debate topic or idea description (at least 10 characters).');
      return;
    }
    if (selectedModelIds.length < 2) {
      setError('Please select at least 2 models for the debate.');
      return;
    }

    setError(null);
    setIsRunning(true);
    try {
      await onRunDebate({
        prompt: prompt.trim(),
        templateId,
        modelIds: selectedModelIds,
        synthesisModelId,
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to complete multi-model debate.');
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center space-x-2 text-white font-semibold text-base">
            <div className="w-7 h-7 rounded-lg bg-purple-600/30 text-purple-400 flex items-center justify-center border border-purple-500/30">
              <Swords className="w-4 h-4" />
            </div>
            <span>Run Multi-Model Debate & Synthesis</span>
          </div>
          <button
            onClick={onClose}
            disabled={isRunning}
            className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Form */}
        <form onSubmit={handleStart} className="p-6 overflow-y-auto space-y-5 flex-1">
          {error && (
            <div className="p-3 bg-red-950/70 border border-red-800/80 rounded-xl text-xs text-red-300 flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-400 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Prompt */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Debate Topic / Proposition
            </label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              disabled={isRunning}
              rows={3}
              placeholder="e.g. Should we adopt an event-driven architecture for our notification engine, or stick to scheduled batch jobs?"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 resize-none"
            />
          </div>

          {/* Template Selection */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Debate Lens / Template
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {(Object.keys(DEBATE_TEMPLATES) as DebateTemplateId[]).map((tid) => {
                const tmpl = DEBATE_TEMPLATES[tid];
                const isSelected = templateId === tid;
                return (
                  <button
                    key={tid}
                    type="button"
                    onClick={() => setTemplateId(tid)}
                    disabled={isRunning}
                    className={`text-left p-3 rounded-xl border transition-all ${
                      isSelected
                        ? 'bg-purple-950/40 border-purple-600 text-purple-200 ring-1 ring-purple-600'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-300'
                    }`}
                  >
                    <div className="font-semibold text-xs text-slate-200 mb-1 flex items-center justify-between">
                      <span>{tmpl.name}</span>
                      {isSelected && <Check className="w-3.5 h-3.5 text-purple-400" />}
                    </div>
                    <div className="text-[11px] leading-tight text-slate-400 line-clamp-2">
                      {tmpl.description}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Model Selection */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Independent Evaluator Models ({selectedModelIds.length}/4)
              </label>
              <span className="text-[11px] text-slate-500">Pick 2 to 4 models</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {ALLOWED_MODELS.map((model) => {
                const isChecked = selectedModelIds.includes(model.id);
                return (
                  <div
                    key={model.id}
                    onClick={() => !isRunning && toggleModel(model.id)}
                    className={`flex items-center justify-between p-2.5 rounded-xl border cursor-pointer select-none transition-all ${
                      isChecked
                        ? 'bg-slate-800/90 border-blue-500/70 text-slate-200'
                        : 'bg-slate-950 border-slate-800 text-slate-500 hover:border-slate-700'
                    }`}
                  >
                    <div>
                      <div className="text-xs font-medium text-slate-200">{model.name}</div>
                      <div className="text-[10px] text-slate-400">{model.provider}</div>
                    </div>
                    <div
                      className={`w-4 h-4 rounded border flex items-center justify-center ${
                        isChecked
                          ? 'bg-blue-600 border-blue-600 text-white'
                          : 'border-slate-700 bg-transparent'
                      }`}
                    >
                      {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Synthesis Model */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Synthesis Model (Reconciles Consensus & Contradictions)
            </label>
            <select
              value={synthesisModelId}
              onChange={(e) => setSynthesisModelId(e.target.value)}
              disabled={isRunning}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-purple-500"
            >
              {ALLOWED_MODELS.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} ({m.provider})
                </option>
              ))}
            </select>
          </div>

          {/* Footer Action */}
          <div className="pt-2 flex items-center justify-end space-x-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={isRunning}
              className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isRunning}
              className="flex items-center space-x-2 px-5 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-lg shadow-purple-600/25 transition-all disabled:opacity-50"
            >
              {isRunning ? (
                <>
                  <Sparkles className="w-3.5 h-3.5 animate-spin" />
                  <span>Orchestrating Models in Parallel...</span>
                </>
              ) : (
                <>
                  <Swords className="w-3.5 h-3.5" />
                  <span>Launch Debate & Synthesis</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
