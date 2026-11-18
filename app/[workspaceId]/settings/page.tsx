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
import { AUTHORIZED_MEMBERS } from '@/lib/auth/authorized-members';

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

      {/* Section 1: Authorized Team Members */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-lg bg-blue-600/20 text-blue-400 flex items-center justify-center">
            <Users className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Authorized Team Roster</h3>
            <p className="text-xs text-slate-400">
              Only provisioned team members can access this workspace by entering their name.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
          {AUTHORIZED_MEMBERS.map((member) => (
            <div
              key={member.id}
              className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 flex items-center justify-between"
            >
              <div className="flex items-center space-x-3">
                <div
                  className={`w-8 h-8 rounded-lg ${member.avatarColor} text-white font-bold flex items-center justify-center text-xs shadow-sm`}
                >
                  {member.name[0]}
                </div>
                <div>
                  <div className="text-xs font-semibold text-slate-100">{member.name}</div>
                  <div className="text-[10px] text-slate-400">{member.email}</div>
                </div>
              </div>
              <span className="text-[10px] font-semibold bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full border border-slate-700 capitalize">
                {member.role}
              </span>
            </div>
          ))}
        </div>
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
