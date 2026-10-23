import Link from "next/link";
import { redirect } from "next/navigation";
import { Download, FileSpreadsheet } from "lucide-react";

import { getInventoryAccess } from "@/lib/auth/inventory";

import { BulkImportForm } from "@/components/bulk-import-form";
import { ModuleHero } from "@/components/dashboard/module-widgets";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BULK_COLUMNS } from "@/lib/inventory/bulk";

export const dynamic = "force-dynamic";

export default async function BulkInventoryPage() {
  const access = await getInventoryAccess();
  if (!access?.canDirectMutate) redirect("/yetkisiz");
  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 p-4 sm:p-8">
      <ModuleHero
        title="Toplu envanter yükleme"
        description="Excel şablonunu indirin, satır satır doldurun, aynı dosyayı geri yükleyin."
        actions={
          <Button asChild variant="outline">
            <a href="/api/envanter/sablon">
              <Download className="size-4" />
              Şablonu indir
            </a>
          </Button>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Şablon</CardTitle>
          <CardDescription>
            Dosyada Envanter, Listeler ve Talimat sayfaları vardır. Tür, Ad ve Sahibi zorunludur. Sahip adı personel
            kaydıyla birebir aynı olmalıdır.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {BULK_COLUMNS.map((column) => (
              <span key={column.key} className="bg-muted rounded-md px-2 py-1 text-xs">
                {column.header}
                {"required" in column && column.required ? " *" : ""}
              </span>
            ))}
          </div>
          <Button asChild>
            <a href="/api/envanter/sablon">
              <FileSpreadsheet className="size-4" />
              Excel şablonunu indir (.xlsx)
            </a>
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Doldurulmuş dosyayı yükle</CardTitle>
          <CardDescription>Örnek satırı silin veya düzenleyin. Hatalı satırlar atlanır, geçerli satırlar eklenir.</CardDescription>
        </CardHeader>
        <CardContent>
          <BulkImportForm />
        </CardContent>
      </Card>

      <p className="text-muted-foreground text-sm">
        Tek kayıt için{" "}
        <Link href="/envanter/yeni" className="underline">
          yeni envanter
        </Link>{" "}
        formunu kullanın.
      </p>
    </div>
  );
}
