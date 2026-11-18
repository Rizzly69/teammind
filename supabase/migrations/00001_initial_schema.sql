-- TeamMind Initial Schema Migration
-- Migration 00001: Core tables, Indexes, RLS Policies and Triggers

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. PROFILES
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    display_name TEXT,
    avatar_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. WORKSPACES
CREATE TABLE IF NOT EXISTS public.workspaces (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. WORKSPACE MEMBERS
CREATE TABLE IF NOT EXISTS public.workspace_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('owner', 'member')),
    joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_workspace_member UNIQUE (workspace_id, user_id)
);

-- HELPER FUNCTIONS FOR RLS (Security Definer to prevent recursive RLS)
CREATE OR REPLACE FUNCTION public.is_workspace_member(_workspace_id UUID, _user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.workspace_members
        WHERE workspace_id = _workspace_id AND user_id = _user_id
    );
$$;

CREATE OR REPLACE FUNCTION public.is_workspace_owner(_workspace_id UUID, _user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.workspace_members
        WHERE workspace_id = _workspace_id AND user_id = _user_id AND role = 'owner'
    );
$$;

-- 4. PROJECTS
CREATE TABLE IF NOT EXISTS public.projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
    archived_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. ROOMS
CREATE TABLE IF NOT EXISTS public.rooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- HELPER FUNCTIONS FOR ROOM & PROJECT MEMBERSHIP
CREATE OR REPLACE FUNCTION public.get_project_workspace_id(_project_id UUID)
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
    SELECT workspace_id FROM public.projects WHERE id = _project_id;
$$;

CREATE OR REPLACE FUNCTION public.get_room_workspace_id(_room_id UUID)
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
    SELECT p.workspace_id FROM public.projects p
    JOIN public.rooms r ON r.project_id = p.id
    WHERE r.id = _room_id;
$$;

-- 6. MESSAGES
CREATE TABLE IF NOT EXISTS public.messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
    sender_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    sender_type TEXT NOT NULL CHECK (sender_type IN ('user', 'assistant', 'system')),
    model_id TEXT,
    content TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'complete' CHECK (status IN ('pending', 'complete', 'failed')),
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. AI RUNS
CREATE TABLE IF NOT EXISTS public.ai_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
    requested_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
    run_type TEXT NOT NULL CHECK (run_type IN ('single', 'debate', 'synthesis')),
    status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'running', 'complete', 'partial', 'failed')),
    prompt TEXT NOT NULL,
    model_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
    usage_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    error_summary TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

-- 8. AI RUN RESPONSES
CREATE TABLE IF NOT EXISTS public.ai_run_responses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ai_run_id UUID NOT NULL REFERENCES public.ai_runs(id) ON DELETE CASCADE,
    model_id TEXT NOT NULL,
    response TEXT,
    status TEXT NOT NULL CHECK (status IN ('pending', 'complete', 'failed')),
    input_tokens INTEGER,
    output_tokens INTEGER,
    latency_ms INTEGER,
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9. IDEAS
CREATE TABLE IF NOT EXISTS public.ideas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    source_room_id UUID REFERENCES public.rooms(id) ON DELETE SET NULL,
    source_message_id UUID REFERENCES public.messages(id) ON DELETE SET NULL,
    created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'proposed' CHECK (status IN ('proposed', 'under_review', 'accepted', 'rejected', 'implemented')),
    tags JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 10. IDEA COMMENTS
CREATE TABLE IF NOT EXISTS public.idea_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    idea_id UUID NOT NULL REFERENCES public.ideas(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 11. IDEA VOTES
CREATE TABLE IF NOT EXISTS public.idea_votes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    idea_id UUID NOT NULL REFERENCES public.ideas(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    vote INTEGER NOT NULL DEFAULT 1 CHECK (vote IN (1, -1)),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_idea_user_vote UNIQUE (idea_id, user_id)
);

-- 12. ACTION ITEMS
CREATE TABLE IF NOT EXISTS public.action_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    assignee_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
    due_at TIMESTAMPTZ,
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'blocked', 'completed')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 13. PROJECT FILES
CREATE TABLE IF NOT EXISTS public.project_files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    uploaded_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
    storage_path TEXT NOT NULL,
    file_name TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    file_size BIGINT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 14. WORKSPACE INVITATIONS
