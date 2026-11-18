'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Sparkles, ArrowRight, AlertCircle, Shield, Check } from 'lucide-react';
import { AUTHORIZED_MEMBERS } from '@/lib/auth/authorized-members';

export default function LoginPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleNameAccess = async (selectedName?: string) => {
    const nameToSubmit = (selectedName || name).trim();
    if (!nameToSubmit) {
      setError('Please enter your name.');
      return;
    }

    setError(null);
    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/name-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: nameToSubmit }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Access restricted.');
      }

      router.push(data.redirectUrl || '/');
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'Access restricted: Only authorized team members can enter.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 text-slate-100">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl space-y-6">
        {/* Brand */}
        <div className="text-center space-y-2">
          <div className="inline-flex w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 items-center justify-center text-white shadow-xl shadow-blue-500/25 mb-1">
            <Sparkles className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">TeamMind Workspace</h1>
          <p className="text-xs text-slate-400">
            Collaborative AI Brainstorming, Multi-Model Debates & Synthesis
          </p>
        </div>

        {/* Security badge */}
        <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 text-xs space-y-2">
          <div className="flex items-center space-x-2 text-slate-300 font-semibold">
            <Shield className="w-4 h-4 text-blue-400" />
            <span>Authorized Team Access Only</span>
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            Access is strictly provisioned for team members:{' '}
            <strong className="text-slate-200">Dana, Shivansh, Lial, and Niya</strong>.
          </p>

          {/* Quick Select Buttons */}
          <div className="grid grid-cols-2 gap-2 pt-2">
            {AUTHORIZED_MEMBERS.map((member) => (
              <button
                key={member.normalized}
                type="button"
                onClick={() => {
                  setName(member.name);
                  handleNameAccess(member.name);
                }}
                disabled={isLoading}
                className="flex items-center space-x-2 p-2.5 rounded-xl bg-slate-900 hover:bg-blue-950/40 border border-slate-800 hover:border-blue-600/70 text-slate-200 text-xs font-semibold transition-all group text-left"
              >
                <div
                  className={`w-6 h-6 rounded-lg ${member.avatarColor} text-white flex items-center justify-center text-[10px] font-bold shrink-0 shadow-sm`}
                >
                  {member.name[0]}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate">{member.name}</div>
                  <div className="text-[9px] text-slate-500 font-normal uppercase tracking-wider">
                    {member.role}
                  </div>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-slate-600 group-hover:text-blue-400 group-hover:translate-x-0.5 transition-all" />
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div className="p-3 bg-red-950/70 border border-red-800/80 rounded-xl text-xs text-red-300 flex items-start space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-400 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Manual Name Input Form */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleNameAccess();
          }}
          className="space-y-4 pt-1"
        >
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">
              Or enter your name manually:
            </label>
            <input
              type="text"
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Dana, Shivansh, Lial, Niya"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading || !name.trim()}
            className="w-full py-2.5 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50 text-white rounded-xl text-xs font-semibold shadow-lg shadow-blue-600/25 transition-all flex items-center justify-center space-x-2"
          >
            <span>{isLoading ? 'Verifying access...' : 'Enter Workspace'}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </form>
      </div>
    </div>
  );
}
