import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useCreate } from "@refinedev/core";
import { Button } from "@/components/ui/button";
import { AnimatedButton } from "../../components/AnimatedButton";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { PageShell } from "../../components/PageShell";
import { PageHeader } from "../../components/PageHeader";
import { useComponentRegistry } from "../../engine/hooks";
import { resolveRendererForSchema } from "../../engine/schema-adaptive";
import { rendererRegistry } from "../../engine/renderer-registry";
import type {
  ComponentDefinition,
  DynamicComponentProps,
} from "../../engine/types";

/**
 * Organization field slugs that the engine should provide definitions for.
 * When the engine is seeded, definitions with these slugs will be rendered
 * dynamically instead of hardcoded JSX.
 */
const ORG_FIELD_SLUGS = [
  "org-name",
  "org-type",
  "org-status",
  "org-website",
  "org-description",
];

/**
 * Fallback schema used when no engine definitions exist.
 * This lets us demonstrate the schema-adaptive rendering pipeline
 * even before the engine has been seeded with org field definitions.
 */
const ORG_FIELD_SCHEMAS: Record<
  string,
  {
    slug: string;
    label: string;
    schema: import("../../engine/types").JSONSchema7;
    required?: boolean;
  }
> = {
  name: {
    slug: "org-name",
    label: "Name",
    schema: { type: "string", title: "Name" },
    required: true,
  },
  type: {
    slug: "org-type",
    label: "Type",
    schema: {
      type: "string",
      title: "Type",
      enum: ["partner", "investor", "vendor", "client", "market_entity"],
    },
    required: true,
  },
  status: {
    slug: "org-status",
    label: "Status",
    schema: {
      type: "string",
      title: "Status",
      enum: ["active", "prospect", "inactive"],
    },
    required: true,
  },
  website: {
    slug: "org-website",
    label: "Website",
    schema: { type: "string", title: "Website", format: "uri" },
  },
  description: {
    slug: "org-description",
    label: "Description",
    schema: { type: "string", title: "Description", maxLength: 500 },
  },
};

// ---------------------------------------------------------------------------
// Engine-backed field renderer (uses saved ComponentDefinition)
// ---------------------------------------------------------------------------

