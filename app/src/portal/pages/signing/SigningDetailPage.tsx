import { useOne, useList, useUpdate } from "@refinedev/core";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { AnimatedButton } from "../../components/AnimatedButton";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AnimatedTabContent } from "../../components/AnimatedTabContent";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "../../components/EmptyState";
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
import {
  Building2,
  CheckCircle2,
  Clock,
  Download,
  Layers,
  Link as LinkIcon,
  RefreshCw,
  Send,
  Users,
  XCircle,
} from "lucide-react";
import { PageShell } from "../../components/PageShell";
import { PageHeader } from "../../components/PageHeader";
import type { BaseRecord } from "@refinedev/core";
import { PdfViewer } from "../../components/PdfViewer";
import {
  SignatureFieldOverlay,
  type FieldRect,
} from "../../components/SignatureFieldOverlay";
import { assemblePdf, type FieldPlacement } from "../../lib/pdf-assembly";
import { useState, useCallback } from "react";

const statusLabel: Record<string, string> = {
  draft: "Draft",
  sent: "Sent",
  partially_signed: "Partially Signed",
  completed: "Completed",
  cancelled: "Cancelled",
};

const signerStatusIcon: Record<string, React.ReactNode> = {
  pending: <Clock className="h-4 w-4 text-muted-foreground" />,
  signed: <CheckCircle2 className="h-4 w-4 text-green-600" />,
  declined: <XCircle className="h-4 w-4 text-destructive" />,
};

