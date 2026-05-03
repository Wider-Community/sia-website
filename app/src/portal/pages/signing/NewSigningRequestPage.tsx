import { useState, useCallback, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useCreate, useList } from "@refinedev/core";
import { toast } from "sonner";
import { DndContext, type DragEndEvent } from "@dnd-kit/core";
import { Button } from "@/components/ui/button";
import { AnimatedButton } from "../../components/AnimatedButton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AnimatedInput } from "../../components/AnimatedInput";
import { AnimatedTextarea } from "../../components/AnimatedTextarea";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  ArrowRight,
  Copy,
  Plus,
  Trash2,
  Upload,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { PageShell } from "../../components/PageShell";
import { PageHeader } from "../../components/PageHeader";
import { PdfViewer } from "../../components/PdfViewer";
import {
  SignatureFieldOverlay,
  type FieldRect,
} from "../../components/SignatureFieldOverlay";
import { createBlankPdf } from "../../lib/pdf-assembly";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { BaseRecord } from "@refinedev/core";

const SIGNER_COLORS = [
  "#C8A951",
  "#3B82F6",
  "#EF4444",
  "#10B981",
  "#8B5CF6",
  "#F59E0B",
];

interface SignerEntry {
  tempId: string;
  name: string;
  email: string;
  color: string;
}

