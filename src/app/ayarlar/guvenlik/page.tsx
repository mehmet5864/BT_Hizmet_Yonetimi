import Link from "next/link";

import { ModuleHero } from "@/components/dashboard/module-widgets";
import { SecurityForm } from "@/components/settings/security-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getViewer } from "@/lib/auth/viewer";
import { getSecurityPolicy } from "@/lib/security/policy";

export const dynamic = "force-dynamic";

export default async function SecurityPage() {
  const viewer = await getViewer();
  if (viewer?.role !== "SUPER_ADMIN") {
    return (
      <div className="mx-auto w-full max-w-3xl p-4 sm:p-8">
        <ModuleHero title="Güvenlik" description="Güvenlik politikası yalnızca süper yönetici tarafından yönetilir." />
      </div>
    );
  }
  const policy = await getSecurityPolicy();
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-4 sm:p-8">
      <ModuleHero
        title="Güvenlik"
        description="Parola kuralları, hatalı girişte hesap kilidi ve oturum süresi."
        actions={
          <Button asChild variant="outline" size="sm">
            <Link href="/ayarlar">Ayarlara dön</Link>
          </Button>
        }
      />
      <SecurityForm policy={policy} />
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Yedekleme</CardTitle>
          <CardDescription>Veritabanı yedeği Docker üzerinden alınır; kurulum klasöründeki betikleri kullanın.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-1 text-sm">
          <p>
            <code>yedekle-docker.bat</code> (Windows) ya da <code>./yedekle-docker.sh</code> → <code>yedekler/</code> klasörüne
            tarihli <code>.sql.gz</code> ve yükleme dosyaları arşivi yazar.
          </p>
          <p>
            <code>geri-yukle-docker.bat &lt;dosya&gt;</code> yedeği geri yükler. Lisans anahtarı ve işaret dosyaları da yedeğe girer.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
