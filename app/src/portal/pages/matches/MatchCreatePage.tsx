import { useForm } from "@refinedev/react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate } from "react-router-dom";
import { useList } from "@refinedev/core";
import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { AnimatedButton } from "../../components/AnimatedButton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AnimatedInput } from "../../components/AnimatedInput";
import { AnimatedTextarea } from "../../components/AnimatedTextarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PageShell } from "../../components/PageShell";
import { PageHeader } from "../../components/PageHeader";
import { matchSchema, MATCH_CATEGORIES } from "../../schemas";
import type { BaseRecord } from "@refinedev/core";

type FormValues = {
  organizationAId: string;
  organizationBId: string;
  status: "pending";
  matchScore: number;
  matchReason: string;
  category: (typeof MATCH_CATEGORIES)[number];
  sector?: string;
  suggestedBy: string;
  expiresAt?: string;
};

export function MatchCreatePage() {
  const navigate = useNavigate();

  const orgs = useList({ resource: "organizations", pagination: { mode: "off" } });
  const orgData = (orgs.result?.data ?? []) as BaseRecord[];

  const {
    refineCore: { formLoading, onFinish },
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    refineCoreProps: {
      resource: "matches",
      action: "create",
      redirect: "list",
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(matchSchema) as any,
    defaultValues: {
      organizationAId: "",
      organizationBId: "",
      status: "pending",
      matchScore: 50,
      matchReason: "",
      category: "partnership",
      sector: "",
      suggestedBy: "admin",
      expiresAt: "",
    },
  });

  const orgAId = watch("organizationAId");
  const orgBId = watch("organizationBId");
  const categoryValue = watch("category");
  const matchScore = watch("matchScore");

  // Build org name map for preview
  const orgMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const org of orgData) {
      map[org.id as string] = org.name as string;
    }
    return map;
  }, [orgData]);

  // Exclude selected Org A from Org B options
  const orgBOptions = useMemo(
    () => orgData.filter((org) => org.id !== orgAId),
    [orgData, orgAId],
  );

  const handleFinish = (values: FormValues) => {
    onFinish({
      ...values,
      matchScore: Number(values.matchScore),
      expiresAt: values.expiresAt || undefined,
      sector: values.sector || undefined,
    });
  };

  return (
    <PageShell loading={formLoading}>
      <div className="mx-auto max-w-2xl space-y-6">
        <PageHeader title="Create Match" backTo="/portal/matches" />

        <form onSubmit={handleSubmit(handleFinish as any)} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Match Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Organization A */}
              <div className="space-y-2">
                <Label>Organization A *</Label>
                <Select
                  value={orgAId || "none"}
                  onValueChange={(v) => {
                    setValue("organizationAId", v === "none" ? "" : v);
                    // Reset Org B if it matches the new Org A
                    if (v === orgBId) setValue("organizationBId", "");
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select first organization" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {orgData.map((org) => (
                      <SelectItem key={org.id as string} value={org.id as string}>
                        {org.name as string}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.organizationAId && (
                  <p className="text-sm text-destructive">{String(errors.organizationAId.message)}</p>
                )}
              </div>

              {/* Organization B */}
              <div className="space-y-2">
                <Label>Organization B *</Label>
                <Select
                  value={orgBId || "none"}
                  onValueChange={(v) => setValue("organizationBId", v === "none" ? "" : v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select second organization" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {orgBOptions.map((org) => (
                      <SelectItem key={org.id as string} value={org.id as string}>
                        {org.name as string}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.organizationBId && (
                  <p className="text-sm text-destructive">{String(errors.organizationBId.message)}</p>
                )}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                {/* Match Score */}
                <div className="space-y-2">
                  <Label htmlFor="matchScore">Match Score (0–100) *</Label>
                  <Input
                    id="matchScore"
                    type="number"
                    min={0}
                    max={100}
                    {...register("matchScore", { valueAsNumber: true })}
                  />
                  {errors.matchScore && (
                    <p className="text-sm text-destructive">{String(errors.matchScore.message)}</p>
                  )}
                </div>

                {/* Category */}
                <div className="space-y-2">
                  <Label>Category *</Label>
                  <Select
                    value={categoryValue}
                    onValueChange={(v) => setValue("category", v as FormValues["category"])}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {MATCH_CATEGORIES.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c.replace(/_/g, " ").replace(/\b\w/g, (ch) => ch.toUpperCase())}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Match Reason */}
              <div className="space-y-2">
                <Label htmlFor="matchReason">Match Reason *</Label>
                <AnimatedTextarea
                  id="matchReason"
                  rows={3}
                  placeholder="Why should these organizations connect?"
                  error={!!errors.matchReason}
                  {...register("matchReason")}
                />
                {errors.matchReason && (
                  <p className="text-sm text-destructive">{String(errors.matchReason.message)}</p>
                )}
              </div>

              {/* Sector */}
              <div className="space-y-2">
                <Label htmlFor="sector">Sector</Label>
                <AnimatedInput id="sector" placeholder="e.g. Fintech, Energy" {...register("sector")} />
              </div>

              {/* Expiry Date */}
              <div className="space-y-2">
                <Label htmlFor="expiresAt">Expiry Date</Label>
                <Input id="expiresAt" type="date" {...register("expiresAt")} />
              </div>
            </CardContent>
          </Card>

          {/* Preview */}
          {orgAId && orgBId && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Match Preview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-center gap-4 py-4">
                  <div className="rounded-lg border bg-muted/50 px-4 py-3 text-center">
                    <p className="font-semibold">{orgMap[orgAId] ?? orgAId}</p>
                    <p className="text-xs text-muted-foreground">Organization A</p>
                  </div>
                  <span className="text-2xl text-muted-foreground">↔</span>
                  <div className="rounded-lg border bg-muted/50 px-4 py-3 text-center">
                    <p className="font-semibold">{orgMap[orgBId] ?? orgBId}</p>
                    <p className="text-xs text-muted-foreground">Organization B</p>
                  </div>
                </div>
                <div className="mt-2 flex items-center justify-center gap-2">
                  <div className="h-2 w-24 rounded-full bg-muted">
                    <div
                      className="h-2 rounded-full bg-primary"
                      style={{ width: `${matchScore ?? 50}%` }}
                    />
                  </div>
                  <span className="text-sm text-muted-foreground">Score: {matchScore ?? 50}</span>
                </div>
              </CardContent>
            </Card>
          )}

          <input type="hidden" {...register("status")} />
          <input type="hidden" {...register("suggestedBy")} />

          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => navigate(-1)}>
              Cancel
            </Button>
            <AnimatedButton type="submit" loading={isSubmitting}>
              Create Match
            </AnimatedButton>
          </div>
        </form>
      </div>
    </PageShell>
  );
}
