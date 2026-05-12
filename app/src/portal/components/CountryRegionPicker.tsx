import { useEffect, useMemo, useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { getReferenceDataManager } from "../engine/hooks-internal";
import type { ReferenceEntry } from "../engine/reference-data";

export interface CountryRegionValue {
  country?: string;
  region?: string;
}

interface CountryRegionPickerProps {
  value?: CountryRegionValue;
  onChange?: (v: CountryRegionValue) => void;
  locale?: "en" | "ar";
  /** Restrict countries shown (ISO 2-letter codes). Default: all. */
  countryFilter?: string[];
  /** Restrict regions to entries whose group is one of these countries. */
  disabled?: boolean;
}

/**
 * Two cascading dropdowns: pick a country, then pick one of its regions.
 *
 * Loads the `countries` and `regions` reference datasets directly via the
 * manager. Regions are filtered client-side by `entry.group === country`.
 * Clearing or changing the country resets the region selection.
 */
export function CountryRegionPicker({
  value,
  onChange,
  locale = "en",
  countryFilter,
  disabled,
}: CountryRegionPickerProps) {
  const [countries, setCountries] = useState<ReferenceEntry[] | null>(null);
  const [regions, setRegions] = useState<ReferenceEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const manager = getReferenceDataManager();
    (async () => {
      try {
        const [c, r] = await Promise.all([
          manager.getDataset("countries"),
          manager.getDataset("regions"),
        ]);
        if (cancelled) return;
        setCountries(c?.entries ?? []);
        setRegions(r?.entries ?? []);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Failed to load datasets");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const visibleCountries = useMemo(() => {
    if (!countries) return [];
    if (!countryFilter) return countries;
    const allowed = new Set(countryFilter);
    return countries.filter((e) => allowed.has(e.value));
  }, [countries, countryFilter]);

  const regionsForCountry = useMemo(() => {
    if (!regions || !value?.country) return [];
    return regions.filter((e) => e.group === value.country);
  }, [regions, value?.country]);

  const labelOf = (e: ReferenceEntry) =>
    (locale === "ar" ? e.label_ar : e.label_en) ?? e.label_en;

  if (error) {
    return <p className="text-sm text-destructive">{error}</p>;
  }
  if (!countries || !regions) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-9 w-full" />
        <Skeleton className="h-9 w-full" />
      </div>
    );
  }

  const handleCountry = (next: string) => {
    onChange?.({ country: next, region: undefined });
  };
  const handleRegion = (next: string) => {
    onChange?.({ country: value?.country, region: next });
  };

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="space-y-1.5">
        <Label className="text-xs">{locale === "ar" ? "الدولة" : "Country"}</Label>
        <Select
          value={value?.country ?? ""}
          onValueChange={handleCountry}
          disabled={disabled}
          dir={locale === "ar" ? "rtl" : "ltr"}
        >
          <SelectTrigger className="h-9">
            <SelectValue placeholder={locale === "ar" ? "اختر دولة" : "Select country"} />
          </SelectTrigger>
          <SelectContent>
            {visibleCountries.map((c) => (
              <SelectItem key={c.value} value={c.value}>
                {labelOf(c)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">{locale === "ar" ? "المنطقة" : "Region"}</Label>
        <Select
          value={value?.region ?? ""}
          onValueChange={handleRegion}
          disabled={disabled || !value?.country || regionsForCountry.length === 0}
          dir={locale === "ar" ? "rtl" : "ltr"}
        >
          <SelectTrigger className="h-9">
            <SelectValue
              placeholder={
                !value?.country
                  ? locale === "ar"
                    ? "اختر دولة أولاً"
                    : "Pick a country first"
                  : regionsForCountry.length === 0
                    ? locale === "ar"
                      ? "لا توجد مناطق متاحة"
                      : "No regions available"
                    : locale === "ar"
                      ? "اختر منطقة"
                      : "Select region"
              }
            />
          </SelectTrigger>
          <SelectContent>
            {regionsForCountry.map((r) => (
              <SelectItem key={r.value} value={r.value}>
                {labelOf(r)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