function EngineField({
  definition,
  value,
  onChange,
  errors,
}: {
  definition: ComponentDefinition;
  value: unknown;
  onChange: (v: unknown) => void;
  errors?: string[];
}) {
  const Renderer =
    rendererRegistry.get(definition.renderer) ??
    rendererRegistry.getFallback();
  const i18n = definition.i18n.en;

  return (
    <div className="space-y-2">
      <Renderer
        instanceId={`dyn-${definition.slug}`}
        config={definition.defaultConfig}
        validations={definition.validations}
        i18n={i18n}
        value={value}
        onChange={onChange}
        errors={errors}
        locale="en"
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Schema-adaptive field renderer (fallback when no engine definitions exist)
// ---------------------------------------------------------------------------

function SchemaField({
  fieldKey,
  value,
  onChange,
  errors,
}: {
  fieldKey: string;
  value: unknown;
  onChange: (v: unknown) => void;
  errors?: string[];
}) {
  const spec = ORG_FIELD_SCHEMAS[fieldKey];
  if (!spec) return null;

  const { Component, config } = resolveRendererForSchema(
    spec.schema,
    fieldKey,
  );

  return (
    <div className="space-y-2">
      <Component
        instanceId={`schema-${fieldKey}`}
        config={config}
        validations={
          spec.required
            ? [
                {
                  rule: "required",
                  message_en: `${spec.label} is required`,
                  message_ar: `${spec.label} مطلوب`,
                },
              ]
            : []
        }
        i18n={{
          label: `${spec.label}${spec.required ? " *" : ""}`,
          placeholder: spec.schema.format === "uri" ? "https://..." : undefined,
        }}
        value={value}
        onChange={onChange}
        errors={errors}
        locale="en"
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page component
// ---------------------------------------------------------------------------

export function OrganizationDynamicForm() {
  const navigate = useNavigate();
  const { definitions, loading: defsLoading } = useComponentRegistry({
    category: "field",
  });
  const { mutate: createOrg } = useCreate();

  const [values, setValues] = useState<Record<string, unknown>>({
    type: "partner",
    status: "prospect",
  });
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [submitting, setSubmitting] = useState(false);

  // Match engine definitions to org field slugs
  const engineFields = useMemo(() => {
    const map = new Map<string, ComponentDefinition>();
    for (const def of definitions) {
      if (ORG_FIELD_SLUGS.includes(def.slug)) {
        map.set(def.slug, def);
      }
    }
    return map;
  }, [definitions]);

  const hasEngineFields = engineFields.size > 0;

  const setValue = useCallback((key: string, value: unknown) => {
    setValues((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }, []);

  const validate = useCallback((): boolean => {
    const newErrors: Record<string, string[]> = {};
    let valid = true;

    // Validate required fields
    for (const [key, spec] of Object.entries(ORG_FIELD_SCHEMAS)) {
      if (spec.required) {
        const v = values[key];
        if (v === undefined || v === null || v === "") {
          newErrors[key] = [`${spec.label} is required`];
          valid = false;
        }
      }
    }

    setErrors(newErrors);
    return valid;
  }, [values]);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (!validate()) return;

      setSubmitting(true);
      createOrg(
        {
          resource: "organizations",
          values: {
            name: values.name ?? "",
            type: values.type ?? "partner",
            status: values.status ?? "prospect",
            website: values.website ?? "",
            description: values.description ?? "",
            locations: [
              {
                id: crypto.randomUUID(),
                country: "",
                countryName: "",
                city: "",
                lat: 0,
                lng: 0,
                isDefault: true,
              },
            ],
          },
        },
        {
          onSuccess: () => {
            navigate("/portal/organizations");
          },
          onError: () => {
            setSubmitting(false);
          },
        },
      );
    },
    [values, validate, createOrg, navigate],
  );

  // Determine rendering mode
  const useEngineMode = hasEngineFields;

  return (
    <PageShell loading={defsLoading}>
      <div className="mx-auto max-w-2xl space-y-6">
        <PageHeader
          title="New Organization (Dynamic)"
          backTo="/portal/organizations"
        />

        {defsLoading ? (
          <Card>
            <CardContent className="space-y-4 pt-6">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </CardContent>
          </Card>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Details</CardTitle>
                  <Badge variant={useEngineMode ? "default" : "secondary"}>
                    {useEngineMode ? "Engine-Powered" : "Schema-Adaptive"}
                  </Badge>
                </div>
                {!useEngineMode && (
                  <p className="text-sm text-muted-foreground">
                    No engine definitions found for organization fields. Using
                    schema-adaptive rendering. Seed the engine from the Control
                    Board to enable full engine-powered forms.
                  </p>
                )}
              </CardHeader>
              <CardContent className="space-y-4">
                {useEngineMode ? (
                  // Engine-powered rendering
                  <>
                    {Object.entries(ORG_FIELD_SCHEMAS).map(([key, spec]) => {
                      const def = engineFields.get(spec.slug);
                      if (!def) {
                        // Fall back to schema-adaptive for fields without definitions
                        return (
                          <SchemaField
                            key={key}
                            fieldKey={key}
                            value={values[key]}
                            onChange={(v) => setValue(key, v)}
                            errors={errors[key]}
                          />
                        );
                      }
                      return (
                        <EngineField
                          key={key}
                          definition={def}
                          value={values[key]}
                          onChange={(v) => setValue(key, v)}
                          errors={errors[key]}
                        />
                      );
                    })}
                  </>
                ) : (
                  // Schema-adaptive rendering (fallback)
                  <>
                    {Object.keys(ORG_FIELD_SCHEMAS).map((key) => (
                      <SchemaField
                        key={key}
                        fieldKey={key}
                        value={values[key]}
                        onChange={(v) => setValue(key, v)}
                        errors={errors[key]}
                      />
                    ))}
                  </>
                )}
              </CardContent>
            </Card>

            <div className="flex justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate(-1)}
              >
                Cancel
              </Button>
              <AnimatedButton type="submit" loading={submitting}>
                Create Organization
              </AnimatedButton>
            </div>
          </form>
        )}
      </div>
    </PageShell>
  );
}