export function SigningDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [currentPage, setCurrentPage] = useState(1);
  const [activeTab, setActiveTab] = useState("signers");

  const { query: reqQuery } = useOne({
    resource: "signing-requests",
    id: id!,
  });
  const req = reqQuery.data?.data;

  const { query: orgQuery } = useOne({
    resource: "organizations",
    id: (req?.organizationId as string) ?? "",
    queryOptions: { enabled: !!req?.organizationId },
  });
  const orgName = (orgQuery.data?.data?.name as string) ?? "";

  const { query: engQuery } = useOne({
    resource: "engagements",
    id: (req?.engagementId as string) ?? "",
    queryOptions: { enabled: !!req?.engagementId },
  });
  const engTitle = (engQuery.data?.data?.title as string) ?? "";

  const { result: signersData, query: signersQuery } = useList({
    resource: "signers",
    filters: [
      { field: "signingRequestId", operator: "eq", value: id },
    ],
    pagination: { mode: "off" },
  });

  const { result: fieldsData, query: fieldsQuery } = useList({
    resource: "signature-fields",
    filters: [
      { field: "signingRequestId", operator: "eq", value: id },
    ],
    pagination: { mode: "off" },
  });

  const { mutate: updateRequest } = useUpdate();
  const { mutate: updateSigner } = useUpdate();

  const signersList = (signersData?.data ?? []) as BaseRecord[];
  const fieldsList = (fieldsData?.data ?? []) as BaseRecord[];

  const appUrl = import.meta.env.VITE_APP_URL ?? window.location.origin;

  const handleResend = async (signer: BaseRecord) => {
    const newToken = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    updateSigner({
      resource: "signers",
      id: signer.id as string,
      values: { token: newToken, expiresAt },
    }, {
      onSuccess: () => {
        const link = `${appUrl}/sign/${newToken}`;
        navigator.clipboard.writeText(link);
      },
    });
  };

  const fieldRects: FieldRect[] = fieldsList.map((f) => {
    const signer = signersList.find((s) => s.id === f.signerId);
    return {
      id: f.id as string,
      signerId: f.signerId as string,
      signerName: (signer?.name as string) ?? "Unknown",
      page: f.page as number,
      xPct: f.xPct as number,
      yPct: f.yPct as number,
      widthPct: f.widthPct as number,
      heightPct: f.heightPct as number,
      color: (signer?.color as string) ?? "#C8A951",
    };
  });

  const signedFieldIds = fieldsList
    .filter((f) => f.signedImageUrl)
    .map((f) => f.id as string);

  const handleCancel = () => {
    updateRequest({
      resource: "signing-requests",
      id: id!,
      values: { status: "cancelled" },
    });
  };

  const handleDownload = useCallback(async () => {
    if (!req?.pdfUrl) return;
    const signedFields: FieldPlacement[] = fieldsList
      .filter((f) => f.signedImageUrl)
      .map((f) => ({
        page: f.page as number,
        xPct: f.xPct as number,
        yPct: f.yPct as number,
        widthPct: f.widthPct as number,
        heightPct: f.heightPct as number,
        signedImageUrl: f.signedImageUrl as string,
      }));

    if (signedFields.length === 0) {
      // Download original
      const a = document.createElement("a");
      a.href = req.pdfUrl as string;
      a.download = req.pdfFileName as string;
      a.click();
      return;
    }

    try {
      const response = await fetch(req.pdfUrl as string);
      const pdfBytes = new Uint8Array(await response.arrayBuffer());
      const signedPdf = await assemblePdf(pdfBytes, signedFields);
      const blob = new Blob([signedPdf as unknown as BlobPart], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `signed-${req.pdfFileName as string}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Failed to assemble PDF:", err);
    }
  }, [req, fieldsList]);

  if (reqQuery.isLoading) {
    return <PageShell loading>{null}</PageShell>;
  }

  if (!req) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">Signing request not found</p>
        <Button
          variant="outline"
          onClick={() => navigate("/portal/signing")}
        >
          Back to list
        </Button>
      </div>
    );
  }

  const status = req.status as string;

  return (
    <PageShell>
      <PageHeader
        title={req.title as string}
        backTo="/portal/signing"
        subtitle={`${req.pdfFileName as string} - ${statusLabel[status] ?? status}`}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleDownload}>
              <Download className="mr-2 h-4 w-4" />
              Download PDF
            </Button>
            {(status === "sent" || status === "partially_signed") && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <AnimatedButton variant="destructive">
                    Cancel Request
                  </AnimatedButton>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Cancel signing request?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will cancel the signing request. All pending signers will no longer be able to sign. This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Keep Request</AlertDialogCancel>
                    <AlertDialogAction onClick={handleCancel}>
                      Cancel Request
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        }
      />

      {(req.organizationId || req.engagementId) && (
        <div className="flex items-center gap-4 text-sm">
          {req.organizationId && (
            <Button
              variant="link"
              className="h-auto p-0"
              onClick={() => navigate(`/portal/organizations/${req.organizationId}`)}
            >
              <Building2 className="mr-1 h-3 w-3" />
              {orgName || (req.organizationId as string)}
            </Button>
          )}
          {req.engagementId && (
            <>
              <span className="text-muted-foreground">/</span>
              <Button
                variant="link"
                className="h-auto p-0"
                onClick={() => navigate(`/portal/engagements/${req.engagementId}`)}
              >
                <Layers className="mr-1 h-3 w-3" />
                {engTitle || (req.engagementId as string)}
              </Button>
            </>
          )}
        </div>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="signers">Signers</TabsTrigger>
          <TabsTrigger value="document">Document</TabsTrigger>
        </TabsList>

        <AnimatedTabContent activeValue={activeTab} value="signers">
          <Card>
            <CardHeader>
              <CardTitle>Signer Progress</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {signersQuery.isLoading ? (
                <Skeleton className="h-32 w-full" />
              ) : signersList.length > 0 ? (
                signersList.map((signer) => {
                  const signerFieldCount = fieldsList.filter(
                    (f) => f.signerId === signer.id,
                  ).length;
                  const signerSignedCount = fieldsList.filter(
                    (f) =>
                      f.signerId === signer.id && f.signedImageUrl,
                  ).length;
                  return (
                    <div
                      key={signer.id as string}
                      className="flex items-center gap-3 rounded-md border p-4"
                    >
                      <div
                        className="h-4 w-4 shrink-0 rounded-full"
                        style={{
                          backgroundColor:
                            (signer.color as string) ?? "#C8A951",
                        }}
                      />
                      {signerStatusIcon[signer.status as string]}
                      <div className="flex-1">
                        <p className="font-medium">
                          {signer.name as string}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {signer.email as string}
                        </p>
                      </div>
                      <Badge variant="outline">
                        {signerSignedCount}/{signerFieldCount} fields
                      </Badge>
                      <Badge
                        variant={
                          signer.status === "signed"
                            ? "default"
                            : signer.status === "declined"
                              ? "destructive"
                              : "secondary"
                        }
                      >
                        {signer.status as string}
                      </Badge>
                      {signer.status === "pending" && (
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Copy signing link"
                            onClick={() => {
                              navigator.clipboard.writeText(
                                `${appUrl}/sign/${signer.token as string}`,
                              );
                            }}
                          >
                            <LinkIcon className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Resend"
                            onClick={() => handleResend(signer)}
                          >
                            <Send className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                      {signer.signedAt && (
                        <span className="text-xs text-muted-foreground">
                          {new Date(
                            signer.signedAt as string,
                          ).toLocaleString()}
                        </span>
                      )}
                    </div>
                  );
                })
              ) : (
                <EmptyState icon={Users} title="No signers yet" description="Add signers to this signing request." />
              )}

              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  reqQuery.refetch();
                  signersQuery.refetch();
                  fieldsQuery.refetch();
                }}
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh Status
              </Button>
            </CardContent>
          </Card>
        </AnimatedTabContent>

        <AnimatedTabContent activeValue={activeTab} value="document">
          <Card>
            <CardContent className="pt-6">
              {req.pdfUrl && (
                <PdfViewer
                  fileUrl={req.pdfUrl as string}
                  currentPage={currentPage}
                  onPageChange={setCurrentPage}
                  overlay={
                    <SignatureFieldOverlay
                      fields={fieldRects}
                      currentPage={currentPage}
                      onRemove={() => {}}
                      interactive={false}
                      signedFieldIds={signedFieldIds}
                    />
                  }
                />
              )}
            </CardContent>
          </Card>
        </AnimatedTabContent>
      </Tabs>
    </PageShell>
  );
}
