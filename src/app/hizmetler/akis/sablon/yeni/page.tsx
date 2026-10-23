import { PageHeader } from "@/components/ui-bits";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { saveProcessTemplate } from "@/lib/actions/process-flow";
import { FLOW_KIND_LABELS } from "@/lib/process-flow";

export const dynamic = "force-dynamic";

export default async function YeniSablonPage({ searchParams }: { searchParams: Promise<{ hata?: string }> }) {
  const { hata } = await searchParams;
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-4 sm:p-8">
      <PageHeader title="Yeni süreç şablonu" description="Adımları sırayla, her satıra bir adım olarak yazın: Tür: başlık" />
      {hata ? <p className="text-destructive rounded-md border border-destructive/30 px-3 py-2 text-sm">{hata}</p> : null}
      <Card>
        <CardContent className="pt-6">
          <form action={saveProcessTemplate} className="flex flex-col gap-4">
            <label className="flex flex-col gap-1 text-sm">
              Ad
              <Input name="name" required />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              Açıklama
              <Input name="description" />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              Adımlar
              <Textarea name="steps" rows={8} required placeholder={"Olay: Olayı kaydet\nProblem: Kök neden\nDeğişiklik: Düzeltme"} />
              <span className="text-muted-foreground text-xs">Türler: {Object.values(FLOW_KIND_LABELS).join(", ")} (en fazla 12 adım)</span>
            </label>
            <div className="flex gap-2">
              <Button type="submit">Kaydet</Button>
              <Button asChild variant="outline"><a href="/hizmetler/akis">Vazgeç</a></Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
