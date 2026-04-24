import { useRef, useState, useCallback } from "react";
import { useCreate } from "@refinedev/core";
import { Button } from "@/components/ui/button";
import { Upload, X, CheckCircle, AlertCircle, Loader2 } from "lucide-react";

const UPLOAD_API = import.meta.env.VITE_UPLOAD_API ?? "/api";

interface FileUploaderProps {
  organizationId: string;
  onUploadComplete?: () => void;
}

interface UploadFile {
  id: string;
  name: string;
  size: number;
  progress: number;
  status: "uploading" | "complete" | "error";
  error?: string;
}

function generateId(): string {
  return `upload-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function FileUploader({ organizationId, onUploadComplete }: FileUploaderProps) {
  const [files, setFiles] = useState<UploadFile[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { mutate: createFileRecord } = useCreate();

  const processFile = useCallback(async (file: File) => {
    const fileId = generateId();
    setFiles((prev) => [
      ...prev,
      { id: fileId, name: file.name, size: file.size, progress: 0, status: "uploading" },
    ]);

    try {
      // Upload to R2 via upload server with XHR for progress tracking
      const r2Key = await new Promise<string>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        const url = `${UPLOAD_API}/upload?orgId=${encodeURIComponent(organizationId)}&fileName=${encodeURIComponent(file.name)}`;

        xhr.upload.addEventListener("progress", (e) => {
          if (e.lengthComputable) {
            const pct = Math.round((e.loaded / e.total) * 100);
            setFiles((prev) => prev.map((f) => (f.id === fileId ? { ...f, progress: pct } : f)));
          }
        });

        xhr.addEventListener("load", () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            const data = JSON.parse(xhr.responseText);
            resolve(data.key);
          } else {
            reject(new Error(`Upload failed: ${xhr.status} ${xhr.statusText}`));
          }
        });

        xhr.addEventListener("error", () => reject(new Error("Network error during upload")));
        xhr.addEventListener("abort", () => reject(new Error("Upload cancelled")));

        xhr.open("POST", url);
        xhr.setRequestHeader("Content-Type", file.type || "application/octet-stream");
        xhr.send(file);
      });

      setFiles((prev) => prev.map((f) => (f.id === fileId ? { ...f, progress: 100, status: "complete" } : f)));

      createFileRecord(
        {
          resource: "files",
          values: {
            name: file.name,
            mimeType: file.type,
            size: file.size,
            r2ObjectKey: r2Key,
            uploadedBy: "user-1",
            organizationId,
          },
        },
        { onSuccess: () => onUploadComplete?.() },
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Upload failed";
      setFiles((prev) => prev.map((f) => (f.id === fileId ? { ...f, status: "error", error: msg } : f)));
    }
  }, [organizationId, createFileRecord, onUploadComplete]);

  const handleFiles = (fileList: FileList | null) => {
    if (!fileList) return;
    for (const file of Array.from(fileList)) {
      processFile(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    handleFiles(e.dataTransfer.files);
  };

  const removeFile = (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  };

  return (
    <div className="space-y-3">
      <div
        className={`flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 transition-colors cursor-pointer ${
          isDragOver ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-primary/50"
        }`}
        onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
      >
        <Upload className="mb-2 h-8 w-8 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          Drag & drop files here, or <span className="text-primary underline">browse</span>
        </p>
        <p className="mt-1 text-xs text-muted-foreground">PDF, DOCX, XLSX, PPTX — up to 50MB</p>
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          multiple
          accept=".pdf,.docx,.xlsx,.pptx,.doc,.xls,.ppt"
          onChange={(e) => { handleFiles(e.target.files); e.target.value = ""; }}
        />
      </div>

      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((f) => (
            <div key={f.id} className="flex items-center gap-3 rounded-md border p-2 text-sm">
              {f.status === "uploading" && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
              {f.status === "complete" && <CheckCircle className="h-4 w-4 text-green-500" />}
              {f.status === "error" && <AlertCircle className="h-4 w-4 text-destructive" />}
              <span className="flex-1 truncate">{f.name}</span>
              {f.status === "uploading" && (
                <div className="flex items-center gap-2">
                  <div className="h-1.5 w-24 rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary transition-all"
                      style={{ width: `${f.progress}%` }}
                    />
                  </div>
                  <span className="w-10 text-right text-xs text-muted-foreground">{f.progress}%</span>
                </div>
              )}
              {f.status === "error" && (
                <span className="text-xs text-destructive">{f.error}</span>
              )}
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => { e.stopPropagation(); removeFile(f.id); }}>
                <X className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
