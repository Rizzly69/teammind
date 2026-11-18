import { redirect } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { Sparkles, ArrowRight, Plus } from 'lucide-react';

export default async function HomePage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const { data: memberships } = await supabase
      .from('workspace_members')
      .select('workspace_id')
      .eq('user_id', user.id)
      .limit(1);

    if (memberships && memberships.length > 0) {
      redirect(`/${memberships[0].workspace_id}/projects`);
    }
  }

  // Fallback demo / workspace onboarding screen
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-slate-100">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center shadow-2xl space-y-6">
        <div className="inline-flex w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 items-center justify-center text-white shadow-xl shadow-blue-500/25 mb-1">
          <Sparkles className="w-7 h-7" />
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight text-white">Welcome to TeamMind</h1>
          <p className="text-sm text-slate-400 max-w-md mx-auto">
            A collaborative AI brainstorming workspace. Brainstorm together in real-time,
            run multi-model debates with automatic synthesis, and capture ideas into action.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3 pt-2">
          <Link
            href="/00000000-0000-0000-0000-000000000001/projects"
            className="flex items-center justify-between p-4 bg-blue-600 hover:bg-blue-500 rounded-xl text-white font-semibold text-sm transition-all shadow-lg shadow-blue-600/20 group"
          >
            <span>Enter Team Workspace</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>

          <Link
            href="/login"
            className="flex items-center justify-center p-3 bg-slate-800/80 hover:bg-slate-800 rounded-xl text-slate-300 font-medium text-xs transition-colors border border-slate-700/60"
          >
            <span>Sign in to existing account</span>
          </Link>
        </div>

        <div className="pt-4 border-t border-slate-800/80 text-[11px] text-slate-500">
          Built with Next.js, Supabase Row-Level Security, and OpenRouter Server Gateway.
        </div>
      </div>
    </div>
  );
}