export function NewSigningRequestPage() {
  const navigate = useNavigate();
  const { mutateAsync: create } = useCreate();
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [createdLinks, setCreatedLinks] = useState<Array<{name: string; link: string}>>([]);
  const [createdRequestId, setCreatedRequestId] = useState<string | null>(null);

  // Step 1
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [organizationId, setOrganizationId] = useState("");
  const [engagementId, setEngagementId] = useState("");
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [pdfFileName, setPdfFileName] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const orgs = useList({
    resource: "organizations",
    pagination: { mode: "off" },
  });

  const engagements = useList({
    resource: "engagements",
    filters: organizationId
      ? [{ field: "organizationId", operator: "eq", value: organizationId }]
      : [],
    pagination: { mode: "off" },
    queryOptions: { enabled: !!organizationId },
  });

  // Step 2
  const [currentPage, setCurrentPage] = useState(1);
  const [fields, setFields] = useState<FieldRect[]>([]);
  const pdfContainerRef = useRef<HTMLDivElement>(null);

  // Step 3
  const [signers, setSigners] = useState<SignerEntry[]>([
    {
      tempId: crypto.randomUUID(),
      name: "",
      email: "",
      color: SIGNER_COLORS[0],
    },
  ]);
  const [fieldSignerMap, setFieldSignerMap] = useState<
    Record<string, string>
  >({});

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setPdfUrl(url);
    setPdfFileName(file.name);
  };

  const handleGenerateBlank = useCallback(async () => {
    const url = await createBlankPdf();
    setPdfUrl(url);
    setPdfFileName("sample-document.pdf");
  }, []);

  const addField = () => {
    const defaultSigner = signers[0];
    const newField: FieldRect = {
      id: crypto.randomUUID(),
      signerId: defaultSigner?.tempId ?? "",
      signerName: defaultSigner?.name || "Signer",
      page: currentPage,
      xPct: 10,
      yPct: 70,
      widthPct: 25,
      heightPct: 6,
      color: defaultSigner?.color ?? SIGNER_COLORS[0],
    };
    setFields((prev) => [...prev, newField]);
  };

  const removeField = (id: string) => {
    setFields((prev) => prev.filter((f) => f.id !== id));
    setFieldSignerMap((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, delta } = event;
    if (!pdfContainerRef.current) return;
    const rect = pdfContainerRef.current.getBoundingClientRect();
    const dxPct = (delta.x / rect.width) * 100;
    const dyPct = (delta.y / rect.height) * 100;
    setFields((prev) =>
      prev.map((f) =>
        f.id === active.id
          ? {
              ...f,
              xPct: Math.max(0, Math.min(100 - f.widthPct, f.xPct + dxPct)),
              yPct: Math.max(0, Math.min(100 - f.heightPct, f.yPct + dyPct)),
            }
          : f,
      ),
    );
  };

  // Update fields when signer assignment changes
  useEffect(() => {
    setFields((prev) =>
      prev.map((f) => {
        const assignedSignerId = fieldSignerMap[f.id] ?? f.signerId;
        const signer = signers.find((s) => s.tempId === assignedSignerId);
        if (signer) {
          return {
            ...f,
            signerId: signer.tempId,
            signerName: signer.name || "Signer",
            color: signer.color,
          };
        }
        return f;
      }),
    );
  }, [fieldSignerMap, signers]);

  const addSigner = () => {
    setSigners((prev) => [
      ...prev,
      {
        tempId: crypto.randomUUID(),
        name: "",
        email: "",
        color: SIGNER_COLORS[prev.length % SIGNER_COLORS.length],
      },
    ]);
  };

  const removeSigner = (tempId: string) => {
    setSigners((prev) => prev.filter((s) => s.tempId !== tempId));
  };

  const updateSigner = (
    tempId: string,
    field: "name" | "email",
    value: string,
  ) => {
    setSigners((prev) =>
      prev.map((s) => (s.tempId === tempId ? { ...s, [field]: value } : s)),
    );
  };

  const assignFieldToSigner = (fieldId: string, signerTempId: string) => {
    setFieldSignerMap((prev) => ({ ...prev, [fieldId]: signerTempId }));
  };

  const canProceedStep1 = pdfUrl && title.trim();
  const canProceedStep2 = fields.length > 0;
  const canProceedStep3 =
    signers.length > 0 &&
    signers.every((s) => s.name.trim() && s.email.trim()) &&
    fields.every((f) => f.signerId);

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      // Create the signing request
      const reqResult = await create({
        resource: "signing-requests",
        values: {
          title,
          status: "sent",
          pdfUrl: pdfUrl!,
          pdfFileName,
          message,
          createdBy: "user-1",
          ...(organizationId ? { organizationId } : {}),
          ...(engagementId ? { engagementId } : {}),
        },
        successNotification: false,
      });

      const requestId = (reqResult.data as { id: string }).id;
      const appUrl =
        import.meta.env.VITE_APP_URL ?? window.location.origin;

      // Create signers
      const signerIdMap: Record<string, string> = {};
      const links: Array<{name: string; link: string}> = [];
      for (const s of signers) {
        const token = crypto.randomUUID();
        const signerResult = await create({
          resource: "signers",
          values: {
            signingRequestId: requestId,
            name: s.name,
            email: s.email,
            status: "pending",
            token,
            color: s.color,
            expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          },
          successNotification: false,
        });
        signerIdMap[s.tempId] = (signerResult.data as { id: string }).id;
        links.push({ name: s.name, link: `${appUrl}/sign/${token}` });
      }

      // Create signature fields
      for (const f of fields) {
        const realSignerId = signerIdMap[f.signerId];
        await create({
          resource: "signature-fields",
          values: {
            signingRequestId: requestId,
            signerId: realSignerId,
            page: f.page,
            xPct: f.xPct,
            yPct: f.yPct,
            widthPct: f.widthPct,
            heightPct: f.heightPct,
          },
          successNotification: false,
        });
      }

      toast.success("Signing request created successfully");
      setCreatedLinks(links);
      setCreatedRequestId(requestId);
    } catch (err) {
      toast.error("Failed to create signing request");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PageShell>
      <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader title="New Signing Request" backTo="/portal/signing" />

      {/* Step indicators */}
      <div className="flex items-center gap-2">
        {[1, 2, 3, 4].map((s) => (
          <div key={s} className="flex items-center gap-2">
            <Badge
              variant={step === s ? "default" : step > s ? "secondary" : "outline"}
              className="h-8 w-8 justify-center rounded-full p-0"
            >
              {s}
            </Badge>
            <span
              className={`text-sm ${step === s ? "font-semibold" : "text-muted-foreground"}`}
            >
              {s === 1
                ? "Upload"
                : s === 2
                  ? "Place Fields"
                  : s === 3
                    ? "Assign Signers"
                    : "Review"}
            </span>
            {s < 4 && (
              <div className="h-px w-8 bg-border" />
            )}
          </div>
        ))}
      </div>

      {/* Step 1: Upload */}
      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Upload Document</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Document Title *</Label>
              <AnimatedInput
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Investment Agreement"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="message">Message to Signers</Label>
              <AnimatedTextarea
                id="message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Optional message..."
                rows={3}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Organization</Label>
                <Select
                  value={organizationId}
                  onValueChange={(val) => {
                    setOrganizationId(val);
                    setEngagementId("");
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select organization (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    {(orgs.result?.data ?? []).map((o: BaseRecord) => (
                      <SelectItem key={o.id as string} value={o.id as string}>
                        {o.name as string}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Engagement</Label>
                <Select
                  value={engagementId}
                  onValueChange={setEngagementId}
                  disabled={!organizationId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={organizationId ? "Select engagement (optional)" : "Select an organization first"} />
                  </SelectTrigger>
                  <SelectContent>
                    {(engagements.result?.data ?? []).map((e: BaseRecord) => (
                      <SelectItem key={e.id as string} value={e.id as string}>
                        {e.title as string}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>PDF Document *</Label>
              <div className="flex gap-3">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="application/pdf"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <Button
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="mr-2 h-4 w-4" />
                  Upload PDF
                </Button>
                <Button variant="outline" onClick={handleGenerateBlank}>
                  Generate Sample PDF
                </Button>
              </div>
              {pdfFileName && (
                <p className="text-sm text-muted-foreground">
                  Selected: {pdfFileName}
                </p>
              )}
            </div>
            <div className="flex justify-end">
              <AnimatedButton
                onClick={() => setStep(2)}
                disabled={!canProceedStep1}
              >
                Next <ArrowRight className="ml-2 h-4 w-4" />
              </AnimatedButton>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Place signature fields */}
      {step === 2 && pdfUrl && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Place Signature Fields</CardTitle>
            <Button variant="outline" size="sm" onClick={addField}>
              <Plus className="mr-2 h-4 w-4" /> Add Field
            </Button>
          </CardHeader>
          <CardContent>
            <p className="mb-4 text-sm text-muted-foreground">
              Click "Add Field" to place a signature field, then drag it to
              position. Fields show as colored rectangles.
            </p>
            <DndContext onDragEnd={handleDragEnd}>
              <PdfViewer
                fileUrl={pdfUrl}
                currentPage={currentPage}
                onPageChange={setCurrentPage}
                containerRef={pdfContainerRef}
                overlay={
                  <SignatureFieldOverlay
                    fields={fields}
                    currentPage={currentPage}
                    onRemove={removeField}
                    interactive
                  />
                }
              />
            </DndContext>
            <div className="mt-4 flex justify-between">
              <Button variant="outline" onClick={() => setStep(1)}>
                <ArrowLeft className="mr-2 h-4 w-4" /> Back
              </Button>
              <AnimatedButton
                onClick={() => setStep(3)}
                disabled={!canProceedStep2}
              >
                Next <ArrowRight className="ml-2 h-4 w-4" />
              </AnimatedButton>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Assign signers */}
      {step === 3 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Assign Signers</CardTitle>
            <Button variant="outline" size="sm" onClick={addSigner}>
              <Plus className="mr-2 h-4 w-4" /> Add Signer
            </Button>
          </CardHeader>
          <CardContent className="space-y-6">
            {signers.map((signer, idx) => (
              <div
                key={signer.tempId}
                className="flex items-start gap-3 rounded-md border p-4"
              >
                <div
                  className="mt-2 h-4 w-4 shrink-0 rounded-full"
                  style={{ backgroundColor: signer.color }}
                />
                <div className="flex-1 space-y-3">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1">
                      <Label>Name *</Label>
                      <Input
                        value={signer.name}
                        onChange={(e) =>
                          updateSigner(signer.tempId, "name", e.target.value)
                        }
                        placeholder="Full name"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>Email *</Label>
                      <Input
                        type="email"
                        value={signer.email}
                        onChange={(e) =>
                          updateSigner(signer.tempId, "email", e.target.value)
                        }
                        placeholder="email@example.com"
                      />
                    </div>
                  </div>

                  {/* Assign fields to this signer */}
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">
                      Assigned Fields
                    </Label>
                    <div className="flex flex-wrap gap-2">
                      {fields.map((f, fi) => {
                        const isAssigned =
                          (fieldSignerMap[f.id] ?? f.signerId) ===
                          signer.tempId;
                        return (
                          <Badge
                            key={f.id}
                            variant={isAssigned ? "default" : "outline"}
                            className="cursor-pointer"
                            onClick={() =>
                              assignFieldToSigner(f.id, signer.tempId)
                            }
                          >
                            Field {fi + 1} (p{f.page})
                          </Badge>
                        );
                      })}
                    </div>
                  </div>
                </div>
                {idx > 0 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeSigner(signer.tempId)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                )}
              </div>
            ))}

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(2)}>
                <ArrowLeft className="mr-2 h-4 w-4" /> Back
              </Button>
              <AnimatedButton
                onClick={() => setStep(4)}
                disabled={!canProceedStep3}
              >
                Next <ArrowRight className="ml-2 h-4 w-4" />
              </AnimatedButton>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 4: Review & Send */}
      {step === 4 && (
        <Card>
          <CardHeader>
            <CardTitle>Review & Send</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-md border p-4 space-y-2">
              <p>
                <span className="font-medium">Title:</span> {title}
              </p>
              <p>
                <span className="font-medium">File:</span> {pdfFileName}
              </p>
              {message && (
                <p>
                  <span className="font-medium">Message:</span> {message}
                </p>
              )}
              <p>
                <span className="font-medium">Signature Fields:</span>{" "}
                {fields.length}
              </p>
            </div>

            <div className="space-y-2">
              <h3 className="font-semibold">Signers</h3>
              {signers.map((s) => {
                const assignedCount = fields.filter(
                  (f) =>
                    (fieldSignerMap[f.id] ?? f.signerId) === s.tempId,
                ).length;
                return (
                  <div
                    key={s.tempId}
                    className="flex items-center gap-3 rounded-md border p-3"
                  >
                    <div
                      className="h-3 w-3 rounded-full"
                      style={{ backgroundColor: s.color }}
                    />
                    <span className="font-medium">{s.name}</span>
                    <span className="text-sm text-muted-foreground">
                      {s.email}
                    </span>
                    <Badge variant="outline" className="ml-auto">
                      {assignedCount} field(s)
                    </Badge>
                  </div>
                );
              })}
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(3)}>
                <ArrowLeft className="mr-2 h-4 w-4" /> Back
              </Button>
              <AnimatedButton onClick={handleSubmit} loading={submitting}>
                Send for Signing
              </AnimatedButton>
            </div>
          </CardContent>
        </Card>
      )}
    </div>

      <Dialog open={createdLinks.length > 0} onOpenChange={() => {}}>
        <DialogContent className="sm:max-w-lg" onPointerDownOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>Signing Links Created</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {createdLinks.map((entry, idx) => (
              <div key={idx} className="flex items-center gap-2 rounded-md border p-3">
                <div className="flex-1 min-w-0">
                  <p className="font-medium">{entry.name}</p>
                  <p className="text-sm text-muted-foreground truncate">{entry.link}</p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => navigator.clipboard.writeText(entry.link)}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button onClick={() => navigate(`/portal/signing/${createdRequestId}`)}>
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageShell>
  );
}
