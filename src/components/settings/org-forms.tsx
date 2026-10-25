"use client";

import { useActionState, useState } from "react";
import { FolderTree } from "lucide-react";

import { FieldShell } from "@/components/form-fields/field-shell";
import { ReferenceSelect } from "@/components/form-fields/reference-select";
import { FormStatus, SaveBar } from "@/components/settings/settings-forms";
import { UnitRow, type UnitItem } from "@/components/settings/unit-row";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { addUnit, saveOfficeNameSettings, saveOfficerSettings } from "@/lib/actions/settings";
import { EMPTY_STATE } from "@/lib/actions/shared";
import { CORE_OFFICER_KEYS, OFFICER_DEFS, RECOMMENDED_OFFICER_KEYS, type SystemSettings } from "@/lib/settings";
import { REQUEST_OFFICES, REQUEST_OFFICE_LABELS } from "@/lib/itil/request-types";
import { UNIT_TYPES, UNIT_TYPE_LABELS } from "@/lib/itil/unit-types";

type Person = { id: string; label: string; meta?: string };

const OFFICER_GROUPS = [
  {
    title: "1 · Önce bunları atayın",
    note: "Talep onayları (şube yöneticileri), bilgi güvenliği ve envanter onayları bunlara dayanır.",
    keys: CORE_OFFICER_KEYS as readonly string[],
    optional: false,
  },
  {
    title: "2 · Önerilen",
    note: "Yeni değişiklik ve yama kayıtlarında varsayılan talep amiri olurlar.",
    keys: RECOMMENDED_OFFICER_KEYS as readonly string[],
    optional: false,
  },
  {
    title: "3 · İsteğe bağlı (kurumunuzda sorumlu varsa)",
    note: "Boş bırakılanlar rolüne uygun bir kişiyle otomatik doldurulur; yalnızca varsayılan sorumlu ve modül yönetimi içindir.",
    keys: [
      "olay", "problem", "konfigurasyon", "zafiyet", "firmaSla", "zimmet", "personel", "rapor",
      "katalog", "bilgi", "akis", "tasarim", "kullanilabilirlik", "kapasite", "sureklilik", "dogrulama", "surum",
      "izleme", "degerlendirme", "cevik",
    ] as readonly string[],
    optional: true,
  },
] as const;

export function OfficersForm({ settings, people }: { settings: SystemSettings; people: Person[] }) {
  const [officerState, officerAction, officerPending] = useActionState(saveOfficerSettings, EMPTY_STATE);
  // Bir kişi yalnızca tek bir modülün yöneticisi olabilir: başka modülde seçilenler listede görünmez.
  const [officerValues, setOfficerValues] = useState<Record<string, string>>(() => ({ ...(settings.officers as Record<string, string>) }));
  return (
    <>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Süreç yöneticileri</CardTitle>
            <CardDescription>
              Her modül ve ITIL süreci (envanter, zimmet, personel, katalog, bilgi bankası, süreç akışı, tasarım, kullanılabilirlik, kapasite, süreklilik, test, sürüm, izleme, değerlendirme, Çevik, rapor; ayrıca değişiklik, yama, konfigürasyon, zafiyet, firma/SLA, olay ve problem) için sorumlu personeli seçin.
              Yeni kayıtlarda yönetici alanı bu kişilerle dolar. Şube yöneticileri kendi ofislerindeki talepleri onaylar; onaydan sonra kayıt işlemde (açıkta) devam eder. E-posta açıksa onaycıya doğrudan onay bağlantısı gider.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form action={officerAction} className="space-y-5">
              <FormStatus state={officerState} />
              <div className="bg-muted/40 flex flex-wrap items-center gap-3 rounded-lg border px-3 py-2 text-sm">
                <span className="font-medium tabular-nums">
                  {CORE_OFFICER_KEYS.filter((key) => officerValues[key]).length}/{CORE_OFFICER_KEYS.length}
                </span>
                <span className="text-muted-foreground text-xs">
                  temel yönetici atandı · toplam {Object.values(officerValues).filter(Boolean).length}/{OFFICER_DEFS.length} · bir kişi yalnızca bir modülün yöneticisi olabilir
                </span>
                <div className="bg-muted ms-auto h-1.5 w-32 overflow-hidden rounded-full">
                  <div className="bg-primary h-full rounded-full" style={{ width: `${(CORE_OFFICER_KEYS.filter((key) => officerValues[key]).length / CORE_OFFICER_KEYS.length) * 100}%` }} />
                </div>
              </div>
              {OFFICER_GROUPS.map((group) => {
                const fields = (
                  <div className="grid gap-4 sm:grid-cols-2">
                    {OFFICER_DEFS.filter((def) => group.keys.includes(def.key)).map((def) => (
                      <FieldShell key={def.key} id={`officer-${def.key}`} label={def.label} hint={def.hint}>
                        <ReferenceSelect
                          name={`officer_${def.key}`}
                          entity="person"
                          options={[
                            { id: "", label: "Tanımsız" },
                            ...people.filter((person) => !Object.entries(officerValues).some(([key, id]) => key !== def.key && id === person.id)),
                          ]}
                          value={officerValues[def.key] ?? ""}
                          onValueChange={(id) => setOfficerValues((prev) => ({ ...prev, [def.key]: id }))}
                          placeholder="Personel seçin"
                          emptyLabel="Personel bulunamadı"
                        />
                      </FieldShell>
                    ))}
                  </div>
                );
                return group.optional ? (
                  <details key={group.title} className="group space-y-3 rounded-lg border p-3">
                    <summary className="text-muted-foreground flex cursor-pointer items-center gap-2 text-xs font-semibold tracking-wide uppercase">
                      <FolderTree className="size-3.5" />
                      {group.title}
                      <span className="text-muted-foreground/70 font-normal normal-case">({group.keys.length} alan)</span>
                    </summary>
                    <p className="text-muted-foreground mt-2 mb-3 text-xs">{group.note}</p>
                    {fields}
                  </details>
                ) : (
                  <section key={group.title} className="space-y-3">
                    <h3 className="text-muted-foreground flex items-center gap-2 text-xs font-semibold tracking-wide uppercase">
                      <FolderTree className="size-3.5" />
                      {group.title}
                    </h3>
                    <p className="text-muted-foreground text-xs">{group.note}</p>
                    {fields}
                  </section>
                );
              })}
              <SaveBar pending={officerPending} />
            </form>
          </CardContent>
        </Card>
    </>
  );
}

