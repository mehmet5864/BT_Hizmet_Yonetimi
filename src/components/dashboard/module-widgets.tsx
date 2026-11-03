import Link from "next/link";

import { DistributionTabs } from "@/components/dashboard/distribution-tabs";
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
  return (
    <Card className="widget-card">
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <DistributionTabs items={items} />
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
