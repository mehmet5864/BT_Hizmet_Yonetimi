import { BookOpen, Code2, KeyRound, Shield } from "lucide-react";

import { ApiExplorer } from "@/components/api-explorer";
import { ModuleHero, WidgetRow } from "@/components/dashboard/module-widgets";
import { StatWidget } from "@/components/dashboard/stat-widget";
import { ApiKeysPanel } from "@/components/settings/api-keys-panel";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { listApiKeysForSettings } from "@/lib/actions/api-keys";
import { API_ENDPOINTS } from "@/lib/api/catalog";
import { API_SCOPE_LABELS, API_SCOPES } from "@/lib/api/scopes";
import { getViewer } from "@/lib/auth/viewer";
import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";

export const dynamic = "force-dynamic";

export default async function ApiConsolePage() {
  const headerList = await headers();
  const host = headerList.get("x-forwarded-host") ?? headerList.get("host") ?? "127.0.0.1:43130";
  const proto = headerList.get("x-forwarded-proto") ?? "http";
  const origin = `${proto}://${host}`;
  const viewer = await getViewer();
  const isKeyAdmin = viewer?.role === "SUPER_ADMIN";
  const [totalKeys, activeKeys, keys, people] = await Promise.all([
    prisma.apiKey.count(),
    prisma.apiKey.count({ where: { revokedAt: null } }),
    isKeyAdmin ? listApiKeysForSettings() : Promise.resolve([]),
    isKeyAdmin
      ? prisma.person.findMany({
          orderBy: { fullName: "asc" },
          select: { id: true, fullName: true, title: true },
        })
      : Promise.resolve([]),
  ]);

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-4 sm:p-8">
      <ModuleHero
        title="API arayüzü"
        description="Anahtar üretimi, uç listesi ve canlı deneme tek sayfada. REST yazma işlemleri bağlı anahtar veya aynı kaynak oturumu ister. Servis anahtarı salt okunurdur. Yazılı doküman Kılavuzlar’daki API kılavuzudur."
      />
      <WidgetRow>
        <StatWidget
          icon={<Code2 className="size-4" />}
          label="Uç sayısı"
          value={API_ENDPOINTS.length}
          hint="v1 REST"
          href="/api/v1"
          tone="info"
        />
        <StatWidget
          icon={<KeyRound className="size-4" />}
          label="Aktif anahtar"
          value={activeKeys}
          hint={`${totalKeys} kayıtlı`}
          href="/api-arayuzu#anahtarlar"
          tone={activeKeys ? "ok" : "warning"}
        />
        <StatWidget
          icon={<Shield className="size-4" />}
          label="Kapsam"
          value={API_SCOPES.length}
          hint="Modül + okuma/yazma"
          href="/api-arayuzu#kapsamlar"
        />
      </WidgetRow>

      {isKeyAdmin ? (
        <section id="anahtarlar" className="scroll-mt-6">
          <ApiKeysPanel
            keys={keys}
            people={people.map((person) => ({
              id: person.id,
              label: person.title ? `${person.fullName} — ${person.title}` : person.fullName,
            }))}
          />
        </section>
      ) : (
        <Card id="anahtarlar" className="scroll-mt-6">
          <CardHeader>
            <CardTitle className="text-base">API anahtarları</CardTitle>
            <CardDescription>
              Anahtar üretme ve iptal yalnızca süper yöneticidedir. Bu sayfada oturumunuzla uçları deneyebilir veya
              yöneticinin verdiği anahtarı canlı denemeye yapıştırabilirsiniz.
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      <ApiExplorer origin={origin} />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Kimlik doğrulama</CardTitle>
          <CardDescription>Üç yöntemden biri yeterlidir.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <pre className="bg-muted overflow-x-auto rounded-lg p-3 text-xs">{`curl -H "Authorization: Bearer bth_xxxx_…" ${origin}/api/v1/talepler
curl -H "X-Api-Key: bth_xxxx_…" ${origin}/api/v1/envanter?limit=20`}</pre>
          <ul className="text-muted-foreground list-disc space-y-1 pl-5">
            <li>Anahtarsız istekte oturum çerezi kullanılır (bu sayfadaki deneme).</li>
            <li>Personel bağlı anahtar, o kişinin kuyruğu, birimi ve ACL kesişimindeki kapsamlarla işlem yapar.</li>
            <li>Bağlı olmayan servis anahtarı yalnızca okur; yazma (POST/PATCH) reddedilir.</li>
            <li>Oturum ile yazma yalnızca aynı kaynaktan (bu uygulama) kabul edilir.</li>
            <li>
              Açık tanım:{" "}
              <a className="underline" href="/api/v1/openapi.json">
                /api/v1/openapi.json
              </a>
            </li>
            <li>
              Yazılı kılavuz: Kılavuzlar menüsündeki API PDF’i —{" "}
              <a className="underline" href="/docs/api-kilavuzu.pdf" download>
                api-kilavuzu.pdf
              </a>
            </li>
          </ul>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" size="sm">
              <a href="/docs/api-kilavuzu.pdf" download>
                <BookOpen className="size-4" />
                API kılavuzunu indir
              </a>
            </Button>
            <Button asChild variant="ghost" size="sm">
              <a href="/kilavuzlar">Tüm kılavuzlar</a>
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card id="kapsamlar" className="scroll-mt-6">
        <CardHeader>
          <CardTitle className="text-base">Kapsamlar</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="grid gap-2 sm:grid-cols-2">
            {API_SCOPES.map((scope) => (
              <li key={scope} className="rounded-md border px-3 py-2 text-sm">
                <span className="font-mono text-xs">{scope}</span>
                <p className="text-muted-foreground text-xs">{API_SCOPE_LABELS[scope]}</p>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