export function UnitsForms({ settings, people, units }: { settings: SystemSettings; people: Person[]; units: UnitItem[] }) {
  const [officeNameState, officeNameAction, officeNamePending] = useActionState(saveOfficeNameSettings, EMPTY_STATE);
  const [unitState, unitAction, unitPending] = useActionState(addUnit, EMPTY_STATE);
  const [unitType, setUnitType] = useState<string>("");
  const [unitParent, setUnitParent] = useState<string>("__none__");
  const [unitManager, setUnitManager] = useState<string>("");
  return (
    <>
            <Card className="mb-4">
              <CardHeader>
                <CardTitle className="text-base">Birim ekle</CardTitle>
                <CardDescription>
                  Birim türünü seçin; isterseniz birim adını da yazın. Ad boş bırakılırsa tür adı kullanılır.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form action={unitAction} className="space-y-5">
                  <FormStatus state={unitState} />
                  <div className="grid gap-5 sm:grid-cols-2">
                    <FieldShell id="unit-type" label="Birim türü" required hint="Kurum yapısındaki düzey.">
                      <Select name="unitType" value={unitType} onValueChange={setUnitType}>
                        <SelectTrigger className="w-full" id="unit-type">
                          <SelectValue placeholder="Tür seçin" />
                        </SelectTrigger>
                        <SelectContent>
                          {UNIT_TYPES.map((t) => (
                            <SelectItem key={t} value={t}>{UNIT_TYPE_LABELS[t]}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FieldShell>
                    <FieldShell id="unit-name" label="Birim adı" hint="Örn. Başkanlık veya Bilgi İşlem Daire Başkanlığı. Boşsa tür adı kullanılır.">
                      <Input id="unit-name" name="name" maxLength={120} />
                    </FieldShell>
                    <FieldShell id="unit-parent" label="Bağlı olduğu üst birim" hint="İsteğe bağlı; hiyerarşiyi kurar.">
                      <Select value={unitParent} onValueChange={setUnitParent}>
                        <SelectTrigger className="w-full" id="unit-parent">
                          <SelectValue placeholder="Yok (en üst birim)" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">Yok (en üst birim)</SelectItem>
                          {units.map((u) => (
                            <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <input type="hidden" name="parentId" value={unitParent === "__none__" ? "" : unitParent} />
                    </FieldShell>
                    <FieldShell id="unit-manager" label="Birim amiri" hint="İsteğe bağlı; sonradan Personel'den de atanabilir.">
                      <ReferenceSelect
                        name="managerId"
                        entity="person"
                        options={[{ id: "", label: "Tanımsız" }, ...people]}
                        value={unitManager}
                        onValueChange={setUnitManager}
                        placeholder="Personel seçin"
                        emptyLabel="Personel bulunamadı"
                      />
                    </FieldShell>
                  </div>
                  <SaveBar pending={unitPending} />
                </form>
                {units.length ? (
                  <ul className="mt-4 grid gap-1 text-sm sm:grid-cols-2">
                    {units.map((u) => (
                      <UnitRow key={u.id} unit={u} units={units} people={people} />
                    ))}
                  </ul>
                ) : null}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Talep birimleri</CardTitle>
                <CardDescription>
                  Talep yönetimindeki birim adlarını kurumunuza göre değiştirin. Menü adı kenar çubuğunda, tam ad form ve listelerde görünür.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form action={officeNameAction} className="space-y-5">
                  <FormStatus state={officeNameState} />
                  <div className="grid gap-5">
                    {REQUEST_OFFICES.map((office) => (
                      <div key={office} className="grid gap-4 rounded-lg border p-4 sm:grid-cols-2">
                        <p className="text-muted-foreground sm:col-span-2 text-xs font-medium tracking-wide uppercase">
                          {REQUEST_OFFICE_LABELS[office]}
                        </p>
                        <FieldShell
                          id={`office-label-${office}`}
                          label="Tam ad"
                          required
                          hint="Formlarda, talep kartında ve raporlarda görünen ad."
                        >
                          <Input
                            id={`office-label-${office}`}
                            name={`office_label_${office}`}
                            defaultValue={settings.officeNames[office].label}
                            maxLength={80}
                          />
                        </FieldShell>
                        <FieldShell
                          id={`office-nav-${office}`}
                          label="Menü adı"
                          hint="Kenar çubuğundaki kısa ad. Boşsa tam ad kullanılır."
                        >
                          <Input
                            id={`office-nav-${office}`}
                            name={`office_nav_${office}`}
                            defaultValue={settings.officeNames[office].navLabel}
                            maxLength={40}
                          />
                        </FieldShell>
                      </div>
                    ))}
                  </div>
                  <SaveBar pending={officeNamePending} />
                </form>
              </CardContent>
            </Card>
    </>
  );
}
