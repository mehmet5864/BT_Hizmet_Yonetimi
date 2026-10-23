import Link from "next/link";
import { Building2, KeyRound, Shield, Users } from "lucide-react";

import { PersonnelActions } from "@/components/personnel-actions";

import { DistributionCard, ModuleHero, RecentCard, WidgetRow } from "@/components/dashboard/module-widgets";
import { ListFilters } from "@/components/list-filters";
import { StatWidget } from "@/components/dashboard/stat-widget";
import { EmptyState } from "@/components/ui-bits";
import { Badge } from "@/components/ui/badge";
import { PERSONNEL_ROLE_LABELS, PERSONNEL_ROLES, type PersonnelRole } from "@/lib/itil/constants";
import { getPersonnelDashboard } from "@/lib/module-stats";
import { emptyStat, getPersonStats } from "@/lib/person-stats";
import { prisma } from "@/lib/prisma";
import { mergeWhere, param, searchOr } from "@/lib/search-params";
import { getScopedDb } from "@/lib/auth/data-scope";
import { canHandleModule } from "@/lib/auth/viewer";

export const dynamic = "force-dynamic";

export default async function PersonnelPage({ searchParams }: PageProps<"/personel">) {
  const db = await getScopedDb();
  const canEditPeople = await canHandleModule("/personel");
  const params = await searchParams;
  const query = param(params, "q");
  const role = param(params, "rol");
  const departmentId = param(params, "birim");
  const [people, departments, dash] = await Promise.all([
    db.person.findMany({
      where: mergeWhere(
        role ? { role } : {},
        departmentId ? { departmentId } : {},
        searchOr(query, ["fullName", "sicilNo", "tcNo", "email", "adUsername", "title", "department.name"]),
      ) as never,
      orderBy: { fullName: "asc" },
      include: {
        department: true,
        unitManager: true,
        parentDepartment: true,
        _count: { select: { assets: true } },
      },
      take: 300,
    }),
    prisma.department.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    getPersonnelDashboard(db),
  ]);

  const stats = await getPersonStats(people.map((person) => person.id));

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 p-4 sm:p-8">
      <ModuleHero
        title="Personel yönetimi"
        description="TC, sicil, birim hiyerarşisi ve yetki rolleri."
        actions={canEditPeople ? <PersonnelActions /> : undefined}
      />

      <WidgetRow>
        <StatWidget icon={<Users className="size-4" />} label="Kayıtlı personel" value={dash.total} hint="Tüm aktif kayıtlar" href="/personel" tone="info" />
        <StatWidget icon={<KeyRound className="size-4" />} label="AD hesabı" value={dash.withAd} hint="Active Directory kullanıcı adı dolu" href="/personel" bar={dash.total ? Math.round((dash.withAd / dash.total) * 100) : 0} />
        <StatWidget icon={<Shield className="size-4" />} label="Yönetici / amir" value={dash.managers} hint="Birim ve üst yetkili roller" href="/personel" />
        <StatWidget
          icon={<Building2 className="size-4" />}
          label="Birimsiz"
          value={dash.noDept}
          hint="Birim atanmamış personel"
          href="/personel"
          tone={dash.noDept > 0 ? "warning" : "ok"}
        />
      </WidgetRow>

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <RecentCard title="Son eklenen personel" description="Yeni kayıtlar.">
            {dash.recent.length ? (
              <ul className="divide-y">
                {dash.recent.map((person) => (
                  <li key={person.id} className="flex items-center justify-between gap-3 py-2.5">
                    <div className="min-w-0">
                      <Link href={`/personel/${person.id}`} className="truncate text-sm font-medium hover:underline">
                        {person.fullName}
                      </Link>
                      <p className="text-muted-foreground truncate text-xs">
                        {person.title ?? person.duty ?? "—"}
                        {person.department ? ` · ${person.department.name}` : ""}
                      </p>
                    </div>
                    <Badge variant="secondary">{PERSONNEL_ROLE_LABELS[person.role as PersonnelRole] ?? person.role}</Badge>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState title="Personel yok" description="İlk personel kaydını oluşturun." />
            )}
          </RecentCard>
        </div>
        <div className="flex flex-col gap-6 lg:col-span-2">
          <DistributionCard
            title="Rol dağılımı"
            items={PERSONNEL_ROLES.map((role) => ({
              label: PERSONNEL_ROLE_LABELS[role],
              value: dash.byRole[role] ?? 0,
            })).filter((item) => item.value > 0)}
          />
          <DistributionCard title="Birimler" items={dash.byDepartment.slice(0, 6)} />
        </div>
      </div>

      <ListFilters
        searchPlaceholder="Ad, sicil, TC, e-posta veya birim ara…"
        searchAriaLabel="Personel ara"
        selects={[
          {
            key: "rol",
            label: "Yetki",
            allLabel: "Tüm roller",
            options: PERSONNEL_ROLES.map((item) => ({ value: item, label: PERSONNEL_ROLE_LABELS[item] })),
          },
          {
            key: "birim",
            label: "Birim",
            allLabel: "Tüm birimler",
            className: "w-52",
            options: departments.map((item) => ({ value: item.id, label: item.name })),
          },
        ]}
      />
      <p className="text-muted-foreground text-sm">{people.length} kayıt listeleniyor</p>

      {people.length ? (
        <div className="overflow-hidden rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left">
              <tr>
                <th className="px-3 py-2 font-medium">Ad soyad</th>
                <th className="px-3 py-2 font-medium">Sicil / TC</th>
                <th className="px-3 py-2 font-medium">Birim</th>
                <th className="px-3 py-2 font-medium">Amir</th>
                <th className="px-3 py-2 font-medium">Yetki</th>
                <th className="px-3 py-2 font-medium">Envanter</th>
                <th className="px-3 py-2 font-medium" title="Açtığı çağrı">Açtığı</th>
                <th className="px-3 py-2 font-medium" title="Kapattığı çağrı">Kapattığı</th>
                <th className="px-3 py-2 font-medium" title="Diğer ITIL süreçlerinde giriş / güncelleme / tamamlama">Diğer süreç (G/Gü/T)</th>
                <th className="px-3 py-2 font-medium">Puan</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {people.map((person) => (
                <tr key={person.id} className="hover:bg-muted/30">
                  <td className="px-3 py-2">
                    <Link href={`/personel/${person.id}`} className="font-medium hover:underline">
                      {person.fullName}
                    </Link>
                    <p className="text-muted-foreground text-xs">{person.title ?? person.duty ?? "—"}</p>
                  </td>
                  <td className="text-muted-foreground px-3 py-2 font-mono text-xs">
                    {person.sicilNo ?? "—"}
                    <br />
                    {person.tcNo ?? "—"}
                  </td>
                  <td className="px-3 py-2">{person.department?.name ?? "—"}</td>
                  <td className="px-3 py-2">{person.unitManager?.fullName ?? "—"}</td>
                  <td className="px-3 py-2">
                    <Badge variant="secondary">{PERSONNEL_ROLE_LABELS[person.role as PersonnelRole] ?? person.role}</Badge>
                  </td>
                  <td className="px-3 py-2 tabular-nums">{person._count.assets}</td>
                  {(() => {
                    const stat = stats.get(person.id) ?? emptyStat();
                    return (
                      <>
                        <td className="px-3 py-2 tabular-nums">{stat.opened}</td>
                        <td className="px-3 py-2 tabular-nums">{stat.closed}</td>
                        <td className="px-3 py-2 tabular-nums">
                          {stat.otherCreated} / {stat.otherUpdated} / {stat.otherCompleted}
                        </td>
                        <td className="px-3 py-2 font-medium tabular-nums">{stat.points}</td>
                      </>
                    );
                  })()}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState title="Kayıt bulunamadı" description="Filtrelerinizi gevşetin veya ilk personel kaydını oluşturun." />
      )}
    </div>
  );
}
