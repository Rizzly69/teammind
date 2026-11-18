'use client';

import React, { useState } from 'react';
import { useParams } from 'next/navigation';
import {
  Settings,
  Users,
  Shield,
  Coins,
  Cpu,
  Mail,
  Copy,
  Check,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { ALLOWED_MODELS } from '@/lib/ai/model-config';

export default function WorkspaceSettingsPage() {
  const params = useParams();
  const workspaceId = params.workspaceId as string;

  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'member' | 'owner'>('member');
  const [inviting, setInviting] = useState(false);
  const [inviteResult, setInviteResult] = useState<{ inviteLink: string; email: string } | null>(
    null
  );
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim() || inviting) return;

    setInviting(true);
    setError(null);
    setInviteResult(null);

    try {
      const res = await fetch('/api/invitations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspaceId,
          email: inviteEmail.trim(),
          role: inviteRole,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to issue invitation');
      }

      setInviteResult({
        inviteLink: data.invitation.inviteLink,
        email: inviteEmail.trim(),
      });
      setInviteEmail('');
    } catch (err: any) {
      setError(err.message || 'Invitation failed');
    } finally {
      setInviting(false);
    }
  };

  const copyToClipboard = () => {
    if (inviteResult?.inviteLink) {
      navigator.clipboard.writeText(inviteResult.inviteLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 max-w-4xl mx-auto w-full space-y-8">
      {/* Header */}
      <div className="border-b border-slate-800 pb-5">
        <h2 className="text-xl font-bold tracking-tight text-white flex items-center space-x-2">
          <Settings className="w-5 h-5 text-slate-400" />
          <span>Workspace Settings & Governance</span>
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          Manage team membership, access permissions, OpenRouter AI configurations, and cost limits.
        </p>
      </div>

      {error && (
        <div className="p-3 bg-red-950/60 border border-red-800 rounded-xl text-xs text-red-300 flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
          <span>{error}</span>
        </div>
      )}

      {/* Section 1: Team Invitations */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-lg bg-blue-600/20 text-blue-400 flex items-center justify-center">
            <Users className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Invite Team Members</h3>
            <p className="text-xs text-slate-400">
              Only workspace owners can invite new collaborators.
            </p>
          </div>
        </div>

        <form onSubmit={handleSendInvite} className="flex flex-wrap items-center gap-3 pt-2">
          <div className="relative flex-1 min-w-[240px]">
            <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
            <input
              type="email"
              required
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="colleague@company.com"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3.5 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
          </div>

          <select
            value={inviteRole}
            onChange={(e) => setInviteRole(e.target.value as any)}
            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none"
          >
            <option value="member">Member</option>
            <option value="owner">Workspace Owner</option>
          </select>

          <button
            type="submit"
            disabled={inviting || !inviteEmail.trim()}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white rounded-xl text-xs font-semibold shadow-sm transition-colors"
          >
            {inviting ? 'Generating...' : 'Create Invite Link'}
          </button>
        </form>

        {inviteResult && (
          <div className="mt-3 p-3 bg-emerald-950/40 border border-emerald-800/60 rounded-xl text-xs space-y-2">
            <div className="text-emerald-300 flex items-center space-x-1.5 font-medium">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Invitation link generated for {inviteResult.email}!</span>
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="text"
                readOnly
                value={inviteResult.inviteLink}
                className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 font-mono"
              />
              <button
                onClick={copyToClipboard}
                className="flex items-center space-x-1 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium transition-colors"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Section 2: AI Cost Controls & Spending Limits */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-lg bg-amber-600/20 text-amber-400 flex items-center justify-center">
            <Coins className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Cost Controls & Budget Thresholds</h3>
            <p className="text-xs text-slate-400">
              Proactively prevent runaway AI usage across multi-model debate sessions.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 space-y-1">
            <div className="text-[11px] text-slate-400 font-medium">Monthly Workspace Budget</div>
            <div className="text-lg font-bold text-white">$50.00 USD</div>
            <div className="text-[10px] text-emerald-400">Current estimate: $1.20</div>
          </div>

          <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 space-y-1">
            <div className="text-[11px] text-slate-400 font-medium">Rate Limit Ceiling</div>
            <div className="text-lg font-bold text-white">30 req / min</div>
            <div className="text-[10px] text-slate-400">Per workspace sliding window</div>
          </div>

          <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 space-y-1">
            <div className="text-[11px] text-slate-400 font-medium">Max Models per Debate</div>
            <div className="text-lg font-bold text-white">3 (Default)</div>
            <div className="text-[10px] text-slate-400">Capped at 4 models max</div>
          </div>
        </div>
      </div>

      {/* Section 3: Allowed OpenRouter Models */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-lg bg-purple-600/20 text-purple-400 flex items-center justify-center">
            <Cpu className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Configured Model Allowlist</h3>
            <p className="text-xs text-slate-400">
              Arbitrary client model IDs are strictly blocked server-side.
            </p>
          </div>
        </div>

        <div className="space-y-2 pt-1">
          {ALLOWED_MODELS.map((model) => (
            <div
              key={model.id}
              className="bg-slate-950 border border-slate-800/80 rounded-xl p-3 flex items-center justify-between text-xs"
            >
              <div>
                <div className="font-semibold text-slate-200">{model.name}</div>
                <div className="text-[11px] text-slate-400 font-mono">{model.id}</div>
              </div>
              <div className="flex items-center space-x-2">
                <span className="bg-slate-800 text-slate-300 px-2 py-0.5 rounded text-[10px] font-mono">
                  {model.provider}
                </span>
                <span className="text-[10px] text-emerald-400 font-medium">Allowed</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