CREATE TABLE IF NOT EXISTS public.workspace_invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'member')),
    invited_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'revoked')),
    token TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days')
);

-- INDEXES
CREATE INDEX IF NOT EXISTS idx_workspace_members_user ON public.workspace_members(user_id);
CREATE INDEX IF NOT EXISTS idx_workspace_members_workspace ON public.workspace_members(workspace_id);
CREATE INDEX IF NOT EXISTS idx_projects_workspace ON public.projects(workspace_id);
CREATE INDEX IF NOT EXISTS idx_rooms_project ON public.rooms(project_id);
CREATE INDEX IF NOT EXISTS idx_messages_room ON public.messages(room_id, created_at);
CREATE INDEX IF NOT EXISTS idx_ai_runs_room ON public.ai_runs(room_id);
CREATE INDEX IF NOT EXISTS idx_ai_run_responses_run ON public.ai_run_responses(ai_run_id);
CREATE INDEX IF NOT EXISTS idx_ideas_project ON public.ideas(project_id);
CREATE INDEX IF NOT EXISTS idx_idea_comments_idea ON public.idea_comments(idea_id);
CREATE INDEX IF NOT EXISTS idx_idea_votes_idea ON public.idea_votes(idea_id);
CREATE INDEX IF NOT EXISTS idx_action_items_project ON public.action_items(project_id);
CREATE INDEX IF NOT EXISTS idx_project_files_project ON public.project_files(project_id);
CREATE INDEX IF NOT EXISTS idx_workspace_invitations_email ON public.workspace_invitations(email);

-- ENABLE ROW LEVEL SECURITY
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_run_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ideas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.idea_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.idea_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.action_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_invitations ENABLE ROW LEVEL SECURITY;

-- RLS POLICIES

-- PROFILES
CREATE POLICY "Public profiles are viewable by authenticated users"
ON public.profiles FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can update own profile"
ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

-- WORKSPACES
CREATE POLICY "Users can view workspaces they belong to"
ON public.workspaces FOR SELECT TO authenticated
USING (public.is_workspace_member(id));

CREATE POLICY "Authenticated users can create workspaces"
ON public.workspaces FOR INSERT TO authenticated
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Workspace owners can update their workspace"
ON public.workspaces FOR UPDATE TO authenticated
USING (public.is_workspace_owner(id));

CREATE POLICY "Workspace owners can delete their workspace"
ON public.workspaces FOR DELETE TO authenticated
USING (public.is_workspace_owner(id));

-- WORKSPACE MEMBERS
CREATE POLICY "Members can view membership in their workspaces"
ON public.workspace_members FOR SELECT TO authenticated
USING (public.is_workspace_member(workspace_id));

CREATE POLICY "Workspace owners can add members"
ON public.workspace_members FOR INSERT TO authenticated
WITH CHECK (public.is_workspace_owner(workspace_id) OR auth.uid() = user_id);

CREATE POLICY "Workspace owners can remove members"
ON public.workspace_members FOR DELETE TO authenticated
USING (public.is_workspace_owner(workspace_id) OR auth.uid() = user_id);

-- PROJECTS
CREATE POLICY "Members can view projects in their workspaces"
ON public.projects FOR SELECT TO authenticated
USING (public.is_workspace_member(workspace_id));

CREATE POLICY "Members can insert projects in their workspaces"
ON public.projects FOR INSERT TO authenticated
WITH CHECK (public.is_workspace_member(workspace_id) AND auth.uid() = created_by);

CREATE POLICY "Members can update projects in their workspaces"
ON public.projects FOR UPDATE TO authenticated
USING (public.is_workspace_member(workspace_id));

