"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { Archive, CircleHelp, FolderTree, KeyRound, Loader2, Lock, Mail, Palette, Radar, Save, ScrollText, ShieldCheck, Star, UserCheck, Users, Waypoints } from "lucide-react";

import { FieldShell } from "@/components/form-fields/field-shell";
import { ReferenceSelect } from "@/components/form-fields/reference-select";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScoreRulesCard } from "@/components/settings/score-rules-card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  saveAdSettings,
  saveAppearanceSettings,
  saveApprovalSettings,
  saveMailSettings,
  saveOfficerSettings,
  saveOfficeNameSettings,
  addUnit,
  saveModuleAclSettings,
  saveRbacSettings,
  saveScannerSettings,
  saveSiemSettings,
  testAdConnection,
  testMailConnection,
  testScannerConnection,
  testSiemConnection,
} from "@/lib/actions/settings";
import { ACL_MODULES, MODULE_LEVEL_LABELS, MODULE_LEVELS, type ModuleGrant } from "@/lib/auth/acl";
import { MODULE_LABELS, MODULE_ROLES } from "@/lib/auth/rbac";
import { PERSONNEL_ROLE_LABELS, PERSONNEL_ROLES } from "@/lib/itil/constants";
import { EMPTY_STATE, type ActionState } from "@/lib/actions/shared";
import {
  CORE_OFFICER_KEYS,
  OFFICER_DEFS,
  RECOMMENDED_OFFICER_KEYS,
  SCANNER_DEFAULT_PATHS,
  SCANNER_DEFAULT_PORTS,
  SCANNER_VENDOR_LABELS,
  SCANNER_VENDORS,
  SIEM_LOG_FORMAT_LABELS,
  SIEM_LOG_FORMATS,
  SIEM_SYSLOG_FACILITIES,
  type ScannerVendor,
  type SiemLogFormat,
  type SystemSettings,
} from "@/lib/settings";
import { REQUEST_OFFICES, REQUEST_OFFICE_LABELS } from "@/lib/itil/request-types";
import { UNIT_TYPES, UNIT_TYPE_LABELS } from "@/lib/itil/unit-types";
import { UnitRow, type UnitItem } from "@/components/settings/unit-row";
import { AuditLogPanel, type AuditLogItem } from "@/components/settings/audit-log-panel";
import { ConfigBackupPanel } from "@/components/settings/config-backup-panel";
import { applyPattern, applyTheme, PATTERNS, PATTERN_LABELS, THEME_OPTIONS, type PatternId, type ThemeId } from "@/lib/theme";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

function Flag({
  name,
  label,
  hint,
  defaultChecked,
}: {
  name: string;
  label: string;
  hint?: string;
  defaultChecked: boolean;
}) {
  const [checked, setChecked] = useState(defaultChecked);
  return (
    <div className="flex items-center gap-3 rounded-md border px-3 py-2.5">
      <input type="hidden" name={name} value={checked ? "true" : "false"} />
      <Checkbox checked={checked} onCheckedChange={(value) => setChecked(value === true)} />
      <div className="flex min-w-0 items-center gap-1.5">
        <p className="text-sm font-medium leading-none">{label}</p>
        {hint ? (
          <Tooltip>
            <TooltipTrigger
              type="button"
              className="text-muted-foreground hover:text-foreground inline-flex size-5 shrink-0 items-center justify-center rounded-full"
              aria-label={`${label} hakkında`}
            >
              <CircleHelp className="size-3.5" />
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-xs text-left leading-relaxed">
              {hint}
            </TooltipContent>
          </Tooltip>
        ) : null}
      </div>
    </div>
  );
}

function FormStatus({ state }: { state: ActionState }) {
  useEffect(() => {
    if (!state.message) return;
    if (state.ok) toast.success(state.message);
    else toast.error(state.message);
  }, [state.message, state.ok, state.stamp]);

  if (!state.message) return null;
  return (
    <Alert variant={state.ok ? "default" : "destructive"}>
      <AlertDescription>{state.message}</AlertDescription>
    </Alert>
  );
}

