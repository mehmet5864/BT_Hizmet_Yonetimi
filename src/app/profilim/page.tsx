import Link from "next/link";
import { redirect } from "next/navigation";

import { PersonPerformance } from "@/components/personel/person-performance";
import { PersonWorkloadCard } from "@/components/personel/person-workload";
import { PageHeader } from "@/components/ui-bits";
import { Button } from "@/components/ui/button";
import { getViewer } from "@/lib/auth/viewer";
import { emptyStat, getPersonStats } from "@/lib/person-stats";
import { getPersonWorkload } from "@/lib/person-workload";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function MyWorkPage() {
  const viewer = await getViewer();
  if (!viewer) redirect("/giris");
  const [person, workload, stats] = await Promise.all([
    prisma.person.findUnique({ where: { id: viewer.id }, select: { fullName: true, title: true, duty: true, department: { select: { name: true } } } }),
    getPersonWorkload(viewer.id),
    getPersonStats([viewer.id]),
  ]);
  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 p-4 sm:p-8">
      <PageHeader
        title="Çalışma özetim"
        description={[person?.fullName, person?.title ?? person?.duty, person?.department?.name].filter(Boolean).join(" · ")}
        actions={
          <Button variant="outline" asChild>
            <Link href="/">Ana sayfa</Link>
          </Button>
        }
      />
      <PersonWorkloadCard data={workload} title="Üzerimdeki işler, onaylar ve görevler" />
      <PersonPerformance stat={stats.get(viewer.id) ?? emptyStat()} />
    </div>
  );
}