CREATE POLICY "Workspace owners or project creators can delete projects"
ON public.projects FOR DELETE TO authenticated
USING (public.is_workspace_owner(workspace_id) OR auth.uid() = created_by);

-- ROOMS
CREATE POLICY "Members can view rooms in their projects"
ON public.rooms FOR SELECT TO authenticated
USING (public.is_workspace_member(public.get_project_workspace_id(project_id)));

CREATE POLICY "Members can create rooms in their projects"
ON public.rooms FOR INSERT TO authenticated
WITH CHECK (public.is_workspace_member(public.get_project_workspace_id(project_id)) AND auth.uid() = created_by);

CREATE POLICY "Members can update rooms in their projects"
ON public.rooms FOR UPDATE TO authenticated
USING (public.is_workspace_member(public.get_project_workspace_id(project_id)));

CREATE POLICY "Members can delete rooms in their projects"
ON public.rooms FOR DELETE TO authenticated
USING (public.is_workspace_member(public.get_project_workspace_id(project_id)));

-- MESSAGES
CREATE POLICY "Members can view messages in their rooms"
ON public.messages FOR SELECT TO authenticated
USING (public.is_workspace_member(public.get_room_workspace_id(room_id)));

CREATE POLICY "Members can post messages in their rooms"
ON public.messages FOR INSERT TO authenticated
WITH CHECK (public.is_workspace_member(public.get_room_workspace_id(room_id)));

CREATE POLICY "Members can update their own messages or complete AI messages"
ON public.messages FOR UPDATE TO authenticated
USING (public.is_workspace_member(public.get_room_workspace_id(room_id)));

-- AI RUNS & RESPONSES
CREATE POLICY "Members can view AI runs in their rooms"
ON public.ai_runs FOR SELECT TO authenticated
USING (public.is_workspace_member(public.get_room_workspace_id(room_id)));

CREATE POLICY "Members can start AI runs in their rooms"
ON public.ai_runs FOR INSERT TO authenticated
WITH CHECK (public.is_workspace_member(public.get_room_workspace_id(room_id)) AND auth.uid() = requested_by);

CREATE POLICY "Members can update AI runs in their rooms"
ON public.ai_runs FOR UPDATE TO authenticated
USING (public.is_workspace_member(public.get_room_workspace_id(room_id)));

CREATE POLICY "Members can view AI run responses in their rooms"
ON public.ai_run_responses FOR SELECT TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.ai_runs r
        WHERE r.id = ai_run_id AND public.is_workspace_member(public.get_room_workspace_id(r.room_id))
    )
);

CREATE POLICY "Members can insert AI run responses in their rooms"
ON public.ai_run_responses FOR INSERT TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.ai_runs r
        WHERE r.id = ai_run_id AND public.is_workspace_member(public.get_room_workspace_id(r.room_id))
    )
);

-- IDEAS
CREATE POLICY "Members can view ideas in their projects"
ON public.ideas FOR SELECT TO authenticated
USING (public.is_workspace_member(public.get_project_workspace_id(project_id)));

CREATE POLICY "Members can create ideas in their projects"
ON public.ideas FOR INSERT TO authenticated
WITH CHECK (public.is_workspace_member(public.get_project_workspace_id(project_id)) AND auth.uid() = created_by);

CREATE POLICY "Members can update ideas in their projects"
ON public.ideas FOR UPDATE TO authenticated
USING (public.is_workspace_member(public.get_project_workspace_id(project_id)));

CREATE POLICY "Members can delete their own ideas or owner can delete"
ON public.ideas FOR DELETE TO authenticated
USING (
    auth.uid() = created_by OR
    public.is_workspace_owner(public.get_project_workspace_id(project_id))
);

-- IDEA COMMENTS
CREATE POLICY "Members can view comments on accessible ideas"
ON public.idea_comments FOR SELECT TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.ideas i
        WHERE i.id = idea_id AND public.is_workspace_member(public.get_project_workspace_id(i.project_id))
    )
);