function SaveBar({
  pending,
  testLabel,
  onTest,
}: {
  pending: boolean;
  testLabel?: string;
  onTest?: () => Promise<ActionState>;
}) {
  const [testing, startTest] = useTransition();
  const [testState, setTestState] = useState<ActionState>(EMPTY_STATE);
  return (
    <div className="flex flex-col gap-3">
      <FormStatus state={testState} />
      <div className="flex flex-wrap justify-end gap-2">
        {onTest ? (
          <Button
            type="button"
            variant="outline"
            disabled={testing}
            onClick={() =>
              startTest(async () => {
                setTestState(await onTest());
              })
            }
          >
            {testing ? <Loader2 className="size-4 animate-spin" /> : null}
            {testLabel}
          </Button>
        ) : null}
        <Button type="submit" disabled={pending}>
          {pending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
          Kaydet
        </Button>
      </div>
    </div>
  );
}

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

export function SettingsForms({
  settings,
  people,
  audit,
  initialTab = "tanimlar",
  scorePoints,
  canEditScore,
  units,
}: {
  scorePoints: Record<string, number>;
  canEditScore: boolean;
  units: UnitItem[];
  settings: SystemSettings;
  people: { id: string; label: string; meta?: string }[];
  audit: { logs: AuditLogItem[]; totals: { total: number; created: number; updated: number; deleted: number } };
  initialTab?: string;
}) {
  const [officerState, officerAction, officerPending] = useActionState(saveOfficerSettings, EMPTY_STATE);
  // Bir kişi yalnızca tek bir modülün yöneticisi olabilir: başka modülde seçilenler listede görünmez.
  const [officerValues, setOfficerValues] = useState<Record<string, string>>(() => ({ ...(settings.officers as Record<string, string>) }));
  const [officeNameState, officeNameAction, officeNamePending] = useActionState(saveOfficeNameSettings, EMPTY_STATE);
  const [unitState, unitAction, unitPending] = useActionState(addUnit, EMPTY_STATE);
  const [unitType, setUnitType] = useState<string>("");
  const [unitParent, setUnitParent] = useState<string>("__none__");
  const [unitManager, setUnitManager] = useState<string>("");
  const [adState, adAction, adPending] = useActionState(saveAdSettings, EMPTY_STATE);
  const [siemState, siemAction, siemPending] = useActionState(saveSiemSettings, EMPTY_STATE);
  const [scannerState, scannerAction, scannerPending] = useActionState(saveScannerSettings, EMPTY_STATE);
  const [approvalState, approvalAction, approvalPending] = useActionState(saveApprovalSettings, EMPTY_STATE);
  const [mailState, mailAction, mailPending] = useActionState(saveMailSettings, EMPTY_STATE);
  const [rbacState, rbacAction, rbacPending] = useActionState(saveRbacSettings, EMPTY_STATE);
  const [aclState, aclAction, aclPending] = useActionState(saveModuleAclSettings, EMPTY_STATE);
  const [appearanceState, appearanceAction, appearancePending] = useActionState(saveAppearanceSettings, EMPTY_STATE);
  const [maps, setMaps] = useState(settings.ad.roleMaps);
  const [grants, setGrants] = useState<ModuleGrant[]>(settings.acl.grants);
  const [theme, setTheme] = useState<ThemeId>(settings.appearance.theme);
  const [pattern, setPattern] = useState<PatternId>(settings.appearance.pattern);

  useEffect(() => {
    if (appearanceState.ok) applyTheme(theme);
  }, [appearanceState, theme]);

  const outerTab = initialTab === "subeler" ? "tanimlar" : initialTab || "tanimlar";
  const innerTab = initialTab === "subeler" ? "subeler" : "yoneticiler";

  return (
    <Tabs defaultValue={outerTab}>
      <TabsList className="bg-card flex !h-auto min-h-9 w-full flex-wrap justify-start gap-1 rounded-xl border p-1.5 shadow-xs [&_[data-slot=tabs-trigger]]:gap-1.5 [&_[data-slot=tabs-trigger]]:rounded-lg [&_[data-slot=tabs-trigger]]:px-3 [&_[data-slot=tabs-trigger]_svg]:size-3.5">
        <TabsTrigger value="tanimlar"><Users />Tanımlar</TabsTrigger>
        <TabsTrigger value="ad"><KeyRound />Active Directory</TabsTrigger>
        <TabsTrigger value="siem"><ScrollText />SIEM</TabsTrigger>
        <TabsTrigger value="scanner"><Radar />Zafiyet tarama</TabsTrigger>
        <TabsTrigger value="approval"><UserCheck />Yönetici onayları</TabsTrigger>
        <TabsTrigger value="mail"><Mail />E-posta</TabsTrigger>
        <TabsTrigger value="rbac"><Lock />Yetkilendirme</TabsTrigger>
        <TabsTrigger value="acl"><ShieldCheck />Modül yetkileri</TabsTrigger>
        <TabsTrigger value="appearance"><Palette />Görünüm</TabsTrigger>
        <TabsTrigger value="yedek"><Archive />Yedek</TabsTrigger>
        {canEditScore ? <TabsTrigger value="puanlama"><Star />Puanlama</TabsTrigger> : null}
        <TabsTrigger value="audit"><Waypoints />Audit log</TabsTrigger>
      </TabsList>

      <TabsContent value="tanimlar">
        <Tabs defaultValue={innerTab} className="gap-4">
          <TabsList className="grid h-auto w-full grid-cols-2 sm:w-auto">
            <TabsTrigger value="yoneticiler">Süreç yöneticileri</TabsTrigger>
            <TabsTrigger value="subeler">Talep birimleri</TabsTrigger>
          </TabsList>
          <TabsContent value="yoneticiler">
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
          </TabsContent>
          <TabsContent value="subeler">
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
          </TabsContent>
        </Tabs>
      </TabsContent>

      <TabsContent value="ad">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Active Directory entegrasyonu</CardTitle>
            <CardDescription>
              Kullanıcı ve grup eşlemesi için LDAP / LDAPS bağlantısı. Şifre yalnızca değiştirdiğinizde güncellenir.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form action={adAction} className="space-y-5">
              <FormStatus state={adState} />
              <Flag name="enabled" label="AD entegrasyonunu aç" hint="Açıkken personel senkronu ve AD girişi bu sunucuyu kullanır." defaultChecked={settings.ad.enabled} />
              <div className="grid gap-5 sm:grid-cols-2">
                <FieldShell id="ad-host" label="Sunucu / domain" required hint="Etki alanı denetleyicisi FQDN veya IP. Örn. dc01.kurum.local.">
                  <Input id="ad-host" name="host" defaultValue={settings.ad.host} placeholder="dc01.kurum.local" />
                </FieldShell>
                <FieldShell id="ad-port" label="Port" hint="LDAP 389, LDAPS 636. Kurum özel portu varsa yazın.">
                  <Input id="ad-port" name="port" type="number" defaultValue={settings.ad.port} />
                </FieldShell>
                <FieldShell id="ad-base" label="Base DN" hint="Aramanın başlayacağı kök. Örn. DC=kurum,DC=local.">
                  <Input id="ad-base" name="baseDn" defaultValue={settings.ad.baseDn} placeholder="DC=kurum,DC=local" />
                </FieldShell>
                <FieldShell id="ad-bind" label="Bind DN / kullanıcı" hint="Sorguları çalıştıracak servis hesabının DN veya UPN’si.">
                  <Input id="ad-bind" name="bindDn" defaultValue={settings.ad.bindDn} placeholder="CN=svc_bt,OU=Servis,DC=kurum,DC=local" />
                </FieldShell>
                <FieldShell id="ad-pass" label="Bind parolası" hint="Boş bırakılırsa kayıtlı parola korunur.">
                  <Input id="ad-pass" name="bindPassword" type="password" placeholder={settings.ad.bindPassword ? "Kayıtlı parola — değiştirmek için yazın" : "Parola"} />
                </FieldShell>
                <div className="sm:col-span-2">
                  <Flag name="useLdaps" label="LDAPS kullan" hint="636/TCP, sertifika ile şifreli bağlanır." defaultChecked={settings.ad.useLdaps} />
                </div>
                <FieldShell id="ad-ufilter" label="Kullanıcı filtresi" className="sm:col-span-2" hint="LDAP kullanıcı arama filtresi. (%s) kullanıcı adıyla değişir.">
                  <Input id="ad-ufilter" name="userFilter" defaultValue={settings.ad.userFilter} />
                </FieldShell>
                <FieldShell id="ad-gfilter" label="Grup filtresi" className="sm:col-span-2" hint="Rol eşlemesinde kullanılacak grup arama filtresi.">
                  <Input id="ad-gfilter" name="groupFilter" defaultValue={settings.ad.groupFilter} />
                </FieldShell>
              </div>
              <SaveBar pending={adPending} testLabel="Bağlantıyı dene" onTest={testAdConnection} />
            </form>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="siem">
        <SiemSettingsCard settings={settings} state={siemState} action={siemAction} pending={siemPending} />
      </TabsContent>

      <TabsContent value="scanner">
        <ScannerSettingsCard settings={settings} state={scannerState} action={scannerAction} pending={scannerPending} />
      </TabsContent>

      <TabsContent value="approval">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Yönetici onayları</CardTitle>
            <CardDescription>
              Açık olan kademeler için yeni kayıt Beklemede / Onay bekliyor durumuna alınır; e-posta açıksa amirlere iletilir.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form action={approvalAction} className="space-y-5">
              <FormStatus state={approvalState} />
              <div className="grid gap-3 sm:grid-cols-2">
                <Flag name="unitManager" label="Birim amiri onayı" hint="Talep eden birim amiri onaylamadan işleme alınmaz." defaultChecked={settings.approval.unitManager} />
                <Flag name="seniorManager" label="Üst amir onayı" hint="Üst birim amiri de onaylar." defaultChecked={settings.approval.seniorManager} />
                <Flag name="infosec" label="Bilgi güvenliği onayı" hint="Siber talepler ve değişiklik kayıtları için zorunlu." defaultChecked={settings.approval.infosec} />
                <Flag name="notifyMail" label="Onay beklerken e-posta gönder" hint="SMTP açık olmalıdır. Onaycıya giriş yapmadan Onayla / Reddet bağlantısı gider." defaultChecked={settings.approval.notifyMail} />
                <Flag name="applyToRequests" label="Servis taleplerinde uygula" hint="Yeni servis talepleri onay kademelerine düşer." defaultChecked={settings.approval.applyToRequests} />
                <Flag name="applyToChanges" label="Değişiklik yönetiminde uygula" hint="Değişiklik kayıtları onay bekler." defaultChecked={settings.approval.applyToChanges} />
                <Flag name="applyToPatches" label="Yama yönetiminde uygula" hint="Yama kayıtları onay bekler." defaultChecked={settings.approval.applyToPatches} />
                <FieldShell id="sla-hours" label="Onay süresi (saat)" hint="Bu süre dolunca kayıt gecikmiş onay olarak işaretlenir.">
                  <Input id="sla-hours" name="slaHours" type="number" defaultValue={settings.approval.slaHours} />
                </FieldShell>
              </div>
              <SaveBar pending={approvalPending} />
            </form>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="mail">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">E-posta gönderimi</CardTitle>
            <CardDescription>Onay bildirimleri ve test iletileri bu SMTP hesabından çıkar.</CardDescription>
          </CardHeader>
          <CardContent>
            <form action={mailAction} className="space-y-5">
              <FormStatus state={mailState} />
              <Flag name="enabled" label="E-posta gönderimini aç" hint="Açıkken onay ve test iletileri bu SMTP hesabından çıkar." defaultChecked={settings.mail.enabled} />
              <div className="grid gap-5 sm:grid-cols-2">
                <FieldShell id="smtp-host" label="SMTP sunucu" required hint="Kurum SMTP sunucusunun FQDN veya IP adresi.">
                  <Input id="smtp-host" name="host" defaultValue={settings.mail.host} placeholder="smtp.kurum.local" />
                </FieldShell>
                <FieldShell id="smtp-port" label="Port" hint="25, 587 (STARTTLS) veya 465 (SSL).">
                  <Input id="smtp-port" name="port" type="number" defaultValue={settings.mail.port} />
                </FieldShell>
                <FieldShell id="smtp-sec" label="Şifreleme" hint="Kurum politikasına göre NONE, STARTTLS veya SSL/TLS.">
                  <Select name="secure" defaultValue={settings.mail.secure}>
                    <SelectTrigger className="w-full" id="smtp-sec">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="NONE">Yok</SelectItem>
                      <SelectItem value="STARTTLS">STARTTLS</SelectItem>
                      <SelectItem value="SSL">SSL / TLS</SelectItem>
                    </SelectContent>
                  </Select>
                </FieldShell>
                <FieldShell id="smtp-user" label="Kullanıcı adı" hint="SMTP kimlik doğrulama hesabı. Anonim ise boş bırakın.">
                  <Input id="smtp-user" name="user" defaultValue={settings.mail.user} />
                </FieldShell>
                <FieldShell id="smtp-pass" label="Parola" hint="Boş bırakılırsa kayıtlı parola korunur.">
                  <Input id="smtp-pass" name="password" type="password" placeholder={settings.mail.password ? "Kayıtlı parola — değiştirmek için yazın" : "Parola"} />
                </FieldShell>
                <FieldShell id="mail-from" label="Gönderen adresi" hint="Alıcının göreceği From adresi.">
                  <Input id="mail-from" name="from" defaultValue={settings.mail.from} placeholder="bt-hizmet@kurum.gov.tr" />
                </FieldShell>
                <FieldShell id="mail-name" label="Gönderen adı" hint="From görünen adı. Örn. BT Hizmet Yönetimi.">
                  <Input id="mail-name" name="fromName" defaultValue={settings.mail.fromName} />
                </FieldShell>
                <FieldShell id="mail-test" label="Test alıcısı" hint="“SMTP / test iletisi” bu adrese gider.">
                  <Input id="mail-test" name="testRecipient" defaultValue={settings.mail.testRecipient} placeholder="yonetici@kurum.gov.tr" />
                </FieldShell>
              </div>
              <SaveBar pending={mailPending} testLabel="SMTP / test iletisi" onTest={testMailConnection} />
            </form>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="appearance">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Tema</CardTitle>
            <CardDescription>
              Seçilen tema menü, panolar ve widget renklerini tüm oturumlarda değiştirir.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form action={appearanceAction} className="space-y-5">
              <FormStatus state={appearanceState} />
              <input type="hidden" name="theme" value={theme} />
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {THEME_OPTIONS.map((option) => {
                  const selected = theme === option.id;
                  return (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => {
                        setTheme(option.id);
                        applyTheme(option.id);
                      }}
                      className={cn(
                        "cursor-pointer rounded-xl border p-3 text-left transition-all",
                        selected ? "border-primary ring-2 ring-primary/30" : "hover:border-primary/40",
                      )}
                      aria-pressed={selected}
                    >
                      <div className="mb-3 flex h-10 overflow-hidden rounded-lg">
                        {option.swatches.map((color) => (
                          <span key={color} className="flex-1" style={{ background: color }} />
                        ))}
                      </div>
                      <p className="text-sm font-medium">{option.label}</p>
                      <p className="text-muted-foreground text-xs">{option.hint}</p>
                    </button>
                  );
                })}
              </div>
              <input type="hidden" name="pattern" value={pattern} />
              <div className="space-y-2">
                <p className="text-sm font-medium">Arka plan deseni</p>
                <div className="flex flex-wrap gap-2">
                  {PATTERNS.map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => {
                        setPattern(p);
                        applyPattern(p);
                      }}
                      aria-pressed={pattern === p}
                      className={cn(
                        "cursor-pointer rounded-lg border px-3 py-1.5 text-sm transition-all",
                        pattern === p ? "border-primary ring-2 ring-primary/30" : "hover:border-primary/40",
                      )}
                    >
                      {PATTERN_LABELS[p]}
                    </button>
                  ))}
                </div>
              </div>
              <Flag
                name="itilV2"
                label="ITIL 2.0 süreç menüsü"
                hint="Kapatınca 1.3.0 menüsü geri gelir. Katalog ve süreç kayıtları silinmez."
                defaultChecked={settings.layout.itilV2}
              />
              <SaveBar pending={appearancePending} />
            </form>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="yedek">
        <ConfigBackupPanel />
      </TabsContent>

      {canEditScore ? (
        <TabsContent value="puanlama">
          <ScoreRulesCard points={scorePoints} canEdit={canEditScore} />
        </TabsContent>
      ) : null}

      <TabsContent value="audit">
        <AuditLogPanel logs={audit.logs} totals={audit.totals} />
      </TabsContent>

      <TabsContent value="rbac">
        <div className="space-y-5">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">AD grup → rol</CardTitle>
              <CardDescription>
                Active Directory girişi sonrası üyelik bu tabloya göre role çevrilir. Manuel kaynaklı hesaplar personel kartındaki rolü kullanır.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form action={rbacAction} className="space-y-5">
                <FormStatus state={rbacState} />
                <FieldShell id="default-role" label="Eşleşme yoksa AD rolü" hint="Grup eşlemesi tutmazsa AD kullanıcısına bu rol verilir. Genelde Kullanıcı.">
                  <Select name="defaultRole" defaultValue={settings.ad.defaultRole}>
                    <SelectTrigger className="w-full" id="default-role">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PERSONNEL_ROLES.map((role) => (
                        <SelectItem key={role} value={role}>
                          {PERSONNEL_ROLE_LABELS[role]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FieldShell>
                <div className="space-y-2">
                  {maps.map((row, index) => (
                    <div key={`${row.group}-${index}`} className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
                      <Input name="mapGroup" defaultValue={row.group} placeholder="GG_BilgiGuvenligi" />
                      <select
                        name="mapRole"
                        defaultValue={row.role}
                        className="border-input h-9 rounded-md border bg-transparent px-3 text-sm"
                      >
                        {PERSONNEL_ROLES.map((role) => (
                          <option key={role} value={role}>
                            {PERSONNEL_ROLE_LABELS[role]}
                          </option>
                        ))}
                      </select>
                      <Button type="button" variant="ghost" onClick={() => setMaps((prev) => prev.filter((_, i) => i !== index))}>
                        Sil
                      </Button>
                    </div>
                  ))}
                  <Button type="button" variant="outline" size="sm" onClick={() => setMaps((prev) => [...prev, { group: "", role: "USER" }])}>
                    Grup eşlemesi ekle
                  </Button>
                </div>
                <SaveBar pending={rbacPending} />
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Rol varsayılanı</CardTitle>
              <CardDescription>
                Rol matrisi başlangıç değeridir. Asıl erişim Ayarlar → Modül yetkileri sekmesindeki grup eşlemesiyle
                yönetilir.
              </CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b">
                    <th className="py-2 pr-3 font-medium">Modül</th>
                    {PERSONNEL_ROLES.map((role) => (
                      <th key={role} className="px-2 py-2 font-medium">
                        {PERSONNEL_ROLE_LABELS[role]}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(MODULE_ROLES).map(([mod, roles]) => (
                    <tr key={mod} className="border-b last:border-0">
                      <td className="py-2 pr-3">{MODULE_LABELS[mod as keyof typeof MODULE_LABELS]}</td>
                      {PERSONNEL_ROLES.map((role) => (
                        <td key={role} className="px-2 py-2">
                          {roles.includes(role) ? "●" : "·"}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </div>
      </TabsContent>

      <TabsContent value="acl">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Grup bazlı modül yetkileri</CardTitle>
            <CardDescription>
              Süper yönetici her birimi kendi modülüne bağlar. Grup adı AD grubu (`GG_Envanter`), rol
              (`role:USER`) veya talep ofisi (`office:SERVIS`) olabilir. Seviyeler: görüntüle, işle, modül
              yöneticisi. Süper yönetici her zaman tam yetkilidir.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form action={aclAction} className="space-y-5">
              <FormStatus state={aclState} />
              <div className="space-y-2">
                {grants.map((row, index) => (
                  <div key={`${row.module}-${row.group}-${index}`} className="grid gap-2 sm:grid-cols-[1fr_1fr_1fr_auto]">
                    <select
                      name="grantModule"
                      defaultValue={row.module}
                      className="border-input h-9 rounded-md border bg-transparent px-3 text-sm"
                    >
                      {ACL_MODULES.map((mod) => (
                        <option key={mod} value={mod}>
                          {MODULE_LABELS[mod]}
                        </option>
                      ))}
                    </select>
                    <Input name="grantGroup" defaultValue={row.group} placeholder="GG_Envanter veya role:USER" />
                    <select
                      name="grantLevel"
                      defaultValue={row.level}
                      className="border-input h-9 rounded-md border bg-transparent px-3 text-sm"
                    >
                      {MODULE_LEVELS.map((level) => (
                        <option key={level} value={level}>
                          {MODULE_LEVEL_LABELS[level]}
                        </option>
                      ))}
                    </select>
                    <Button type="button" variant="ghost" onClick={() => setGrants((prev) => prev.filter((_, i) => i !== index))}>
                      Sil
                    </Button>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setGrants((prev) => [...prev, { module: "envanter", group: "", level: "VIEW" }])}
                >
                  Yetki satırı ekle
                </Button>
              </div>
              <p className="text-muted-foreground text-xs">
                Örnek: `GG_Envanter` → Envanter yönetimi → Modül yöneticisi. Normal kullanıcılar `role:USER` ile
                yalnızca kendi ve birimindeki envanteri görür; ekleme/silme onaya düşer.
              </p>
              <SaveBar pending={aclPending} />
            </form>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}

function SiemSettingsCard({
  settings,
  state,
  action,
  pending,
}: {
  settings: SystemSettings;
  state: ActionState;
  action: (formData: FormData) => void;
  pending: boolean;
}) {
  const [logFormat, setLogFormat] = useState<SiemLogFormat>(settings.siem.logFormat ?? "CEF");

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">SIEM</CardTitle>
        <CardDescription>
          Talep, değişiklik ve yama kayıtları seçilen log formatında SIEM hedefine iletilir. Taşıma protokolü ile
          içerik formatı ayrıdır.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={action} className="space-y-5">
          <FormStatus state={state} />
          <Flag
            name="enabled"
            label="SIEM gönderimini aç"
            hint="Açıkken yeni kayıtlarda seçilen formatta olay üretilir."
            defaultChecked={settings.siem.enabled}
          />
          <div className="grid gap-5 sm:grid-cols-2">
            <FieldShell id="siem-host" label="SIEM adresi" required hint="Toplayıcı veya syslog hedefinin FQDN / IP adresi.">
              <Input id="siem-host" name="host" defaultValue={settings.siem.host} placeholder="siem.kurum.local" />
            </FieldShell>
            <FieldShell id="siem-port" label="Port" hint="Genelde 514 (UDP/TCP) veya 6514 (TLS).">
              <Input id="siem-port" name="port" type="number" defaultValue={settings.siem.port} />
            </FieldShell>
            <FieldShell id="siem-proto" label="Protokol" hint="Taşıma katmanı. İçerik formatından bağımsızdır.">
              <Select name="protocol" defaultValue={settings.siem.protocol}>
                <SelectTrigger className="w-full" id="siem-proto">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="UDP">UDP</SelectItem>
                  <SelectItem value="TCP">TCP</SelectItem>
                  <SelectItem value="TLS">TLS</SelectItem>
                </SelectContent>
              </Select>
            </FieldShell>
            <input type="hidden" name="logFormat" value={logFormat} />
            <FieldShell id="siem-format" label="Log formatı" hint="CEF: ArcSight / QRadar. Syslog: RFC 5424 düz metin.">
              <Select value={logFormat} onValueChange={(value) => setLogFormat(value as SiemLogFormat)}>
                <SelectTrigger className="w-full" id="siem-format">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SIEM_LOG_FORMATS.map((format) => (
                    <SelectItem key={format} value={format}>
                      {SIEM_LOG_FORMAT_LABELS[format]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FieldShell>
            {logFormat === "CEF" ? (
              <>
                <FieldShell id="cef-vendor" label="CEF Device Vendor" hint="CEF başlığındaki üretici alanı.">
                  <Input id="cef-vendor" name="cefVendor" defaultValue={settings.siem.cefVendor} />
                </FieldShell>
                <FieldShell id="cef-product" label="CEF Device Product" hint="CEF başlığındaki ürün adı.">
                  <Input id="cef-product" name="cefProduct" defaultValue={settings.siem.cefProduct} />
                </FieldShell>
                <FieldShell id="cef-ver" label="CEF Device Version" hint="CEF başlığındaki ürün sürümü.">
                  <Input id="cef-ver" name="cefVersion" defaultValue={settings.siem.cefVersion} />
                </FieldShell>
              </>
            ) : (
              <>
                <FieldShell id="syslog-app" label="Syslog uygulama adı" hint="RFC 5424 APP-NAME alanı.">
                  <Input
                    id="syslog-app"
                    name="syslogAppName"
                    defaultValue={settings.siem.syslogAppName}
                    placeholder="BTHizmetYonetimi"
                  />
                </FieldShell>
                <FieldShell id="syslog-fac" label="Syslog facility" hint="PRI hesabında kullanılan tesis kodu. Local0 = 16.">
                  <Select name="syslogFacility" defaultValue={String(settings.siem.syslogFacility ?? 16)}>
                    <SelectTrigger className="w-full" id="syslog-fac">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SIEM_SYSLOG_FACILITIES.map((item) => (
                        <SelectItem key={item.value} value={String(item.value)}>
                          {item.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FieldShell>
              </>
            )}
          </div>
          {logFormat === "CEF" ? (
            <>
              <input type="hidden" name="syslogAppName" value={settings.siem.syslogAppName} />
              <input type="hidden" name="syslogFacility" value={String(settings.siem.syslogFacility ?? 16)} />
            </>
          ) : (
            <>
              <input type="hidden" name="cefVendor" value={settings.siem.cefVendor} />
              <input type="hidden" name="cefProduct" value={settings.siem.cefProduct} />
              <input type="hidden" name="cefVersion" value={settings.siem.cefVersion} />
            </>
          )}
          <p className="text-muted-foreground text-xs">
            {logFormat === "CEF"
              ? "CEF:0|üretici|ürün|sürüm|imza|ad|önem|uzantılar satırı gönderilir. ArcSight, QRadar ve benzeri toplayıcılar için uygundur."
              : "RFC 5424 syslog satırı gönderilir: <PRI>1 zaman damgası sunucu uygulama - imza [alanlar] mesaj."}
          </p>
          <SaveBar pending={pending} testLabel="Test kaydı gönder" onTest={testSiemConnection} />
        </form>
      </CardContent>
    </Card>
  );
}

function ScannerSettingsCard({
  settings,
  state,
  action,
  pending,
}: {
  settings: SystemSettings;
  state: ActionState;
  action: (formData: FormData) => void;
  pending: boolean;
}) {
  const [vendor, setVendor] = useState<ScannerVendor>(settings.scanner.vendor);
  const [port, setPort] = useState(String(settings.scanner.port));
  const [apiPath, setApiPath] = useState(settings.scanner.apiPath);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Zafiyet tarama cihazı bağlantısı</CardTitle>
        <CardDescription>
          Yalnızca zafiyet tarama ailesi (Nessus, Tenable, Qualys, OpenVAS, Rapid7). VMware, OpenShift veya uygulama ortamı
          ürünleri bu sekmede yoktur — onlar ilgili talep formundadır. IP / cihaz
          adına göre envanter kaydı eşlenir.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={action} className="space-y-5">
          <FormStatus state={state} />
          {settings.scanner.lastSyncMessage ? (
            <p className="text-muted-foreground text-xs">Son çekim: {settings.scanner.lastSyncMessage}</p>
          ) : null}
          <Flag
            name="enabled"
            label="Tarama cihazı bağlantısını aç"
            hint="Açıkken Zafiyet sayfasındaki “Tarayıcıdan çek” gerçek cihaza gider."
            defaultChecked={settings.scanner.enabled}
          />
          <Flag
            name="useDemoFeed"
            label="Örnek tarama kaynağı kullan"
            hint="Cihaz yokken demo bulgularla çekim yapılır. Canlı ortamda kapatın."
            defaultChecked={settings.scanner.useDemoFeed}
          />
          <Flag
            name="autoMatchAssets"
            label="Envanter ile otomatik eşle"
            hint="Aynı IP veya cihaz adına sahip varlık kaydına bağlanır."
            defaultChecked={settings.scanner.autoMatchAssets}
          />
          <div className="grid gap-5 sm:grid-cols-2">
            <input type="hidden" name="vendor" value={vendor} />
            <input type="hidden" name="port" value={port} />
            <input type="hidden" name="apiPath" value={apiPath} />
            <FieldShell id="scanner-vendor" label="Cihaz / ürün" hint="Port ve API yolu ürüne göre otomatik dolar; gerekirse değiştirin.">
              <Select
                value={vendor}
                onValueChange={(value) => {
                  const next = value as ScannerVendor;
                  setVendor(next);
                  setPort(String(SCANNER_DEFAULT_PORTS[next]));
                  setApiPath(SCANNER_DEFAULT_PATHS[next]);
                }}
              >
                <SelectTrigger className="w-full" id="scanner-vendor">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SCANNER_VENDORS.map((item) => (
                    <SelectItem key={item} value={item}>
                      {SCANNER_VENDOR_LABELS[item]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FieldShell>
            <FieldShell id="scanner-proto" label="Protokol" hint="Kurum içi self-signed cihazlarda HTTPS + TLS doğrulamasını kapatın.">
              <Select name="protocol" defaultValue={settings.scanner.protocol}>
                <SelectTrigger className="w-full" id="scanner-proto">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="HTTPS">HTTPS</SelectItem>
                  <SelectItem value="HTTP">HTTP</SelectItem>
                </SelectContent>
              </Select>
            </FieldShell>
            <FieldShell id="scanner-host" label="Cihaz adresi" required hint="Tarama konsolunun FQDN veya IP adresi.">
              <Input id="scanner-host" name="host" defaultValue={settings.scanner.host} placeholder="nessus.kurum.local" />
            </FieldShell>
            <FieldShell id="scanner-port" label="Port" hint="Ürünün API portu. Değiştirince kayıtlı değer güncellenir.">
              <Input id="scanner-port" type="number" value={port} onChange={(event) => setPort(event.target.value)} />
            </FieldShell>
            <FieldShell id="scanner-path" label="API yolu" className="sm:col-span-2" hint="Bulgu listesi uç noktası. Ürün seçilince varsayılan gelir.">
              <Input id="scanner-path" value={apiPath} onChange={(event) => setApiPath(event.target.value)} />
            </FieldShell>
            <FieldShell id="scanner-access" label="API access key" hint="Tenable / Nessus access key. Boş bırakılırsa kayıtlı değer korunur.">
              <Input
                id="scanner-access"
                name="accessKey"
                type="password"
                placeholder={settings.scanner.accessKey ? "Kayıtlı anahtar — değiştirmek için yazın" : "Access key"}
              />
            </FieldShell>
            <FieldShell id="scanner-secret" label="API secret key" hint="Tenable / Nessus secret key. Boş bırakılırsa kayıtlı değer korunur.">
              <Input
                id="scanner-secret"
                name="secretKey"
                type="password"
                placeholder={settings.scanner.secretKey ? "Kayıtlı anahtar — değiştirmek için yazın" : "Secret key"}
              />
            </FieldShell>
            <FieldShell id="scanner-user" label="Kullanıcı adı" hint="Qualys, OpenVAS veya Rapid7 temel kimlik hesabı.">
              <Input id="scanner-user" name="username" defaultValue={settings.scanner.username} />
            </FieldShell>
            <FieldShell id="scanner-pass" label="Parola" hint="Boş bırakılırsa kayıtlı parola korunur.">
              <Input
                id="scanner-pass"
                name="password"
                type="password"
                placeholder={settings.scanner.password ? "Kayıtlı parola — değiştirmek için yazın" : "Parola"}
              />
            </FieldShell>
            <FieldShell id="scanner-crit" label="Kritik termin (gün)" hint="Kritik bulgular için kapatma süresi. Envanter eşlemesinde dueDate hesaplanır.">
              <Input id="scanner-crit" name="dueDaysCritical" type="number" defaultValue={settings.scanner.dueDaysCritical} />
            </FieldShell>
            <FieldShell id="scanner-high" label="Yüksek termin (gün)" hint="Yüksek seviye bulgular için kapatma süresi.">
              <Input id="scanner-high" name="dueDaysHigh" type="number" defaultValue={settings.scanner.dueDaysHigh} />
            </FieldShell>
            <div className="sm:col-span-2">
              <Flag
                name="verifyTls"
                label="TLS sertifikasını doğrula"
                hint="Kurum içi self-signed cihazlarda kapalı bırakın."
                defaultChecked={settings.scanner.verifyTls}
              />
            </div>
          </div>
          <SaveBar pending={pending} testLabel="Bağlantıyı dene" onTest={testScannerConnection} />
        </form>
      </CardContent>
    </Card>
  );
}
