import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate, useParams } from "react-router-dom";
import { useCreate, useUpdate, useOne, useList } from "@refinedev/core";
import { z } from "zod";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AnimatedButton } from "../../components/AnimatedButton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AnimatedInput } from "../../components/AnimatedInput";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { PageShell } from "../../components/PageShell";
import { PageHeader } from "../../components/PageHeader";

const formSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  phone: z.string().optional(),
  role: z.string().optional(),
  organizationId: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

export function ContactFormPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);

  const { result: orgsResult } = useList({
    resource: "organizations",
    pagination: { mode: "off" },
  });
  const orgsData = orgsResult;

  const { query: contactQuery } = useOne({
    resource: "contacts",
    id: id!,
    queryOptions: { enabled: isEdit },
  });

  const { mutate: createContact, isLoading: isCreating } = useCreate();
  const { mutate: updateContact, isLoading: isUpdating } = useUpdate();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      role: "",
      organizationId: "",
    },
  });

  useEffect(() => {
    if (isEdit && contactQuery?.data?.data) {
      const c = contactQuery.data.data;
      reset({
        firstName: (c.firstName as string) ?? "",
        lastName: (c.lastName as string) ?? "",
        email: (c.email as string) ?? "",
        phone: (c.phone as string) ?? "",
        role: (c.role as string) ?? "",
        organizationId: (c.organizationId as string) ?? "",
      });
    }
  }, [isEdit, contactQuery?.data?.data, reset]);

  const orgIdValue = watch("organizationId");
  const isSaving = isCreating || isUpdating;

  const onSubmit = (values: FormValues) => {
    if (isEdit) {
      updateContact(
        { resource: "contacts", id: id!, values },
        { onSuccess: () => navigate("/portal/contacts") },
      );
    } else {
      createContact(
        { resource: "contacts", values },
        { onSuccess: () => navigate("/portal/contacts") },
      );
    }
  };

  if (isEdit && contactQuery?.isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <PageShell>
      <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader title={isEdit ? "Edit Contact" : "New Contact"} backTo="/portal/contacts" />

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Contact Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name *</Label>
                <AnimatedInput id="firstName" error={!!errors.firstName} {...register("firstName")} />
                {errors.firstName && (
                  <p className="text-sm text-destructive">{errors.firstName.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name *</Label>
                <AnimatedInput id="lastName" error={!!errors.lastName} {...register("lastName")} />
                {errors.lastName && (
                  <p className="text-sm text-destructive">{errors.lastName.message}</p>
                )}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <AnimatedInput id="email" type="email" error={!!errors.email} {...register("email")} />
                {errors.email && (
                  <p className="text-sm text-destructive">{errors.email.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input id="phone" {...register("phone")} />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <Input id="role" {...register("role")} />
              </div>
              <div className="space-y-2">
                <Label>Organization</Label>
                <Select
                  value={orgIdValue ?? ""}
                  onValueChange={(v) => setValue("organizationId", v === "none" ? "" : v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select organization" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {(orgsData?.data ?? []).map((org) => (
                      <SelectItem key={org.id as string} value={org.id as string}>
                        {org.name as string}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => navigate(-1)}>
            Cancel
          </Button>
          <AnimatedButton type="submit" loading={isSaving}>
            {isEdit ? "Save Changes" : "Create Contact"}
          </AnimatedButton>
        </div>
      </form>
    </div>
    </PageShell>
  );
}
