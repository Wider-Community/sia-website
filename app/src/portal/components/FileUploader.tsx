import { useEffect, useRef, useState } from "react";
import Uppy from "@uppy/core";
import Tus from "@uppy/tus";
import { useCreate } from "@refinedev/core";
import { Button } from "@/components/ui/button";
import { Upload, X, CheckCircle, AlertCircle, Loader2 } from "lucide-react";

const TUS_ENDPOINT = import.meta.env.VITE_TUS_ENDPOINT ?? "http://localhost:1080/files/";

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

export function FileUploader({ organizationId, onUploadComplete }: FileUploaderProps) {
  const [files, setFiles] = useState<UploadFile[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const uppyRef = useRef<Uppy | null>(null);
  const { mutate: createFileRecord } = useCreate();

  useEffect(() => {
    const uppy = new Uppy({
      restrictions: {
        maxFileSize: 50 * 1024 * 1024, // 50MB
        allowedFileTypes: [".pdf", ".docx", ".xlsx", ".pptx", ".doc", ".xls", ".ppt"],
      },
      autoProceed: true,
    });

    uppy.use(Tus, {
      endpoint: TUS_ENDPOINT,
      chunkSize: 5 * 1024 * 1024,
      retryDelays: [0, 1000, 3000, 5000],
    });

    uppy.on("file-added", (file) => {
      setFiles((prev) => [
        ...prev,
        { id: file.id, name: file.name ?? "unknown", size: file.size ?? 0, progress: 0, status: "uploading" },
      ]);
    });

    uppy.on("upload-progress", (file, progress) => {
      if (!file) return;
      const pct = progress.bytesTotal ? Math.round((progress.bytesUploaded / progress.bytesTotal) * 100) : 0;
      setFiles((prev) => prev.map((f) => (f.id === file.id ? { ...f, progress: pct } : f)));
    });

    uppy.on("upload-success", (file, response) => {
      if (!file) return;
      setFiles((prev) => prev.map((f) => (f.id === file.id ? { ...f, progress: 100, status: "complete" } : f)));

      createFileRecord({
        resource: "files",
        values: {
          name: file.name,
          mimeType: file.type,
          size: file.size,
          r2ObjectKey: response.uploadURL ?? "",
          uploadedBy: "user-1",
          organizationId,
        },
      });

      onUploadComplete?.();
    });

    uppy.on("upload-error", (file, error) => {
      if (!file) return;
      setFiles((prev) =>
        prev.map((f) => (f.id === file.id ? { ...f, status: "error", error: error.message } : f)),
      );
    });

    uppyRef.current = uppy;
    return () => { uppy.destroy(); };
  }, [organizationId, createFileRecord, onUploadComplete]);

  const handleFiles = (fileList: FileList | null) => {
    if (!fileList || !uppyRef.current) return;
    for (const file of Array.from(fileList)) {
      try {
        uppyRef.current.addFile({ name: file.name, type: file.type, data: file });
      } catch (err) {
        console.error("Failed to add file:", err);
      }
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    handleFiles(e.dataTransfer.files);
  };

  const removeFile = (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
    try { uppyRef.current?.removeFile(id); } catch { /* already removed */ }
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
          onChange={(e) => handleFiles(e.target.files)}
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
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeFile(f.id)}>
                <X className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
