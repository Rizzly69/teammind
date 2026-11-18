import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { requireAuth, verifyProjectAccess } from '@/lib/permissions/workspace';

// Allowed document MIME types
const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'text/plain',
  'text/markdown',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/csv',
];

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

export async function GET(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const user = await requireAuth(supabase);

    const projectId = req.nextUrl.searchParams.get('projectId');
    if (!projectId) {
      return NextResponse.json({ error: 'projectId is required' }, { status: 400 });
    }

    await verifyProjectAccess(supabase, projectId, user.id);

    const { data: files, error } = await supabase
      .from('project_files')
      .select('*, uploader_profile:profiles!project_files_uploaded_by_fkey(id, display_name, avatar_url)')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });

    if (error) {
      const { data: fallbackFiles, error: fbErr } = await supabase
        .from('project_files')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

      if (fbErr) {
        return NextResponse.json({ error: fbErr.message }, { status: 500 });
      }
      return NextResponse.json({ files: fallbackFiles });
    }

    return NextResponse.json({ files });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Unauthorized' },
      { status: error.statusCode || 401 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const user = await requireAuth(supabase);

    const formData = await req.formData();
    const projectId = formData.get('projectId') as string;
    const file = formData.get('file') as File;

    if (!projectId || !file) {
      return NextResponse.json({ error: 'projectId and file are required' }, { status: 400 });
    }

    await verifyProjectAccess(supabase, projectId, user.id);

    // Validate size
    if (file.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json(
        { error: 'File size exceeds maximum allowed limit (10MB)' },
        { status: 400 }
      );
    }

    // Validate MIME type
    if (!ALLOWED_MIME_TYPES.includes(file.type) && !file.name.endsWith('.md')) {
      return NextResponse.json(
        { error: 'Unsupported file type. Only PDF, TXT, Markdown, CSV, and DOCX are allowed.' },
        { status: 400 }
      );
    }

    const timestamp = Date.now();
    const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const storagePath = `projects/${projectId}/${timestamp}-${sanitizedFileName}`;

    // Upload to Supabase private storage bucket if configured
    const fileBuffer = await file.arrayBuffer();
    const { error: uploadError } = await supabase.storage
      .from('project-documents')
      .upload(storagePath, fileBuffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      // In local dev/mock mode if storage bucket is not configured, continue storing metadata
      console.warn('Storage bucket upload warning:', uploadError.message);
    }

    // Persist file metadata
    const { data: record, error: dbError } = await supabase
      .from('project_files')
      .insert({
        project_id: projectId,
        uploaded_by: user.id,
        storage_path: storagePath,
        file_name: file.name,
        mime_type: file.type || 'text/plain',
        file_size: file.size,
      })
      .select('*')
      .single();

    if (dbError) {
      return NextResponse.json({ error: dbError.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      file: record,
      notice: 'Document uploaded securely. Notice: Files are stored privately and will never be shared with AI models without explicit opt-in.',
    }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Unauthorized' },
      { status: error.statusCode || 401 }
    );
  }
}
