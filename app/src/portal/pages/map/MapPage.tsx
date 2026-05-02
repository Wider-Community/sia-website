import { useState, useMemo } from "react";
import { useList } from "@refinedev/core";
import { useNavigate } from "react-router-dom";
import { PageShell } from "../../components/PageShell";
import { PageHeader } from "../../components/PageHeader";
import {
  ComposableMap,
  Geographies,
  Geography,
  Marker,
  ZoomableGroup,
} from "react-simple-maps";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import type { Organization } from "../../schemas";

interface OrgLocation {
  id: string;
  country: string;
  countryName: string;
  city: string;
  lat: number;
  lng: number;
  isDefault: boolean;
}

const GEO_URL = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

const STAGE_COLORS: Record<string, string> = {
  prospect: "#94a3b8",
  engaged: "#3b82f6",
  due_diligence: "#f59e0b",
  negotiation: "#8b5cf6",
  active_partner: "#22c55e",
  inactive: "#6b7280",
};

const STAGE_LABELS: Record<string, string> = {
  prospect: "Prospect",
  engaged: "Engaged",
  due_diligence: "Due Diligence",
  negotiation: "Negotiation",
  active_partner: "Active Partner",
  inactive: "Inactive",
};


function getOrgStage(org: Organization & Record<string, unknown>): string {
  return (
    (org.stage as string) ??
    ((org.nodeDetails as Record<string, unknown>)?.stage as string) ??
    org.status ??
    "prospect"
  );
}

export function MapPage() {
  const navigate = useNavigate();
  const [stageFilter, setStageFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [tooltip, setTooltip] = useState<{
    name: string;
    city: string;
    stage: string;
    type: string;
    x: number;
    y: number;
  } | null>(null);

  const { result: orgsResult, query: orgsQuery } = useList<Organization>({
    resource: "organizations",
    pagination: { pageSize: 500 },
  });
  const isLoading = orgsQuery.isLoading;

  const markers = useMemo(() => {
    if (!orgsResult?.data) return [];
    const result: Array<{
      id: string;
      orgId: string;
      name: string;
      city: string;
      countryName: string;
      type: string;
      stage: string;
      coordinates: [number, number];
      isDefault: boolean;
    }> = [];
    for (const org of orgsResult.data) {
      const locations = (org as unknown as { locations?: OrgLocation[] }).locations;
      if (!locations || locations.length === 0) continue;
      const stage = getOrgStage(org as Organization & Record<string, unknown>);
      for (const loc of locations) {
        if (!loc.lat && !loc.lng) continue;
        result.push({
          id: `${org.id}-${loc.id}`,
          orgId: org.id,
          name: org.name,
          city: loc.city,
          countryName: loc.countryName,
          type: org.type,
          stage,
          coordinates: [loc.lng, loc.lat] as [number, number],
          isDefault: loc.isDefault,
        });
      }
    }
    return result;
  }, [orgsResult]);

  const filtered = useMemo(() => {
    return markers.filter((m) => {
      if (stageFilter !== "all" && m.stage !== stageFilter) return false;
      if (typeFilter !== "all" && m.type !== typeFilter) return false;
      return true;
    });
  }, [markers, stageFilter, typeFilter]);

  return (
    <PageShell>
      <PageHeader title="Organization Map" />

      <div className="flex flex-wrap gap-4">
        <Select value={stageFilter} onValueChange={setStageFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by stage" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Stages</SelectItem>
            {Object.entries(STAGE_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="partner">Partner</SelectItem>
            <SelectItem value="investor">Investor</SelectItem>
            <SelectItem value="vendor">Vendor</SelectItem>
            <SelectItem value="client">Client</SelectItem>
          </SelectContent>
        </Select>

        <div className="flex flex-wrap gap-2 items-center ml-4">
          {Object.entries(STAGE_LABELS).map(([key, label]) => (
            <Badge
              key={key}
              variant="outline"
              className="gap-1.5"
            >
              <span
                className="inline-block h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: STAGE_COLORS[key] }}
              />
              {label}
            </Badge>
          ))}
        </div>
      </div>

      <Card>
        <CardContent className="p-0 relative">
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/50 z-10">
              <span className="text-muted-foreground">Loading...</span>
            </div>
          )}
          <ComposableMap
            projectionConfig={{ scale: 147 }}
            style={{ width: "100%", height: "auto" }}
          >
            <ZoomableGroup>
              <Geographies geography={GEO_URL}>
                {({ geographies }) =>
                  geographies.map((geo) => (
                    <Geography
                      key={geo.rsmKey}
                      geography={geo}
                      fill="#1e293b"
                      stroke="#334155"
                      strokeWidth={0.5}
                      style={{
                        default: { outline: "none" },
                        hover: { outline: "none", fill: "#334155" },
                        pressed: { outline: "none" },
                      }}
                    />
                  ))
                }
              </Geographies>
              {filtered.map((m) => (
                <Marker
                  key={m.id}
                  coordinates={m.coordinates}
                  onClick={() => navigate(`/portal/organizations/${m.orgId}`)}
                  onMouseEnter={(e) => {
                    const target = e.target as SVGElement;
                    const ctm = target.getScreenCTM();
                    setTooltip({
                      name: m.name,
                      city: m.city,
                      stage: STAGE_LABELS[m.stage] ?? m.stage,
                      type: m.type,
                      x: ctm ? ctm.e : 0,
                      y: ctm ? ctm.f - 40 : 0,
                    });
                  }}
                  onMouseLeave={() => setTooltip(null)}
                  style={{ cursor: "pointer" }}
                >
                  <circle
                    r={m.isDefault ? 6 : 4}
                    fill={STAGE_COLORS[m.stage] ?? "#94a3b8"}
                    stroke="#fff"
                    strokeWidth={1.5}
                  />
                </Marker>
              ))}
            </ZoomableGroup>
          </ComposableMap>

          {tooltip && (
            <div
              className="fixed z-50 rounded-md bg-popover px-3 py-2 text-sm text-popover-foreground shadow-md border pointer-events-none"
              style={{ left: tooltip.x, top: tooltip.y, transform: "translate(-50%, -100%)" }}
            >
              <div className="font-semibold">{tooltip.name} &mdash; {tooltip.city}</div>
              <div className="text-muted-foreground">
                {tooltip.stage} &middot; {tooltip.type}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </PageShell>
  );
}
