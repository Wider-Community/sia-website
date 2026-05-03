import { useForm } from "@refinedev/react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useList } from "@refinedev/core";
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
import {
  engagementSchema,
  ENGAGEMENT_STAGES,
  ENGAGEMENT_CATEGORIES,
} from "../../schemas";
import type { BaseRecord } from "@refinedev/core";

type FormValues = {
  title: string;
  organizationId: string;
  stage: (typeof ENGAGEMENT_STAGES)[number];
  category: (typeof ENGAGEMENT_CATEGORIES)[number];
  description?: string;
  priority: "low" | "medium" | "high" | "critical";
  assignedTo?: string;
  startDate?: string;
  targetDate?: string;
  value?: string;
  tags?: string[];
  createdBy: string;
};

export function EngagementFormPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const isEdit = Boolean(id);
  const prefilledOrgId = searchParams.get("organizationId") ?? "";

  const orgs = useList({ resource: "organizations", pagination: { mode: "off" } });
  const orgData = orgs.result?.data ?? [];

  const {
    refineCore: { formLoading, onFinish },
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    refineCoreProps: {
      resource: "engagements",
      action: isEdit ? "edit" : "create",
      id,
      redirect: "list",
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(engagementSchema) as any,
    defaultValues: {
      title: "",
      organizationId: prefilledOrgId,
      stage: "prospect",
      category: "deal",
      description: "",
      priority: "medium",
      assignedTo: "",
      startDate: "",
      targetDate: "",
      value: "",
      tags: [],
      createdBy: isEdit ? "" : "user-1",
    },
  });

  const stageValue = watch("stage");
  const categoryValue = watch("category");
  const priorityValue = watch("priority");
  const orgIdValue = watch("organizationId");

  const handleOrgChange = (orgId: string) => {
    setValue("organizationId", orgId);
  };

  const handleFinish = (values: FormValues) => {
    const tagsRaw = values.tags;
    const parsedTags =
      typeof tagsRaw === "string"
        ? (tagsRaw as string).split(",").map((t) => t.trim()).filter(Boolean)
        : Array.isArray(tagsRaw)
          ? tagsRaw
          : [];
    onFinish({ ...values, tags: parsedTags });
  };

  return (
    <PageShell loading={formLoading}>
      <div className="mx-auto max-w-2xl space-y-6">
        <PageHeader
          title={isEdit ? "Edit Engagement" : "New Engagement"}
          backTo="/portal/engagements"
        />

        <form onSubmit={handleSubmit(handleFinish as any)} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Engagement Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title *</Label>
                <AnimatedInput id="title" error={!!errors.title} {...register("title")} />
                {errors.title && (
                  <p className="text-sm text-destructive">{String(errors.title.message)}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Organization *</Label>
                <Select value={orgIdValue || "none"} onValueChange={(v) => handleOrgChange(v === "none" ? "" : v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select organization" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {orgData.map((org: BaseRecord) => (
                      <SelectItem key={org.id as string} value={org.id as string}>
                        {org.name as string}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.organizationId && (
                  <p className="text-sm text-destructive">{String(errors.organizationId.message)}</p>
                )}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Stage</Label>
                  <Select value={stageValue} onValueChange={(v) => setValue("stage", v as FormValues["stage"])}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {ENGAGEMENT_STAGES.map((s) => (
                        <SelectItem key={s} value={s}>
                          {s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select value={categoryValue} onValueChange={(v) => setValue("category", v as FormValues["category"])}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {ENGAGEMENT_CATEGORIES.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c.replace(/_/g, " ").replace(/\b\w/g, (ch) => ch.toUpperCase())}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Priority</Label>
                <Select value={priorityValue} onValueChange={(v) => setValue("priority", v as FormValues["priority"])}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <AnimatedTextarea id="description" rows={3} {...register("description")} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="assignedTo">Assigned To</Label>
                <AnimatedInput id="assignedTo" {...register("assignedTo")} />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="startDate">Start Date</Label>
                  <Input id="startDate" type="date" {...register("startDate")} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="targetDate">Target Date</Label>
                  <Input id="targetDate" type="date" {...register("targetDate")} />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="value">Value</Label>
                <AnimatedInput id="value" placeholder="e.g. $500K" {...register("value")} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="tags">Tags</Label>
                <AnimatedInput id="tags" placeholder="Comma-separated tags" {...register("tags")} />
              </div>
            </CardContent>
          </Card>

          <input type="hidden" {...register("createdBy")} />

          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => navigate(-1)}>
              Cancel
            </Button>
            <AnimatedButton type="submit" loading={isSubmitting}>
              {isEdit ? "Save Changes" : "Create Engagement"}
            </AnimatedButton>
          </div>
        </form>
      </div>
    </PageShell>
  );
}
