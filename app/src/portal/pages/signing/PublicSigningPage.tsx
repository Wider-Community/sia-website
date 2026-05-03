import { useParams } from "react-router-dom";
import { useList, useUpdate } from "@refinedev/core";
import { useState, useCallback } from "react";
import { toast } from "sonner";
import { Refine } from "@refinedev/core";
import routerProvider from "@refinedev/react-router";
import {
  mockDataProvider,
  notificationProvider,
  i18nProvider,
} from "../../providers";
import { mujarradDataProvider } from "../../providers/mujarrad-data-provider";
import { Button } from "@/components/ui/button";
import { AnimatedButton } from "../../components/AnimatedButton";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckCircle2, Clock, FileSignature, XCircle } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import { PdfViewer } from "../../components/PdfViewer";
import {
  SignatureFieldOverlay,
  type FieldRect,
} from "../../components/SignatureFieldOverlay";
import { SignatureCapture } from "../../components/SignatureCapture";
import type { BaseRecord } from "@refinedev/core";

function PublicSigningPageInner() {
  const { token } = useParams();
  const [currentPage, setCurrentPage] = useState(1);
  const [captureOpen, setCaptureOpen] = useState(false);
  const [activeFieldId, setActiveFieldId] = useState<string | null>(null);
  const [signedFields, setSignedFields] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [declineOpen, setDeclineOpen] = useState(false);
  const [declineReason, setDeclineReason] = useState("");

  // Find signer by token
  const { result: signersResult, query: signersQueryState } = useList({
    resource: "signers",
    filters: [{ field: "token", operator: "eq", value: token }],
    pagination: { mode: "off" },
  });

  const signer = (signersResult?.data ?? [])[0] as BaseRecord | undefined;
  const signingRequestId = signer?.signingRequestId as string | undefined;

  // Get the signing request
  const { result: requestResult, query: requestQueryState } = useList({
    resource: "signing-requests",
    filters: signingRequestId
      ? [{ field: "id", operator: "eq", value: signingRequestId }]
      : [],
    pagination: { mode: "off" },
    queryOptions: { enabled: !!signingRequestId },
  });
  const request = (requestResult?.data ?? [])[0] as BaseRecord | undefined;

  // Get fields for this signer
  const { result: fieldsResult, query: fieldsQueryState } = useList({
    resource: "signature-fields",
    filters: signer
      ? [
          { field: "signingRequestId", operator: "eq", value: signingRequestId },
          { field: "signerId", operator: "eq", value: signer.id },
        ]
      : [],
    pagination: { mode: "off" },
    queryOptions: { enabled: !!signer },
  });

  // Get all fields for the request (to show other signers' fields as non-interactive)
  const { result: allFieldsResult } = useList({
    resource: "signature-fields",
    filters: signingRequestId
      ? [{ field: "signingRequestId", operator: "eq", value: signingRequestId }]
      : [],
    pagination: { mode: "off" },
    queryOptions: { enabled: !!signingRequestId },
  });

  // Get all signers for this request
  const { result: allSignersResult } = useList({
    resource: "signers",
    filters: signingRequestId
      ? [{ field: "signingRequestId", operator: "eq", value: signingRequestId }]
      : [],
    pagination: { mode: "off" },
    queryOptions: { enabled: !!signingRequestId },
  });

  const { mutateAsync: updateField } = useUpdate();
  const { mutateAsync: updateSigner } = useUpdate();
  const { mutateAsync: updateRequest } = useUpdate();

  const myFields = (fieldsResult?.data ?? []) as BaseRecord[];
  const allFields = (allFieldsResult?.data ?? []) as BaseRecord[];
  const allSigners = (allSignersResult?.data ?? []) as BaseRecord[];

  const myFieldIds = new Set(myFields.map((f) => f.id as string));

  const fieldRects: FieldRect[] = allFields.map((f) => {
    const fieldSigner = allSigners.find((s) => s.id === f.signerId);
    return {
      id: f.id as string,
      signerId: f.signerId as string,
      signerName: (fieldSigner?.name as string) ?? "Other",
      page: f.page as number,
      xPct: f.xPct as number,
      yPct: f.yPct as number,
      widthPct: f.widthPct as number,
      heightPct: f.heightPct as number,
      color: myFieldIds.has(f.id as string)
        ? (signer?.color as string) ?? "#C8A951"
        : "#9CA3AF",
    };
  });

  const highlightFieldIds = myFields.map((f) => f.id as string);
  const signedFieldIds = [
    ...allFields
      .filter((f) => f.signedImageUrl)
      .map((f) => f.id as string),
    ...Object.keys(signedFields),
  ];

  const handleFieldClick = (fieldId: string) => {
    if (!myFieldIds.has(fieldId)) return;
    if (signedFields[fieldId]) return;
    setActiveFieldId(fieldId);
    setCaptureOpen(true);
  };

  const handleCapture = useCallback(
    (dataUrl: string) => {
      if (!activeFieldId) return;
      setSignedFields((prev) => ({ ...prev, [activeFieldId]: dataUrl }));
    },
    [activeFieldId],
  );

  const allMyFieldsSigned =
    myFields.length > 0 &&
    myFields.every(
      (f) => signedFields[f.id as string] || f.signedImageUrl,
    );

  const handleSubmit = async () => {
    if (!signer) return;
    setSubmitting(true);
    try {
      // Update each field with the signature image
      for (const [fieldId, imageUrl] of Object.entries(signedFields)) {
        await updateField({
          resource: "signature-fields",
          id: fieldId,
          values: { signedImageUrl: imageUrl },
          successNotification: false,
        });
      }

      // Update signer status
      await updateSigner({
        resource: "signers",
        id: signer.id as string,
        values: { status: "signed", signedAt: new Date().toISOString() },
        successNotification: false,
      });

      // Check if all signers have signed
      const otherSigners = allSigners.filter(
        (s) => (s.id as string) !== (signer.id as string),
      );
      const allOthersSigned = otherSigners.every(
        (s) => s.status === "signed",
      );

      if (allOthersSigned && signingRequestId) {
        await updateRequest({
          resource: "signing-requests",
          id: signingRequestId,
          values: { status: "completed" },
          successNotification: false,
        });
      } else if (signingRequestId) {
        await updateRequest({
          resource: "signing-requests",
          id: signingRequestId,
          values: { status: "partially_signed" },
          successNotification: false,
        });
      }

      setCompleted(true);
    } catch (err) {
      toast.error("Failed to submit signatures");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDecline = async () => {
    if (!signer) return;
    setSubmitting(true);
    try {
      await updateSigner({
        resource: "signers",
        id: signer.id as string,
        values: { status: "declined", declineReason },
      });
      setCompleted(true);
    } finally {
      setSubmitting(false);
    }
  };

  const isExpired = signer?.expiresAt && new Date(signer.expiresAt as string) < new Date();

  const isLoading =
    signersQueryState.isLoading || requestQueryState.isLoading || fieldsQueryState.isLoading;

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <Skeleton className="h-64 w-full max-w-2xl" />
      </div>
    );
  }

  if (!signer || !request) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <p className="text-lg font-medium">Invalid or expired signing link</p>
            <p className="mt-2 text-sm text-muted-foreground">
              This signing link may have already been used or is no longer valid.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isExpired) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <Clock className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
            <p className="text-lg font-medium">This signing link has expired</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Please contact the administrator to receive a new signing link.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (signer.status === "signed" || signer.status === "declined" || completed) {
    const isDeclined = signer.status === "declined";
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center gap-4 pt-6 text-center">
            {isDeclined ? (
              <XCircle className="h-16 w-16 text-destructive" />
            ) : (
              <CheckCircle2 className="h-16 w-16 text-green-600" />
            )}
            <h2 className="text-2xl font-bold" style={{ fontFamily: "'Playfair Display', serif" }}>
              {isDeclined ? "Request Declined" : "Thank you!"}
            </h2>
            <p className="text-muted-foreground">
              {isDeclined
                ? `You have declined to sign "${request.title as string}". The admin has been notified.`
                : `Your signature has been recorded for "${request.title as string}". You may close this page.`}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (request.status === "cancelled") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <p className="text-lg font-medium">This signing request has been cancelled</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card px-6 py-4">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <div className="flex items-center gap-3">
            <FileSignature className="h-6 w-6" style={{ color: "#C8A951" }} />
            <div>
              <h1
                className="text-xl font-bold"
                style={{ fontFamily: "'Playfair Display', serif" }}
              >
                {request.title as string}
              </h1>
              <p className="text-sm text-muted-foreground">
                Signing as {signer.name as string}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary">
              {Object.keys(signedFields).length}/{myFields.length} fields
              signed
            </Badge>
            <AnimatedButton
              onClick={handleSubmit}
              disabled={!allMyFieldsSigned}
              loading={submitting}
            >
              Submit Signatures
            </AnimatedButton>
            <AlertDialog open={declineOpen} onOpenChange={setDeclineOpen}>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm">Decline</Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Decline signing request?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. The request admin will be notified.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <Textarea
                  placeholder="Reason for declining (optional)"
                  value={declineReason}
                  onChange={(e) => setDeclineReason(e.target.value)}
                  rows={3}
                />
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDecline}>Decline</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </header>

      {/* Message */}
      {request.message && (
        <div className="mx-auto max-w-4xl px-6 pt-4">
          <Card>
            <CardContent className="py-3">
              <p className="text-sm text-muted-foreground">
                {request.message as string}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* PDF with fields */}
      <div className="mx-auto max-w-4xl px-6 py-6">
        <p className="mb-4 text-sm text-muted-foreground">
          Click on the highlighted fields to add your signature.
        </p>
        <PdfViewer
          fileUrl={request.pdfUrl as string}
          currentPage={currentPage}
          onPageChange={setCurrentPage}
          overlay={
            <SignatureFieldOverlay
              fields={fieldRects}
              currentPage={currentPage}
              onRemove={() => {}}
              interactive={false}
              onFieldClick={handleFieldClick}
              highlightFieldIds={highlightFieldIds}
              signedFieldIds={signedFieldIds}
            />
          }
        />
      </div>

      <SignatureCapture
        open={captureOpen}
        onClose={() => setCaptureOpen(false)}
        onCapture={handleCapture}
        signerName={signer.name as string}
      />
    </div>
  );
}

const USE_MOCK = import.meta.env.VITE_USE_MOCK === "true";

// Wrap in Refine so hooks work outside PortalApp
export function PublicSigningPage() {
  return (
    <Refine
      routerProvider={routerProvider}
      dataProvider={USE_MOCK ? mockDataProvider : mujarradDataProvider}
      notificationProvider={notificationProvider}
      i18nProvider={i18nProvider}
      resources={[
        { name: "signing-requests", meta: { hide: true } },
        { name: "signature-fields", meta: { hide: true } },
        { name: "signers", meta: { hide: true } },
      ]}
      options={{ syncWithLocation: false }}
    >
      <PublicSigningPageInner />
    </Refine>
  );
}