CREATE POLICY "Members can create comments on accessible ideas"
ON public.idea_comments FOR INSERT TO authenticated
WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
        SELECT 1 FROM public.ideas i
        WHERE i.id = idea_id AND public.is_workspace_member(public.get_project_workspace_id(i.project_id))
    )
);

CREATE POLICY "Users can update their own comments"
ON public.idea_comments FOR UPDATE TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own comments"
ON public.idea_comments FOR DELETE TO authenticated
USING (auth.uid() = user_id);

-- IDEA VOTES
CREATE POLICY "Members can view votes on accessible ideas"
ON public.idea_votes FOR SELECT TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.ideas i
        WHERE i.id = idea_id AND public.is_workspace_member(public.get_project_workspace_id(i.project_id))
    )
);

CREATE POLICY "Members can cast their own vote on accessible ideas"
ON public.idea_votes FOR INSERT TO authenticated
WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
        SELECT 1 FROM public.ideas i
        WHERE i.id = idea_id AND public.is_workspace_member(public.get_project_workspace_id(i.project_id))
    )
);

CREATE POLICY "Members can update their own vote"
ON public.idea_votes FOR UPDATE TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Members can remove their own vote"
ON public.idea_votes FOR DELETE TO authenticated
USING (auth.uid() = user_id);

-- ACTION ITEMS
CREATE POLICY "Members can view action items in their projects"
ON public.action_items FOR SELECT TO authenticated
USING (public.is_workspace_member(public.get_project_workspace_id(project_id)));

CREATE POLICY "Members can create action items in their projects"
ON public.action_items FOR INSERT TO authenticated
WITH CHECK (public.is_workspace_member(public.get_project_workspace_id(project_id)) AND auth.uid() = created_by);

CREATE POLICY "Members can update action items in their projects"
ON public.action_items FOR UPDATE TO authenticated
USING (public.is_workspace_member(public.get_project_workspace_id(project_id)));

CREATE POLICY "Members can delete action items in their projects"
ON public.action_items FOR DELETE TO authenticated
USING (public.is_workspace_member(public.get_project_workspace_id(project_id)));

-- PROJECT FILES
CREATE POLICY "Members can view project files"
ON public.project_files FOR SELECT TO authenticated
USING (public.is_workspace_member(public.get_project_workspace_id(project_id)));

CREATE POLICY "Members can upload project files"
ON public.project_files FOR INSERT TO authenticated
WITH CHECK (public.is_workspace_member(public.get_project_workspace_id(project_id)) AND auth.uid() = uploaded_by);

CREATE POLICY "File uploaders or workspace owners can delete project files"
ON public.project_files FOR DELETE TO authenticated
USING (
    uploaded_by = auth.uid() OR
    public.is_workspace_owner(public.get_project_workspace_id(project_id))
);

-- WORKSPACE INVITATIONS
CREATE POLICY "Members can view invitations in their workspace"
ON public.workspace_invitations FOR SELECT TO authenticated
USING (public.is_workspace_member(workspace_id));

CREATE POLICY "Workspace owners can create invitations"
ON public.workspace_invitations FOR INSERT TO authenticated
WITH CHECK (public.is_workspace_owner(workspace_id) AND auth.uid() = invited_by);

CREATE POLICY "Workspace owners can update or revoke invitations"
ON public.workspace_invitations FOR UPDATE TO authenticated
USING (public.is_workspace_owner(workspace_id));

-- TRIGGER: Auto-create Profile upon Auth SignUp
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.profiles (id, display_name, avatar_url)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
        NEW.raw_user_meta_data->>'avatar_url'
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ENABLE REALTIME ON MESSAGES, AI RUNS, IDEAS, AND ACTION ITEMS
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.ai_runs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.ideas;
ALTER PUBLICATION supabase_realtime ADD TABLE public.action_items;
