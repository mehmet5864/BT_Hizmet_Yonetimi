import Link from "next/link";

import { PageHeader } from "@/components/ui-bits";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function ModuleHero({
  title,
  description,
  actions,
}: {
  title: string;
  description: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="hero-banner overflow-hidden rounded-xl p-6 sm:p-8">
      <PageHeader
        title={title}
        description={description}
        actions={actions ? <div className="hero-actions">{actions}</div> : undefined}
      />
    </div>
  );
}

export function WidgetRow({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{children}</div>;
}

export function DistributionCard({
  title,
  items,
}: {
  title: string;
  items: { label: string; value: number; href?: string }[];
}) {
  const total = items.reduce((sum, item) => sum + item.value, 0);
  return (
    <Card className="widget-card">
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.length ? (
          items.map((item) => {
            const ratio = total ? Math.round((item.value / total) * 100) : 0;
            const inner = (
              <>
                <div className="flex items-center justify-between text-sm">
                  <span className="truncate">{item.label}</span>
                  <span className="tabular-nums">{item.value}</span>
                </div>
                <div className="bg-muted h-1.5 w-full overflow-hidden rounded-full">
                  <div className="widget-bar h-full rounded-full" style={{ width: `${ratio}%` }} />
                </div>
              </>
            );
            return item.href ? (
              <Link key={item.label} href={item.href} className="block space-y-1.5 hover:opacity-90">
                {inner}
              </Link>
            ) : (
              <div key={item.label} className="space-y-1.5">
                {inner}
              </div>
            );
          })
        ) : (
          <p className="text-muted-foreground text-sm">Henüz dağılım oluşmadı.</p>
        )}
      </CardContent>
    </Card>
  );
}

export function RecentCard({
  title,
  description,
  actionHref,
  actionLabel = "Liste",
  children,
}: {
  title: string;
  description?: string;
  actionHref?: string;
  actionLabel?: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="widget-card">
      <CardHeader className="flex-row items-center justify-between gap-3">
        <div>
          <CardTitle className="text-base">{title}</CardTitle>
          {description ? <CardDescription>{description}</CardDescription> : null}
        </div>
        {actionHref ? (
          <Button variant="ghost" size="sm" asChild>
            <Link href={actionHref}>{actionLabel}</Link>
          </Button>
        ) : null}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}
