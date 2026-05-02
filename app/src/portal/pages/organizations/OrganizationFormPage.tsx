import { useForm } from "@refinedev/react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate, useParams } from "react-router-dom";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { AnimatedButton } from "../../components/AnimatedButton";
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
import { LocationEditor } from "../../components/LocationEditor";

const formSchema = z.object({
  name: z.string().min(1, "Name is required"),
  type: z.enum(["partner", "investor", "vendor", "client"]),
  status: z.enum(["active", "inactive", "prospect"]),
  locations: z.array(z.object({
    id: z.string(),
    country: z.string().min(1),
    countryName: z.string().min(1),
    city: z.string().min(1),
    lat: z.number(),
    lng: z.number(),
    isDefault: z.boolean(),
  })).min(1, "At least one location is required"),
  website: z.string().url("Invalid URL").optional().or(z.literal("")),
  description: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

export function OrganizationFormPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);

  const {
    refineCore: { formLoading, onFinish },
    register,
    handleSubmit,
    control,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    refineCoreProps: {
      resource: "organizations",
      action: isEdit ? "edit" : "create",
      id,
      redirect: "list",
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(formSchema) as any,
    defaultValues: {
      name: "",
      type: "partner",
      status: "prospect",
      locations: [{ id: crypto.randomUUID(), country: "", countryName: "", city: "", lat: 0, lng: 0, isDefault: true }],
      website: "",
      description: "",
    },
  });

  const typeValue = watch("type");
  const statusValue = watch("status");

  return (
    <PageShell loading={formLoading}>
      <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader
        title={isEdit ? "Edit Organization" : "New Organization"}
        backTo="/portal/organizations"
      />

      <form onSubmit={handleSubmit(onFinish)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <AnimatedInput id="name" error={!!errors.name} {...register("name")} />
              {errors.name && <p className="text-sm text-destructive">{String(errors.name.message)}</p>}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Type *</Label>
                <Select value={typeValue} onValueChange={(v) => setValue("type", v as FormValues["type"])}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="partner">Partner</SelectItem>
                    <SelectItem value="investor">Investor</SelectItem>
                    <SelectItem value="vendor">Vendor</SelectItem>
                    <SelectItem value="client">Client</SelectItem>
                    <SelectItem value="market_entity">Market Entity</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Status *</Label>
                <Select value={statusValue} onValueChange={(v) => setValue("status", v as FormValues["status"])}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="prospect">Prospect</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Locations *</Label>
              <LocationEditor
                value={watch("locations") ?? []}
                onChange={(locs) => setValue("locations", locs, { shouldValidate: true })}
              />
              {errors.locations && (
                <p className="text-sm text-destructive">
                  {typeof errors.locations.message === "string" ? errors.locations.message : "Invalid locations"}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="website">Website</Label>
              <AnimatedInput id="website" type="url" placeholder="https://..." error={!!errors.website} {...register("website")} />
              {errors.website && <p className="text-sm text-destructive">{String(errors.website.message)}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <AnimatedTextarea id="description" rows={3} {...register("description")} />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => navigate(-1)}>
            Cancel
          </Button>
          <AnimatedButton type="submit" loading={isSubmitting}>
            {isEdit ? "Save Changes" : "Create Organization"}
          </AnimatedButton>
        </div>
      </form>
      </div>
    </PageShell>
  );
}
