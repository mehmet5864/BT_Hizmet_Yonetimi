"use client";

import Link from "next/link";
import { useActionState, useEffect, useState, useTransition } from "react";
import { Archive, CircleHelp, FolderTree, KeyRound, Loader2, Lock, Mail, Palette, Radar, Save, ScrollText, Star, UserCheck, Users, Waypoints } from "lucide-react";

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
  saveScannerSettings,
  saveSiemSettings,
  testAdConnection,
  testMailConnection,
  testScannerConnection,
  testSiemConnection,
} from "@/lib/actions/settings";
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

export function FormStatus({ state }: { state: ActionState }) {
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

export function SaveBar({
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
  const [adState, adAction, adPending] = useActionState(saveAdSettings, EMPTY_STATE);
  const [siemState, siemAction, siemPending] = useActionState(saveSiemSettings, EMPTY_STATE);
  const [scannerState, scannerAction, scannerPending] = useActionState(saveScannerSettings, EMPTY_STATE);
  const [approvalState, approvalAction, approvalPending] = useActionState(saveApprovalSettings, EMPTY_STATE);
  const [mailState, mailAction, mailPending] = useActionState(saveMailSettings, EMPTY_STATE);
  const [appearanceState, appearanceAction, appearancePending] = useActionState(saveAppearanceSettings, EMPTY_STATE);
  const [theme, setTheme] = useState<ThemeId>(settings.appearance.theme);
  const [pattern, setPattern] = useState<PatternId>(settings.appearance.pattern);

  useEffect(() => {
    if (appearanceState.ok) applyTheme(theme);
  }, [appearanceState, theme]);

  const outerTab = initialTab && initialTab !== "tanimlar" && initialTab !== "subeler" ? initialTab : "ad";

  return (
    <Tabs defaultValue={outerTab}>
      <TabsList className="bg-card flex !h-auto min-h-9 w-full flex-wrap justify-start gap-1 rounded-xl border p-1.5 shadow-xs [&_[data-slot=tabs-trigger]]:gap-1.5 [&_[data-slot=tabs-trigger]]:rounded-lg [&_[data-slot=tabs-trigger]]:px-3 [&_[data-slot=tabs-trigger]_svg]:size-3.5">
        <TabsTrigger value="ad"><KeyRound />Active Directory</TabsTrigger>
        <TabsTrigger value="siem"><ScrollText />SIEM</TabsTrigger>
        <TabsTrigger value="scanner"><Radar />Zafiyet tarama</TabsTrigger>
        <TabsTrigger value="approval"><UserCheck />Yönetici onayları</TabsTrigger>
        <TabsTrigger value="mail"><Mail />E-posta</TabsTrigger>
        <Link href="/ayarlar/yetkiler" className="hover:bg-accent text-foreground/80 inline-flex items-center gap-1.5 rounded-lg px-3 py-1 text-sm font-medium"><Lock className="size-3.5" />Yetki ve roller</Link>
        <TabsTrigger value="appearance"><Palette />Görünüm</TabsTrigger>
        <TabsTrigger value="yedek"><Archive />Yedek</TabsTrigger>
        {canEditScore ? <TabsTrigger value="puanlama"><Star />Puanlama</TabsTrigger> : null}
        <TabsTrigger value="audit"><Waypoints />Audit log</TabsTrigger>
      </TabsList>

      <TabsContent value="ad">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Active Directory entegrasyonu</CardTitle>
            <CardDescription>
              Kullanıcı ve grup eşlemesi için LDAP / LDAPS bağlantısı. Şifre yalnızca değiştirdiğinizde güncellenir. Bağlantı çalışınca AD güvenlik gruplarını talep kategorileriyle eşleştirmek için{" "}
              <a href="/ayarlar/yetkiler?sekme=talep" className="text-primary underline underline-offset-2">Yetki ve roller</a> sayfasını açın.
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
                <div className="sm:col-span-2">
                  <Flag name="ouSync" label="OU yolundan birimi otomatik kur" hint="Açıkken girişte kullanıcının OU yolu (örn. Genel Müdürlük → Siber Daire Başkanlığı → Şube Müdürlüğü) birim ağacına çevrilir ve kişi en alttaki birime bağlanır; talep birimi boşsa OU adından belirlenir. Hata olursa giriş etkilenmez. Varsayılan kapalıdır." defaultChecked={settings.ad.ouSync} />
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
