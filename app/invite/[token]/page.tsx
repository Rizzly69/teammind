'use client';

import React, { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Sparkles, Users, ArrowRight, CheckCircle2, AlertCircle } from 'lucide-react';

export default function AcceptInvitationPage() {
  const params = useParams();
  const router = useRouter();
  const token = params.token as string;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleAccept = async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/invitations', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to accept invitation');
      }

      setSuccess(true);
      setTimeout(() => {
        router.push(`/${data.workspaceId}/projects`);
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'Invitation failed or has expired');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl space-y-6 text-center">
        <div className="inline-flex w-12 h-12 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 items-center justify-center text-white shadow-lg shadow-blue-500/25 mb-1">
          <Sparkles className="w-6 h-6" />
        </div>

        <div className="space-y-1.5">
          <h1 className="text-xl font-bold tracking-tight text-white">
            Workspace Invitation
          </h1>
          <p className="text-xs text-slate-400">
            You have been invited to join a collaborative AI workspace on TeamMind.
          </p>
        </div>

        {error && (
          <div className="p-3 bg-red-950/70 border border-red-800 rounded-xl text-xs text-red-300 flex items-start space-x-2 text-left">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-400 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="p-3 bg-emerald-950/70 border border-emerald-800 rounded-xl text-xs text-emerald-300 flex items-center justify-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>Accepted! Redirecting to workspace...</span>
          </div>
        )}

        <button
          onClick={handleAccept}
          disabled={loading || success}
          className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-xl text-xs font-semibold shadow-md shadow-blue-600/20 transition-all flex items-center justify-center space-x-2"
        >
          <span>{loading ? 'Joining workspace...' : 'Accept Invitation & Join'}</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
