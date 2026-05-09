/**
 * FileUploadRenderer — Dynamic Engine Renderer
 *
 * Full file upload component for the dynamic engine:
 * - Drag & drop or click to browse
 * - Uploads to R2 via the upload server
 * - Files scoped to user + component slug: {userId}/engine/{slug}/{fileName}
 * - Progress tracking via XHR
 * - Stores R2 key(s) as the component value
 * - Shows uploaded files with download links
 * - Each user can only see/access their own files
 */

import { useRef, useState, useCallback } from 'react';
import { useGetIdentity } from '@refinedev/core';
import { Upload, X, CheckCircle, AlertCircle, Loader2, FileDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import type { DynamicComponentProps } from '../types';

const UPLOAD_API = import.meta.env.VITE_UPLOAD_API ?? '/api';
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB

interface UploadedFile {
  name: string;
  size: number;
  mimeType: string;
  r2Key: string;
}

interface FileUploadState {
  id: string;
  name: string;
  size: number;
  progress: number;
  status: 'uploading' | 'complete' | 'error';
  error?: string;
  r2Key?: string;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function generateId(): string {
  return `up-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function FileUploadRenderer({
  instanceId,
  config,
  i18n,
  value,
  onChange,
  errors,
  disabled,
}: DynamicComponentProps) {
  const [uploadStates, setUploadStates] = useState<FileUploadState[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { data: identity } = useGetIdentity<{ id: string; name: string; email: string }>();

  const userId = identity?.id ?? 'user-1';
  // Use the instanceId as the folder scope — unique per component placement
  const slug = instanceId;

  const multiple = config.multiple !== false;
  const accept = (config.accept as string) ?? '.pdf,.docx,.xlsx,.pptx,.png,.jpg,.jpeg,.zip';

  // Current uploaded files from the component value
  const uploadedFiles: UploadedFile[] = Array.isArray(value)
    ? (value as UploadedFile[])
    : value && typeof value === 'object' && (value as UploadedFile).r2Key
      ? [value as UploadedFile]
      : [];

  const uploadFile = useCallback(
    async (file: File) => {
      if (file.size > MAX_FILE_SIZE) {
        const fileId = generateId();
        setUploadStates((prev) => [
          ...prev,
          { id: fileId, name: file.name, size: file.size, progress: 0, status: 'error', error: 'File exceeds 50 MB limit' },
        ]);
        return;
      }

      const fileId = generateId();
      setUploadStates((prev) => [
        ...prev,
        { id: fileId, name: file.name, size: file.size, progress: 0, status: 'uploading' },
      ]);

      try {
        const r2Key = await new Promise<string>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          const params = new URLSearchParams({
            userId,
            folder: `engine/${slug}`,
            fileName: file.name,
          });
          const url = `${UPLOAD_API}/upload/user?${params.toString()}`;

          xhr.upload.addEventListener('progress', (e) => {
            if (e.lengthComputable) {
              const pct = Math.round((e.loaded / e.total) * 100);
              setUploadStates((prev) =>
                prev.map((f) => (f.id === fileId ? { ...f, progress: pct } : f)),
              );
            }
          });

          xhr.addEventListener('load', () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              const data = JSON.parse(xhr.responseText);
              resolve(data.key);
            } else {
              reject(new Error(`Upload failed: ${xhr.status}`));
            }
          });

          xhr.addEventListener('error', () => reject(new Error('Network error')));
          xhr.addEventListener('abort', () => reject(new Error('Upload cancelled')));

          xhr.open('POST', url);
          xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');
          xhr.send(file);
        });

        setUploadStates((prev) =>
          prev.map((f) => (f.id === fileId ? { ...f, progress: 100, status: 'complete', r2Key } : f)),
        );

        // Add to component value
        const newFile: UploadedFile = {
          name: file.name,
          size: file.size,
          mimeType: file.type,
          r2Key,
        };

        if (multiple) {
          onChange([...uploadedFiles, newFile]);
        } else {
          onChange(newFile);
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Upload failed';
        setUploadStates((prev) =>
          prev.map((f) => (f.id === fileId ? { ...f, status: 'error', error: msg } : f)),
        );
      }
    },
    [userId, slug, multiple, uploadedFiles, onChange],
  );

  const handleFiles = useCallback(
    (fileList: FileList | null) => {
      if (!fileList || disabled) return;
      const filesToUpload = multiple ? Array.from(fileList) : [fileList[0]];
      for (const file of filesToUpload) {
        if (file) uploadFile(file);
      }
    },
    [multiple, disabled, uploadFile],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      handleFiles(e.dataTransfer.files);
    },
    [handleFiles],
  );

  const removeFile = useCallback(
    (r2Key: string) => {
      const updated = uploadedFiles.filter((f) => f.r2Key !== r2Key);
      onChange(multiple ? updated : updated[0] ?? null);
      setUploadStates((prev) => prev.filter((s) => s.r2Key !== r2Key));
    },
    [uploadedFiles, multiple, onChange],
  );

  const removeUploadState = useCallback((id: string) => {
    setUploadStates((prev) => prev.filter((s) => s.id !== id));
  }, []);

  const downloadUrl = (key: string) => `${UPLOAD_API}/download?key=${encodeURIComponent(key)}`;

  return (
    <div className="space-y-2">
      {i18n.label && (
        <Label className="text-sm font-medium">{i18n.label}</Label>
      )}

      {/* Drop zone */}
      {!disabled && (
        <div
          className={`flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-5 transition-colors cursor-pointer ${
            isDragOver
              ? 'border-primary bg-primary/5'
              : 'border-muted-foreground/25 hover:border-primary/50'
          }`}
          onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
        >
          <Upload className="mb-1.5 h-6 w-6 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            Drag & drop {multiple ? 'files' : 'a file'} here, or{' '}
            <span className="text-primary underline">browse</span>
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">Up to 50 MB</p>
          <input
            ref={inputRef}
            type="file"
            className="hidden"
            multiple={multiple}
            accept={accept}
            onChange={(e) => { handleFiles(e.target.files); e.target.value = ''; }}
          />
        </div>
      )}

      {/* Active uploads (progress / errors) */}
      {uploadStates.filter((s) => s.status !== 'complete').length > 0 && (
        <div className="space-y-1.5">
          {uploadStates
            .filter((s) => s.status !== 'complete')
            .map((s) => (
              <div key={s.id} className="flex items-center gap-2 rounded-md border p-2 text-sm">
                {s.status === 'uploading' && <Loader2 className="h-4 w-4 shrink-0 animate-spin text-primary" />}
                {s.status === 'error' && <AlertCircle className="h-4 w-4 shrink-0 text-destructive" />}
                <span className="flex-1 truncate">{s.name}</span>
                {s.status === 'uploading' && (
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-20 rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-primary transition-all"
                        style={{ width: `${s.progress}%` }}
                      />
                    </div>
                    <span className="w-8 text-right text-xs text-muted-foreground">{s.progress}%</span>
                  </div>
                )}
                {s.status === 'error' && (
                  <span className="text-xs text-destructive">{s.error}</span>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 shrink-0"
                  onClick={(e) => { e.stopPropagation(); removeUploadState(s.id); }}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ))}
        </div>
      )}

      {/* Uploaded files list */}
      {uploadedFiles.length > 0 && (
        <div className="space-y-1.5">
          {uploadedFiles.map((file) => (
            <div
              key={file.r2Key}
              className="flex items-center gap-2 rounded-md border bg-muted/30 p-2 text-sm"
            >
              <CheckCircle className="h-4 w-4 shrink-0 text-green-500" />
              <span className="flex-1 truncate" title={file.name}>{file.name}</span>
              <span className="text-xs text-muted-foreground">{formatSize(file.size)}</span>
              <a
                href={downloadUrl(file.r2Key)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex"
                onClick={(e) => e.stopPropagation()}
              >
                <Button variant="ghost" size="icon" className="h-6 w-6" type="button">
                  <FileDown className="h-3.5 w-3.5" />
                </Button>
              </a>
              {!disabled && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 shrink-0"
                  type="button"
                  onClick={(e) => { e.stopPropagation(); removeFile(file.r2Key); }}
                >
                  <X className="h-3 w-3 text-destructive" />
                </Button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Help text */}
      {i18n.helpText && (
        <p className="text-xs text-muted-foreground">{i18n.helpText}</p>
      )}

      {/* Errors */}
      {errors?.map((err, i) => (
        <p key={i} className="text-sm text-destructive">{err}</p>
      ))}
    </div>
  );
}
