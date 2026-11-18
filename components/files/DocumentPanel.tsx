'use client';

import React, { useState, useEffect } from 'react';
import { ProjectFile } from '@/types';
import { FileText, Upload, Shield, AlertTriangle, Trash2, CheckCircle2 } from 'lucide-react';

interface DocumentPanelProps {
  projectId: string;
}

export function DocumentPanel({ projectId }: DocumentPanelProps) {
  const [files, setFiles] = useState<ProjectFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  const fetchFiles = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/files?projectId=${projectId}`);
      const data = await res.json();
      if (data.files) {
        setFiles(data.files);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load project files');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFiles();
  }, [projectId]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setSuccessNotice(null);
    setUploading(true);

    const formData = new FormData();
    formData.append('projectId', projectId);
    formData.append('file', file);

    try {
      const res = await fetch('/api/files', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to upload document');
      }
      setSuccessNotice(data.notice || 'Document uploaded securely.');
      fetchFiles();
    } catch (err: any) {
      setError(err.message || 'File upload failed');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  return (
    <div className="space-y-4">
      {/* Privacy Notice Banner */}
      <div className="bg-blue-950/40 border border-blue-800/60 rounded-xl p-3 text-xs text-blue-200 flex items-start space-x-2.5">
        <Shield className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
        <div className="leading-relaxed">
          <span className="font-semibold text-white">Secure Private Storage:</span> All project
          documents are stored in private storage with workspace-scoped access control. Documents
          are never automatically ingested or transmitted to AI providers without explicit team opt-in.
        </div>
      </div>

      {error && (
        <div className="bg-red-950/60 border border-red-800/80 rounded-xl p-3 text-xs text-red-300 flex items-center space-x-2">
          <AlertTriangle className="w-4 h-4 shrink-0 text-red-400" />
          <span>{error}</span>
        </div>
      )}

      {successNotice && (
        <div className="bg-emerald-950/60 border border-emerald-800/80 rounded-xl p-3 text-xs text-emerald-300 flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
          <span>{successNotice}</span>
        </div>
      )}

      {/* Upload Zone */}
      <label className="border-2 border-dashed border-slate-700/80 hover:border-blue-500/70 bg-slate-950/60 rounded-xl p-6 flex flex-col items-center justify-center cursor-pointer transition-colors text-center">
        <Upload className="w-6 h-6 text-slate-400 mb-2" />
        <span className="text-xs font-semibold text-slate-200">
          {uploading ? 'Encrypting & Uploading...' : 'Upload Reference Document'}
        </span>
        <span className="text-[11px] text-slate-500 mt-1">
          Supports PDF, Markdown, TXT, CSV, DOCX (Max 10MB)
        </span>
        <input
          type="file"
          accept=".pdf,.txt,.md,.docx,.csv"
          onChange={handleFileUpload}
          disabled={uploading}
          className="hidden"
        />
      </label>

      {/* File List */}
      <div className="space-y-2">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          Project Documents ({files.length})
        </h4>

        {loading ? (
          <div className="text-xs text-slate-500 text-center py-4">Loading documents...</div>
        ) : files.length === 0 ? (
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-6 text-center text-xs text-slate-500">
            No project documents uploaded yet.
          </div>
        ) : (
          <div className="space-y-1.5">
            {files.map((file) => (
              <div
                key={file.id}
                className="bg-slate-900 border border-slate-800 rounded-xl p-3 flex items-center justify-between hover:border-slate-700 transition-colors"
              >
                <div className="flex items-center space-x-3 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-blue-400 shrink-0">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-medium text-slate-200 truncate">
                      {file.file_name}
                    </div>
                    <div className="text-[10px] text-slate-500">
                      {(file.file_size / 1024).toFixed(1)} KB •{' '}
                      {new Date(file.created_at).toLocaleDateString()}
                    </div>
                  </div>
                </div>

                <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded border border-slate-700">
                  Private
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
