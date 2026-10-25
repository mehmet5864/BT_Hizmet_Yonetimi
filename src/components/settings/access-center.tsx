"use client";

import { AccessGroups, type GroupRow } from "@/components/settings/access-groups";
import { AccessMatrix } from "@/components/settings/access-matrix";
import { UnitsForms } from "@/components/settings/org-forms";
import type { UnitItem } from "@/components/settings/unit-row";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { ModuleGrant } from "@/lib/auth/acl";
import type { AdRoleMap } from "@/lib/auth/rbac";
import type { SystemSettings } from "@/lib/settings";

/** Eski sekme adları yeni üç sekmeye eşlenir. */
const TAB_ALIAS: Record<string, string> = {
  ozet: "matris",
  moduller: "matris",
  yoneticiler: "matris",
  roller: "gruplar",
  talep: "gruplar",
};

export function AccessCenter({
  initialTab,
  roleMaps,
  defaultRole,
  grants,
  adGroups,
  adNote,
  requestOffices,
  issues,
  settings,
  people,
  units,
}: {
  initialTab: string;
  roleMaps: AdRoleMap[];
  defaultRole: string;
  grants: ModuleGrant[];
  adGroups: string[];
  adNote: string;
  requestOffices: { office: string; label: string; rows: GroupRow[] }[];
  issues: string[];
  settings: SystemSettings;
  people: { id: string; label: string; meta?: string }[];
  units: UnitItem[];
}) {
  const resolved = TAB_ALIAS[initialTab] ?? initialTab;
  const tab = ["matris", "gruplar", "birimler"].includes(resolved) ? resolved : "matris";
  return (
    <Tabs defaultValue={tab} className="gap-4">
      <TabsList className="grid h-auto w-full grid-cols-3 sm:w-auto">
        <TabsTrigger value="matris">1 · Yetki matrisi</TabsTrigger>
        <TabsTrigger value="gruplar">2 · AD grupları</TabsTrigger>
        <TabsTrigger value="birimler">3 · Talep birimleri</TabsTrigger>
      </TabsList>
      <TabsContent value="matris">
        <AccessMatrix grants={grants} issues={issues} settings={settings} people={people} />
      </TabsContent>
      <TabsContent value="gruplar">
        <AccessGroups adGroups={adGroups} adNote={adNote} roleMaps={roleMaps} defaultRole={defaultRole} offices={requestOffices} />
      </TabsContent>
      <TabsContent value="birimler" className="space-y-4">
        <UnitsForms settings={settings} people={people} units={units} />
      </TabsContent>
    </Tabs>
  );
}
